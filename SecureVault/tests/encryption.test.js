const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");

process.env.ENCRYPTION_KEY = "0123456789abcdef0123456789abcdef";

const { encryptFile, decryptFile } = require("../src/utils/encryption.util");

const tempFiles = [];

function createTempFile(contents) {
    const filePath = path.join(os.tmpdir(), `securevault-test-${crypto.randomUUID()}`);
    fs.writeFileSync(filePath, contents);
    tempFiles.push(filePath);
    return filePath;
}

afterEach(() => {
    while (tempFiles.length) {
        fs.rmSync(tempFiles.pop(), { force: true });
    }
});

test("encrypts new files with authenticated AES-GCM", async () => {
    const sourcePath = createTempFile("confidential document");
    const encrypted = await encryptFile(sourcePath);
    tempFiles.push(encrypted.path);

    const payload = fs.readFileSync(encrypted.path);
    expect(payload.subarray(0, 4).toString()).toBe("SVG1");

    const decryptedPath = await decryptFile(encrypted.path);
    tempFiles.push(decryptedPath);
    expect(fs.readFileSync(decryptedPath, "utf8")).toBe("confidential document");
});

test("rejects a tampered AES-GCM file", async () => {
    const sourcePath = createTempFile("confidential document");
    const encrypted = await encryptFile(sourcePath);
    tempFiles.push(encrypted.path);

    const payload = fs.readFileSync(encrypted.path);
    payload[16] ^= 0xff;
    fs.writeFileSync(encrypted.path, payload);

    await expect(decryptFile(encrypted.path)).rejects.toThrow();
});
