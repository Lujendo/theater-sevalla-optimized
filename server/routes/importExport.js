/**
 * Import/Export Routes
 * Handles bulk import and export of equipment data
 */
const express = require('express');
const multer = require('multer');
const { authenticate, isAdvancedOrAdmin } = require('../middleware/auth');
const importExportService = require('../services/importExportService');

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

/**
 * @route   GET /api/import-export/export
 * @desc    Export equipment data in specified format
 * @access  Private (Admin, Advanced)
 */
router.get('/export', authenticate, isAdvancedOrAdmin, async (req, res) => {
  try {
    const { format = 'csv', selectedIds, ...filters } = req.query;

    // Process selectedIds if provided
    let processedFilters = { ...filters };
    if (selectedIds) {
      try {
        // Parse the selectedIds string into an array
        const selectedIdsArray = JSON.parse(selectedIds);
        if (Array.isArray(selectedIdsArray) && selectedIdsArray.length > 0) {
          processedFilters.selectedIds = selectedIdsArray;
          console.log(`Exporting ${selectedIdsArray.length} selected items`);
        }
      } catch (error) {
        console.error('Error parsing selectedIds:', error);
        // Continue without selectedIds if parsing fails
      }
    }

    let buffer;
    let contentType;
    let filename;
    let filePrefix = 'equipment_export';

    // Add selected items count to filename if applicable
    if (processedFilters.selectedIds && processedFilters.selectedIds.length > 0) {
      filePrefix = `equipment_selected_${processedFilters.selectedIds.length}_items`;
    }

    // Generate export based on format
    switch (format.toLowerCase()) {
      case 'csv':
        buffer = await importExportService.exportToCsv({ filters: processedFilters });
        contentType = 'text/csv';
        filename = `${filePrefix}_${Date.now()}.csv`;
        break;
      case 'xlsx':
        buffer = await importExportService.exportToXlsx({ filters: processedFilters });
        contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        filename = `${filePrefix}_${Date.now()}.xlsx`;
        break;
      case 'json':
        buffer = await importExportService.exportToJson({ filters: processedFilters });
        contentType = 'application/json';
        filename = `${filePrefix}_${Date.now()}.json`;
        break;
      default:
        return res.status(400).json({ message: 'Unsupported export format' });
    }

    // Set headers for file download
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length);

    // Send the file
    res.send(buffer);
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({
      message: 'Error exporting equipment data',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/import-export/import
 * @desc    Import equipment data from uploaded file
 * @access  Private (Admin, Advanced)
 */
router.post('/import', authenticate, isAdvancedOrAdmin, upload.single('file'), async (req, res) => {
  try {
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const { buffer, originalname, mimetype } = req.file;
    const { updateExisting = true } = req.body;

    // Determine file format based on mimetype or file extension
    let format;
    if (mimetype === 'text/csv' || originalname.endsWith('.csv')) {
      format = 'csv';
    } else if (
      mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      originalname.endsWith('.xlsx')
    ) {
      format = 'xlsx';
    } else if (mimetype === 'application/json' || originalname.endsWith('.json')) {
      format = 'json';
    } else {
      return res.status(400).json({ message: 'Unsupported file format' });
    }

    // Import options
    const options = {
      updateExisting: updateExisting === 'true' || updateExisting === true
    };

    // Process import based on format
    let results;
    switch (format) {
      case 'csv':
        results = await importExportService.importFromCsv(buffer, options, req.user.id);
        break;
      case 'xlsx':
        results = await importExportService.importFromXlsx(buffer, options, req.user.id);
        break;
      case 'json':
        results = await importExportService.importFromJson(buffer, options, req.user.id);
        break;
      default:
        return res.status(400).json({ message: 'Unsupported import format' });
    }

    // Return results
    res.status(200).json({
      message: 'Import completed',
      results
    });
  } catch (error) {
    console.error('Import error:', error);
    res.status(500).json({
      message: 'Error importing equipment data',
      error: error.message
    });
  }
});

module.exports = router;
