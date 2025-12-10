const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;
const config = require('../config');

/**
 * Image Upload Service
 * Handles profile picture uploads with resizing and optimization
 */
class ImageUploadService {
  /**
   * Configure multer storage
   */
  static getMulterConfig() {
    const storage = multer.diskStorage({
      destination: async (req, file, cb) => {
        const uploadDir = path.join(config.upload.dir, 'profile-pictures');

        // Ensure directory exists
        try {
          await fs.mkdir(uploadDir, { recursive: true });
        } catch (err) {
          // Directory might already exist
        }

        cb(null, uploadDir);
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, `profile-${uniqueSuffix}${ext}`);
      }
    });

    const fileFilter = (req, file, cb) => {
      // Accept only image files
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Only image files are allowed'), false);
      }
    };

    return multer({
      storage,
      fileFilter,
      limits: {
        fileSize: config.upload.maxSize // 5MB default
      }
    });
  }

  /**
   * Process uploaded image (resize and optimize)
   */
  static async processImage(filePath) {
    try {
      const outputPath = filePath.replace(path.extname(filePath), '-processed.jpg');

      await sharp(filePath)
        .resize(400, 400, {
          fit: 'cover',
          position: 'center'
        })
        .jpeg({
          quality: 85,
          progressive: true
        })
        .toFile(outputPath);

      // Delete original file
      await fs.unlink(filePath);

      return outputPath;
    } catch (err) {
      // If processing fails, delete the uploaded file
      try {
        await fs.unlink(filePath);
      } catch (unlinkErr) {
        // Ignore unlink errors
      }
      throw err;
    }
  }

  /**
   * Delete image file
   */
  static async deleteImage(imageUrl) {
    if (!imageUrl) return;

    try {
      const imagePath = path.join(process.cwd(), imageUrl);
      await fs.unlink(imagePath);
    } catch (err) {
      // Ignore errors if file doesn't exist
    }
  }

  /**
   * Get public URL for uploaded image
   */
  static getPublicUrl(filePath) {
    // Convert absolute path to relative URL
    const relativePath = filePath.replace(process.cwd(), '');
    return relativePath.replace(/\\/g, '/');
  }
}

module.exports = ImageUploadService;
