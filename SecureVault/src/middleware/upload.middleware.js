const multer = require("multer");
const path = require("path");
const fs = require("fs");

const uploadDir = path.resolve(process.env.UPLOAD_DIR || path.join(__dirname, "../../uploads"));
const maxFileSize = Number(process.env.MAX_UPLOAD_SIZE_BYTES) || 100 * 1024 * 1024;

fs.mkdirSync(uploadDir, { recursive: true });

const blockedMimeTypes = new Set([
    "application/x-msdownload",
    "application/x-dosexec",
    "application/x-sh",
    "application/x-bat"
]);

const storage = multer.diskStorage({

    destination(req, file, cb) {
        cb(null, uploadDir);
    },

    filename(req, file, cb) {

        const uniqueName =
            Date.now() +
            "-" +
            Math.round(Math.random() * 1E9) +
            path.extname(path.basename(file.originalname)).toLowerCase();

        cb(null, uniqueName);
    }

});

module.exports = multer({
    storage,
    limits: {
        fileSize: maxFileSize,
        files: 1,
        fields: 10,
        fieldSize: 16 * 1024
    },
    fileFilter(req, file, cb) {
        if (!file.mimetype || blockedMimeTypes.has(file.mimetype.toLowerCase())) {
            const error = new Error("This file type is not allowed");
            error.statusCode = 400;
            return cb(error);
        }

        cb(null, true);
    }
});
