const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const excelManager = require('../excel/excelManager');
const authMiddleware = require('../auth/authMiddleware');

router.use(authMiddleware);

// 1. Get all notes for user (with search, category, pinned, archive filters)
router.get('/', (req, res) => {
  const userId = req.user.userId;
  const { search, category, archived, pinned } = req.query;

  let result = excelManager.notes.filter((n) => n.userId === userId);

  // Archive filter (default false)
  if (archived === 'true') {
    result = result.filter((n) => n.archived === true);
  } else if (archived === 'all') {
    // include all
  } else {
    result = result.filter((n) => !n.archived);
  }

  // Pinned filter
  if (pinned === 'true') {
    result = result.filter((n) => n.pinned === true);
  }

  // Category filter
  if (category && category !== 'All') {
    result = result.filter((n) => n.category.toLowerCase() === category.toLowerCase());
  }

  // Search filter
  if (search && search.trim()) {
    const q = search.trim().toLowerCase();
    result = result.filter((n) => {
      const matchTitle = n.noteTitle.toLowerCase().includes(q);
      const matchDesc = n.noteDescription.toLowerCase().includes(q);
      const matchTags = Array.isArray(n.tags) && n.tags.some((t) => t.toLowerCase().includes(q));
      return matchTitle || matchDesc || matchTags;
    });
  }

  // Sort: pinned first, then by updatedDate desc
  result.sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return new Date(b.updatedDate) - new Date(a.updatedDate);
  });

  return res.json({ success: true, count: result.length, data: result });
});

// 2. Get single note
router.get('/:id', (req, res) => {
  const note = excelManager.notes.find((n) => n.userId === req.user.userId && n.noteId === req.params.id);
  if (!note) {
    return res.status(404).json({ success: false, message: 'Note not found.' });
  }
  return res.json({ success: true, data: note });
});

// 3. Create note
router.post('/', async (req, res) => {
  try {
    const { noteTitle, noteDescription, category, pinned, archived, tags, attachments } = req.body;

    const newNote = {
      noteId: crypto.randomUUID(),
      userId: req.user.userId,
      noteTitle: (noteTitle || '').trim() || 'Untitled Note',
      noteDescription: noteDescription || '',
      category: (category || 'General').trim(),
      createdDate: new Date().toISOString(),
      updatedDate: new Date().toISOString(),
      pinned: Boolean(pinned),
      archived: Boolean(archived),
      tags: Array.isArray(tags) ? tags : [],
      attachments: Array.isArray(attachments) ? attachments : []
    };

    excelManager.notes.unshift(newNote);
    await excelManager.saveToExcel();

    return res.status(201).json({ success: true, message: 'Note created successfully.', data: newNote });
  } catch (err) {
    console.error('Error creating note:', err);
    return res.status(500).json({ success: false, message: 'Failed to create note.' });
  }
});

// 4. Update note
router.put('/:id', async (req, res) => {
  try {
    const note = excelManager.notes.find((n) => n.userId === req.user.userId && n.noteId === req.params.id);
    if (!note) {
      return res.status(404).json({ success: false, message: 'Note not found.' });
    }

    const { noteTitle, noteDescription, category, pinned, archived, tags, attachments } = req.body;

    if (noteTitle !== undefined) note.noteTitle = (noteTitle || '').trim() || 'Untitled Note';
    if (noteDescription !== undefined) note.noteDescription = noteDescription;
    if (category !== undefined) note.category = (category || 'General').trim();
    if (pinned !== undefined) note.pinned = Boolean(pinned);
    if (archived !== undefined) note.archived = Boolean(archived);
    if (tags !== undefined) note.tags = Array.isArray(tags) ? tags : [];
    if (attachments !== undefined) note.attachments = Array.isArray(attachments) ? attachments : [];

    note.updatedDate = new Date().toISOString();

    await excelManager.saveToExcel();

    return res.json({ success: true, message: 'Note updated.', data: note });
  } catch (err) {
    console.error('Error updating note:', err);
    return res.status(500).json({ success: false, message: 'Failed to update note.' });
  }
});

// 5. Toggle Pin
router.patch('/:id/pin', async (req, res) => {
  try {
    const note = excelManager.notes.find((n) => n.userId === req.user.userId && n.noteId === req.params.id);
    if (!note) {
      return res.status(404).json({ success: false, message: 'Note not found.' });
    }

    note.pinned = !note.pinned;
    note.updatedDate = new Date().toISOString();
    await excelManager.saveToExcel();

    return res.json({ success: true, message: note.pinned ? 'Note pinned' : 'Note unpinned', data: note });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to toggle pin.' });
  }
});

// 6. Toggle Archive
router.patch('/:id/archive', async (req, res) => {
  try {
    const note = excelManager.notes.find((n) => n.userId === req.user.userId && n.noteId === req.params.id);
    if (!note) {
      return res.status(404).json({ success: false, message: 'Note not found.' });
    }

    note.archived = !note.archived;
    note.updatedDate = new Date().toISOString();
    await excelManager.saveToExcel();

    return res.json({ success: true, message: note.archived ? 'Note archived' : 'Note unarchived', data: note });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to toggle archive.' });
  }
});

// 7. Delete note
router.delete('/:id', async (req, res) => {
  try {
    const idx = excelManager.notes.findIndex((n) => n.userId === req.user.userId && n.noteId === req.params.id);
    if (idx === -1) {
      return res.status(404).json({ success: false, message: 'Note not found.' });
    }

    excelManager.notes.splice(idx, 1);
    await excelManager.saveToExcel();

    return res.json({ success: true, message: 'Note deleted successfully.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to delete note.' });
  }
});

// 8. Convert Note into Task
router.post('/:id/convert-to-task', async (req, res) => {
  try {
    const note = excelManager.notes.find((n) => n.userId === req.user.userId && n.noteId === req.params.id);
    if (!note) {
      return res.status(404).json({ success: false, message: 'Note not found.' });
    }

    const { taskTitle, description, priority, deadlineDate, deadlineTime, customReminders } = req.body;

    const newTask = {
      taskId: crypto.randomUUID(),
      userId: req.user.userId,
      noteId: note.noteId,
      taskTitle: (taskTitle || note.noteTitle || 'Task from Note').trim(),
      description: description !== undefined ? description : note.noteDescription,
      priority: ['Critical', 'High', 'Medium', 'Low'].includes(priority) ? priority : 'Medium',
      startDate: new Date().toISOString().slice(0, 10),
      deadlineDate: deadlineDate || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      deadlineTime: deadlineTime || '18:00',
      status: 'Pending',
      completionDate: null,
      customReminders: Array.isArray(customReminders) ? customReminders : []
    };

    excelManager.tasks.unshift(newTask);
    await excelManager.saveToExcel();

    return res.status(201).json({
      success: true,
      message: 'Note converted to task successfully!',
      data: newTask
    });
  } catch (err) {
    console.error('Error converting note to task:', err);
    return res.status(500).json({ success: false, message: 'Failed to convert note to task.' });
  }
});

module.exports = router;
