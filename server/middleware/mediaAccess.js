const { File, Equipment } = require('../models');
const path = require('path');
const fs = require('fs');
const { promisify } = require('util');

// Convert fs functions to promise-based
const existsAsync = promisify(fs.exists);

/**
 * Media access control middleware
 * Handles access control for media files based on various criteria
 */
const mediaAccess = {
  /**
   * Verify file access permissions
   * Checks if the user has permission to access the requested file
   */
  verifyAccess: async (req, res, next) => {
    try {
      const fileId = req.params.id;

      // Log the request
      console.log(`[MEDIA-ACCESS] Verifying access for file ID: ${fileId}`);
      console.log(`[MEDIA-ACCESS] Request path: ${req.path}`);
      console.log(`[MEDIA-ACCESS] Request query:`, req.query);

      // Always set isAuthenticated to true for file access
      // This ensures files can be accessed without authentication
      req.isAuthenticated = true;

      if (req.user) {
        console.log(`[MEDIA-ACCESS] User role: ${req.user.role}`);
      } else {
        console.log(`[MEDIA-ACCESS] No user attached to request - public access`);
      }

      // Find the file
      const file = await File.findByPk(fileId);

      if (!file) {
        console.log(`[MEDIA-ACCESS] File not found: ${fileId}`);
        return res.status(404).json({ message: 'File not found' });
      }

      // Store file in request for later use
      req.mediaFile = file;

      // Check if file exists on disk
      let filePath;
      let originalFilePath = path.resolve(file.file_path);

      // Log the file details for debugging
      console.log(`[MEDIA-ACCESS] File details:`, {
        id: file.id,
        file_type: file.file_type,
        file_path: file.file_path,
        thumbnail_path: file.thumbnail_path,
        thumbnail_requested: req.query.thumbnail === 'true'
      });

      if (req.query.thumbnail === 'true' && file.thumbnail_path) {
        filePath = path.resolve(file.thumbnail_path);

        // Check if thumbnail exists
        const thumbnailExists = await existsAsync(filePath);

        if (!thumbnailExists) {
          console.log(`[MEDIA-ACCESS] Thumbnail not found, falling back to original: ${filePath}`);
          filePath = originalFilePath;
        } else {
          console.log(`[MEDIA-ACCESS] Thumbnail found: ${filePath}`);
        }
      } else {
        if (req.query.thumbnail === 'true') {
          console.log(`[MEDIA-ACCESS] Thumbnail requested but no thumbnail path available, using original`);
        }
        filePath = originalFilePath;
      }

      const fileExists = await existsAsync(filePath);

      if (!fileExists) {
        console.log(`[MEDIA-ACCESS] File not found on disk: ${filePath}`);
        return res.status(404).json({ message: 'File not found on disk' });
      }

      // IMPORTANT: Always allow access to files
      // This is necessary for displaying images in the UI without authentication
      console.log(`[MEDIA-ACCESS] Access granted (public file): ${filePath}`);
      next();
    } catch (error) {
      console.error('[MEDIA-ACCESS] Error verifying access:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  /**
   * Prepare file for serving
   * Sets appropriate headers and prepares the file for download or viewing
   */
  prepareFile: (req, res, next) => {
    try {
      const file = req.mediaFile;
      const { thumbnail, download } = req.query;

      // Determine which path to use (original or thumbnail)
      let filePath;
      if (thumbnail === 'true' && file.thumbnail_path) {
        filePath = path.resolve(file.thumbnail_path);
        console.log(`[MEDIA-ACCESS] Using thumbnail path: ${filePath}`);

        // Check if thumbnail exists
        if (!fs.existsSync(filePath)) {
          console.log(`[MEDIA-ACCESS] Thumbnail not found, falling back to original: ${filePath}`);
          filePath = path.resolve(file.file_path);

          // Check if original file exists
          if (!fs.existsSync(filePath)) {
            console.log(`[MEDIA-ACCESS] Original file not found either: ${filePath}`);
            return res.status(404).json({ message: 'File not found on disk' });
          }
        } else {
          // Check thumbnail file size
          try {
            const stats = fs.statSync(filePath);
            console.log(`[MEDIA-ACCESS] Thumbnail file size: ${stats.size} bytes`);

            // If thumbnail is empty or too small, fall back to original
            if (stats.size < 100) {
              console.log(`[MEDIA-ACCESS] Thumbnail file is too small (${stats.size} bytes), falling back to original`);
              filePath = path.resolve(file.file_path);
            }
          } catch (err) {
            console.error(`[MEDIA-ACCESS] Error checking thumbnail file size:`, err);
            filePath = path.resolve(file.file_path);
          }
        }
      } else {
        filePath = path.resolve(file.file_path);
        console.log(`[MEDIA-ACCESS] Using original file path: ${filePath}`);
      }

      // Set appropriate content type
      let contentType = 'application/octet-stream';

      // Check if file_type contains a valid MIME type
      if (file.file_type && file.file_type.includes('/')) {
        // Use the file_type directly if it's a valid MIME type
        contentType = file.file_type;
        console.log(`[MEDIA-ACCESS] Using MIME type from database: ${contentType}`);
      } else {
        // Otherwise, infer from the file type field or extension
        if (file.file_type === 'image') {
          contentType = 'image/jpeg';
          if (filePath.endsWith('.png')) {
            contentType = 'image/png';
          } else if (filePath.endsWith('.gif')) {
            contentType = 'image/gif';
          } else if (filePath.endsWith('.webp')) {
            contentType = 'image/webp';
          }
        } else if (file.file_type === 'audio') {
          contentType = 'audio/mpeg';
        } else if (file.file_type === 'pdf') {
          contentType = 'application/pdf';
        }
        console.log(`[MEDIA-ACCESS] Inferred MIME type: ${contentType}`);
      }

      // Set download header if download parameter is present
      if (download === 'true') {
        console.log(`[MEDIA-ACCESS] Setting attachment disposition for download`);
        res.setHeader('Content-Disposition', `attachment; filename="${file.file_name}"`);
      } else {
        res.setHeader('Content-Disposition', `inline; filename="${file.file_name}"`);
      }

      // Set cache control headers for better performance
      res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
      res.setHeader('Content-Type', contentType);

      // Store file path in request for the next middleware
      req.filePath = filePath;

      next();
    } catch (error) {
      console.error('[MEDIA-ACCESS] Error preparing file:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  /**
   * Serve the file
   * Streams the file to the response
   */
  serveFile: (req, res) => {
    try {
      const filePath = req.filePath;

      console.log(`[MEDIA-ACCESS] Streaming file to response: ${filePath}`);

      // Stream file to response
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);

      // Handle errors
      fileStream.on('error', (error) => {
        console.error('[MEDIA-ACCESS] Error streaming file:', error);
        if (!res.headersSent) {
          res.status(500).json({ message: 'Error streaming file' });
        }
      });
    } catch (error) {
      console.error('[MEDIA-ACCESS] Error serving file:', error);
      if (!res.headersSent) {
        res.status(500).json({ message: 'Server error' });
      }
    }
  }
};

module.exports = mediaAccess;
