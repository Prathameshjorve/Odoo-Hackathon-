const { S3Client } = require('@aws-sdk/client-s3');

// AWS S3 Configuration
const s3Client = new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});

// Default bucket name with fallback
const DEFAULT_BUCKET = process.env.AWS_S3_BUCKET || 'demo-test-aryu-me';

module.exports = {
    s3Client,
    DEFAULT_BUCKET,
};
