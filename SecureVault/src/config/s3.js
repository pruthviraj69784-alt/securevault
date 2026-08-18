const { S3Client } = require("@aws-sdk/client-s3");
const { NodeHttpHandler } = require("@smithy/node-http-handler");

// Fail fast if required S3 environment variables are missing
const REQUIRED_VARS = [
    "AWS_REGION",
    "AWS_BUCKET_NAME",
    "AWS_ACCESS_KEY_ID",
    "AWS_SECRET_ACCESS_KEY"
];

for (const key of REQUIRED_VARS) {
    if (!process.env[key]) {
        throw new Error(`Missing required environment variable: ${key}`);
    }
}

const s3 = new S3Client({

    region: process.env.AWS_REGION,

    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    },

    // 5-second socket timeout to prevent hanging requests
    requestHandler: new NodeHttpHandler({
        socketTimeout: 5000
    })

});

module.exports = s3;