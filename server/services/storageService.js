const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');

class StorageService {
  constructor() {
    this.storageType = process.env.STORAGE_TYPE || 'local';

    console.log(`[STORAGE] Initializing storage service - v2`);
    console.log(`[STORAGE] Storage type: ${this.storageType}`);
    console.log(`[STORAGE] NODE_ENV: ${process.env.NODE_ENV}`);
    console.log(`[STORAGE] Timestamp: ${new Date().toISOString()}`);

    if (this.storageType === 'r2') {
      // Initialize Cloudflare R2 client
      this.s3Client = new S3Client({
        region: process.env.R2_REGION || 'auto',
        endpoint: process.env.R2_ENDPOINT,
        credentials: {
          accessKeyId: process.env.R2_ACCESS_KEY_ID,
          secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
        },
      });
      this.bucketName = process.env.R2_BUCKET_NAME || 'tonlager-files';
      this.publicUrl = process.env.R2_PUBLIC_URL;
      console.log(`[STORAGE] R2 configured with bucket: ${this.bucketName}`);
    } else {
      // Local storage configuration - use single consistent path
      if (process.env.NODE_ENV === 'production') {
        // For Sevalla production, use the persistent disk path
        this.localStorageDir = '/var/lib/data/tonlager';
      } else {
        // For development, use local uploads directory
        this.localStorageDir = path.join(__dirname, '..', 'uploads');
      }

      console.log(`[STORAGE] Local storage directory: ${this.localStorageDir}`);
      console.log(`[STORAGE] Environment: ${process.env.NODE_ENV}`);

      // Ensure the base storage directory exists
      try {
        if (!fs.existsSync(this.localStorageDir)) {
          console.log(`[STORAGE] Creating base storage directory: ${this.localStorageDir}`);
          fs.mkdirSync(this.localStorageDir, { recursive: true });
          console.log(`[STORAGE] Base storage directory created successfully`);
        } else {
          console.log(`[STORAGE] Base storage directory already exists`);
        }
      } catch (error) {
        console.error(`[STORAGE] Failed to create base storage directory:`, error);
        console.error(`[STORAGE] Error details:`, error.message);
      }
    }
  }

  /**
   * Upload a file to storage
   * @param {Buffer} fileBuffer - File buffer
   * @param {string} fileName - Original filename
   * @param {string} mimeType - File MIME type
   * @param {string} fileType - File type (image, audio, pdf)
   * @returns {Promise<Object>} - Upload result with file path and metadata
   */
  async uploadFile(fileBuffer, fileName, mimeType, fileType) {
    const timestamp = Date.now();
    const randomId = Math.round(Math.random() * 1E9);
    const ext = path.extname(fileName).toLowerCase();
    const sanitizedName = `${fileType}-${timestamp}-${randomId}${ext}`;

    if (this.storageType === 'r2') {
      return await this.uploadToR2(fileBuffer, sanitizedName, mimeType, fileType);
    } else {
      return await this.uploadToLocal(fileBuffer, sanitizedName, mimeType, fileType);
    }
  }

  /**
   * Upload file to Cloudflare R2
   */
  async uploadToR2(fileBuffer, fileName, mimeType, fileType) {
    try {
      const key = `${fileType}s/${fileName}`;
      
      const uploadCommand = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: fileBuffer,
        ContentType: mimeType,
        CacheControl: 'public, max-age=31536000', // 1 year cache
      });

      await this.s3Client.send(uploadCommand);

      // Create thumbnail for images
      let thumbnailPath = null;
      if (mimeType.startsWith('image/')) {
        thumbnailPath = await this.createThumbnailR2(fileBuffer, fileName, fileType);
      }

      return {
        filePath: key,
        fileName: fileName,
        thumbnailPath: thumbnailPath,
        publicUrl: `${this.publicUrl}/${key}`,
        thumbnailUrl: thumbnailPath ? `${this.publicUrl}/${thumbnailPath}` : null
      };
    } catch (error) {
      console.error('Error uploading to R2:', error);
      throw error;
    }
  }

  /**
   * Upload file to local storage
   */
  async uploadToLocal(fileBuffer, fileName, mimeType, fileType) {
    try {
      console.log(`[STORAGE] Uploading to local storage: ${fileName}`);
      console.log(`[STORAGE] Storage directory: ${this.localStorageDir}`);
      console.log(`[STORAGE] File type: ${fileType}`);

      // Ensure directories exist
      const typeDir = path.join(this.localStorageDir, `${fileType}s`);
      const thumbnailDir = path.join(this.localStorageDir, 'thumbnails');

      console.log(`[STORAGE] Type directory: ${typeDir}`);
      console.log(`[STORAGE] Thumbnail directory: ${thumbnailDir}`);

      if (!fs.existsSync(typeDir)) {
        console.log(`[STORAGE] Creating type directory: ${typeDir}`);
        fs.mkdirSync(typeDir, { recursive: true });
      }
      if (!fs.existsSync(thumbnailDir)) {
        console.log(`[STORAGE] Creating thumbnail directory: ${thumbnailDir}`);
        fs.mkdirSync(thumbnailDir, { recursive: true });
      }

      const filePath = path.join(typeDir, fileName);
      console.log(`[STORAGE] Writing file to: ${filePath}`);
      fs.writeFileSync(filePath, fileBuffer);
      console.log(`[STORAGE] File written successfully`);

      // Create thumbnail for images
      let thumbnailPath = null;
      if (mimeType.startsWith('image/')) {
        thumbnailPath = await this.createThumbnailLocal(fileBuffer, fileName, thumbnailDir);
      }

      // Generate public URLs for file access
      const publicUrl = `/sevalla-files/${fileType}s/${fileName}`;
      const thumbnailUrl = thumbnailPath ? `/sevalla-files/thumbnails/${path.basename(thumbnailPath)}` : null;

      console.log(`[STORAGE] Generated URLs - Public: ${publicUrl}, Thumbnail: ${thumbnailUrl}`);

      return {
        filePath: filePath,
        fileName: fileName,
        thumbnailPath: thumbnailPath,
        publicUrl: publicUrl,
        thumbnailUrl: thumbnailUrl
      };
    } catch (error) {
      console.error('Error uploading to local storage:', error);
      throw error;
    }
  }

  /**
   * Create thumbnail for R2 storage
   */
  async createThumbnailR2(imageBuffer, originalFileName, fileType) {
    try {
      const ext = path.extname(originalFileName);
      const thumbnailName = `thumb-${originalFileName}`;
      const thumbnailKey = `thumbnails/${thumbnailName}`;

      const thumbnailBuffer = await sharp(imageBuffer)
        .resize({
          width: 300,
          height: 300,
          fit: 'inside',
          withoutEnlargement: true
        })
        .toFormat(ext === '.png' ? 'png' : 'jpeg', { quality: 80 })
        .toBuffer();

      const uploadCommand = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: thumbnailKey,
        Body: thumbnailBuffer,
        ContentType: ext === '.png' ? 'image/png' : 'image/jpeg',
        CacheControl: 'public, max-age=31536000',
      });

      await this.s3Client.send(uploadCommand);
      return thumbnailKey;
    } catch (error) {
      console.error('Error creating thumbnail for R2:', error);
      return null;
    }
  }

  /**
   * Create thumbnail for local storage
   */
  async createThumbnailLocal(imageBuffer, originalFileName, thumbnailDir) {
    try {
      const ext = path.extname(originalFileName);
      const thumbnailName = `thumb-${originalFileName}`;
      const thumbnailPath = path.join(thumbnailDir, thumbnailName);

      await sharp(imageBuffer)
        .resize({
          width: 300,
          height: 300,
          fit: 'inside',
          withoutEnlargement: true
        })
        .toFormat(ext === '.png' ? 'png' : 'jpeg', { quality: 80 })
        .toFile(thumbnailPath);

      return thumbnailPath;
    } catch (error) {
      console.error('Error creating thumbnail for local storage:', error);
      return null;
    }
  }

  /**
   * Delete a file from storage
   */
  async deleteFile(filePath, thumbnailPath = null) {
    if (this.storageType === 'r2') {
      return await this.deleteFromR2(filePath, thumbnailPath);
    } else {
      return await this.deleteFromLocal(filePath, thumbnailPath);
    }
  }

  /**
   * Delete file from R2
   */
  async deleteFromR2(filePath, thumbnailPath) {
    try {
      // Delete main file
      const deleteCommand = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: filePath,
      });
      await this.s3Client.send(deleteCommand);

      // Delete thumbnail if exists
      if (thumbnailPath) {
        const deleteThumbnailCommand = new DeleteObjectCommand({
          Bucket: this.bucketName,
          Key: thumbnailPath,
        });
        await this.s3Client.send(deleteThumbnailCommand);
      }

      return true;
    } catch (error) {
      console.error('Error deleting from R2:', error);
      return false;
    }
  }

  /**
   * Delete file from local storage
   */
  async deleteFromLocal(filePath, thumbnailPath) {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      if (thumbnailPath && fs.existsSync(thumbnailPath)) {
        fs.unlinkSync(thumbnailPath);
      }

      return true;
    } catch (error) {
      console.error('Error deleting from local storage:', error);
      return false;
    }
  }

  /**
   * Get file URL for serving
   */
  getFileUrl(filePath, thumbnail = false) {
    if (this.storageType === 'r2') {
      return `${this.publicUrl}/${filePath}`;
    } else {
      // For local storage, use the direct static file serving
      if (process.env.SEVALLA_STORAGE_PATH) {
        // Extract relative path from the full path
        const relativePath = filePath.replace(process.env.SEVALLA_STORAGE_PATH, '').replace(/^\/+/, '');
        return `/sevalla-files/${relativePath}`;
      } else {
        // Fallback to API file serving for development
        return `/api/files/serve/${encodeURIComponent(filePath)}${thumbnail ? '?thumbnail=true' : ''}`;
      }
    }
  }
}

module.exports = new StorageService();
