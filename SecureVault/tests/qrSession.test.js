// Mock low-level modules before importing the service
jest.mock("../src/repositories/qrSession.repository");
jest.mock("../src/repositories/file.repository");
jest.mock("../src/services/audit.service");
jest.mock("../src/services/storage.service", () => ({
    download: jest.fn(),
    deleteLocalFile: jest.fn()
}));
jest.mock("../src/utils/encryption.util", () => ({
    decryptFile: jest.fn(),
    encryptFile: jest.fn(),
    calculateFileHash: jest.fn()
}));
jest.mock("../src/utils/hash.util", () => ({
    generateFileHash: jest.fn()
}));

const qrSessionService = require("../src/services/qrSession.service");
const qrSessionRepository = require("../src/repositories/qrSession.repository");
const fileRepository = require("../src/repositories/file.repository");
const auditService = require("../src/services/audit.service");

const MOCK_OWNER_ID = "owner-user-111";
const MOCK_FILE_ID = "file-abc-222";
const MOCK_SESSION_ID = "qr_test_session_id";
const MOCK_NONCE = "test_nonce_abc123";

const mockFile = {
    _id: MOCK_FILE_ID,
    owner: MOCK_OWNER_ID,
    originalName: "SecureVault_Overview.pdf",
    currentVersion: 1,
    versions: [
        {
            version: 1,
            s3Key: "files/file-abc-222/v1/test.enc",
            mimeType: "application/pdf",
            size: 102400,
            hash: "abc123hash",
            status: "READY",
            isZeroKnowledge: false
        }
    ]
};

describe("QRSessionService", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        auditService.logAction.mockResolvedValue({});
    });

    // ── createQRSession ─────────────────────────────────────────────────────
    describe("createQRSession", () => {
        test("should create a QR session for a valid file owner", async () => {
            fileRepository.getFileById.mockResolvedValue(mockFile);
            qrSessionRepository.createSession.mockResolvedValue({});

            const result = await qrSessionService.createQRSession(MOCK_OWNER_ID, MOCK_FILE_ID, {});

            expect(fileRepository.getFileById).toHaveBeenCalledWith(MOCK_FILE_ID);
            expect(qrSessionRepository.createSession).toHaveBeenCalledWith(
                expect.objectContaining({
                    fileId: MOCK_FILE_ID,
                    createdBy: MOCK_OWNER_ID,
                    status: "ACTIVE"
                }),
                60
            );
            expect(auditService.logAction).toHaveBeenCalledWith(
                expect.objectContaining({ action: "QR_CREATED" })
            );
            expect(result).toHaveProperty("sessionId");
            expect(result).toHaveProperty("qrPayload");
            expect(result).toHaveProperty("expiresAt");
            expect(result).toHaveProperty("nonce");
        });

        test("should throw 404 if file not found", async () => {
            fileRepository.getFileById.mockResolvedValue(null);
            await expect(qrSessionService.createQRSession(MOCK_OWNER_ID, MOCK_FILE_ID))
                .rejects.toThrow("File not found");
        });

        test("should throw 403 if user does not own file", async () => {
            fileRepository.getFileById.mockResolvedValue({ ...mockFile, owner: "other-user-999" });
            await expect(qrSessionService.createQRSession(MOCK_OWNER_ID, MOCK_FILE_ID))
                .rejects.toThrow("You do not own this file");
        });
    });

    // ── scanQRSession ───────────────────────────────────────────────────────
    describe("scanQRSession", () => {
        test("should validate scan and transition status to SCANNED", async () => {
            const mockSession = {
                sessionId: MOCK_SESSION_ID,
                nonce: MOCK_NONCE,
                status: "ACTIVE",
                createdBy: MOCK_OWNER_ID,
                fileId: MOCK_FILE_ID,
                filename: "test.pdf"
            };
            qrSessionRepository.getSession.mockResolvedValue(mockSession);
            qrSessionRepository.updateSessionStatus.mockResolvedValue({
                ...mockSession, status: "SCANNED"
            });

            const result = await qrSessionService.scanQRSession(MOCK_SESSION_ID, MOCK_NONCE, "1.2.3.4");
            expect(result.status).toBe("SCANNED");
            expect(auditService.logAction).toHaveBeenCalledWith(
                expect.objectContaining({ action: "QR_SCANNED" })
            );
        });

        test("should throw 404 if session is expired or not found", async () => {
            qrSessionRepository.getSession.mockResolvedValue(null);
            await expect(qrSessionService.scanQRSession(MOCK_SESSION_ID, MOCK_NONCE))
                .rejects.toThrow("QR share session has expired or is invalid");
            expect(auditService.logAction).toHaveBeenCalledWith(
                expect.objectContaining({ action: "QR_EXPIRED", status: "FAILED" })
            );
        });

        test("should throw 401 if nonce is invalid", async () => {
            qrSessionRepository.getSession.mockResolvedValue({
                sessionId: MOCK_SESSION_ID,
                nonce: "correct_nonce",
                status: "ACTIVE"
            });
            await expect(qrSessionService.scanQRSession(MOCK_SESSION_ID, "wrong_nonce"))
                .rejects.toThrow("Invalid QR security nonce");
        });

        test("should throw 410 if session is already CONSUMED", async () => {
            qrSessionRepository.getSession.mockResolvedValue({
                sessionId: MOCK_SESSION_ID,
                nonce: MOCK_NONCE,
                status: "CONSUMED"
            });
            await expect(qrSessionService.scanQRSession(MOCK_SESSION_ID, MOCK_NONCE))
                .rejects.toThrow("QR session has already been consumed");
        });
    });

    // ── verifyQRSession ─────────────────────────────────────────────────────
    describe("verifyQRSession", () => {
        test("should transition to AUTHENTICATED for valid user and nonce", async () => {
            const mockSession = {
                sessionId: MOCK_SESSION_ID,
                nonce: MOCK_NONCE,
                status: "SCANNED",
                fileId: MOCK_FILE_ID
            };
            qrSessionRepository.getSession.mockResolvedValue(mockSession);
            qrSessionRepository.updateSessionStatus.mockResolvedValue({
                ...mockSession, status: "AUTHENTICATED"
            });

            const result = await qrSessionService.verifyQRSession(
                MOCK_SESSION_ID, MOCK_NONCE, MOCK_OWNER_ID, "1.2.3.4"
            );

            expect(result.status).toBe("AUTHENTICATED");
            expect(auditService.logAction).toHaveBeenCalledWith(
                expect.objectContaining({ action: "QR_AUTHENTICATION_SUCCESS" })
            );
        });

        test("should throw 401 if nonce mismatch on verify", async () => {
            qrSessionRepository.getSession.mockResolvedValue({
                sessionId: MOCK_SESSION_ID,
                nonce: "real_nonce",
                status: "SCANNED"
            });
            await expect(qrSessionService.verifyQRSession(
                MOCK_SESSION_ID, "wrong_nonce", MOCK_OWNER_ID
            )).rejects.toThrow("Invalid QR nonce");
        });
    });

    // ── revokeQRSession ─────────────────────────────────────────────────────
    describe("revokeQRSession", () => {
        test("should allow owner to revoke their own QR session", async () => {
            qrSessionRepository.getSession.mockResolvedValue({
                sessionId: MOCK_SESSION_ID,
                nonce: MOCK_NONCE,
                status: "ACTIVE",
                createdBy: MOCK_OWNER_ID,
                fileId: MOCK_FILE_ID
            });
            qrSessionRepository.deleteSession.mockResolvedValue(true);

            const result = await qrSessionService.revokeQRSession(
                MOCK_SESSION_ID, MOCK_OWNER_ID, "1.2.3.4"
            );

            expect(result.success).toBe(true);
            expect(auditService.logAction).toHaveBeenCalledWith(
                expect.objectContaining({ action: "QR_REVOKED" })
            );
        });

        test("should throw 403 if different user tries to revoke session", async () => {
            qrSessionRepository.getSession.mockResolvedValue({
                sessionId: MOCK_SESSION_ID,
                nonce: MOCK_NONCE,
                status: "ACTIVE",
                createdBy: "another-owner-999"
            });
            await expect(qrSessionService.revokeQRSession(
                MOCK_SESSION_ID, MOCK_OWNER_ID
            )).rejects.toThrow("Unauthorized to revoke this QR session");
        });

        test("should throw 404 if session not found when revoking", async () => {
            qrSessionRepository.getSession.mockResolvedValue(null);
            await expect(qrSessionService.revokeQRSession(
                MOCK_SESSION_ID, MOCK_OWNER_ID
            )).rejects.toThrow("QR session not found or already expired");
        });
    });
});
