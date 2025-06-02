const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const { promisify } = require('util');
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

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads');
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

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const fileType = getFileTypeFromMimetype(file.mimetype);
    const destinationDir = getDirectoryFromFileType(fileType);

    // Ensure directory exists
    if (!fs.existsSync(destinationDir)) {
      fs.mkdirSync(destinationDir, { recursive: true });
    }

    cb(null, destinationDir);
  },
  filename: (req, file, cb) => {
    // Create unique filename with original extension
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname).toLowerCase();
    const sanitizedFilename = file.fieldname + '-' + uniqueSuffix + ext;

    // Store original filename in file object for later use
    file.originalFilename = file.originalname;
    file.storedFilename = sanitizedFilename;

    cb(null, sanitizedFilename);
  }
});

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

// Middleware to process uploaded images
const processImages = async (req, res, next) => {
  try {
    // Skip if no files were uploaded
    if (!req.files) {
      return next();
    }

    console.log('Processing uploaded images...');

    // Process all image files
    const processPromises = [];

    // Helper function to process a single file
    const processFile = async (file) => {
      // Only process image files
      if (!file.mimetype.startsWith('image/')) {
        console.log(`Skipping non-image file: ${file.originalname} (${file.mimetype})`);
        return;
      }

      console.log(`Processing image file: ${file.originalname}`);

      try {
        // Create thumbnail filename with same extension as original
        const fileExt = path.extname(file.path);
        const thumbnailFilename = `thumb-${path.basename(file.path, fileExt)}${fileExt}`;
        const thumbnailPath = path.join(thumbnailsDir, thumbnailFilename);

        console.log(`Creating thumbnail at: ${thumbnailPath}`);

        // Create thumbnail using sharp
        await sharp(file.path)
          .resize({
            width: IMAGE_THUMBNAIL_SIZE,
            height: IMAGE_THUMBNAIL_SIZE,
            fit: 'inside',
            withoutEnlargement: true
          })
          .toFormat(fileExt === '.png' ? 'png' : 'jpeg', {
            quality: IMAGE_QUALITY
          })
          .toFile(thumbnailPath);

        // Add thumbnail path to file object
        file.thumbnailPath = thumbnailPath;
        console.log(`Thumbnail created successfully: ${thumbnailPath}`);

        // Optimize original image if it's a JPEG or PNG
        if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png') {
          console.log(`Optimizing original image: ${file.path}`);
          const optimizedPath = file.path + '.optimized';

          await sharp(file.path)
            .resize({
              width: 1920, // Limit max width to 1920px
              height: 1080, // Limit max height to 1080px
              fit: 'inside',
              withoutEnlargement: true
            })
            .toFormat(fileExt === '.png' ? 'png' : 'jpeg', {
              quality: IMAGE_QUALITY
            })
            .toFile(optimizedPath);

          // Replace original file with optimized version
          fs.renameSync(optimizedPath, file.path);
          console.log(`Original image optimized: ${file.path}`);
        }
      } catch (error) {
        console.error(`Error processing image ${file.originalname}:`, error);
        // Continue with next file even if this one fails
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
    console.log('All images processed successfully');

    next();
  } catch (error) {
    console.error('Error in image processing middleware:', error);
    next(error);
  }
};

// Export both the upload middleware and the image processing middleware
module.exports = {
  upload,
  processImages,
  MAX_FILE_SIZE,
  MAX_FILES
};
