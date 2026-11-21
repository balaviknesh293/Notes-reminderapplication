const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const excelManager = require('../excel/excelManager');
const authMiddleware = require('../auth/authMiddleware');
const reminderEngine = require('../scheduler/reminderEngine');

router.use(authMiddleware);

// 1. Get all tasks for user with filters
router.get('/', (req, res) => {
  const userId = req.user.userId;
  const { status, priority, search, overdue, upcoming, today } = req.query;

  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);

  let result = excelManager.tasks.filter((t) => t.userId === userId);

  // Auto-flag overdue tasks
  result.forEach((t) => {
    if (t.status !== 'Completed' && t.deadlineDate) {
      const deadline = new Date(`${t.deadlineDate}T${t.deadlineTime || '12:00'}:00`);
      if (deadline < now && t.status !== 'Overdue') {
        t.status = 'Overdue';
      }
    }
  });

  // Filter by status
  if (status && status !== 'All') {
    result = result.filter((t) => t.status.toLowerCase() === status.toLowerCase());
  }

  // Filter by priority
  if (priority && priority !== 'All') {
    result = result.filter((t) => t.priority.toLowerCase() === priority.toLowerCase());
  }

  // Filter: Overdue tasks
  if (overdue === 'true') {
    result = result.filter((t) => t.status === 'Overdue');
  }

  // Filter: Today's tasks
  if (today === 'true') {
    result = result.filter((t) => t.deadlineDate === todayStr);
  }

  // Filter: Upcoming deadlines (due within next 7 days, not completed)
  if (upcoming === 'true') {
    const next7Days = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    result = result.filter((t) => {
      return t.status !== 'Completed' && t.deadlineDate >= todayStr && t.deadlineDate <= next7Days;
    });
  }

  // Search filter
  if (search && search.trim()) {
    const q = search.trim().toLowerCase();
    result = result.filter((t) => {
      const matchTitle = t.taskTitle.toLowerCase().includes(q);
      const matchDesc = t.description.toLowerCase().includes(q);
      return matchTitle || matchDesc;
    });
  }

  // Sort by deadline date & time asc
  result.sort((a, b) => {
    const timeA = new Date(`${a.deadlineDate || '9999-12-31'}T${a.deadlineTime || '23:59'}:00`).getTime();
    const timeB = new Date(`${b.deadlineDate || '9999-12-31'}T${b.deadlineTime || '23:59'}:00`).getTime();
    return timeA - timeB;
  });

  return res.json({ success: true, count: result.length, data: result });
});

// 2. Get single task
router.get('/:id', (req, res) => {
  const task = excelManager.tasks.find((t) => t.userId === req.user.userId && t.taskId === req.params.id);
  if (!task) {
    return res.status(404).json({ success: false, message: 'Task not found.' });
  }

  // Include associated note if any
  let associatedNote = null;
  if (task.noteId) {
    associatedNote = excelManager.notes.find((n) => n.userId === req.user.userId && n.noteId === task.noteId);
  }

  return res.json({ success: true, data: { ...task, note: associatedNote } });
});

// 3. Create task
router.post('/', async (req, res) => {
  try {
    const {
      taskTitle,
      description,
      priority,
      startDate,
      deadlineDate,
      deadlineTime,
      noteId,
      customReminders
    } = req.body;

    if (!taskTitle || !taskTitle.trim()) {
      return res.status(400).json({ success: false, message: 'Task title is required.' });
    }

    const newTask = {
      taskId: crypto.randomUUID(),
      userId: req.user.userId,
      noteId: noteId || null,
      taskTitle: taskTitle.trim(),
      description: description || '',
      priority: ['Critical', 'High', 'Medium', 'Low'].includes(priority) ? priority : 'Medium',
      startDate: startDate || new Date().toISOString().slice(0, 10),
      deadlineDate: deadlineDate || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      deadlineTime: deadlineTime || '12:00',
      status: 'Pending',
      completionDate: null,
      customReminders: Array.isArray(customReminders) ? customReminders : []
    };

    excelManager.tasks.unshift(newTask);
    await excelManager.saveToExcel();

    // Trigger reminder engine check immediately
    reminderEngine.checkDeadlines();

    return res.status(201).json({ success: true, message: 'Task created successfully.', data: newTask });
  } catch (err) {
    console.error('Error creating task:', err);
    return res.status(500).json({ success: false, message: 'Failed to create task.' });
  }
});

// 4. Update task
router.put('/:id', async (req, res) => {
  try {
    const task = excelManager.tasks.find((t) => t.userId === req.user.userId && t.taskId === req.params.id);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found.' });
    }

    const {
      taskTitle,
      description,
      priority,
      startDate,
      deadlineDate,
      deadlineTime,
      status,
      noteId,
      customReminders
    } = req.body;

    if (taskTitle !== undefined) task.taskTitle = taskTitle.trim() || 'Untitled Task';
    if (description !== undefined) task.description = description;
    if (priority && ['Critical', 'High', 'Medium', 'Low'].includes(priority)) task.priority = priority;
    if (startDate !== undefined) task.startDate = startDate;
    if (deadlineDate !== undefined) task.deadlineDate = deadlineDate;
    if (deadlineTime !== undefined) task.deadlineTime = deadlineTime;
    if (noteId !== undefined) task.noteId = noteId;
    if (customReminders !== undefined && Array.isArray(customReminders)) task.customReminders = customReminders;

    if (status && ['Pending', 'In Progress', 'Completed', 'Overdue'].includes(status)) {
      task.status = status;
      if (status === 'Completed' && !task.completionDate) {
        task.completionDate = new Date().toISOString();
      } else if (status !== 'Completed') {
        task.completionDate = null;
      }
    }

    await excelManager.saveToExcel();
    reminderEngine.checkDeadlines();

    return res.json({ success: true, message: 'Task updated successfully.', data: task });
  } catch (err) {
    console.error('Error updating task:', err);
    return res.status(500).json({ success: false, message: 'Failed to update task.' });
  }
});

// 5. Update Status (Complete / In Progress / Pending)
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const task = excelManager.tasks.find((t) => t.userId === req.user.userId && t.taskId === req.params.id);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found.' });
    }

    if (!['Pending', 'In Progress', 'Completed', 'Overdue'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status.' });
    }

    task.status = status;
    task.completionDate = status === 'Completed' ? new Date().toISOString() : null;

    await excelManager.saveToExcel();

    return res.json({ success: true, message: `Task status changed to ${status}.`, data: task });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to update task status.' });
  }
});

// 6. Reschedule Task (From Calendar or Quick Action)
router.patch('/:id/reschedule', async (req, res) => {
  try {
    const { deadlineDate, deadlineTime } = req.body;
    const task = excelManager.tasks.find((t) => t.userId === req.user.userId && t.taskId === req.params.id);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found.' });
    }

    if (deadlineDate) task.deadlineDate = deadlineDate;
    if (deadlineTime) task.deadlineTime = deadlineTime;

    // Reset status from Overdue if deadline is moved to future
    const newDeadline = new Date(`${task.deadlineDate}T${task.deadlineTime || '12:00'}:00`);
    if (newDeadline > new Date() && task.status === 'Overdue') {
      task.status = 'Pending';
    }

    await excelManager.saveToExcel();
    reminderEngine.checkDeadlines();

    return res.json({ success: true, message: 'Task rescheduled successfully.', data: task });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to reschedule task.' });
  }
});

// 7. Delete Task
router.delete('/:id', async (req, res) => {
  try {
    const idx = excelManager.tasks.findIndex((t) => t.userId === req.user.userId && t.taskId === req.params.id);
    if (idx === -1) {
      return res.status(404).json({ success: false, message: 'Task not found.' });
    }

    excelManager.tasks.splice(idx, 1);
    await excelManager.saveToExcel();

    return res.json({ success: true, message: 'Task deleted successfully.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to delete task.' });
  }
});

module.exports = router;
