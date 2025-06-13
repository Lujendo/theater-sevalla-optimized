const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const { promisify } = require('util');
const storageService = require('../services/storageService');
const mkdirAsync = promisify(fs.mkdir);
const existsAsync = promisify(fs.exists);

// Configuration constants
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_FILES = 5;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png'];
const ALLOWED_AUDIO_TYPES = ['audio/mpeg'];
const ALLOWED_DOCUMENT_TYPES = ['application/pdf'];
const ALLOWED_MIME_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_AUDIO_TYPES, ...ALLOWED_DOCUMENT_TYPES];

// Image processing configuration
const IMAGE_THUMBNAIL_SIZE = 300; // 300px width for thumbnails
const IMAGE_QUALITY = 80; // JPEG quality (0-100)

// Determine upload directory based on environment
const getUploadDir = () => {
  if (process.env.NODE_ENV === 'production') {
    // Production: Use Sevalla disk storage
    return '/var/lib/data/tonlager';
  } else {
    // Development: Use local uploads directory
    return path.join(__dirname, '../uploads');
  }
};

// Ensure uploads directory exists
const uploadsDir = getUploadDir();
const imageDir = path.join(uploadsDir, 'images');
const audioDir = path.join(uploadsDir, 'audio');
const pdfDir = path.join(uploadsDir, 'pdfs');
const thumbnailsDir = path.join(uploadsDir, 'thumbnails');

// Create directories if they don't exist
const createDirectories = async () => {
  try {
    // Create main uploads directory
    if (!await existsAsync(uploadsDir)) {
      await mkdirAsync(uploadsDir, { recursive: true });
    }

    // Create subdirectories
    const directories = [imageDir, audioDir, pdfDir, thumbnailsDir];
    for (const dir of directories) {
      if (!await existsAsync(dir)) {
        await mkdirAsync(dir, { recursive: true });
      }
    }
  } catch (error) {
    console.error('Error creating upload directories:', error);
  }
};

// Create directories on startup
createDirectories();

// Helper function to get file type from mimetype
const getFileTypeFromMimetype = (mimetype) => {
  if (ALLOWED_IMAGE_TYPES.includes(mimetype)) return 'image';
  if (ALLOWED_AUDIO_TYPES.includes(mimetype)) return 'audio';
  if (ALLOWED_DOCUMENT_TYPES.includes(mimetype)) return 'pdf';
  return null;
};

// Helper function to get directory from file type
const getDirectoryFromFileType = (fileType) => {
  switch (fileType) {
    case 'image': return imageDir;
    case 'audio': return audioDir;
    case 'pdf': return pdfDir;
    default: return uploadsDir;
  }
};

// Configure storage - use memory storage for cloud uploads
const storage = multer.memoryStorage();

// File filter
const fileFilter = (req, file, cb) => {
  // Check if the file type is allowed
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Unsupported file type: ${file.mimetype}. Only JPEG, PNG, MP3, and PDF files are allowed.`), false);
  }
};

// Create multer upload instance
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: MAX_FILES
  }
});

// Middleware to process uploaded files using storage service
const processFiles = async (req, res, next) => {
  try {
    // Skip if no files were uploaded
    if (!req.files) {
      return next();
    }

    console.log('Processing uploaded files...');

    // Process all files
    const processPromises = [];
    const uploadResults = [];

    // Helper function to process a single file
    const processFile = async (file) => {
      try {
        console.log(`Processing file: ${file.originalname} (${file.mimetype})`);

        const fileType = getFileTypeFromMimetype(file.mimetype);
        if (!fileType) {
          throw new Error(`Unsupported file type: ${file.mimetype}`);
        }

        // Upload file using storage service
        const result = await storageService.uploadFile(
          file.buffer,
          file.originalname,
          file.mimetype,
          fileType
        );

        // Add storage result to file object
        file.storagePath = result.filePath;
        file.thumbnailPath = result.thumbnailPath;
        file.publicUrl = result.publicUrl;
        file.thumbnailUrl = result.thumbnailUrl;
        file.storedFilename = result.fileName;

        uploadResults.push({
          originalName: file.originalname,
          storagePath: result.filePath,
          thumbnailPath: result.thumbnailPath,
          publicUrl: result.publicUrl,
          thumbnailUrl: result.thumbnailUrl,
          fileType: fileType,
          mimeType: file.mimetype
        });

        console.log(`File processed successfully: ${file.originalname}`);
      } catch (error) {
        console.error(`Error processing file ${file.originalname}:`, error);
        throw error; // Re-throw to handle in the main catch block
      }
    };

    // Process all files
    if (Array.isArray(req.files)) {
      // Handle array of files (from upload.array())
      console.log(`Processing ${req.files.length} files`);
      for (const file of req.files) {
        processPromises.push(processFile(file));
      }
    } else if (req.files && typeof req.files === 'object') {
      // Handle object of files (from upload.fields())
      for (const fieldName of Object.keys(req.files)) {
        const files = req.files[fieldName];
        console.log(`Processing ${files.length} files in field: ${fieldName}`);

        for (const file of files) {
          processPromises.push(processFile(file));
        }
      }
    }

    // Wait for all processing to complete
    await Promise.all(processPromises);

    // Attach upload results to request for use in route handlers
    req.uploadResults = uploadResults;

    console.log('All files processed successfully');
    next();
  } catch (error) {
    console.error('Error in file processing middleware:', error);
    next(error);
  }
};

// Export both the upload middleware and the file processing middleware
module.exports = {
  upload,
  processFiles,
  processImages: processFiles, // Backward compatibility alias
  MAX_FILE_SIZE,
  MAX_FILES,
  storageService
};
