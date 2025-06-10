const express = require('express');
const { Op } = require('sequelize');
// Use environment-aware models based on database type
const models = (process.env.NODE_ENV === 'development' && process.env.DB_TYPE === 'sqlite')
  ? require('../models/index.local')
  : require('../models');
const { Equipment, File, Location, Category, EquipmentType, DefaultStorageLocation, sequelize } = models;
const { authenticate, restrictTo, isAdvancedOrAdmin } = require('../middleware/auth');
const { upload, processImages, MAX_FILES } = require('../middleware/upload');
const path = require('path');
const fs = require('fs').promises;
const equipmentLogService = require('../services/equipmentLogService');
const inventoryService = require('../services/inventoryService');

const router = express.Router();

// Get all equipment with pagination and filters
router.get('/', authenticate, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      type,
      category,
      brand,
      status,
      location_id,
      search,
      sortBy = 'updated_at',
      sortOrder = 'desc'
    } = req.query;

    const offset = (page - 1) * limit;

    // Build filter conditions
    const where = {};

    if (type) where.type = type;
    if (category) where.category = category;
    if (brand) where.brand = brand;
    if (status) where.status = status;
    if (location_id) where.location_id = location_id;

    if (search) {
      where[Op.or] = [
        { type: { [Op.like]: `%${search}%` } },
        { category: { [Op.like]: `%${search}%` } },
        { brand: { [Op.like]: `%${search}%` } },
        { model: { [Op.like]: `%${search}%` } },
        { serial_number: { [Op.like]: `%${search}%` } },
        { location: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } }
      ];
    }

    // Validate sortBy field to prevent SQL injection
    const validSortFields = ['updated_at', 'created_at', 'brand', 'model', 'type', 'category', 'status', 'location', 'serial_number'];
    const orderField = validSortFields.includes(sortBy) ? sortBy : 'updated_at';

    // Validate sortOrder
    const orderDirection = sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    // Get equipment with count
    const { count, rows } = await Equipment.findAndCountAll({
      where,
      include: [
        {
          model: File,
          as: 'files',
          attributes: ['id', 'file_type', 'file_name', 'file_path']
        },
        {
          model: Location,
          as: 'locationDetails',
          attributes: ['id', 'name', 'street', 'postal_code', 'city', 'region', 'country']
        },
        {
          model: Category,
          as: 'categoryDetails',
          attributes: ['id', 'name', 'description']
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [[orderField, orderDirection]]
    });

    res.json({
      total: count,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      equipment: rows
    });
  } catch (error) {
    console.error('Get equipment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Lookup equipment by serial number
router.get('/lookup', authenticate, async (req, res) => {
  try {
    const { serial_number } = req.query;

    if (!serial_number) {
      return res.status(400).json({ message: 'Serial number is required' });
    }

    const equipment = await Equipment.findOne({
      where: { serial_number: serial_number },
      attributes: ['id', 'type', 'brand', 'model', 'serial_number', 'status', 'location']
    });

    if (!equipment) {
      return res.status(404).json({ message: 'Equipment not found' });
    }

    res.json(equipment);
  } catch (error) {
    console.error('Equipment lookup error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get equipment by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const equipment = await Equipment.findByPk(req.params.id, {
      include: [
        {
          model: File,
          as: 'files',
          attributes: ['id', 'file_type', 'file_name', 'file_path']
        },
        {
          model: Location,
          as: 'locationDetails',
          attributes: ['id', 'name', 'street', 'postal_code', 'city', 'region', 'country']
        },
        {
          model: Category,
          as: 'categoryDetails',
          attributes: ['id', 'name', 'description']
        }
      ]
    });

    if (!equipment) {
      return res.status(404).json({ message: 'Equipment not found' });
    }

    // If we have location details, make sure the location field is set
    if (equipment.locationDetails && equipment.locationDetails.name) {
      equipment.location = equipment.locationDetails.name;
    }

    res.json(equipment);
  } catch (error) {
    console.error('Get equipment by ID error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new equipment with files (admin and advanced users only)
router.post('/', authenticate, restrictTo('admin', 'advanced'), upload.fields([
  { name: 'files', maxCount: MAX_FILES },
  { name: 'referenceImage', maxCount: 1 }
]), processImages, async (req, res) => {
  try {
    const {
      type_id,
      category,
      category_id,
      brand,
      model,
      serial_number,
      status,
      location,
      location_id,
      description,
      reference_image_id,
      quantity,
      // Installation fields
      installation_type,
      installation_location_id,
      installation_location,
      installation_date,
      installation_notes,
      installation_quantity,
      maintenance_schedule,
      last_maintenance_date,
      next_maintenance_date
    } = req.body;

    // Validate required fields (serial number is now optional)
    if (!type_id || !brand || !model) {
      return res.status(400).json({
        message: 'Type, brand, and model are required'
      });
    }

    // Check if serial number already exists (only if provided)
    if (serial_number && serial_number.trim() !== '') {
      const existingEquipment = await Equipment.findOne({
        where: { serial_number }
      });

      if (existingEquipment) {
        return res.status(400).json({
          message: 'Equipment with this serial number already exists'
        });
      }
    }

    // Get the type name from the type_id
    const equipmentType = await EquipmentType.findByPk(type_id);

    if (!equipmentType) {
      return res.status(400).json({
        message: 'Invalid equipment type'
      });
    }

    // Prepare equipment data with proper location hierarchy
    let locationName = location;
    let finalLocationId = location_id || null;
    let autoStatus = 'available';

    // LOCATION HIERARCHY: Installation location overrides storage location
    let currentLocationName = '';
    let currentLocationId = null;
    let isInstallationLocation = false;

    // Priority 1: Installation location (for fixed/semi-permanent equipment)
    if ((installation_type === 'fixed' || installation_type === 'semi-permanent')) {
      if (installation_location_id) {
        try {
          const installationLocationRecord = await Location.findByPk(installation_location_id);
          if (installationLocationRecord) {
            currentLocationName = installationLocationRecord.name;
            currentLocationId = installation_location_id;
            isInstallationLocation = true;
            console.log(`[EQUIPMENT CREATE] Using installation location: ${currentLocationName} (ID: ${installation_location_id})`);
          }
        } catch (error) {
          console.error('Error fetching installation location name:', error);
        }
      } else if (installation_location && installation_location !== '') {
        currentLocationName = installation_location;
        currentLocationId = null;
        isInstallationLocation = true;
        console.log(`[EQUIPMENT CREATE] Using custom installation location: ${currentLocationName}`);
      }
    }

    // Priority 2: Regular storage location (if no installation location or portable equipment)
    if (!isInstallationLocation) {
      if (location_id) {
        try {
          const locationRecord = await Location.findByPk(location_id);
          if (locationRecord) {
            currentLocationName = locationRecord.name;
            currentLocationId = location_id;
            console.log(`[EQUIPMENT CREATE] Using storage location: ${currentLocationName} (ID: ${location_id})`);
          }
        } catch (error) {
          console.error('Error fetching storage location name:', error);
        }
      } else if (location && location !== '') {
        currentLocationName = location;
        currentLocationId = null;
        console.log(`[EQUIPMENT CREATE] Using custom storage location: ${currentLocationName}`);
      } else {
        // No location specified - use default storage location
        try {
          const defaultStorage = await DefaultStorageLocation.findOne({
            where: { is_active: true },
            include: [{
              model: Location,
              as: 'location'
            }],
            order: [['priority', 'ASC']]
          });

          if (defaultStorage && defaultStorage.location) {
            currentLocationName = defaultStorage.location.name;
            currentLocationId = defaultStorage.location_id;
            console.log(`[EQUIPMENT CREATE] Using default storage location: ${currentLocationName} (ID: ${currentLocationId})`);
          } else {
            console.log(`[EQUIPMENT CREATE] No default storage location configured`);
          }
        } catch (error) {
          console.error('Error fetching default storage location:', error);
        }
      }
    }

    // Set the final location values (storage location for database compatibility)
    locationName = currentLocationName || location || '';
    finalLocationId = isInstallationLocation ? (location_id || null) : currentLocationId;

    // SIMPLIFIED STATUS LOGIC: Only auto-set for specific cases
    if (isInstallationLocation && (installation_type === 'fixed' || installation_type === 'semi-permanent') && installation_quantity > 0) {
      // Installation equipment with quantity is suggested as in-use
      autoStatus = 'in-use';
      console.log(`[EQUIPMENT CREATE] Installation equipment with quantity, suggesting status: in-use`);
    } else if (currentLocationName && currentLocationName.toLowerCase() === 'lager') {
      // Storage in Lager is available (unless user specified otherwise)
      autoStatus = 'available';
      console.log(`[EQUIPMENT CREATE] Storage location is Lager, setting status to available`);
    } else {
      // For all other cases, use user-provided status or default to available
      autoStatus = status || 'available';
      console.log(`[EQUIPMENT CREATE] Using ${status ? 'user-provided' : 'default'} status: ${autoStatus}`);
    }

    // Handle quantity field - convert to integer and default to 1 if not provided or invalid
    let equipmentQuantity = 1; // Default quantity
    if (quantity !== undefined && quantity !== null && quantity !== '') {
      const parsedQuantity = parseInt(quantity, 10);
      if (!isNaN(parsedQuantity) && parsedQuantity > 0) {
        equipmentQuantity = parsedQuantity;
      }
    }

    // Handle installation quantity field
    let equipmentInstallationQuantity = 0; // Default installation quantity
    if (installation_quantity !== undefined && installation_quantity !== null && installation_quantity !== '') {
      const parsedInstallationQuantity = parseInt(installation_quantity, 10);
      if (!isNaN(parsedInstallationQuantity) && parsedInstallationQuantity >= 0) {
        equipmentInstallationQuantity = parsedInstallationQuantity;
      }
    }

    // Helper function to handle date fields properly
    const processDateField = (dateValue) => {
      if (dateValue === undefined || dateValue === '' || dateValue === null) {
        return null; // Set to NULL for empty strings
      }
      // Validate date format
      const date = new Date(dateValue);
      if (isNaN(date.getTime())) {
        return null; // Invalid date becomes NULL
      }
      return dateValue; // Valid date string
    };

    // CONDITIONAL RULE: If installation type is fixed or semi-permanent, set status to "in-use"
    let finalStatus = status || autoStatus;
    if (installation_type === 'fixed' || installation_type === 'semi-permanent') {
      finalStatus = 'in-use';
      console.log(`[EQUIPMENT CREATE] Setting status to "in-use" because installation type is ${installation_type}`);
    }

    const equipmentData = {
      type: equipmentType.name,
      type_id: type_id,
      category,
      category_id: category_id || null,
      brand,
      model,
      serial_number,
      status: finalStatus,
      location: locationName, // This will be the current location (installation or storage)
      location_id: finalLocationId, // This will be the storage location_id for database compatibility
      description,
      quantity: equipmentQuantity,
      // Installation fields
      installation_type: installation_type || 'portable',
      installation_location_id: installation_location_id || null,
      installation_location: installation_location || null,
      installation_date: processDateField(installation_date),
      installation_notes: installation_notes || null,
      installation_quantity: equipmentInstallationQuantity,
      maintenance_schedule: maintenance_schedule || null,
      last_maintenance_date: processDateField(last_maintenance_date),
      next_maintenance_date: processDateField(next_maintenance_date)
    };

    console.log(`[EQUIPMENT CREATE] Final equipment data:`, {
      location: equipmentData.location,
      location_id: equipmentData.location_id,
      installation_type: equipmentData.installation_type,
      installation_location: equipmentData.installation_location,
      installation_location_id: equipmentData.installation_location_id,
      status: equipmentData.status,
      quantity: equipmentData.quantity,
      installation_quantity: equipmentData.installation_quantity
    });

    // Only add reference_image_id if it's not empty and not 'new'
    if (reference_image_id && reference_image_id !== '' && reference_image_id !== 'new') {
      equipmentData.reference_image_id = reference_image_id;
    }

    // Create equipment
    const equipment = await Equipment.create(equipmentData);

    // Log the equipment creation
    // TEMPORARILY DISABLED - Equipment log service causes deletion issues
    // await equipmentLogService.logCreation(equipment.id, req.user.id, equipmentData);

    // Handle file uploads if any
    let createdFiles = [];

    // Process regular files
    if (req.files && req.files.files && req.files.files.length > 0) {
      console.log(`Processing ${req.files.files.length} regular files for equipment`);

      const fileRecords = req.files.files.map(file => {
        // Get file type from mimetype
        let fileType = 'image';
        if (file.mimetype.startsWith('audio/')) {
          fileType = 'audio';
        } else if (file.mimetype === 'application/pdf') {
          fileType = 'pdf';
        }

        // Normalize file path for Docker environment
        const normalizedPath = file.path.replace(/\\/g, '/');

        // Get thumbnail path if available (for images)
        let thumbnailPath = null;
        if (fileType === 'image' && file.thumbnailPath) {
          thumbnailPath = file.thumbnailPath.replace(/\\/g, '/');
          console.log(`Found thumbnail for ${file.originalname}: ${thumbnailPath}`);
        }

        console.log(`File saved at: ${normalizedPath}`);
        if (thumbnailPath) {
          console.log(`Thumbnail saved at: ${thumbnailPath}`);
        }

        return {
          equipment_id: equipment.id,
          file_type: fileType,
          file_path: normalizedPath,
          file_name: file.originalFilename || file.originalname,
          thumbnail_path: thumbnailPath
        };
      });

      createdFiles = await File.bulkCreate(fileRecords);
    }

    // Process reference image if provided
    if (req.files && req.files.referenceImage && req.files.referenceImage.length > 0) {
      const referenceImageFile = req.files.referenceImage[0];

      // Normalize file path for Docker environment
      const normalizedPath = referenceImageFile.path.replace(/\\/g, '/');
      console.log(`Reference image saved at: ${normalizedPath}`);

      // Create file record for reference image
      const referenceFileRecord = await File.create({
        equipment_id: equipment.id,
        file_type: 'image',
        file_path: normalizedPath,
        file_name: referenceImageFile.originalname
      });

      // Update equipment with the reference image ID
      await equipment.update({
        reference_image_id: referenceFileRecord.id
      });

      console.log(`Set reference_image_id to ${referenceFileRecord.id}`);
    }

    // Get equipment with files
    const equipmentWithFiles = await Equipment.findByPk(equipment.id, {
      include: [
        {
          model: File,
          as: 'files',
          attributes: ['id', 'file_type', 'file_name', 'file_path']
        }
      ]
    });

    res.status(201).json(equipmentWithFiles);
  } catch (error) {
    console.error('Create equipment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Remove equipment from installation (return to portable status) - DELETE endpoint
router.delete('/:id/installation', authenticate, isAdvancedOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity } = req.body; // Get quantity from request body

    // Get current equipment
    const equipment = await Equipment.findByPk(id);
    if (!equipment) {
      return res.status(404).json({ message: 'Equipment not found' });
    }

    // Check if equipment is currently installed
    if (equipment.installation_type === 'portable') {
      return res.status(400).json({
        message: 'Equipment is already in portable status'
      });
    }

    const currentInstallationQuantity = equipment.installation_quantity || 0;
    const returnQuantity = quantity || currentInstallationQuantity;

    // Validate return quantity
    if (returnQuantity > currentInstallationQuantity) {
      return res.status(400).json({
        message: `Cannot return ${returnQuantity} items. Only ${currentInstallationQuantity} items are currently installed.`
      });
    }

    // Store old data for logging
    const oldData = {
      installation_type: equipment.installation_type,
      installation_location: equipment.installation_location,
      installation_location_id: equipment.installation_location_id,
      installation_quantity: equipment.installation_quantity
    };

    // Calculate new installation quantity
    const newInstallationQuantity = currentInstallationQuantity - returnQuantity;

    // If returning all items, set to portable status
    if (newInstallationQuantity === 0) {
      await equipment.update({
        installation_type: 'portable',
        installation_location_id: null,
        installation_location: null,
        installation_date: null,
        installation_notes: null,
        installation_quantity: 0,
        status: 'available' // Set status back to available when returning from installation
      });
    } else {
      // If returning partial quantity, just update the installation quantity
      await equipment.update({
        installation_quantity: newInstallationQuantity
      });
    }

    // Log the change using the existing logUpdate method
    await equipmentLogService.logUpdate(
      id,
      req.user.id,
      oldData,
      {
        installation_type: newInstallationQuantity === 0 ? 'portable' : equipment.installation_type,
        installation_location: newInstallationQuantity === 0 ? null : equipment.installation_location,
        installation_location_id: newInstallationQuantity === 0 ? null : equipment.installation_location_id,
        installation_quantity: newInstallationQuantity,
        status: newInstallationQuantity === 0 ? 'available' : equipment.status
      }
    );

    res.json({
      message: `Successfully returned ${returnQuantity} item${returnQuantity !== 1 ? 's' : ''} from installation${newInstallationQuantity === 0 ? ' (equipment now portable)' : ` (${newInstallationQuantity} items still installed)`}`,
      equipment: await Equipment.findByPk(id),
      returned_quantity: returnQuantity,
      remaining_installation_quantity: newInstallationQuantity
    });
  } catch (error) {
    console.error('Error returning equipment from installation:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update equipment installation details (admin and advanced users only) - MOVED BEFORE GENERAL ROUTE
router.put('/:id/installation', authenticate, isAdvancedOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      installation_type,
      installation_location_id,
      installation_location,
      installation_date,
      installation_notes,
      installation_quantity
    } = req.body;

    // Validate installation_type
    const validTypes = ['portable', 'semi-permanent', 'fixed'];
    if (!validTypes.includes(installation_type)) {
      return res.status(400).json({ message: 'Invalid installation type' });
    }

    // Get current equipment to validate quantity
    const equipment = await Equipment.findByPk(id);
    if (!equipment) {
      return res.status(404).json({ message: 'Equipment not found' });
    }

    const totalQuantity = equipment.quantity || 1;

    // Validate installation quantity
    if (installation_quantity && installation_quantity > totalQuantity) {
      return res.status(400).json({
        message: `Installation quantity cannot exceed total equipment quantity (${totalQuantity})`
      });
    }

    // For non-portable equipment, require location
    if (installation_type !== 'portable') {
      if (!installation_location_id && !installation_location) {
        return res.status(400).json({
          message: 'Installation location is required for fixed/semi-permanent equipment'
        });
      }
    }

    // Store old data for logging
    const oldData = {
      installation_type: equipment.installation_type,
      installation_location: equipment.installation_location,
      installation_location_id: equipment.installation_location_id
    };

    // Update equipment installation details
    await equipment.update({
      installation_type,
      installation_location_id: installation_location_id || null,
      installation_location: installation_location || null,
      installation_date: installation_date || null,
      installation_notes: installation_notes || null,
      installation_quantity: installation_quantity || null
    });

    console.log(`✅ Installation updated for equipment ${id}:`, {
      installation_type,
      installation_location: installation_location || null,
      installation_location_id: installation_location_id || null
    });

    res.json({
      message: 'Equipment installation details updated successfully',
      equipment: {
        id: equipment.id,
        installation_type: equipment.installation_type,
        installation_location: equipment.installation_location,
        installation_location_id: equipment.installation_location_id,
        installation_date: equipment.installation_date,
        installation_notes: equipment.installation_notes,
        installation_quantity: equipment.installation_quantity
      }
    });
  } catch (error) {
    console.error('Update equipment installation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update equipment (admin and advanced users only)
router.put('/:id', authenticate, restrictTo('admin', 'advanced'), upload.fields([
  { name: 'files', maxCount: MAX_FILES },
  { name: 'referenceImage', maxCount: 1 }
]), processImages, async (req, res) => {
  try {
    const {
      type_id,
      category,
      category_id,
      brand,
      model,
      serial_number,
      status,
      location,
      location_id,
      description,
      reference_image_id,
      location_id_is_null,
      type_id_is_null,
      category_id_is_null,
      quantity,
      // Installation fields
      installation_type,
      installation_location_id,
      installation_location,
      installation_date,
      installation_notes,
      installation_quantity,
      maintenance_schedule,
      last_maintenance_date,
      next_maintenance_date
    } = req.body;

    // Find equipment
    const equipment = await Equipment.findByPk(req.params.id);

    if (!equipment) {
      return res.status(404).json({ message: 'Equipment not found' });
    }

    // Check if serial number already exists (if changed)
    if (serial_number && serial_number !== equipment.serial_number) {
      const { Op } = require('sequelize');
      const existingEquipment = await Equipment.findOne({
        where: {
          serial_number,
          id: { [Op.ne]: equipment.id } // Exclude current equipment
        }
      });

      if (existingEquipment) {
        return res.status(400).json({
          message: 'Equipment with this serial number already exists'
        });
      }
    }

    // Get the type name from the type_id if provided
    let typeName = equipment.type;
    let typeId = equipment.type_id;

    if (type_id) {
      try {
        const equipmentType = await EquipmentType.findByPk(type_id);

        if (!equipmentType) {
          return res.status(400).json({
            message: 'Invalid equipment type'
          });
        }

        typeName = equipmentType.name;
        typeId = parseInt(type_id, 10);
      } catch (err) {
        console.error('Error finding equipment type:', err);
        return res.status(400).json({
          message: 'Error processing equipment type'
        });
      }
    }

    // Handle quantity field - convert to integer and default to 1 if not provided or invalid
    let equipmentQuantity = 1; // Default quantity
    if (quantity !== undefined && quantity !== null && quantity !== '') {
      const parsedQuantity = parseInt(quantity, 10);
      if (!isNaN(parsedQuantity) && parsedQuantity > 0) {
        equipmentQuantity = parsedQuantity;
      }
    }

    // Helper function to handle date fields properly
    const processDateField = (dateValue, currentValue) => {
      if (dateValue === undefined) {
        return currentValue; // Keep existing value
      }
      if (dateValue === '' || dateValue === null) {
        return null; // Set to NULL for empty strings
      }
      // Validate date format
      const date = new Date(dateValue);
      if (isNaN(date.getTime())) {
        return null; // Invalid date becomes NULL
      }
      return dateValue; // Valid date string
    };

    // Prepare update data
    const updateData = {
      type: typeName,
      type_id: type_id_is_null === 'true' ? null : typeId,
      category: category !== undefined ? category : equipment.category,
      category_id: category_id_is_null === 'true' ? null : (category_id !== undefined ? category_id : equipment.category_id),
      brand: brand || equipment.brand,
      model: model || equipment.model,
      serial_number: serial_number || equipment.serial_number,
      status: status || equipment.status,
      location: location !== undefined ? location : equipment.location,
      location_id: location_id_is_null === 'true' ? null : (location_id !== undefined ? location_id : equipment.location_id),
      description: description !== undefined ? description : equipment.description,
      quantity: equipmentQuantity,
      // Installation fields with proper date handling
      installation_type: installation_type !== undefined ? installation_type : equipment.installation_type,
      installation_location_id: installation_location_id === 'null' || installation_location_id === '' ? null : (installation_location_id !== undefined ? installation_location_id : equipment.installation_location_id),
      installation_location: installation_location !== undefined ? installation_location : equipment.installation_location,
      installation_date: processDateField(installation_date, equipment.installation_date),
      installation_notes: installation_notes !== undefined ? installation_notes : equipment.installation_notes,
      installation_quantity: installation_quantity !== undefined ? parseInt(installation_quantity, 10) || 0 : equipment.installation_quantity,
      maintenance_schedule: maintenance_schedule !== undefined ? maintenance_schedule : equipment.maintenance_schedule,
      last_maintenance_date: processDateField(last_maintenance_date, equipment.last_maintenance_date),
      next_maintenance_date: processDateField(next_maintenance_date, equipment.next_maintenance_date)
    };

    // ALWAYS handle location and location_id together to ensure consistency
    console.log(`[EQUIPMENT UPDATE] Processing location data: location_id=${location_id}, location=${location}`);

    // Case 1: If location_id is provided (not null, not undefined, not empty string)
    if (location_id) {
      try {
        const locationRecord = await Location.findByPk(location_id);
        if (locationRecord) {
          // Always set the location name from the database record
          updateData.location = locationRecord.name;
          console.log(`[EQUIPMENT UPDATE] Setting location name to: ${locationRecord.name} from location_id: ${location_id}`);

          // ENHANCED: Check if location is Lager and update status accordingly
          // Always check case-insensitively
          if (locationRecord.name.toLowerCase() === 'lager') {
            console.log(`[EQUIPMENT UPDATE] Location is Lager, setting status to available`);
            updateData.status = 'available';
          } else if (updateData.status !== 'maintenance') {
            console.log(`[EQUIPMENT UPDATE] Location is not Lager (${locationRecord.name}), setting status to in-use`);
            updateData.status = 'in-use';
          }
        } else {
          console.log(`[EQUIPMENT UPDATE] Warning: Location with ID ${location_id} not found in database`);
        }
      } catch (error) {
        console.error('[EQUIPMENT UPDATE] Error fetching location name:', error);
      }
    }
    // Case 2: If location_id is explicitly empty or null, but location has a value (custom location)
    else if ((location_id === '' || location_id === null) && location) {
      console.log(`[EQUIPMENT UPDATE] Using custom location name: ${location}`);
      updateData.location = location;

      // ENHANCED: Check if custom location is Lager and update status accordingly
      // Always check case-insensitively and handle all cases
      if (location.toLowerCase() === 'lager') {
        console.log(`[EQUIPMENT UPDATE] Custom location is Lager, setting status to available`);
        updateData.status = 'available';
      } else if (updateData.status !== 'maintenance') {
        console.log(`[EQUIPMENT UPDATE] Custom location is not Lager (${location}), setting status to in-use`);
        updateData.status = 'in-use';
      }
    }
    // Case 3: If both location_id and location are empty/null
    else if ((location_id === '' || location_id === null) && (location === '' || location === null || location === undefined)) {
      console.log('[EQUIPMENT UPDATE] Both location_id and location are empty, clearing location');
      updateData.location = '';
    }
    // Case 4: If location_id is undefined but location has a value
    else if (location_id === undefined && location !== undefined) {
      console.log(`[EQUIPMENT UPDATE] Using provided location name: ${location}`);
      updateData.location = location;
    }

    // Handle reference_image_id separately to avoid empty string issues
    if (reference_image_id !== undefined) {
      if (reference_image_id === '' || reference_image_id === null) {
        updateData.reference_image_id = null;
      } else {
        updateData.reference_image_id = reference_image_id;
      }
    }

    console.log('Updating equipment with data:', updateData);

    // Store old data for logging
    const oldData = {
      type: equipment.type,
      brand: equipment.brand,
      model: equipment.model,
      serial_number: equipment.serial_number,
      status: equipment.status,
      location: equipment.location
    };

    // Log the update data for debugging
    console.log('[EQUIPMENT UPDATE] Final update data:', JSON.stringify(updateData));

    // Update equipment
    await equipment.update(updateData);

    // Log the equipment update
    // TEMPORARILY DISABLED - Equipment log service causes deletion issues
    // await equipmentLogService.logUpdate(equipment.id, req.user.id, oldData, updateData);

    // Handle file deletions if any
    try {
      let filesToDelete = [];
      if (req.body.filesToDelete) {
        try {
          filesToDelete = JSON.parse(req.body.filesToDelete);
          console.log('Files to delete:', filesToDelete);
        } catch (parseError) {
          console.error('Error parsing filesToDelete:', parseError);
          // If it's not valid JSON, try to use it as is if it's an array
          if (Array.isArray(req.body.filesToDelete)) {
            filesToDelete = req.body.filesToDelete;
          }
        }
      }

      if (filesToDelete && filesToDelete.length > 0) {
        // Find files to delete
        const files = await File.findAll({
          where: {
            id: { [Op.in]: filesToDelete },
            equipment_id: equipment.id
          }
        });

        console.log(`Found ${files.length} files to delete`);

        // Delete files from storage
        for (const file of files) {
          try {
            await fs.unlink(file.file_path);
            console.log(`Deleted file ${file.file_path}`);
          } catch (err) {
            console.error(`Failed to delete file ${file.file_path}:`, err);
            // Continue even if file deletion fails
          }
        }

        // Delete file records from database
        const deleteResult = await File.destroy({
          where: {
            id: { [Op.in]: filesToDelete },
            equipment_id: equipment.id
          }
        });

        console.log(`Deleted ${deleteResult} file records from database`);
      }
    } catch (fileDeleteError) {
      console.error('Error handling file deletions:', fileDeleteError);
      // Continue with the request even if file deletion fails
    }

    // Handle file uploads if any
    let createdFiles = [];

    // Process regular files
    if (req.files && req.files.files && req.files.files.length > 0) {
      console.log(`Processing ${req.files.files.length} regular files for equipment update`);

      const fileRecords = req.files.files.map(file => {
        // Get file type from mimetype
        let fileType = 'image';
        if (file.mimetype.startsWith('audio/')) {
          fileType = 'audio';
        } else if (file.mimetype === 'application/pdf') {
          fileType = 'pdf';
        }

        // Normalize file path for Docker environment
        const normalizedPath = file.path.replace(/\\/g, '/');

        // Get thumbnail path if available (for images)
        let thumbnailPath = null;
        if (fileType === 'image' && file.thumbnailPath) {
          thumbnailPath = file.thumbnailPath.replace(/\\/g, '/');
          console.log(`Found thumbnail for ${file.originalname}: ${thumbnailPath}`);
        }

        console.log(`File saved at: ${normalizedPath}`);
        if (thumbnailPath) {
          console.log(`Thumbnail saved at: ${thumbnailPath}`);
        }

        return {
          equipment_id: equipment.id,
          file_type: fileType,
          file_path: normalizedPath,
          file_name: file.originalFilename || file.originalname,
          thumbnail_path: thumbnailPath
        };
      });

      createdFiles = await File.bulkCreate(fileRecords);
    }

    // Process reference image if provided
    if (req.files && req.files.referenceImage && req.files.referenceImage.length > 0) {
      try {
        const referenceImageFile = req.files.referenceImage[0];

        // Normalize file path for Docker environment
        const normalizedPath = referenceImageFile.path.replace(/\\/g, '/');
        console.log(`Reference image saved at: ${normalizedPath}`);

        // Create file record for reference image
        const referenceFileRecord = await File.create({
          equipment_id: equipment.id,
          file_type: 'image',
          file_path: normalizedPath,
          file_name: referenceImageFile.originalname
        });

        // Update equipment with the reference image ID
        // Use direct SQL to avoid issues with empty location_id
        await sequelize.query(
          'UPDATE equipment SET reference_image_id = ? WHERE id = ?',
          {
            replacements: [referenceFileRecord.id, equipment.id],
            type: sequelize.QueryTypes.UPDATE
          }
        );

        console.log(`Set reference_image_id to ${referenceFileRecord.id}`);
      } catch (error) {
        console.error('Error processing reference image:', error);
        throw error;
      }
    } else if (req.body.removeReferenceImage === 'true') {
      // If removeReferenceImage flag is set, clear the reference image
      try {
        // Use direct SQL to avoid issues with empty location_id
        await sequelize.query(
          'UPDATE equipment SET reference_image_id = NULL WHERE id = ?',
          {
            replacements: [equipment.id],
            type: sequelize.QueryTypes.UPDATE
          }
        );

        console.log('Removed reference image');
      } catch (error) {
        console.error('Error removing reference image:', error);
        throw error;
      }
    }

    // Get updated equipment with files
    const updatedEquipment = await Equipment.findByPk(equipment.id, {
      include: [
        {
          model: File,
          as: 'files',
          attributes: ['id', 'file_type', 'file_name', 'file_path']
        }
      ]
    });

    res.json(updatedEquipment);
  } catch (error) {
    console.error('Update equipment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete equipment (admin and advanced users only)
router.delete('/:id', authenticate, restrictTo('admin', 'advanced'), async (req, res) => {
  let transaction = null;

  try {
    console.log(`[EQUIPMENT] DELETE request for equipment ID: ${req.params.id}`);

    // Start a transaction
    transaction = await sequelize.transaction();

    // Find equipment with files
    const equipment = await Equipment.findByPk(req.params.id, {
      include: [
        {
          model: File,
          as: 'files',
          attributes: ['id', 'file_type', 'file_name', 'file_path', 'thumbnail_path']
        }
      ],
      transaction
    });

    if (!equipment) {
      await transaction.rollback();
      console.log(`[EQUIPMENT] Equipment with ID ${req.params.id} not found`);
      return res.status(404).json({ message: 'Equipment not found' });
    }

    console.log(`[EQUIPMENT] Found equipment: ${equipment.brand} ${equipment.model} (${equipment.serial_number})`);

    // Store equipment data for logging
    const equipmentData = {
      type: equipment.type,
      brand: equipment.brand,
      model: equipment.model,
      serial_number: equipment.serial_number,
      status: equipment.status,
      location: equipment.location
    };

    // Get file IDs and paths for deletion
    const fileIds = equipment.files.map(file => file.id);
    const filePaths = equipment.files.map(file => ({
      id: file.id,
      path: file.file_path,
      thumbnail_path: file.thumbnail_path
    }));

    console.log(`[EQUIPMENT] Found ${filePaths.length} files associated with equipment`);

    // DIRECT SQL APPROACH - Most reliable method
    try {
      // Step 1: Clear the reference_image_id to break the circular reference
      console.log(`[EQUIPMENT] Clearing reference_image_id for equipment ID: ${equipment.id}`);
      await sequelize.query(
        'UPDATE equipment SET reference_image_id = NULL WHERE id = ?',
        {
          replacements: [equipment.id],
          type: sequelize.QueryTypes.UPDATE,
          transaction
        }
      );

      // Step 2: Create a log entry for the deletion BEFORE deleting anything
      // DISABLED - Deletion logging causes foreign key constraint issues
      console.log(`[EQUIPMENT] Skipping deletion log entry for equipment ID: ${equipment.id} (disabled to prevent FK issues)`);
      // Note: Deletion logging is disabled because it creates foreign key constraint issues
      // The equipment_logs table has a foreign key to equipment.id, so we can't create a log
      // entry after deleting the equipment. We could create it before, but then if the deletion
      // fails, we'd have a log entry for a deletion that didn't happen.

      // Step 3: Delete all equipment logs associated with this equipment
      console.log(`[EQUIPMENT] Deleting equipment logs for equipment ID: ${equipment.id}`);
      await sequelize.query(
        'DELETE FROM equipment_logs WHERE equipment_id = ?',
        {
          replacements: [equipment.id],
          type: sequelize.QueryTypes.DELETE,
          transaction
        }
      );

      // Step 4: Delete all files associated with this equipment
      if (fileIds.length > 0) {
        console.log(`[EQUIPMENT] Deleting ${fileIds.length} files for equipment ID: ${equipment.id}`);
        await sequelize.query(
          'DELETE FROM files WHERE equipment_id = ?',
          {
            replacements: [equipment.id],
            type: sequelize.QueryTypes.DELETE,
            transaction
          }
        );
      }

      // Step 5: Delete the equipment record
      console.log(`[EQUIPMENT] Deleting equipment record ID: ${equipment.id}`);
      await sequelize.query(
        'DELETE FROM equipment WHERE id = ?',
        {
          replacements: [equipment.id],
          type: sequelize.QueryTypes.DELETE,
          transaction
        }
      );

      // Step 6: Delete physical files from disk
      for (const filePath of filePaths) {
        try {
          if (filePath.path) {
            await fs.unlink(path.resolve(filePath.path)).catch(err => {
              console.log(`[EQUIPMENT] Non-critical error deleting file from disk: ${err.message}`);
            });
          }
          if (filePath.thumbnail_path) {
            await fs.unlink(path.resolve(filePath.thumbnail_path)).catch(err => {
              console.log(`[EQUIPMENT] Non-critical error deleting thumbnail from disk: ${err.message}`);
            });
          }
        } catch (fileSystemError) {
          console.error(`[EQUIPMENT] Error deleting file from disk:`, fileSystemError);
          // Continue even if file deletion fails
        }
      }

      // Commit the transaction
      console.log(`[EQUIPMENT] About to commit transaction for equipment ID: ${equipment.id}`);
      await transaction.commit();
      console.log(`[EQUIPMENT] Transaction committed successfully for equipment ID: ${equipment.id}`);
      console.log(`[EQUIPMENT] Equipment deletion completed successfully`);

      res.json({ message: 'Equipment deleted successfully' });
    } catch (error) {
      // Rollback the transaction if there's an error
      if (transaction) {
        await transaction.rollback();
      }
      console.error('[EQUIPMENT] Error deleting equipment:', error);
      throw error;
    }
  } catch (error) {
    // Ensure transaction is rolled back
    if (transaction) {
      try {
        await transaction.rollback();
      } catch (rollbackError) {
        console.error('[EQUIPMENT] Error rolling back transaction:', rollbackError);
      }
    }

    console.error(`[EQUIPMENT] Delete equipment error for ID ${req.params.id}:`, error);
    console.error(`[EQUIPMENT] Error stack:`, error.stack);
    res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
});

// Update equipment status (admin and advanced users only)
router.patch('/:id/status', authenticate, isAdvancedOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Validate status
    const validStatuses = ['available', 'in-use', 'maintenance', 'unavailable', 'broken'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status value' });
    }

    // Find equipment
    const equipment = await Equipment.findByPk(id);

    if (!equipment) {
      return res.status(404).json({ message: 'Equipment not found' });
    }

    // Store old data for logging
    const oldData = {
      status: equipment.status
    };

    // Update equipment status
    await equipment.update({ status });

    // Log the status update
    // TEMPORARILY DISABLED - Equipment log service causes deletion issues
    // await equipmentLogService.logStatusChange(
    //   equipment.id,
    //   req.user.id,
    //   oldData.status,
    //   status
    // );

    res.json({
      message: 'Status updated successfully',
      equipment: {
        id: equipment.id,
        status: equipment.status
      }
    });
  } catch (error) {
    console.error('Update equipment status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update equipment location (admin and advanced users only)
router.patch('/:id/location', authenticate, isAdvancedOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { location, location_id } = req.body;

    // Find equipment
    const equipment = await Equipment.findByPk(id);

    if (!equipment) {
      return res.status(404).json({ message: 'Equipment not found' });
    }

    // Store old data for logging
    const oldData = {
      location: equipment.location,
      location_id: equipment.location_id
    };

    // Prepare update data
    const updateData = {};

    // Handle location_id if provided
    if (location_id) {
      try {
        const locationRecord = await Location.findByPk(location_id);
        if (locationRecord) {
          updateData.location = locationRecord.name;
          updateData.location_id = location_id;

          // Update status based on location
          if (locationRecord.name.toLowerCase() === 'lager') {
            updateData.status = 'available';
          } else if (equipment.status !== 'maintenance') {
            updateData.status = 'in-use';
          }
        }
      } catch (error) {
        console.error('Error fetching location:', error);
      }
    }
    // Handle custom location if provided
    else if (location) {
      updateData.location = location;
      updateData.location_id = null;

      // Update status based on location
      if (location.toLowerCase() === 'lager') {
        updateData.status = 'available';
      } else if (equipment.status !== 'maintenance') {
        updateData.status = 'in-use';
      }
    }

    // Update equipment
    await equipment.update(updateData);

    // Log the location update
    // TEMPORARILY DISABLED - Equipment log service causes deletion issues
    // await equipmentLogService.logLocationChange(
    //   equipment.id,
    //   req.user.id,
    //   oldData.location,
    //   updateData.location
    // );

    res.json({
      message: 'Location updated successfully',
      equipment: {
        id: equipment.id,
        location: equipment.location,
        location_id: equipment.location_id,
        status: equipment.status
      }
    });
  } catch (error) {
    console.error('Update equipment location error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update equipment type (admin and advanced users only)
router.patch('/:id/type', authenticate, isAdvancedOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { type_id } = req.body;

    // Validate type_id
    if (!type_id) {
      return res.status(400).json({ message: 'Type ID is required' });
    }

    // Find equipment
    const equipment = await Equipment.findByPk(id);

    if (!equipment) {
      return res.status(404).json({ message: 'Equipment not found' });
    }

    // Find the type to get its name
    const typeRecord = await EquipmentType.findByPk(type_id);

    if (!typeRecord) {
      return res.status(404).json({ message: 'Equipment type not found' });
    }

    // Store old data for logging
    const oldData = {
      type: equipment.type,
      type_id: equipment.type_id
    };

    // Update equipment
    await equipment.update({
      type: typeRecord.name,
      type_id: type_id
    });

    // Log the type update
    // TEMPORARILY DISABLED - Equipment log service causes deletion issues
    // await equipmentLogService.logUpdate(
    //   equipment.id,
    //   req.user.id,
    //   oldData,
    //   { type: typeRecord.name, type_id }
    // );

    res.json({
      message: 'Type updated successfully',
      equipment: {
        id: equipment.id,
        type: equipment.type,
        type_id: equipment.type_id
      }
    });
  } catch (error) {
    console.error('Update equipment type error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update equipment category (admin and advanced users only)
router.patch('/:id/category', authenticate, isAdvancedOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { category_id } = req.body;

    // Find equipment
    const equipment = await Equipment.findByPk(id);

    if (!equipment) {
      return res.status(404).json({ message: 'Equipment not found' });
    }

    // Store old data for logging
    const oldData = {
      category: equipment.category,
      category_id: equipment.category_id
    };

    // Prepare update data
    const updateData = {
      category: '',
      category_id: null
    };

    // If category_id is provided, fetch the category name
    if (category_id) {
      try {
        const categoryRecord = await Category.findByPk(category_id);
        if (categoryRecord) {
          updateData.category = categoryRecord.name;
          updateData.category_id = category_id;
        }
      } catch (error) {
        console.error('Error fetching category:', error);
      }
    }

    // Update equipment
    await equipment.update(updateData);

    // Log the category update
    // TEMPORARILY DISABLED - Equipment log service causes deletion issues
    // await equipmentLogService.logUpdate(
    //   equipment.id,
    //   req.user.id,
    //   oldData,
    //   updateData
    // );

    res.json({
      message: 'Category updated successfully',
      equipment: {
        id: equipment.id,
        category: equipment.category,
        category_id: equipment.category_id
      }
    });
  } catch (error) {
    console.error('Update equipment category error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update equipment brand and model (admin and advanced users only)
router.patch('/:id/brand-model', authenticate, isAdvancedOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { brand, model } = req.body;

    // Validate that at least one field is provided
    if (!brand && !model) {
      return res.status(400).json({ message: 'At least one of brand or model must be provided' });
    }

    // Find equipment
    const equipment = await Equipment.findByPk(id);

    if (!equipment) {
      return res.status(404).json({ message: 'Equipment not found' });
    }

    // Store old data for logging
    const oldData = {
      brand: equipment.brand,
      model: equipment.model
    };

    // Prepare update data
    const updateData = {};
    if (brand) updateData.brand = brand;
    if (model) updateData.model = model;

    // Update equipment
    await equipment.update(updateData);

    // Log the update
    // TEMPORARILY DISABLED - Equipment log service causes deletion issues
    // await equipmentLogService.logUpdate(
    //   equipment.id,
    //   req.user.id,
    //   oldData,
    //   updateData
    // );

    res.json({
      message: 'Brand/model updated successfully',
      equipment: {
        id: equipment.id,
        brand: equipment.brand,
        model: equipment.model
      }
    });
  } catch (error) {
    console.error('Update equipment brand/model error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// UNIFIED AVAILABILITY CALCULATION - Single source of truth
router.get('/:id/availability', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🔍 UNIFIED availability request for equipment ID: ${id}`);

    // Use the unified calculation method from inventoryService
    const availability = await inventoryService.getEquipmentAvailability(id);

    if (!availability) {
      return res.status(404).json({ message: 'Equipment not found' });
    }

    console.log(`✅ UNIFIED availability result for equipment ${id}:`, {
      total: availability.total_quantity,
      allocated: availability.total_allocated,
      show_allocated: availability.show_allocated,
      available: availability.available_quantity
    });

    res.json(availability);
  } catch (error) {
    console.error('Error getting equipment availability:', error);
    res.status(500).json({ message: 'Error getting equipment availability' });
  }
});

// Get equipment location allocations
router.get('/:id/allocations', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    console.log(`[ALLOCATIONS] GET request for equipment ID: ${id}`);

    // Get current allocations
    const allocations = await sequelize.query(`
      SELECT
        ia.id,
        ia.equipment_id,
        ia.location_id,
        ia.quantity_allocated,
        ia.status,
        ia.allocation_type,
        ia.notes,
        ia.allocated_date,
        l.name as location_name
      FROM inventory_allocation ia
      JOIN locations l ON ia.location_id = l.id
      WHERE ia.equipment_id = ?
        AND ia.status IN ('allocated', 'in-use', 'reserved', 'maintenance')
      ORDER BY ia.allocated_date DESC
    `, {
      replacements: [id],
      type: sequelize.QueryTypes.SELECT
    });

    console.log(`[ALLOCATIONS] Found ${allocations.length} allocations for equipment ${id}`);

    res.json({
      success: true,
      allocations: allocations
    });

  } catch (error) {
    console.error('[ALLOCATIONS] Error fetching allocations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch equipment allocations',
      error: error.message
    });
  }
});

// Update equipment location allocations
router.post('/:id/allocations', authenticate, async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { id } = req.params;
    const { allocations } = req.body;
    const userId = req.user.id;

    console.log(`[ALLOCATIONS] POST request for equipment ID: ${id}`);
    console.log(`[ALLOCATIONS] Allocations data:`, allocations);

    // Validate equipment exists
    const equipment = await Equipment.findByPk(id);
    if (!equipment) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Equipment not found'
      });
    }

    // Validate total quantity - allow partial allocations
    const totalQuantity = equipment.quantity || 1;
    const allocatedQuantity = allocations.reduce((sum, alloc) => sum + (parseInt(alloc.quantity) || 0), 0);

    if (allocatedQuantity > totalQuantity) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: `Total allocated quantity (${allocatedQuantity}) cannot exceed equipment quantity (${totalQuantity})`
      });
    }

    // Allow empty allocations - means all items stay in current location
    if (allocatedQuantity === 0) {
      console.log(`[ALLOCATIONS] No allocations specified - clearing all location allocations for equipment ${id}`);

      // Clear existing location-based allocations only
      await sequelize.query(`
        UPDATE inventory_allocation
        SET status = 'returned', return_date = NOW(), returned_by = ?
        WHERE equipment_id = ?
          AND allocation_type = 'location'
          AND status IN ('allocated', 'in-use', 'reserved', 'maintenance')
      `, {
        replacements: [userId, id],
        type: sequelize.QueryTypes.UPDATE,
        transaction
      });

      await transaction.commit();

      return res.json({
        success: true,
        message: 'All location allocations cleared - equipment remains in current location'
      });
    }

    // Clear ALL existing allocations for this equipment (both location and storage types)
    await sequelize.query(`
      UPDATE inventory_allocation
      SET status = 'returned', return_date = NOW(), returned_by = ?
      WHERE equipment_id = ?
        AND status IN ('allocated', 'in-use', 'reserved', 'maintenance')
    `, {
      replacements: [userId, id],
      type: sequelize.QueryTypes.UPDATE,
      transaction
    });

    console.log(`[ALLOCATIONS] Cleared all existing allocations for equipment ${id}`);

    // Create new allocations only for what the user specified
    for (const allocation of allocations) {
      await sequelize.query(`
        INSERT INTO inventory_allocation (
          equipment_id, location_id, quantity_allocated, status,
          allocation_type, allocated_by, notes, allocated_date
        ) VALUES (?, ?, ?, ?, 'location', ?, ?, NOW())
      `, {
        replacements: [
          id,
          allocation.location_id,
          allocation.quantity,
          allocation.status,
          userId,
          allocation.notes || 'Location allocation'
        ],
        type: sequelize.QueryTypes.INSERT,
        transaction
      });

      console.log(`[ALLOCATIONS] Created allocation: ${allocation.quantity} items to location ${allocation.location_id}`);
    }

    // Note: Unallocated items remain in equipment's current location without explicit allocation records
    const unallocatedQuantity = totalQuantity - allocatedQuantity;
    if (unallocatedQuantity > 0) {
      console.log(`[ALLOCATIONS] ${unallocatedQuantity} items will remain in equipment's current location without explicit allocation`);
    }

    await transaction.commit();

    console.log(`[ALLOCATIONS] Successfully updated allocations for equipment ${id}`);

    res.json({
      success: true,
      message: 'Equipment allocations updated successfully'
    });

  } catch (error) {
    await transaction.rollback();
    console.error('[ALLOCATIONS] Error updating allocations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update equipment allocations',
      error: error.message
    });
  }
});

// Clean up all allocations (development only)
router.post('/cleanup-allocations', authenticate, async (req, res) => {
  if (process.env.NODE_ENV !== 'development') {
    return res.status(403).json({
      success: false,
      message: 'This endpoint is only available in development mode'
    });
  }

  try {
    console.log('[CLEANUP] Starting allocation cleanup...');

    // Clean up ALL allocations
    const result = await sequelize.query(`
      UPDATE inventory_allocation
      SET status = 'returned', return_date = NOW(), returned_by = ?
      WHERE status IN ('allocated', 'in-use', 'reserved', 'maintenance')
    `, {
      replacements: [req.user.id],
      type: sequelize.QueryTypes.UPDATE
    });

    console.log('[CLEANUP] Allocation cleanup completed');

    res.json({
      success: true,
      message: 'All allocations have been cleaned up'
    });

  } catch (error) {
    console.error('[CLEANUP] Error during cleanup:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clean up allocations',
      error: error.message
    });
  }
});

module.exports = router;
