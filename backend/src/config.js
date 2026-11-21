const path = require('path');
const fs = require('fs');

const DATA_DIR = path.join(__dirname, '..', 'data');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
const EXCEL_FILE = path.join(DATA_DIR, 'notealert_master.xlsx');

// Ensure directories exist
[DATA_DIR, BACKUP_DIR, UPLOADS_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// VAPID keys for Web Push Notifications
const VAPID_KEYS = {
  publicKey: process.env.VAPID_PUBLIC_KEY || 'BMDF8FpvkjXRZ9s9PfeYu100e82DFYfNoaFnSEJVE1vCre4WthHpfxbApV71HEO1BBfqKyuVcKazKwMI6igxTH0',
  privateKey: process.env.VAPID_PRIVATE_KEY || 'xw-ntMLa6YuEO-Km_d7SHh0cOTXcS4XWlqs5frnd-No'
};

// Email & SMTP configuration
const EMAIL_CONFIG = {
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  secure: process.env.SMTP_SECURE === 'true',
  user: process.env.SMTP_USER || '',
  pass: process.env.SMTP_PASS || '',
  from: process.env.SMTP_FROM || 'NoteAlert Reminders <reminders@notealert.app>'
};

module.exports = {
  PORT: process.env.PORT || 5000,
  JWT_SECRET: process.env.JWT_SECRET || 'notealert-super-secret-key-2026-production',
  JWT_EXPIRES_IN: '30d',
  DATA_DIR,
  BACKUP_DIR,
  UPLOADS_DIR,
  EXCEL_FILE,
  VAPID_KEYS,
  EMAIL_CONFIG,
  MAX_BACKUPS_COUNT: 25,
  REMINDER_CHECK_INTERVAL_MS: 30000 // 30 seconds
};
