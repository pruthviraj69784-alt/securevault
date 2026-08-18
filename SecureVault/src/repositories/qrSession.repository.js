const redis = require("../config/redis");

class QRSessionRepository {
  async createSession(sessionData, ttlSeconds = 60) {
    const key = `qr:session:${sessionData.sessionId}`;
    const payload = JSON.stringify(sessionData);

    await redis.set(key, payload, "EX", ttlSeconds);

    if (sessionData.createdBy) {
      await redis.sadd(`qr:owner:${sessionData.createdBy}`, sessionData.sessionId);
    }

    await redis.incr("qr:stats:counter:CREATED");
    return sessionData;
  }

  async getSession(sessionId) {
    const key = `qr:session:${sessionId}`;
    const data = await redis.get(key);
    if (!data) return null;
    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  }

  async updateSessionStatus(sessionId, status, extraData = {}) {
    const key = `qr:session:${sessionId}`;
    const session = await this.getSession(sessionId);
    if (!session) return null;

    const remainingTtl = await redis.ttl(key);
    if (remainingTtl <= 0) return null;

    const updatedSession = {
      ...session,
      ...extraData,
      status,
      updatedAt: new Date().toISOString()
    };

    await redis.set(key, JSON.stringify(updatedSession), "EX", remainingTtl);
    await redis.incr(`qr:stats:counter:${status}`);
    return updatedSession;
  }

  async atomicConsumeSession(sessionId, nonce) {
    const key = `qr:session:${sessionId}`;
    const now = new Date().toISOString();

    const script = `
      local key = KEYS[1]
      local expectedNonce = ARGV[1]
      local now = ARGV[2]
      local sessionId = ARGV[3]

      local data = redis.call('GET', key)
      if not data then
        return 'EXPIRED'
      end

      local session = cjson.decode(data)
      if session.nonce ~= expectedNonce then
        return 'INVALID_NONCE'
      end

      if session.status == 'CONSUMED' or session.status == 'REVOKED' then
        return 'ALREADY_CONSUMED'
      end

      if session.maxDownloads and session.downloadCount and session.downloadCount >= session.maxDownloads then
        return 'MAX_DOWNLOADS_EXCEEDED'
      end

      session.downloadCount = (session.downloadCount or 0) + 1
      session.status = 'CONSUMED'
      session.consumedAt = now

      redis.call('DEL', key)
      if session.createdBy then
        redis.call('SREM', 'qr:owner:' .. session.createdBy, sessionId)
      end
      redis.call('INCR', 'qr:stats:counter:CONSUMED')

      return cjson.encode(session)
    `;

    try {
      const res = await redis.eval(script, 1, key, nonce, now, sessionId);
      if (res === 'EXPIRED') return { error: 'EXPIRED' };
      if (res === 'INVALID_NONCE') return { error: 'INVALID_NONCE' };
      if (res === 'ALREADY_CONSUMED') return { error: 'ALREADY_CONSUMED' };
      if (res === 'MAX_DOWNLOADS_EXCEEDED') return { error: 'MAX_DOWNLOADS_EXCEEDED' };
      return { session: JSON.parse(res) };
    } catch (err) {
      return await this._fallbackAtomicConsume(sessionId, nonce, now);
    }
  }

  async _fallbackAtomicConsume(sessionId, nonce, now) {
    const lockKey = `qr:lock:${sessionId}`;
    const acquired = await redis.set(lockKey, "1", "NX", "EX", 5);
    if (!acquired) {
      return { error: 'ALREADY_CONSUMED' };
    }
    try {
      const session = await this.getSession(sessionId);
      if (!session) return { error: 'EXPIRED' };
      if (session.nonce !== nonce) return { error: 'INVALID_NONCE' };
      if (['CONSUMED', 'REVOKED'].includes(session.status)) return { error: 'ALREADY_CONSUMED' };
      if (session.maxDownloads && session.downloadCount >= session.maxDownloads) return { error: 'MAX_DOWNLOADS_EXCEEDED' };

      session.downloadCount = (session.downloadCount || 0) + 1;
      session.status = 'CONSUMED';
      session.consumedAt = now;

      await this.deleteSession(sessionId, session.createdBy, 'CONSUMED');
      await redis.incr('qr:stats:counter:CONSUMED');
      return { session };
    } finally {
      await redis.del(lockKey);
    }
  }

  async deleteSession(sessionId, ownerId, reason = 'REVOKED') {
    const key = `qr:session:${sessionId}`
    await redis.del(key)
    if (ownerId) {
      await redis.srem(`qr:owner:${ownerId}`, sessionId)
    }
    if (reason === 'REVOKED') {
      await redis.incr('qr:stats:counter:REVOKED')
    }
    return true
  }

  async getUserActiveSessions(ownerId) {
    const sessionIds = await redis.smembers(`qr:owner:${ownerId}`);
    if (!sessionIds || sessionIds.length === 0) return [];

    const activeSessions = [];
    for (const id of sessionIds) {
      const session = await this.getSession(id);
      if (session) {
        activeSessions.push(session);
      } else {
        // Clean up expired key from owner index
        await redis.srem(`qr:owner:${ownerId}`, id);
      }
    }
    return activeSessions;
  }

  async getAdminStats() {
    const prisma = require("../config/prisma");
    const keys = await redis.keys("qr:session:*");
    const activeCount = keys.length;

    const [created, scanned, authenticated, accepted, consumed, revoked, expired] = await Promise.all([
      redis.get("qr:stats:counter:CREATED").then(v => parseInt(v || "0", 10)),
      redis.get("qr:stats:counter:SCANNED").then(v => parseInt(v || "0", 10)),
      redis.get("qr:stats:counter:AUTHENTICATED").then(v => parseInt(v || "0", 10)),
      redis.get("qr:stats:counter:ACCEPTED").then(v => parseInt(v || "0", 10)),
      redis.get("qr:stats:counter:CONSUMED").then(v => parseInt(v || "0", 10)),
      redis.get("qr:stats:counter:REVOKED").then(v => parseInt(v || "0", 10)),
      redis.get("qr:stats:counter:EXPIRED").then(v => parseInt(v || "0", 10))
    ]);

    const recentLogs = await prisma.audit.findMany({
      where: { action: { startsWith: "QR_" } },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: "desc" },
      take: 20
    });

    const recentEvents = recentLogs.map(log => ({
      ...log,
      _id: log.id,
      user: log.user ? { ...log.user, _id: log.user.id } : null,
      ipAddress: log.ip
    }));

    return {
      activeCount,
      createdCount: created,
      scannedCount: scanned,
      authenticatedCount: authenticated,
      acceptedCount: accepted,
      consumedCount: consumed,
      revokedCount: revoked,
      expiredCount: expired,
      // Fallback aliases
      activeSessions: activeCount,
      createdSessions: created,
      scannedSessions: scanned,
      authenticatedSessions: authenticated,
      acceptedSessions: accepted,
      consumedSessions: consumed,
      revokedSessions: revoked,
      recentEvents
    };
  }
}

module.exports = new QRSessionRepository();
