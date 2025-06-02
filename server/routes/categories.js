const express = require('express');
const router = express.Router();
const { Category } = require('../models');
const { authenticate, restrictTo } = require('../middleware/auth');

/**
 * @route GET /api/categories
 * @desc Get all categories
 * @access Private
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const categories = await Category.findAll({
      order: [['name', 'ASC']]
    });
    res.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route POST /api/categories
 * @desc Create a new category
 * @access Private (Admin only)
 */
router.post('/', authenticate, restrictTo('admin'), async (req, res) => {
  try {
    const { name, description } = req.body;

    // Validate input
    if (!name) {
      return res.status(400).json({ message: 'Category name is required' });
    }

    // Check if category already exists
    const existingCategory = await Category.findOne({ where: { name } });
    if (existingCategory) {
      return res.status(400).json({ message: 'Category already exists' });
    }

    // Create new category
    const category = await Category.create({
      name,
      description: description || ''
    });

    res.status(201).json(category);
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route PUT /api/categories/:id
 * @desc Update a category
 * @access Private (Admin only)
 */
router.put('/:id', authenticate, restrictTo('admin'), async (req, res) => {
  try {
    const { name, description } = req.body;
    const { id } = req.params;

    // Validate input
    if (!name) {
      return res.status(400).json({ message: 'Category name is required' });
    }

    // Find category
    const category = await Category.findByPk(id);
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    // Check if name is already taken by another category
    if (name !== category.name) {
      const existingCategory = await Category.findOne({ where: { name } });
      if (existingCategory) {
        return res.status(400).json({ message: 'Category name already exists' });
      }
    }

    // Update category
    await category.update({
      name,
      description: description || category.description
    });

    res.json(category);
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route DELETE /api/categories/:id
 * @desc Delete a category
 * @access Private (Admin only)
 */
router.delete('/:id', authenticate, restrictTo('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    // Find category
    const category = await Category.findByPk(id);
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    // Delete category
    await category.destroy();

    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
