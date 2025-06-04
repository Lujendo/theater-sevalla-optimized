import axios from 'axios';

/**
 * Get all equipment logs with pagination and filters
 * @param {Object} options - Query options
 * @returns {Promise<Object>} The logs with pagination info
 */
export const getAllEquipmentLogs = async ({
  page = 1,
  limit = 20,
  equipmentId,
  userId,
  actionType,
  search,
  type,
  status,
  location_id,
  sortBy = 'created_at',
  sortOrder = 'desc'
}) => {
  const params = { page, limit };

  if (equipmentId) params.equipmentId = equipmentId;
  if (userId) params.userId = userId;
  if (actionType) params.actionType = actionType;
  if (search) params.search = search;
  if (type) params.type = type;
  if (status) params.status = status;
  if (location_id) params.location_id = location_id;
  if (sortBy) params.sortBy = sortBy;
  if (sortOrder) params.sortOrder = sortOrder;

  const response = await axios.get('/api/equipment-logs', { params });
  return response.data;
};

/**
 * Get logs for a specific equipment
 * @param {number} equipmentId - ID of the equipment
 * @param {Object} options - Query options
 * @returns {Promise<Object>} The logs with pagination info
 */
export const getEquipmentLogs = async (equipmentId, { page = 1, limit = 20 } = {}) => {
  const params = { page, limit };
  const response = await axios.get(`/api/equipment-logs/equipment/${equipmentId}`, { params });
  return response.data;
};
