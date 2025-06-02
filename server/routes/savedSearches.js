/**
 * Saved Searches API Routes
 * Handles CRUD operations for saved searches
 */
const express = require('express');
const { SavedSearch } = require('../models');
const auth = require('../middleware/flexAuth');

const router = express.Router();

// Get all saved searches for the current user
router.get('/', auth.required, async (req, res) => {
  try {
    console.log(`[SAVED-SEARCHES] GET /api/saved-searches - User: ${req.user.username}`);
    
    const savedSearches = await SavedSearch.findAll({
      where: { user_id: req.user.id },
      order: [['updated_at', 'DESC']]
    });
    
    console.log(`[SAVED-SEARCHES] Found ${savedSearches.length} saved searches for user ${req.user.id}`);
    res.json(savedSearches);
  } catch (error) {
    console.error('[SAVED-SEARCHES] Error getting saved searches:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get a specific saved search by ID
router.get('/:id', auth.required, async (req, res) => {
  try {
    console.log(`[SAVED-SEARCHES] GET /api/saved-searches/${req.params.id} - User: ${req.user.username}`);
    
    const savedSearch = await SavedSearch.findOne({
      where: { 
        id: req.params.id,
        user_id: req.user.id
      }
    });
    
    if (!savedSearch) {
      console.log(`[SAVED-SEARCHES] Saved search with ID ${req.params.id} not found for user ${req.user.id}`);
      return res.status(404).json({ message: 'Saved search not found' });
    }
    
    console.log(`[SAVED-SEARCHES] Found saved search: ${savedSearch.name}`);
    res.json(savedSearch);
  } catch (error) {
    console.error('[SAVED-SEARCHES] Error getting saved search:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create a new saved search
router.post('/', auth.required, async (req, res) => {
  try {
    console.log(`[SAVED-SEARCHES] POST /api/saved-searches - User: ${req.user.username}`);
    
    const { name, search_params, is_default } = req.body;
    
    // Validate input
    if (!name || !search_params) {
      return res.status(400).json({ message: 'Name and search parameters are required' });
    }
    
    // If this is set as default, unset any existing default
    if (is_default) {
      await SavedSearch.update(
        { is_default: false },
        { where: { user_id: req.user.id, is_default: true } }
      );
    }
    
    // Create the saved search
    const savedSearch = await SavedSearch.create({
      user_id: req.user.id,
      name,
      search_params,
      is_default: is_default || false
    });
    
    console.log(`[SAVED-SEARCHES] Created new saved search: ${savedSearch.name} (ID: ${savedSearch.id})`);
    res.status(201).json(savedSearch);
  } catch (error) {
    console.error('[SAVED-SEARCHES] Error creating saved search:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update a saved search
router.put('/:id', auth.required, async (req, res) => {
  try {
    console.log(`[SAVED-SEARCHES] PUT /api/saved-searches/${req.params.id} - User: ${req.user.username}`);
    
    const { name, search_params, is_default } = req.body;
    
    // Find the saved search
    const savedSearch = await SavedSearch.findOne({
      where: { 
        id: req.params.id,
        user_id: req.user.id
      }
    });
    
    if (!savedSearch) {
      console.log(`[SAVED-SEARCHES] Saved search with ID ${req.params.id} not found for user ${req.user.id}`);
      return res.status(404).json({ message: 'Saved search not found' });
    }
    
    // If this is set as default, unset any existing default
    if (is_default && !savedSearch.is_default) {
      await SavedSearch.update(
        { is_default: false },
        { where: { user_id: req.user.id, is_default: true } }
      );
    }
    
    // Update the saved search
    await savedSearch.update({
      name: name || savedSearch.name,
      search_params: search_params || savedSearch.search_params,
      is_default: is_default !== undefined ? is_default : savedSearch.is_default
    });
    
    console.log(`[SAVED-SEARCHES] Updated saved search: ${savedSearch.name} (ID: ${savedSearch.id})`);
    res.json(savedSearch);
  } catch (error) {
    console.error('[SAVED-SEARCHES] Error updating saved search:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete a saved search
router.delete('/:id', auth.required, async (req, res) => {
  try {
    console.log(`[SAVED-SEARCHES] DELETE /api/saved-searches/${req.params.id} - User: ${req.user.username}`);
    
    // Find the saved search
    const savedSearch = await SavedSearch.findOne({
      where: { 
        id: req.params.id,
        user_id: req.user.id
      }
    });
    
    if (!savedSearch) {
      console.log(`[SAVED-SEARCHES] Saved search with ID ${req.params.id} not found for user ${req.user.id}`);
      return res.status(404).json({ message: 'Saved search not found' });
    }
    
    // Delete the saved search
    await savedSearch.destroy();
    
    console.log(`[SAVED-SEARCHES] Deleted saved search: ${savedSearch.name} (ID: ${savedSearch.id})`);
    res.json({ message: 'Saved search deleted successfully' });
  } catch (error) {
    console.error('[SAVED-SEARCHES] Error deleting saved search:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
