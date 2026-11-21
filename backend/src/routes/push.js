const express = require('express');
const router = express.Router();
const webpush = require('web-push');
const excelManager = require('../excel/excelManager');
const authMiddleware = require('../auth/authMiddleware');
const { VAPID_KEYS } = require('../config');

// 1. Get VAPID public key (can be public or auth'd)
router.get('/vapid-public-key', (req, res) => {
  return res.json({ success: true, publicKey: VAPID_KEYS.publicKey });
});

// 2. Subscribe to push notifications
router.post('/subscribe', authMiddleware, (req, res) => {
  const { subscription } = req.body;
  if (!subscription || !subscription.endpoint) {
    return res.status(400).json({ success: false, message: 'Valid subscription object required.' });
  }

  // Remove duplicate subscriptions for same endpoint
  excelManager.pushSubscriptions = excelManager.pushSubscriptions.filter(
    (s) => s.subscription.endpoint !== subscription.endpoint
  );

  excelManager.pushSubscriptions.push({
    userId: req.user.userId,
    subscription,
    createdAt: new Date().toISOString()
  });

  return res.json({ success: true, message: 'Subscribed to push notifications successfully.' });
});

// 3. Test push notification
router.post('/test', authMiddleware, async (req, res) => {
  const subs = excelManager.pushSubscriptions.filter((s) => s.userId === req.user.userId);
  if (subs.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'No active push subscriptions found for your account. Please enable notifications in your browser first.'
    });
  }

  const payload = JSON.stringify({
    title: 'NoteAlert Test Notification',
    body: 'Push notifications are active and working smoothly!',
    data: { url: '/#/dashboard' }
  });

  let deliveredCount = 0;
  for (const sub of subs) {
    try {
      await webpush.sendNotification(sub.subscription, payload);
      deliveredCount++;
    } catch (err) {
      console.warn('Test push delivery failed:', err.message);
    }
  }

  return res.json({
    success: true,
    message: `Test notification sent to ${deliveredCount} device(s).`
  });
});

module.exports = router;
