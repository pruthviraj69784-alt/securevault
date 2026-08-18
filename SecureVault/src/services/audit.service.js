const auditRepository = require("../repositories/audit.repository");
const { GENESIS_HASH, computeRecordHash, computeRecordSignature, verifyRecord } = require("../utils/auditIntegrity.util");

class AuditService {

    async log(data) {
        const entry = await auditRepository.create(data);
        try {
            const websocketService = require("./websocket.service");
            websocketService.broadcast("AUDIT_LOG", {
                _id: entry._id,
                user: entry.user,
                action: entry.action,
                status: entry.status,
                ipAddress: entry.ip,
                details: entry.details,
                recordHash: entry.recordHash,
                previousHash: entry.previousHash,
                signature: entry.signature,
                createdAt: entry.createdAt
            });
        } catch {}
        return entry;
    }

    async logAction(data) {
        return await this.log({
            status: "SUCCESS",
            ip: "127.0.0.1",
            ...data
        });
    }

    async getLogs(userId, page = 1, limit = 20, action = null) {
        return await auditRepository.getAll(userId, page, limit, action);
    }

    async verifyIntegrity(userId) {
        const records = await auditRepository.getChronologicalChain(userId);
        if (!records || records.length === 0) {
            return {
                isValid: true,
                isTampered: false,
                totalRecords: 0,
                validRecords: 0,
                tamperedRecords: [],
                genesisHash: GENESIS_HASH,
                lastRecordHash: GENESIS_HASH,
                chainStatus: "EMPTY",
                verifiedAt: new Date()
            };
        }

        let expectedPrevHash = GENESIS_HASH;
        const tampered = [];
        let validCount = 0;

        for (let i = 0; i < records.length; i++) {
            const rec = records[i];

            // If legacy log without hashes, seal it now
            if (!rec.recordHash || !rec.previousHash || !rec.signature) {
                const recHash = computeRecordHash({
                    userId: rec.userId,
                    action: rec.action,
                    status: rec.status,
                    ip: rec.ip,
                    createdAt: rec.createdAt,
                    previousHash: expectedPrevHash,
                    details: rec.details
                });
                const sig = computeRecordSignature(recHash);

                await auditRepository.updateRecordIntegrity(rec.id, {
                    previousHash: expectedPrevHash,
                    recordHash: recHash,
                    signature: sig
                });

                rec.previousHash = expectedPrevHash;
                rec.recordHash = recHash;
                rec.signature = sig;
            }

            const check = verifyRecord(rec, expectedPrevHash);

            if (!check.isValid) {
                const reasons = [];
                if (!check.isChainLinked) reasons.push(`Broken hash pointer link (Expected prev: ${expectedPrevHash.slice(0, 10)}..., Got: ${rec.previousHash?.slice(0, 10)}...)`);
                if (!check.isHashValid) reasons.push("Record payload hash mismatch (data altered)");
                if (!check.isSignatureValid) reasons.push("Cryptographic signature invalid (unauthorized write)");

                tampered.push({
                    id: rec.id,
                    action: rec.action,
                    createdAt: rec.createdAt,
                    reasons,
                    recordHash: rec.recordHash,
                    expectedHash: check.computedHash
                });
            } else {
                validCount++;
            }

            expectedPrevHash = rec.recordHash;
        }

        const isTampered = tampered.length > 0;

        return {
            isValid: !isTampered,
            isTampered,
            totalRecords: records.length,
            validRecords: validCount,
            brokenRecords: tampered.length,
            tamperedRecords: tampered,
            genesisHash: GENESIS_HASH,
            lastRecordHash: expectedPrevHash,
            chainStatus: isTampered ? "TAMPERED" : "VERIFIED",
            verifiedAt: new Date()
        };
    }

    async clearLogs(userId) {
        return await auditRepository.clearByUser(userId);
    }

    /**
     * Re-sequences the entire audit ledger for a user by recomputing
     * each record's previousHash → recordHash → signature in chronological order.
     * Fixes broken chains caused by direct DB edits, deletions, or legacy records.
     */
    async repairLedger(userId) {
        const records = await auditRepository.getChronologicalChain(userId);

        if (!records || records.length === 0) {
            return {
                repaired: 0,
                total: 0,
                newLastHash: GENESIS_HASH,
                status: "NOTHING_TO_REPAIR"
            };
        }

        let prevHash = GENESIS_HASH;
        let repairedCount = 0;

        for (const rec of records) {
            const newRecordHash = computeRecordHash({
                userId: rec.userId,
                action: rec.action,
                status: rec.status,
                ip: rec.ip,
                createdAt: rec.createdAt,
                previousHash: prevHash,
                details: rec.details
            });

            const newSignature = computeRecordSignature(newRecordHash);

            const needsUpdate =
                rec.previousHash !== prevHash ||
                rec.recordHash   !== newRecordHash ||
                rec.signature    !== newSignature;

            if (needsUpdate) {
                await auditRepository.updateRecordIntegrity(rec.id, {
                    previousHash: prevHash,
                    recordHash:   newRecordHash,
                    signature:    newSignature
                });
                repairedCount++;
            }

            prevHash = newRecordHash;
        }

        return {
            repaired: repairedCount,
            total: records.length,
            newLastHash: prevHash,
            status: repairedCount === 0 ? "ALREADY_CLEAN" : "REPAIRED"
        };
    }

}

module.exports = new AuditService();