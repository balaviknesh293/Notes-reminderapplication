const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const excelManager = require('../excel/excelManager');
const authMiddleware = require('../auth/authMiddleware');

router.use(authMiddleware);

// 1. Get all categories for user
router.get('/', (req, res) => {
  const userId = req.user.userId;
  const cats = excelManager.categories.filter((c) => c.userId === userId);

  // Return categories with note count
  const withCounts = cats.map((cat) => {
    const noteCount = excelManager.notes.filter(
      (n) => n.userId === userId && n.category.toLowerCase() === cat.categoryName.toLowerCase()
    ).length;
    return { ...cat, noteCount };
  });

  return res.json({ success: true, count: withCounts.length, data: withCounts });
});

// 2. Create category
router.post('/', async (req, res) => {
  try {
    const { categoryName, color } = req.body;
    if (!categoryName || !categoryName.trim()) {
      return res.status(400).json({ success: false, message: 'Category name is required.' });
    }

    const trimmed = categoryName.trim();
    const existing = excelManager.categories.find(
      (c) => c.userId === req.user.userId && c.categoryName.toLowerCase() === trimmed.toLowerCase()
    );

    if (existing) {
      return res.status(400).json({ success: false, message: 'Category already exists.' });
    }

    const newCat = {
      categoryId: crypto.randomUUID(),
      userId: req.user.userId,
      categoryName: trimmed,
      color: color || '#3b82f6'
    };

    excelManager.categories.push(newCat);
    await excelManager.saveToExcel();

    return res.status(201).json({ success: true, message: 'Category created.', data: newCat });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to create category.' });
  }
});

// 3. Delete category
router.delete('/:id', async (req, res) => {
  try {
    const idx = excelManager.categories.findIndex(
      (c) => c.userId === req.user.userId && c.categoryId === req.params.id
    );

    if (idx === -1) {
      return res.status(404).json({ success: false, message: 'Category not found.' });
    }

    excelManager.categories.splice(idx, 1);
    await excelManager.saveToExcel();

    return res.json({ success: true, message: 'Category deleted.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to delete category.' });
  }
});

module.exports = router;
