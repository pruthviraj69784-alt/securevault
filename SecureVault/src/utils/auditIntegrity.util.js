const crypto = require("crypto");

const GENESIS_HASH = "0000000000000000000000000000000000000000000000000000000000000000";

function getSigningSecret() {
    return process.env.ENCRYPTION_KEY || process.env.JWT_SECRET || "securevault-audit-ledger-secret-key";
}

/**
 * Normalizes details payload into a deterministic canonical string
 */
function canonicalizeDetails(details) {
    if (!details || typeof details !== "object") return "";
    try {
        const sortedKeys = Object.keys(details).sort();
        const obj = {};
        for (const k of sortedKeys) {
            obj[k] = details[k];
        }
        return JSON.stringify(obj);
    } catch {
        return "";
    }
}

/**
 * Computes deterministic SHA-256 hash for an audit record
 */
function computeRecordHash({ userId, action, status, ip, createdAt, previousHash, details }) {
    const ts = createdAt instanceof Date ? createdAt.toISOString() : new Date(createdAt || Date.now()).toISOString();
    const prev = previousHash || GENESIS_HASH;
    const user = userId ? String(userId) : "SYSTEM";
    const canonDetails = canonicalizeDetails(details);

    const payload = `${prev}|${user}|${action}|${status}|${ip || "127.0.0.1"}|${ts}|${canonDetails}`;
    return crypto.createHash("sha256").update(payload, "utf8").digest("hex");
}

/**
 * Computes HMAC-SHA256 signature to prove record authenticity
 */
function computeRecordSignature(recordHash) {
    const secret = getSigningSecret();
    return crypto.createHmac("sha256", secret).update(recordHash, "utf8").digest("hex");
}

/**
 * Verifies a single audit record's hash and signature
 */
function verifyRecord(record, expectedPreviousHash) {
    const prevHash = record.previousHash || GENESIS_HASH;
    const isChainLinked = prevHash === expectedPreviousHash;

    const computedHash = computeRecordHash({
        userId: record.userId || record.user?.id || record.user,
        action: record.action,
        status: record.status,
        ip: record.ip,
        createdAt: record.createdAt,
        previousHash: prevHash,
        details: record.details
    });

    const isHashValid = record.recordHash ? record.recordHash === computedHash : true;
    const computedSignature = computeRecordSignature(record.recordHash || computedHash);
    const isSignatureValid = record.signature ? record.signature === computedSignature : true;

    return {
        isValid: isChainLinked && isHashValid && isSignatureValid,
        isChainLinked,
        isHashValid,
        isSignatureValid,
        computedHash,
        computedSignature
    };
}

module.exports = {
    GENESIS_HASH,
    computeRecordHash,
    computeRecordSignature,
    verifyRecord
};
