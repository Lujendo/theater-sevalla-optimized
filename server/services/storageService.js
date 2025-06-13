const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');

class StorageService {
  constructor() {
    this.storageType = process.env.STORAGE_TYPE || 'local';
    
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
    } else {
      // Local storage configuration
      this.localStorageDir = process.env.NODE_ENV === 'production' 
        ? '/var/lib/data/tonlager' 
        : path.join(__dirname, '..', 'uploads');
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
      // Ensure directories exist
      const typeDir = path.join(this.localStorageDir, `${fileType}s`);
      const thumbnailDir = path.join(this.localStorageDir, 'thumbnails');
      
      if (!fs.existsSync(typeDir)) {
        fs.mkdirSync(typeDir, { recursive: true });
      }
      if (!fs.existsSync(thumbnailDir)) {
        fs.mkdirSync(thumbnailDir, { recursive: true });
      }

      const filePath = path.join(typeDir, fileName);
      fs.writeFileSync(filePath, fileBuffer);

      // Create thumbnail for images
      let thumbnailPath = null;
      if (mimeType.startsWith('image/')) {
        thumbnailPath = await this.createThumbnailLocal(fileBuffer, fileName, thumbnailDir);
      }

      return {
        filePath: filePath,
        fileName: fileName,
        thumbnailPath: thumbnailPath,
        publicUrl: `/api/files/local/${fileType}s/${fileName}`,
        thumbnailUrl: thumbnailPath ? `/api/files/local/thumbnails/${path.basename(thumbnailPath)}` : null
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
      return `/api/files/serve/${encodeURIComponent(filePath)}${thumbnail ? '?thumbnail=true' : ''}`;
    }
  }
}

module.exports = new StorageService();
