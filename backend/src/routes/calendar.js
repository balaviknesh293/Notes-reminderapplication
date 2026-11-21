const express = require('express');
const router = express.Router();
const excelManager = require('../excel/excelManager');
const authMiddleware = require('../auth/authMiddleware');

router.use(authMiddleware);

// Get calendar events for user
router.get('/events', (req, res) => {
  const userId = req.user.userId;
  const { startDate, endDate } = req.query;

  let tasks = excelManager.tasks.filter((t) => t.userId === userId && t.deadlineDate);

  if (startDate) {
    tasks = tasks.filter((t) => t.deadlineDate >= startDate);
  }
  if (endDate) {
    tasks = tasks.filter((t) => t.deadlineDate <= endDate);
  }

  // Format events with priority colors and associated note
  const events = tasks.map((t) => {
    let note = null;
    if (t.noteId) {
      note = excelManager.notes.find((n) => n.userId === userId && n.noteId === t.noteId);
    }

    return {
      id: t.taskId,
      taskId: t.taskId,
      title: t.taskTitle,
      description: t.description,
      priority: t.priority,
      status: t.status,
      date: t.deadlineDate,
      time: t.deadlineTime || '12:00',
      dateTime: `${t.deadlineDate}T${t.deadlineTime || '12:00'}:00`,
      noteId: t.noteId,
      noteTitle: note ? note.noteTitle : null
    };
  });

  return res.json({ success: true, count: events.length, data: events });
});

module.exports = router;
