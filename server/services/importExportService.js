/**
 * Import/Export Service
 * Handles bulk import and export of equipment data
 */
const fs = require('fs').promises;
const path = require('path');
const csv = require('csv-parser');
const { createObjectCsvWriter } = require('csv-writer');
const XLSX = require('xlsx');
const { Readable } = require('stream');
const { Equipment, EquipmentType, Location, File } = require('../models');
const { Op, QueryTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const equipmentLogService = require('./equipmentLogService');

/**
 * Export equipment data to CSV format
 * @param {Object} options - Export options
 * @returns {Promise<Buffer>} - CSV data as buffer
 */
const exportToCsv = async (options = {}) => {
  try {
    const { filters = {} } = options;

    // Get equipment data
    const equipment = await getEquipmentData(filters);

    // Prepare data for CSV
    const csvData = equipment.map(item => ({
      id: item.id,
      type: item.type,
      type_id: item.type_id,
      category: item.category,
      brand: item.brand,
      model: item.model,
      serial_number: item.serial_number,
      status: item.status,
      location: item.location,
      location_id: item.location_id,
      description: item.description,
      created_at: item.created_at,
      updated_at: item.updated_at,
      reference_image_id: item.reference_image_id
    }));

    // Create a temporary file path
    const tempFilePath = path.join(__dirname, '../temp', `equipment_export_${Date.now()}.csv`);

    // Ensure temp directory exists
    await fs.mkdir(path.join(__dirname, '../temp'), { recursive: true });

    // Define CSV writer
    const csvWriter = createObjectCsvWriter({
      path: tempFilePath,
      header: [
        { id: 'id', title: 'ID' },
        { id: 'type', title: 'Type' },
        { id: 'type_id', title: 'Type ID' },
        { id: 'category', title: 'Category' },
        { id: 'brand', title: 'Brand' },
        { id: 'model', title: 'Model' },
        { id: 'serial_number', title: 'Serial Number' },
        { id: 'status', title: 'Status' },
        { id: 'location', title: 'Location' },
        { id: 'location_id', title: 'Location ID' },
        { id: 'description', title: 'Description' },
        { id: 'created_at', title: 'Created At' },
        { id: 'updated_at', title: 'Updated At' },
        { id: 'reference_image_id', title: 'Reference Image ID' }
      ]
    });

    // Write CSV file
    await csvWriter.writeRecords(csvData);

    // Read the file into a buffer
    const buffer = await fs.readFile(tempFilePath);

    // Delete the temporary file
    await fs.unlink(tempFilePath);

    return buffer;
  } catch (error) {
    console.error('Error exporting to CSV:', error);
    throw error;
  }
};

/**
 * Export equipment data to XLSX format
 * @param {Object} options - Export options
 * @returns {Promise<Buffer>} - XLSX data as buffer
 */
const exportToXlsx = async (options = {}) => {
  try {
    const { filters = {} } = options;

    // Get equipment data
    const equipment = await getEquipmentData(filters);

    // Prepare data for XLSX
    const xlsxData = equipment.map(item => ({
      ID: item.id,
      Type: item.type,
      'Type ID': item.type_id,
      Category: item.category,
      Brand: item.brand,
      Model: item.model,
      'Serial Number': item.serial_number,
      Status: item.status,
      Location: item.location,
      'Location ID': item.location_id,
      Description: item.description,
      'Created At': item.created_at,
      'Updated At': item.updated_at,
      'Reference Image ID': item.reference_image_id
    }));

    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(xlsxData);

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Equipment');

    // Generate buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    return buffer;
  } catch (error) {
    console.error('Error exporting to XLSX:', error);
    throw error;
  }
};

/**
 * Export equipment data to JSON format
 * @param {Object} options - Export options
 * @returns {Promise<Buffer>} - JSON data as buffer
 */
const exportToJson = async (options = {}) => {
  try {
    const { filters = {} } = options;

    // Get equipment data
    const equipment = await getEquipmentData(filters);

    // Convert to JSON string
    const jsonString = JSON.stringify(equipment, null, 2);

    // Convert to buffer
    return Buffer.from(jsonString);
  } catch (error) {
    console.error('Error exporting to JSON:', error);
    throw error;
  }
};

/**
 * Get equipment data for export
 * @param {Object} filters - Filters to apply
 * @returns {Promise<Array>} - Array of equipment objects
 */
const getEquipmentData = async (filters = {}) => {
  try {
    // Build filter conditions
    const where = {};

    // Apply regular filters
    if (filters.type) where.type = filters.type;
    if (filters.brand) where.brand = filters.brand;
    if (filters.status) where.status = filters.status;
    if (filters.location_id) where.location_id = filters.location_id;

    // Apply search filter
    if (filters.search) {
      where[Op.or] = [
        { type: { [Op.like]: `%${filters.search}%` } },
        { category: { [Op.like]: `%${filters.search}%` } },
        { brand: { [Op.like]: `%${filters.search}%` } },
        { model: { [Op.like]: `%${filters.search}%` } },
        { serial_number: { [Op.like]: `%${filters.search}%` } },
        { location: { [Op.like]: `%${filters.search}%` } },
        { description: { [Op.like]: `%${filters.search}%` } }
      ];
    }

    // If selectedIds is provided, filter by those IDs
    if (filters.selectedIds && Array.isArray(filters.selectedIds) && filters.selectedIds.length > 0) {
      console.log(`Filtering by ${filters.selectedIds.length} selected IDs`);
      where.id = {
        [Op.in]: filters.selectedIds
      };
    }

    // Get equipment with related data
    const equipment = await Equipment.findAll({
      where,
      include: [
        {
          model: Location,
          as: 'locationDetails',
          attributes: ['id', 'name', 'street', 'postal_code', 'city', 'region', 'country']
        }
      ],
      order: [['updated_at', 'DESC']]
    });

    console.log(`Found ${equipment.length} equipment items for export`);
    return equipment.map(item => item.toJSON());
  } catch (error) {
    console.error('Error getting equipment data:', error);
    throw error;
  }
};

/**
 * Import equipment data from CSV
 * @param {Buffer} fileBuffer - CSV file buffer
 * @param {Object} options - Import options
 * @param {Number} userId - ID of the user performing the import
 * @returns {Promise<Object>} - Import results
 */
const importFromCsv = async (fileBuffer, options = {}, userId) => {
  try {
    const results = {
      total: 0,
      created: 0,
      updated: 0,
      errors: []
    };

    // Convert buffer to readable stream
    const stream = Readable.from(fileBuffer.toString());

    // Parse CSV
    const records = [];
    await new Promise((resolve, reject) => {
      stream
        .pipe(csv())
        .on('data', (data) => records.push(data))
        .on('end', resolve)
        .on('error', reject);
    });

    // Process records
    for (const record of records) {
      results.total++;
      try {
        // Normalize CSV column names to match our model
        const processedRecord = {
          id: record.ID || record.id,
          type: record.Type || record.type,
          type_id: record['Type ID'] || record.type_id || record.TypeID || record.typeId,
          category: record.Category || record.category,
          brand: record.Brand || record.brand,
          model: record.Model || record.model,
          serial_number: record['Serial Number'] || record.serial_number || record.SerialNumber || record.serialNumber,
          status: record.Status || record.status,
          location: record.Location || record.location,
          location_id: record['Location ID'] || record.location_id || record.LocationID || record.locationId,
          description: record.Description || record.description
        };

        await processImportRecord(processedRecord, options, userId);

        // Update counters
        if (processedRecord.id) {
          results.updated++;
        } else {
          results.created++;
        }
      } catch (error) {
        results.errors.push({
          record,
          error: error.message
        });
      }
    }

    return results;
  } catch (error) {
    console.error('Error importing from CSV:', error);
    throw error;
  }
};

/**
 * Import equipment data from XLSX
 * @param {Buffer} fileBuffer - XLSX file buffer
 * @param {Object} options - Import options
 * @param {Number} userId - ID of the user performing the import
 * @returns {Promise<Object>} - Import results
 */
const importFromXlsx = async (fileBuffer, options = {}, userId) => {
  try {
    const results = {
      total: 0,
      created: 0,
      updated: 0,
      errors: []
    };

    // Parse XLSX
    const workbook = XLSX.read(fileBuffer);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const records = XLSX.utils.sheet_to_json(worksheet);

    // Process records
    for (const record of records) {
      results.total++;
      try {
        // Convert XLSX column names to match our model
        const processedRecord = {
          id: record.ID || record.id,
          type: record.Type || record.type,
          type_id: record['Type ID'] || record.type_id || record.TypeID || record.typeId,
          category: record.Category || record.category,
          brand: record.Brand || record.brand,
          model: record.Model || record.model,
          serial_number: record['Serial Number'] || record.serial_number || record.SerialNumber || record.serialNumber,
          status: record.Status || record.status,
          location: record.Location || record.location,
          location_id: record['Location ID'] || record.location_id || record.LocationID || record.locationId,
          description: record.Description || record.description
        };

        await processImportRecord(processedRecord, options, userId);

        // Update counters
        if (processedRecord.id) {
          results.updated++;
        } else {
          results.created++;
        }
      } catch (error) {
        results.errors.push({
          record,
          error: error.message
        });
      }
    }

    return results;
  } catch (error) {
    console.error('Error importing from XLSX:', error);
    throw error;
  }
};

/**
 * Import equipment data from JSON
 * @param {Buffer} fileBuffer - JSON file buffer
 * @param {Object} options - Import options
 * @param {Number} userId - ID of the user performing the import
 * @returns {Promise<Object>} - Import results
 */
const importFromJson = async (fileBuffer, options = {}, userId) => {
  try {
    const results = {
      total: 0,
      created: 0,
      updated: 0,
      errors: []
    };

    // Parse JSON
    const jsonString = fileBuffer.toString();
    const records = JSON.parse(jsonString);

    // Ensure records is an array
    const recordsArray = Array.isArray(records) ? records : [records];

    // Process records
    for (const record of recordsArray) {
      results.total++;
      try {
        // Normalize JSON column names to match our model
        const processedRecord = {
          id: record.ID || record.id,
          type: record.Type || record.type,
          type_id: record['Type ID'] || record.type_id || record.TypeID || record.typeId,
          category: record.Category || record.category,
          brand: record.Brand || record.brand,
          model: record.Model || record.model,
          serial_number: record['Serial Number'] || record.serial_number || record.SerialNumber || record.serialNumber,
          status: record.Status || record.status,
          location: record.Location || record.location,
          location_id: record['Location ID'] || record.location_id || record.LocationID || record.locationId,
          description: record.Description || record.description
        };

        await processImportRecord(processedRecord, options, userId);

        // Update counters
        if (processedRecord.id) {
          results.updated++;
        } else {
          results.created++;
        }
      } catch (error) {
        results.errors.push({
          record,
          error: error.message
        });
      }
    }

    return results;
  } catch (error) {
    console.error('Error importing from JSON:', error);
    throw error;
  }
};

/**
 * Process a single import record
 * @param {Object} record - Record to process
 * @param {Object} options - Import options
 * @param {Number} userId - ID of the user performing the import
 * @returns {Promise<Equipment>} - Created or updated equipment
 */
/**
 * Process a single import record without worrying about foreign key constraints
 * @param {Object} record - Record to process
 * @param {Object} options - Import options
 * @param {Number} userId - ID of the user performing the import
 * @returns {Promise<Object>} - Created or updated equipment
 */
const processImportRecord = async (record, options = {}, userId) => {
  console.log('Processing import record:', JSON.stringify(record));

  // Validate required fields
  if (!record.brand && !record.model && !record.serial_number) {
    throw new Error('At least one of brand, model, or serial number is required');
  }

  // Set default values for missing fields
  if (!record.brand) record.brand = 'Unknown';
  if (!record.model) record.model = 'Unknown';
  if (!record.serial_number) record.serial_number = `Unknown-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  try {
    // Check if we're updating an existing record
    let equipment;
    let isNew = true;

    if (record.id) {
      // Try to find by ID
      equipment = await Equipment.findByPk(record.id);
      if (equipment) {
        isNew = false;
        console.log(`Found existing equipment with ID: ${equipment.id}`);
      }
    }

    // If not found by ID, try to find by serial number
    if (!equipment && record.serial_number) {
      equipment = await Equipment.findOne({
        where: { serial_number: record.serial_number }
      });
      if (equipment) {
        isNew = false;
        console.log(`Found existing equipment with serial number: ${equipment.serial_number}`);
      }
    }

    // Determine status based on location
    let status = record.status;
    if (!status) {
      if (record.location && record.location.toLowerCase() === 'lager') {
        status = 'available';
      } else {
        status = 'in-use';
      }
      console.log(`Setting status to ${status} based on location: ${record.location}`);
    }

    // Prepare equipment data (without foreign keys)
    const equipmentData = {
      type: record.type || 'Other',
      category: record.category || '',
      brand: record.brand,
      model: record.model,
      serial_number: record.serial_number,
      status: status,
      location: record.location || 'Lager',
      description: record.description || ''
    };

    console.log('Prepared equipment data:', JSON.stringify(equipmentData));

    // Create or update equipment
    if (isNew) {
      // Create new equipment
      equipment = await Equipment.create({
        ...equipmentData,
        created_at: new Date(),
        updated_at: new Date()
      });

      console.log(`Created new equipment with ID: ${equipment.id}`);

      // Log creation
      await equipmentLogService.logCreation(equipment.id, userId, equipmentData);
    } else {
      // Store old data for logging
      const oldData = {
        type: equipment.type,
        category: equipment.category,
        brand: equipment.brand,
        model: equipment.model,
        serial_number: equipment.serial_number,
        status: equipment.status,
        location: equipment.location,
        description: equipment.description
      };

      // Update equipment
      await equipment.update({
        ...equipmentData,
        updated_at: new Date()
      });

      console.log(`Updated equipment with ID: ${equipment.id}`);

      // Log update
      await equipmentLogService.logUpdate(equipment.id, userId, oldData, equipmentData);
    }

    return equipment;
  } catch (error) {
    console.error('Error processing import record:', error);
    throw new Error(`Failed to process import record: ${error.message}`);
  }
};

/**
 * Get equipment type name by ID
 * @param {Number} typeId - Equipment type ID
 * @returns {Promise<String>} - Equipment type name
 */
const getTypeName = async (typeId) => {
  const type = await EquipmentType.findByPk(typeId);
  return type ? type.name : null;
};

module.exports = {
  exportToCsv,
  exportToXlsx,
  exportToJson,
  importFromCsv,
  importFromXlsx,
  importFromJson
};
