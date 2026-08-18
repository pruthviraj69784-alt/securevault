const fs = require("fs");
const os = require("os");
const path = require("path");

const { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");

const s3 = require("../config/s3");
const AppError = require("../Error/AppError");

class StorageService {

    /**
     * Uploads a local file to S3.
     * @param {string} localPath - Absolute path of the file to upload.
     * @param {string} fileName  - Desired S3 key (path in bucket).
     * @param {string} [contentType="application/octet-stream"] - MIME type.
     * @returns {Promise<string>} The sanitized S3 key.
     */
    async upload(localPath, fileName, contentType = "application/octet-stream") {

        // Sanitize the S3 key — strip any path traversal segments
        const safeKey = fileName
            .split(path.sep)
            .join("/")                     // normalize separators
            .replace(/\.\.\/|\.\.\\/, "")  // strip traversal
            .replace(/^\/+/, "");          // strip leading slashes

        try {
            const fileStream = fs.createReadStream(localPath);

            const command = new PutObjectCommand({
                Bucket: process.env.AWS_BUCKET_NAME,
                Key: safeKey,
                Body: fileStream,
                ContentType: contentType,
                // Server-side encryption at rest
                ServerSideEncryption: "AES256"
            });

            await s3.send(command);

            return safeKey;

        } catch (error) {
            throw new AppError(
                `S3 upload failed for key "${safeKey}": ${error.message}`,
                502
            );
        }
    }

    /**
     * Downloads an encrypted file from S3 and saves it to a local temp path.
     * @param {string} s3Key - The S3 object key.
     * @returns {Promise<string>} Absolute path to the downloaded temp file.
     */
    async download(s3Key) {
        try {
            const command = new GetObjectCommand({
                Bucket: process.env.AWS_BUCKET_NAME,
                Key: s3Key
            });

            const response = await s3.send(command);

            // Write the S3 stream to a temp file for local decryption
            const tmpPath = path.join(
                os.tmpdir(),
                `${Date.now()}-${path.basename(s3Key)}`
            );

            await new Promise((resolve, reject) => {
                const writeStream = fs.createWriteStream(tmpPath);
                response.Body.pipe(writeStream);
                writeStream.on("finish", resolve);
                writeStream.on("error", reject);
                response.Body.on("error", reject);
            });

            return tmpPath;

        } catch (error) {
            throw new AppError(
                `S3 download failed for key "${s3Key}": ${error.message}`,
                502
            );
        }
    }

    /**
     * Helper to delete local file from disk.
     */
    deleteLocalFile(filePath) {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    }

    /**
     * Downloads file directly from S3 as a stream.
     */
    async downloadFile(key) {
        try {
            const command = new GetObjectCommand({
                Bucket: process.env.AWS_BUCKET_NAME,
                Key: key
            });

            const response = await s3.send(command);

            return response.Body;
        } catch (error) {
            throw new AppError(
                `S3 download failed for key "${key}": ${error.message}`,
                502
            );
        }
    }

    /**
     * Deletes a file from the S3 bucket.
     */
    async deleteFile(key) {
        try {
            const command = new DeleteObjectCommand({
                Bucket: process.env.AWS_BUCKET_NAME,
                Key: key
            });

            await s3.send(command);
        } catch (error) {
            throw new AppError(
                `S3 deletion failed for key "${key}": ${error.message}`,
                502
            );
        }
    }

    /**
     * Wrapper for upload command.
     */
    async uploadFile(localPath, fileName, contentType = "application/octet-stream") {
        return await this.upload(localPath, fileName, contentType);
    }
}

module.exports = new StorageService();