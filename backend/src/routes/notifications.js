const express = require('express');
const router = express.Router();
const excelManager = require('../excel/excelManager');
const authMiddleware = require('../auth/authMiddleware');
const reminderEngine = require('../scheduler/reminderEngine');
const emailService = require('../services/emailService');

router.use(authMiddleware);

// 1. Get notifications for user (combines Sheet 4 history and in-app alerts)
router.get('/', (req, res) => {
  const userId = req.user.userId;
  const history = excelManager.notifications
    .filter((n) => n.userId === userId)
    .sort((a, b) => new Date(b.deliveredDate) - new Date(a.deliveredDate));

  const activeAlerts = reminderEngine.getInAppAlerts(userId);
  const unreadCount = activeAlerts.filter((a) => !a.read).length;

  return res.json({
    success: true,
    unreadCount,
    activeAlerts,
    history
  });
});

// 2. Mark notification / alert as read
router.post('/:id/read', (req, res) => {
  const alert = reminderEngine.markAlertRead(req.user.userId, req.params.id);
  return res.json({ success: true, message: 'Marked as read.', data: alert });
});

// 3. Mark all as read
router.post('/read-all', (req, res) => {
  reminderEngine.markAllAlertsRead(req.user.userId);
  return res.json({ success: true, message: 'All notifications marked as read.' });
});

// 4. Snooze alert
router.post('/:id/snooze', (req, res) => {
  const { minutes } = req.body;
  const alert = reminderEngine.snoozeAlert(req.user.userId, req.params.id, Number(minutes) || 30);
  if (!alert) {
    return res.status(404).json({ success: false, message: 'Alert not found.' });
  }
  return res.json({ success: true, message: `Snoozed for ${minutes || 30} minutes.`, data: alert });
});

// 5. Dismiss / clear alert
router.delete('/:id', (req, res) => {
  const cleared = reminderEngine.clearAlert(req.user.userId, req.params.id);
  return res.json({ success: true, message: 'Notification dismissed.', cleared });
});

// 6. Test Email Reminder
router.post('/test-email', async (req, res) => {
  const user = excelManager.users.find((u) => u.userId === req.user.userId);
  const targetEmail = (req.body.email || (user && user.email) || '').trim();

  if (!targetEmail) {
    return res.status(400).json({ success: false, message: 'Please enter a valid email address.' });
  }

  const result = await emailService.sendTestEmail(targetEmail, user ? user.username : 'User');
  return res.json(result);
});

// 7. Get Email Reminder Logs
router.get('/email-logs', (req, res) => {
  const logs = emailService.getEmailLogs();
  return res.json({ success: true, logs });
});

module.exports = router;
