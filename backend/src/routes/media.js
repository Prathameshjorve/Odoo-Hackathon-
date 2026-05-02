const express = require('express');
const { upload, uploadMedia, deleteMedia } = require('../controllers/mediaController');
const requireAuth = require('../middlewares/requireAuth');

const router = express.Router();

/**
 * @route   POST /media/upload
 * @desc    Upload a media file to S3
 * @access  Private (requires authentication)
 */
router.post('/upload', requireAuth, upload.single('file'), uploadMedia);

/**
 * @route   DELETE /media/delete
 * @desc    Delete a media file from S3
 * @access  Private (requires authentication)
 */
router.delete('/delete', requireAuth, deleteMedia);

module.exports = router;
