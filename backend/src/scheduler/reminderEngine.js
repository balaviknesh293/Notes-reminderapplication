const webpush = require('web-push');
const crypto = require('crypto');
const excelManager = require('../excel/excelManager');
const emailService = require('../services/emailService');
const { VAPID_KEYS, REMINDER_CHECK_INTERVAL_MS } = require('../config');

// In-app real-time notification queue for connected clients or polling
let inAppAlerts = []; // { id, userId, taskId, title, message, reminderType, time, read, snoozedUntil }

// Setup web push details
try {
  webpush.setVapidDetails(
    'mailto:support@notealert.app',
    VAPID_KEYS.publicKey,
    VAPID_KEYS.privateKey
  );
} catch (e) {
  console.warn('[ReminderEngine] WebPush VAPID setup note:', e.message);
}

// Default reminder intervals in milliseconds
const REMINDER_INTERVALS = [
  { name: '7_days_before', label: '7 days before', ms: 7 * 24 * 60 * 60 * 1000 },
  { name: '3_days_before', label: '3 days before', ms: 3 * 24 * 60 * 60 * 1000 },
  { name: '1_day_before', label: '1 day before', ms: 24 * 60 * 60 * 1000 },
  { name: '3_hours_before', label: '3 hours before', ms: 3 * 60 * 60 * 1000 },
  { name: '30_min_before', label: '30 minutes before', ms: 30 * 60 * 1000 },
  { name: 'at_deadline', label: 'At deadline', ms: 0 },
  { name: 'overdue', label: 'Task Overdue', ms: -1 } // Overdue trigger
];

let checkTimer = null;

function startReminderEngine() {
  if (checkTimer) clearInterval(checkTimer);
  console.log('[ReminderEngine] Scheduler started. Checking every 30s.');
  // Initial check
  checkDeadlines();
  checkTimer = setInterval(checkDeadlines, REMINDER_CHECK_INTERVAL_MS);
}

async function checkDeadlines() {
  try {
    const now = new Date();
    const tasks = excelManager.tasks;
    let newNotificationsAdded = false;

    for (const task of tasks) {
      // Only process pending or in progress tasks
      if (task.status === 'Completed' || !task.deadlineDate) continue;

      // Construct deadline Date object
      const timeStr = task.deadlineTime ? task.deadlineTime : '12:00';
      const deadlineString = `${task.deadlineDate}T${timeStr}:00`;
      const deadline = new Date(deadlineString);
      if (isNaN(deadline.getTime())) continue;

      const diffMs = deadline.getTime() - now.getTime();

      // Check overdue status
      if (diffMs < 0 && task.status !== 'Overdue' && task.status !== 'Completed') {
        task.status = 'Overdue';
        newNotificationsAdded = true;
      }

      // Check standard reminders
      for (const rule of REMINDER_INTERVALS) {
        if (rule.name === 'overdue') {
          // If task is overdue and we haven't delivered overdue alert
          if (diffMs < 0) {
            await triggerNotificationIfNeeded(task, 'overdue', `ALERT: Task "${task.taskTitle}" is OVERDUE!`, now);
          }
          continue;
        }

        if (rule.name === 'at_deadline') {
          // Window: within 5 minutes after deadline or right at it
          if (diffMs <= 60000 && diffMs >= -300000) {
            await triggerNotificationIfNeeded(task, 'at_deadline', `Deadline NOW: "${task.taskTitle}" is due now!`, now);
          }
          continue;
        }

        // Before deadline windows:
        // Trigger if remaining time is <= rule.ms and not triggered yet
        // Give a generous window so even if server was asleep, notification triggers
        if (diffMs > 0 && diffMs <= rule.ms && diffMs > (rule.ms - 4 * 60 * 60 * 1000)) {
          await triggerNotificationIfNeeded(task, rule.name, `Reminder: "${task.taskTitle}" is due in ${rule.label}!`, now);
        }
      }

      // Check custom reminders
      if (Array.isArray(task.customReminders)) {
        for (const custom of task.customReminders) {
          // custom format: { type: 'custom_time', scheduledIso: '2026-11-20T14:00:00.000Z', label: '...' }
          if (custom && custom.scheduledIso) {
            const scheduledTime = new Date(custom.scheduledIso).getTime();
            if (now.getTime() >= scheduledTime) {
              await triggerNotificationIfNeeded(
                task,
                `custom_${custom.scheduledIso}`,
                `Custom Reminder: "${task.taskTitle}" (${custom.label || 'Scheduled reminder'})`,
                now
              );
            }
          }
        }
      }
    }

    if (newNotificationsAdded) {
      await excelManager.saveToExcel();
    }
  } catch (err) {
    console.error('[ReminderEngine] Error in checkDeadlines:', err);
  }
}

async function triggerNotificationIfNeeded(task, reminderType, message, now) {
  // Prevent duplicate notifications in Sheet 4
  const existing = excelManager.notifications.find(
    (n) => n.userId === task.userId && n.taskId === task.taskId && n.reminderType === reminderType
  );
  if (existing) return;

  const notifId = crypto.randomUUID();
  const notifRecord = {
    notificationId: notifId,
    userId: task.userId,
    taskId: task.taskId,
    reminderType: reminderType,
    scheduledDate: now.toISOString(),
    notificationStatus: 'Delivered',
    deliveredDate: now.toISOString(),
    message: message
  };

  excelManager.notifications.push(notifRecord);

  // Add to in-app alerts queue
  inAppAlerts.unshift({
    id: notifId,
    userId: task.userId,
    taskId: task.taskId,
    taskTitle: task.taskTitle,
    priority: task.priority,
    reminderType,
    message,
    deliveredDate: now.toISOString(),
    read: false,
    snoozedUntil: null
  });

  // Keep inAppAlerts trimmed to 200 items
  if (inAppAlerts.length > 200) inAppAlerts.pop();

  // Send Email Reminder if user has configured email
  try {
    const user = excelManager.users.find((u) => u.userId === task.userId);
    if (user && user.email) {
      emailService.sendReminderEmail(user, task, reminderType, message).catch((e) => {
        console.error('[ReminderEngine] Email reminder send failed:', e.message);
      });
    }
  } catch (err) {
    console.error('[ReminderEngine] Error preparing reminder email:', err.message);
  }

  // Send Web Push notification if user has active subscriptions
  const subs = excelManager.pushSubscriptions.filter((s) => s.userId === task.userId);
  const payload = JSON.stringify({
    title: 'NoteAlert Reminder',
    body: message,
    data: {
      taskId: task.taskId,
      priority: task.priority,
      url: `/#/tasks?taskId=${task.taskId}`
    }
  });

  for (const sub of subs) {
    try {
      await webpush.sendNotification(sub.subscription, payload);
    } catch (err) {
      if (err.statusCode === 410 || err.statusCode === 404) {
        // Expired subscription, remove it
        excelManager.pushSubscriptions = excelManager.pushSubscriptions.filter((s) => s !== sub);
      }
    }
  }
}

function getInAppAlerts(userId) {
  const now = new Date();
  return inAppAlerts.filter((a) => {
    if (a.userId !== userId) return false;
    if (a.snoozedUntil && new Date(a.snoozedUntil) > now) return false;
    return true;
  });
}

function markAlertRead(userId, alertId) {
  const alert = inAppAlerts.find((a) => a.userId === userId && a.id === alertId);
  if (alert) alert.read = true;
  return alert;
}

function markAllAlertsRead(userId) {
  inAppAlerts.forEach((a) => {
    if (a.userId === userId) a.read = true;
  });
}

function snoozeAlert(userId, alertId, minutes) {
  const alert = inAppAlerts.find((a) => a.userId === userId && a.id === alertId);
  if (alert) {
    const snoozeTime = new Date(Date.now() + minutes * 60 * 1000);
    alert.snoozedUntil = snoozeTime.toISOString();
    return alert;
  }
  return null;
}

function clearAlert(userId, alertId) {
  const idx = inAppAlerts.findIndex((a) => a.userId === userId && a.id === alertId);
  if (idx !== -1) {
    inAppAlerts.splice(idx, 1);
    return true;
  }
  return false;
}

module.exports = {
  startReminderEngine,
  checkDeadlines,
  getInAppAlerts,
  markAlertRead,
  markAllAlertsRead,
  snoozeAlert,
  clearAlert
};
