const express = require('express');
const router = express.Router();
const excelManager = require('../excel/excelManager');
const authMiddleware = require('../auth/authMiddleware');

router.use(authMiddleware);

// Get dashboard summary statistics and widgets
router.get('/stats', (req, res) => {
  const userId = req.user.userId;
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const next7DaysStr = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const userNotes = excelManager.notes.filter((n) => n.userId === userId && !n.archived);
  const userTasks = excelManager.tasks.filter((t) => t.userId === userId);

  // Auto-flag overdue tasks
  userTasks.forEach((t) => {
    if (t.status !== 'Completed' && t.deadlineDate) {
      const deadline = new Date(`${t.deadlineDate}T${t.deadlineTime || '12:00'}:00`);
      if (deadline < now && t.status !== 'Overdue') {
        t.status = 'Overdue';
      }
    }
  });

  const totalNotes = userNotes.length;
  const totalTasks = userTasks.length;
  const pendingTasks = userTasks.filter((t) => t.status === 'Pending' || t.status === 'In Progress').length;
  const completedTasks = userTasks.filter((t) => t.status === 'Completed').length;
  const overdueTasks = userTasks.filter((t) => t.status === 'Overdue').length;

  // Upcoming deadlines (within next 7 days, not completed)
  const upcomingDeadlinesList = userTasks
    .filter((t) => t.status !== 'Completed' && t.deadlineDate >= todayStr && t.deadlineDate <= next7DaysStr)
    .sort((a, b) => new Date(`${a.deadlineDate}T${a.deadlineTime}`) - new Date(`${b.deadlineDate}T${b.deadlineTime}`));

  const upcomingDeadlinesCount = upcomingDeadlinesList.length;

  // Today's tasks
  const todayTasksList = userTasks
    .filter((t) => t.deadlineDate === todayStr)
    .sort((a, b) => (a.deadlineTime || '00:00').localeCompare(b.deadlineTime || '00:00'));

  // Recent notes
  const recentNotes = [...userNotes]
    .sort((a, b) => new Date(b.updatedDate) - new Date(a.updatedDate))
    .slice(0, 4);

  // Overdue tasks list
  const overdueTasksList = userTasks
    .filter((t) => t.status === 'Overdue')
    .sort((a, b) => new Date(`${a.deadlineDate}T${a.deadlineTime}`) - new Date(`${b.deadlineDate}T${b.deadlineTime}`))
    .slice(0, 5);

  return res.json({
    success: true,
    stats: {
      totalNotes,
      totalTasks,
      pendingTasks,
      completedTasks,
      upcomingDeadlines: upcomingDeadlinesCount,
      overdueTasks
    },
    todayTasks: todayTasksList,
    upcomingDeadlines: upcomingDeadlinesList.slice(0, 5),
    overdueList: overdueTasksList,
    recentNotes
  });
});

module.exports = router;
