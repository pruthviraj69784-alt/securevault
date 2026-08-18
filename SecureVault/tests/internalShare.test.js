const internalShareService = require("../src/services/internalShare.service");
const internalShareRepository = require("../src/repositories/internalShare.repository");
const fileRepository = require("../src/repositories/file.repository");
const auditService = require("../src/services/audit.service");
const notificationService = require("../src/services/notification.service");
const User = require("../src/models/user.model");

jest.mock("../src/repositories/internalShare.repository");
jest.mock("../src/repositories/file.repository");
jest.mock("../src/services/audit.service");
jest.mock("../src/services/notification.service");
jest.mock("../src/models/user.model");

describe("InternalShareService", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("createInternalShare", () => {
        test("should successfully create an internal share", async () => {
            const mockOwnerId = "owner-123";
            const mockRecipientId = "recipient-456";
            const mockFileId = "file-789";

            User.findOne.mockResolvedValue({
                _id: mockRecipientId,
                email: "recipient@example.com",
                name: "Recipient User"
            });

            fileRepository.getFileById.mockResolvedValue({
                _id: mockFileId,
                owner: mockOwnerId,
                originalName: "test.txt",
                versions: []
            });

            internalShareRepository.createShare.mockResolvedValue({
                _id: "share-111",
                owner: mockOwnerId,
                recipient: mockRecipientId,
                file: mockFileId,
                permission: "DOWNLOADER",
                status: "PENDING"
            });

            const result = await internalShareService.createInternalShare(mockOwnerId, {
                recipientEmail: "recipient@example.com",
                fileId: mockFileId,
                permission: "DOWNLOADER"
            });

            expect(User.findOne).toHaveBeenCalledWith({ email: "recipient@example.com" });
            expect(fileRepository.getFileById).toHaveBeenCalledWith(mockFileId);
            expect(internalShareRepository.createShare).toHaveBeenCalled();
            expect(auditService.logAction).toHaveBeenCalledWith(expect.objectContaining({
                action: "SHARE_INTERNAL_CREATED"
            }));
            expect(notificationService.notify).toHaveBeenCalled();
            expect(result.status).toBe("PENDING");
        });

        test("should throw error if recipient is not found", async () => {
            User.findOne.mockResolvedValue(null);

            await expect(internalShareService.createInternalShare("owner-123", {
                recipientEmail: "notfound@example.com",
                fileId: "file-789"
            })).rejects.toThrow("Recipient user not found in SecureVault");
        });
    });

    describe("downloadSharedFile", () => {
        test("should throw error if share is still PENDING", async () => {
            internalShareRepository.findShareById.mockResolvedValue({
                _id: "share-123",
                recipient: { _id: "user-456" },
                status: "PENDING"
            });

            await expect(internalShareService.downloadSharedFile("share-123", "user-456"))
                .rejects.toThrow("This share has not been accepted or has been revoked");
        });

        test("should throw error if user permission is VIEWER", async () => {
            internalShareRepository.findShareById.mockResolvedValue({
                _id: "share-123",
                recipient: { _id: "user-456" },
                status: "ACCEPTED",
                permission: "VIEWER"
            });

            await expect(internalShareService.downloadSharedFile("share-123", "user-456"))
                .rejects.toThrow("Viewer permission does not allow downloading");
        });
    });
});
