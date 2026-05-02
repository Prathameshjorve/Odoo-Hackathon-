const { PutObjectCommand, DeleteObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3');
const { s3Client, DEFAULT_BUCKET } = require('../lib/s3');
const multer = require('multer');
const path = require('path');

// Configure multer for memory storage (we'll upload directly to S3)
const storage = multer.memoryStorage();

// File filter to validate file types
const fileFilter = (req, file, cb) => {
    // Allow images, videos, and documents
    const allowedMimeTypes = [
        // Images
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/gif',
        'image/webp',
        'image/svg+xml',
        // Videos
        'video/mp4',
        'video/mpeg',
        'video/quicktime',
        'video/x-msvideo',
        'video/webm',
        // Documents
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        // Audio
        'audio/mpeg',
        'audio/wav',
        'audio/webm',
    ];

    if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only images, videos, documents, and audio files are allowed.'), false);
    }
};

// Multer upload configuration
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 50 * 1024 * 1024, // 50MB max file size
    },
    fileFilter: fileFilter,
});

/**
 * Upload media file to S3
 */
const uploadMedia = async (req, res) => {
    try {
        // Check if file was uploaded
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No file uploaded. Please provide a file.',
            });
        }

        // Get bucket and path from request, with fallbacks
        const bucket = req.body.bucket || DEFAULT_BUCKET;
        const customPath = req.body.path || '';

        // Generate unique filename
        const timestamp = Date.now();
        const randomString = Math.random().toString(36).substring(2, 8);
        const fileExtension = path.extname(req.file.originalname);
        const fileName = `${timestamp}-${randomString}${fileExtension}`;

        // Construct full S3 key (path)
        const s3Key = customPath ? `${customPath}/${fileName}` : fileName;

        // Upload to S3
        const uploadCommand = new PutObjectCommand({
            Bucket: bucket,
            Key: s3Key,
            Body: req.file.buffer,
            ContentType: req.file.mimetype,
            // ACL: 'public-read', // Uncomment if you want files to be publicly accessible
        });

        await s3Client.send(uploadCommand);

        // Construct the file URL
        const fileUrl = `https://${bucket}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${s3Key}`;

        return res.status(201).json({
            success: true,
            message: 'File uploaded successfully.',
            data: {
                fileName: fileName,
                originalName: req.file.originalname,
                path: s3Key,
                bucket: bucket,
                url: fileUrl,
                size: req.file.size,
                mimeType: req.file.mimetype,
                uploadedAt: new Date().toISOString(),
            },
        });
    } catch (error) {
        console.error('Upload error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to upload file.',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
    }
};

/**
 * Delete media file from S3
 */
const deleteMedia = async (req, res) => {
    try {
        const { path: filePath } = req.body;

        // Validate required fields
        if (!filePath) {
            return res.status(400).json({
                success: false,
                message: 'File path is required.',
            });
        }

        // Get bucket from request, with fallback
        const bucket = req.body.bucket || DEFAULT_BUCKET;

        // First, check if file exists
        try {
            const headCommand = new HeadObjectCommand({
                Bucket: bucket,
                Key: filePath,
            });
            await s3Client.send(headCommand);
        } catch (error) {
            if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
                return res.status(404).json({
                    success: false,
                    message: 'File not found in S3 bucket.',
                });
            }
            throw error;
        }

        // Delete from S3
        const deleteCommand = new DeleteObjectCommand({
            Bucket: bucket,
            Key: filePath,
        });

        await s3Client.send(deleteCommand);

        return res.status(200).json({
            success: true,
            message: 'File deleted successfully.',
            data: {
                path: filePath,
                bucket: bucket,
                deletedAt: new Date().toISOString(),
            },
        });
    } catch (error) {
        console.error('Delete error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to delete file.',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
    }
};

module.exports = {
    upload,
    uploadMedia,
    deleteMedia,
};
