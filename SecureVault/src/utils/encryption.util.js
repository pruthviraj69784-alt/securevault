const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");

const ALGORITHM = "aes-256-gcm";
const LEGACY_ALGORITHM = "aes-256-cbc";
const FILE_MAGIC = Buffer.from("SVG1");
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

function getEncryptionKey() {
    const value = process.env.ENCRYPTION_KEY;

    if (!value) {
        throw new Error("ENCRYPTION_KEY must be configured");
    }

    const key = Buffer.from(value, "utf8");
    if (key.length !== 32) {
        throw new Error("ENCRYPTION_KEY must be exactly 32 bytes (UTF-8)");
    }

    return key;
}

function encryptFile(filePath) {
    return new Promise((resolve, reject) => {

        const iv = crypto.randomBytes(IV_LENGTH);

        const outputPath = filePath + ".enc";

        const cipher = crypto.createCipheriv(
            ALGORITHM,
            getEncryptionKey(),
            iv
        );

        const input = fs.createReadStream(filePath);

        const output = fs.createWriteStream(outputPath);

        // Versioned layout: magic (4 bytes), IV (12 bytes), ciphertext, GCM tag (16 bytes).
        // The header lets decryptFile continue to read legacy CBC files during key rotation.
        output.write(FILE_MAGIC);
        output.write(iv);

        input.pipe(cipher).pipe(output, { end: false });

        cipher.on("end", () => {
            try {
                output.write(cipher.getAuthTag());
                output.end();
            } catch (error) {
                reject(error);
            }
        });

        output.on("finish", () => {
            fs.unlink(filePath, (unlinkError) => {
                if (unlinkError) return reject(unlinkError);
                resolve({
                    encryptedPath: outputPath,
                    path: outputPath,
                    iv: iv.toString("hex")
                });
            });
        });

        input.on("error", reject);
        cipher.on("error", reject);
        output.on("error", reject);

    });
}

function decryptFile(filePath, originalName = "") {
    return new Promise((resolve, reject) => {
        try {
            const fd = fs.openSync(filePath, "r");
            const header = Buffer.alloc(FILE_MAGIC.length);
            fs.readSync(fd, header, 0, FILE_MAGIC.length, 0);
            const isCurrentFormat = header.equals(FILE_MAGIC);
            const ivLength = isCurrentFormat ? IV_LENGTH : 16;
            const iv = Buffer.alloc(ivLength);
            fs.readSync(fd, iv, 0, ivLength, isCurrentFormat ? FILE_MAGIC.length : 0);
            const fileSize = fs.fstatSync(fd).size;
            fs.closeSync(fd);

            if (isCurrentFormat && fileSize < FILE_MAGIC.length + IV_LENGTH + AUTH_TAG_LENGTH) {
                throw new Error("Encrypted file is incomplete");
            }

            const decipher = crypto.createDecipheriv(
                isCurrentFormat ? ALGORITHM : LEGACY_ALGORITHM,
                getEncryptionKey(),
                iv
            );

            const cipherStart = isCurrentFormat ? FILE_MAGIC.length + IV_LENGTH : 16;
            const cipherEnd = isCurrentFormat ? fileSize - AUTH_TAG_LENGTH - 1 : undefined;

            if (isCurrentFormat) {
                const tag = Buffer.alloc(AUTH_TAG_LENGTH);
                const tagFd = fs.openSync(filePath, "r");
                fs.readSync(tagFd, tag, 0, AUTH_TAG_LENGTH, fileSize - AUTH_TAG_LENGTH);
                fs.closeSync(tagFd);
                decipher.setAuthTag(tag);
            }

            const ext = originalName ? path.extname(originalName) : "";
            const outputPath = path.join(
                os.tmpdir(),
                `${Date.now()}-decrypted${ext}`
            );

            const output = fs.createWriteStream(outputPath);

            const input = fs.createReadStream(filePath, {
                start: cipherStart,
                ...(cipherEnd === undefined ? {} : { end: cipherEnd })
            });

            input.pipe(decipher).pipe(output);

            output.on("finish", () => {
                resolve(outputPath);
            });

            output.on("error", reject);
            input.on("error", reject);
            decipher.on("error", reject);
        } catch (err) {
            reject(err);
        }
    });
}

const { generateFileHash } = require("./hash.util");

function calculateFileHash(filePath) {
    return generateFileHash(filePath);
}

module.exports = {
    encryptFile,
    decryptFile,
    calculateFileHash
};
