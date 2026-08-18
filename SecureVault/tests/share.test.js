const path = require("path");
const fs = require("fs");
const os = require("os");

jest.mock("../src/repositories/share.repository", () => ({
    findByToken: jest.fn(),
    incrementDownload: jest.fn(),
}));

jest.mock("../src/repositories/file.repository", () => ({
    getFileById: jest.fn(),
}));

jest.mock("../src/services/storage.service", () => ({
    download: jest.fn(),
}));

jest.mock("../src/utils/encryption.util", () => ({
    decryptFile: jest.fn(),
}));

jest.mock("../src/utils/hash.util", () => ({
    generateFileHash: jest.fn(),
}));

jest.mock("../src/config/redis", () => ({
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
}));

jest.mock("../src/jobs/email.job", () => ({
    send: jest.fn().mockResolvedValue(true)
}));

jest.mock("../src/models/user.model", () => ({
    findById: jest.fn()
}));

const shareRepository = require("../src/repositories/share.repository");
const fileRepository = require("../src/repositories/file.repository");
const storageService = require("../src/services/storage.service");
const { decryptFile } = require("../src/utils/encryption.util");
const { generateFileHash } = require("../src/utils/hash.util");
const redis = require("../src/config/redis");
const emailJob = require("../src/jobs/email.job");
const User = require("../src/models/user.model");
const shareService = require("../src/services/share.service");

describe("Share Service Tests", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("accessShare for zero-knowledge files", () => {
        test("returns the encrypted blob for a zero-knowledge share without server-side decrypting", async() => {
            const tempFile = path.join(os.tmpdir(), `share-test-${Date.now()}.bin`);
            fs.writeFileSync(tempFile, "encrypted-payload");

            shareRepository.findByToken.mockResolvedValue({
                _id: "share-1",
                file: "file-1",
                isActive: true,
                expiresAt: new Date(Date.now() + 60000),
                downloadCount: 0,
                maxDownloads: 1,
                allowedIP: null,
                password: null,
                version: 3,
            });

            fileRepository.getFileById.mockResolvedValue({
                _id: "file-1",
                originalName: "secret.txt",
                currentVersion: 3,
                versions: [{
                        version: 1,
                        status: "READY",
                        s3Key: "v1/key.enc",
                        hash: "hash-v1",
                        isZeroKnowledge: false,
                    },
                    {
                        version: 2,
                        status: "READY",
                        s3Key: "v2/key.enc",
                        hash: "hash-v2",
                        isZeroKnowledge: false,
                    },
                    {
                        version: 3,
                        status: "READY",
                        s3Key: "v3/key.enc",
                        hash: "client-hash",
                        isZeroKnowledge: true,
                    },
                ],
            });

            storageService.download.mockResolvedValue(tempFile);
            generateFileHash.mockResolvedValue("client-hash");
            decryptFile.mockRejectedValue(new Error("should not decrypt"));

            const result = await shareService.accessShare("share-token", null, "127.0.0.1");

            expect(result.filename).toBe("secret.txt");
            expect(result.path).toBe(tempFile);
            expect(generateFileHash).not.toHaveBeenCalled();
            expect(decryptFile).not.toHaveBeenCalled();

            fs.unlinkSync(tempFile);
        });
    });

    describe("getShareInfo", () => {
        test("returns the correct metadata for a valid share link", async () => {
            shareRepository.findByToken.mockResolvedValue({
                _id: "share-123",
                file: "file-123",
                isActive: true,
                expiresAt: new Date(Date.now() + 60000),
                downloadCount: 0,
                maxDownloads: 5,
                password: "hashedpassword",
                isOtpEnabled: true,
                version: 1
            });

            fileRepository.getFileById.mockResolvedValue({
                _id: "file-123",
                originalName: "report.pdf",
                currentVersion: 1,
                versions: [{
                    version: 1,
                    size: 2048,
                    status: "READY"
                }]
            });

            const info = await shareService.getShareInfo("some-token");

            expect(info.fileName).toBe("report.pdf");
            expect(info.fileSize).toBe(2048);
            expect(info.isPasswordRequired).toBe(true);
            expect(info.isOtpRequired).toBe(true);
        });
    });

    describe("sendOtp and access with OTP", () => {
        test("sendOtp sends email notification", async () => {
            shareRepository.findByToken.mockResolvedValue({
                _id: "share-123",
                owner: "owner-123",
                otpEmail: "recipient@example.com",
            });

            redis.set.mockResolvedValue("OK");
            emailJob.send.mockResolvedValue(true);

            const result = await shareService.sendOtp("some-token");

            expect(redis.set).toHaveBeenCalledWith(expect.stringContaining("otp:"), expect.any(String), "EX", 300);
            expect(emailJob.send).toHaveBeenCalledWith(expect.objectContaining({
                to: "recipient@example.com",
                subject: expect.stringContaining("Access OTP")
            }));
            expect(result.success).toBe(true);
        });

        test("accessShare fails if OTP is required but missing or wrong", async () => {
            shareRepository.findByToken.mockResolvedValue({
                _id: "share-123",
                file: "file-123",
                isActive: true,
                expiresAt: new Date(Date.now() + 60000),
                downloadCount: 0,
                maxDownloads: 5,
                isOtpEnabled: true,
            });

            // Missing OTP
            await expect(shareService.accessShare("some-token", null, "127.0.0.1", null))
                .rejects.toThrow("OTP required");

            // Mismatching OTP
            redis.get.mockResolvedValue("123456");
            await expect(shareService.accessShare("some-token", null, "127.0.0.1", "654321"))
                .rejects.toThrow("Invalid or expired OTP");
        });
    });
});