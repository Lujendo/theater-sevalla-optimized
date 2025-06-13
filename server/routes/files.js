const express = require('express');
const path = require('path');
const fs = require('fs');
const { promisify } = require('util');
// Use environment-aware models based on database type
const models = (process.env.NODE_ENV === 'development' && process.env.DB_TYPE === 'sqlite')
  ? require('../models/index.local')
  : require('../models');
const { File, sequelize, Equipment } = models;
const auth = require('../middleware/flexAuth');
const mediaAccess = require('../middleware/mediaAccess');
const { upload, processFiles, MAX_FILES, storageService } = require('../middleware/upload');

// Convert fs functions to promise-based
const unlinkAsync = promisify(fs.unlink);
const existsAsync = promisify(fs.exists);

const router = express.Router();

// Get file by ID - using flexible authentication and media access control
router.get('/:id',
  auth.optional, // Optional authentication - attach user if token is valid, but don't require it
  mediaAccess.verifyAccess, // Verify access permissions
  mediaAccess.prepareFile, // Prepare file for serving
  mediaAccess.serveFile // Serve the file
);

// Delete file - requires authentication with appropriate permissions
router.delete('/:id', auth.required, async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    console.log(`[FILES] DELETE /api/files/${req.params.id} - Request received`);
    console.log(`[FILES] User: ${req.user.username}, Role: ${req.user.role}`);

    const file = await File.findByPk(req.params.id, { transaction });

    if (!file) {
      await transaction.rollback();
      console.log(`[FILES] File with ID ${req.params.id} not found in database`);
      return res.status(404).json({ message: 'File not found' });
    }

    console.log(`[FILES] File found for deletion:`, {
      id: file.id,
      file_type: file.file_type,
      file_name: file.file_name,
      file_path: file.file_path,
      thumbnail_path: file.thumbnail_path
    });

    // Check if this file is used as a reference image for any equipment
    const referencingEquipment = await Equipment.findOne({
      where: { reference_image_id: file.id },
      transaction
    });

    if (referencingEquipment) {
      console.log(`[FILES] File is used as reference image for equipment ID: ${referencingEquipment.id}`);

      // Clear the reference_image_id to break the circular reference
      await referencingEquipment.update({ reference_image_id: null }, { transaction });
      console.log(`[FILES] Cleared reference_image_id from equipment ID: ${referencingEquipment.id}`);
    }

    // Delete file from storage using storage service
    console.log(`[FILES] Deleting file from storage: ${file.file_path}`);
    const deleteSuccess = await storageService.deleteFile(file.file_path, file.thumbnail_path);

    if (deleteSuccess) {
      console.log(`[FILES] Successfully deleted file from storage`);
    } else {
      console.log(`[FILES] Warning: Could not delete file from storage, but continuing with database cleanup`);
    }

    // Delete file record from database
    console.log(`[FILES] Deleting file record from database`);
    await file.destroy({ transaction });
    console.log(`[FILES] Successfully deleted file record from database`);

    // Commit the transaction
    await transaction.commit();
    console.log(`[FILES] Transaction committed successfully`);

    console.log(`[FILES] File deletion completed successfully`);
    res.json({ message: 'File deleted successfully' });
  } catch (error) {
    // Rollback the transaction if there's an error
    try {
      await transaction.rollback();
      console.error('[FILES] Transaction rolled back due to error');
    } catch (rollbackError) {
      console.error('[FILES] Error rolling back transaction:', rollbackError);
    }

    console.error('[FILES] Delete file error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get file metadata - using flexible authentication
router.get('/:id/metadata', auth.optional, async (req, res) => {
  try {
    console.log(`[FILES] GET /api/files/${req.params.id}/metadata - Request received`);
    if (req.isAuthenticated) {
      console.log(`[FILES] User: ${req.user.username}, Role: ${req.user.role}`);
    } else {
      console.log(`[FILES] Unauthenticated request`);
    }

    const file = await File.findByPk(req.params.id);

    if (!file) {
      console.log(`[FILES] File with ID ${req.params.id} not found in database`);
      return res.status(404).json({ message: 'File not found' });
    }

    // Return file metadata
    const metadata = {
      id: file.id,
      file_type: file.file_type,
      file_name: file.file_name,
      has_thumbnail: !!file.thumbnail_path,
      uploaded_at: file.uploaded_at
    };

    // Add additional metadata for authenticated users with appropriate roles
    if (req.isAuthenticated && ['admin', 'advanced'].includes(req.user.role)) {
      metadata.file_path = file.file_path;
      metadata.thumbnail_path = file.thumbnail_path;
      metadata.equipment_id = file.equipment_id;
    }

    console.log(`[FILES] Returning metadata for file ID ${file.id}`);
    res.json(metadata);
  } catch (error) {
    console.error('[FILES] Get file metadata error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Upload files for a specific equipment
router.post('/upload/:equipmentId', auth.required, upload.array('files', MAX_FILES), processFiles, async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    console.log(`[FILES] POST /api/files/upload/${req.params.equipmentId} - Request received`);
    console.log(`[FILES] User: ${req.user.username}, Role: ${req.user.role}`);

    // Check if user has permission (admin or advanced)
    if (!['admin', 'advanced'].includes(req.user.role)) {
      console.log(`[FILES] User ${req.user.username} does not have permission to upload files`);
      return res.status(403).json({ message: 'Permission denied' });
    }

    // Check if equipment exists
    const equipmentId = parseInt(req.params.equipmentId);
    const equipment = await Equipment.findByPk(equipmentId, { transaction });

    if (!equipment) {
      await transaction.rollback();
      console.log(`[FILES] Equipment with ID ${equipmentId} not found`);
      return res.status(404).json({ message: 'Equipment not found' });
    }

    // Check if files were uploaded
    if (!req.files || req.files.length === 0) {
      await transaction.rollback();
      console.log(`[FILES] No files were uploaded`);
      return res.status(400).json({ message: 'No files were uploaded' });
    }

    console.log(`[FILES] Processing ${req.files.length} files for equipment ID ${equipmentId}`);

    // Check if upload results are available from processFiles middleware
    if (!req.uploadResults || req.uploadResults.length === 0) {
      await transaction.rollback();
      console.log(`[FILES] No upload results from storage service`);
      return res.status(500).json({ message: 'File processing failed' });
    }

    // Process uploaded files using storage service results
    const fileRecords = [];

    for (const uploadResult of req.uploadResults) {
      console.log(`[FILES] Creating database record for: ${uploadResult.originalName}`);

      // Create file record with storage service paths
      const fileRecord = await File.create({
        equipment_id: equipmentId,
        file_type: uploadResult.fileType,
        file_path: uploadResult.storagePath,
        file_name: uploadResult.originalName,
        thumbnail_path: uploadResult.thumbnailPath
      }, { transaction });

      // Add public URLs to the response
      fileRecord.dataValues.publicUrl = uploadResult.publicUrl;
      fileRecord.dataValues.thumbnailUrl = uploadResult.thumbnailUrl;

      fileRecords.push(fileRecord);
      console.log(`[FILES] Created database record for file ID: ${fileRecord.id}`);
    }

    // Commit the transaction
    await transaction.commit();
    console.log(`[FILES] Successfully uploaded ${fileRecords.length} files for equipment ID ${equipmentId}`);

    // Return the created file records
    res.status(201).json({
      message: `Successfully uploaded ${fileRecords.length} files`,
      files: fileRecords
    });
  } catch (error) {
    // Rollback the transaction if there's an error
    try {
      await transaction.rollback();
      console.error('[FILES] Transaction rolled back due to error');
    } catch (rollbackError) {
      console.error('[FILES] Error rolling back transaction:', rollbackError);
    }

    console.error('[FILES] Upload files error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
