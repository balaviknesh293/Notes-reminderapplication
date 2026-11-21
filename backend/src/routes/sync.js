const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const excelManager = require('../excel/excelManager');
const authMiddleware = require('../auth/authMiddleware');

router.use(authMiddleware);

// Batch sync endpoint for offline mutations
router.post('/batch', async (req, res) => {
  try {
    const userId = req.user.userId;
    const { offlineActions } = req.body; // Array of { type, entity, data }

    let createdNotes = 0;
    let updatedNotes = 0;
    let createdTasks = 0;
    let updatedTasks = 0;

    if (Array.isArray(offlineActions)) {
      for (const action of offlineActions) {
        const { type, entity, data } = action;

        if (entity === 'note') {
          if (type === 'create') {
            const exists = excelManager.notes.find((n) => n.userId === userId && n.noteId === data.noteId);
            if (!exists) {
              excelManager.notes.unshift({
                noteId: data.noteId || crypto.randomUUID(),
                userId,
                noteTitle: (data.noteTitle || 'Untitled Note').trim(),
                noteDescription: data.noteDescription || '',
                category: data.category || 'General',
                createdDate: data.createdDate || new Date().toISOString(),
                updatedDate: data.updatedDate || new Date().toISOString(),
                pinned: Boolean(data.pinned),
                archived: Boolean(data.archived),
                tags: Array.isArray(data.tags) ? data.tags : [],
                attachments: Array.isArray(data.attachments) ? data.attachments : []
              });
              createdNotes++;
            }
          } else if (type === 'update') {
            const note = excelManager.notes.find((n) => n.userId === userId && n.noteId === data.noteId);
            if (note) {
              if (data.noteTitle !== undefined) note.noteTitle = data.noteTitle;
              if (data.noteDescription !== undefined) note.noteDescription = data.noteDescription;
              if (data.category !== undefined) note.category = data.category;
              if (data.pinned !== undefined) note.pinned = data.pinned;
              if (data.archived !== undefined) note.archived = data.archived;
              if (data.tags !== undefined) note.tags = data.tags;
              note.updatedDate = new Date().toISOString();
              updatedNotes++;
            }
          } else if (type === 'delete') {
            const idx = excelManager.notes.findIndex((n) => n.userId === userId && n.noteId === data.noteId);
            if (idx !== -1) {
              excelManager.notes.splice(idx, 1);
            }
          }
        }

        if (entity === 'task') {
          if (type === 'create') {
            const exists = excelManager.tasks.find((t) => t.userId === userId && t.taskId === data.taskId);
            if (!exists) {
              excelManager.tasks.unshift({
                taskId: data.taskId || crypto.randomUUID(),
                userId,
                noteId: data.noteId || null,
                taskTitle: (data.taskTitle || 'Untitled Task').trim(),
                description: data.description || '',
                priority: data.priority || 'Medium',
                startDate: data.startDate || new Date().toISOString().slice(0, 10),
                deadlineDate: data.deadlineDate || '',
                deadlineTime: data.deadlineTime || '12:00',
                status: data.status || 'Pending',
                completionDate: data.completionDate || null,
                customReminders: Array.isArray(data.customReminders) ? data.customReminders : []
              });
              createdTasks++;
            }
          } else if (type === 'update') {
            const task = excelManager.tasks.find((t) => t.userId === userId && t.taskId === data.taskId);
            if (task) {
              Object.assign(task, data);
              updatedTasks++;
            }
          } else if (type === 'delete') {
            const idx = excelManager.tasks.findIndex((t) => t.userId === userId && t.taskId === data.taskId);
            if (idx !== -1) {
              excelManager.tasks.splice(idx, 1);
            }
          }
        }
      }

      await excelManager.saveToExcel();
    }

    // Return the fresh data for this user
    const currentNotes = excelManager.notes.filter((n) => n.userId === userId);
    const currentTasks = excelManager.tasks.filter((t) => t.userId === userId);
    const currentCategories = excelManager.categories.filter((c) => c.userId === userId);

    return res.json({
      success: true,
      message: 'Offline changes synchronized.',
      syncSummary: { createdNotes, updatedNotes, createdTasks, updatedTasks },
      data: {
        notes: currentNotes,
        tasks: currentTasks,
        categories: currentCategories
      }
    });
  } catch (err) {
    console.error('Sync batch error:', err);
    return res.status(500).json({ success: false, message: 'Sync failed: ' + err.message });
  }
});

module.exports = router;
