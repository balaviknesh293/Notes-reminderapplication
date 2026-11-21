const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const { DATA_DIR } = require('../config');

const EMAIL_LOG_FILE = path.join(DATA_DIR, 'email_notifications.log');

// Environment variables / fallback configuration
const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587', 10);
const SMTP_SECURE = process.env.SMTP_SECURE === 'true' || SMTP_PORT === 465;
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const SMTP_FROM = process.env.SMTP_FROM || (SMTP_USER ? `NoteAlert <${SMTP_USER}>` : 'NoteAlert Reminders <reminders@notealert.app>');

// In-memory delivery history
const emailLogs = [];

function createTransporter() {
  if (SMTP_USER && SMTP_PASS) {
    return nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_SECURE,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS
      }
    });
  }
  return null;
}

let transporter = createTransporter();

// Reload transporter if env changed dynamically
function reloadTransporter(config = {}) {
  const host = config.host || process.env.SMTP_HOST || SMTP_HOST;
  const port = parseInt(config.port || process.env.SMTP_PORT || SMTP_PORT, 10);
  const user = config.user !== undefined ? config.user : (process.env.SMTP_USER || SMTP_USER);
  const pass = config.pass !== undefined ? config.pass : (process.env.SMTP_PASS || SMTP_PASS);
  const secure = config.secure !== undefined ? config.secure : (port === 465);

  if (user && pass) {
    transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass }
    });
  } else {
    transporter = null;
  }
}

function logEmailRecord(record) {
  emailLogs.unshift(record);
  if (emailLogs.length > 100) emailLogs.pop();

  const line = `[${record.timestamp}] To: ${record.to} | Subject: "${record.subject}" | Status: ${record.status} | Mode: ${record.mode}\n`;
  fs.appendFile(EMAIL_LOG_FILE, line, (err) => {
    if (err) console.error('[EmailService] Failed writing to email log file:', err.message);
  });
}

/**
 * Format an HTML template for task reminders
 */
function buildReminderHtml({ username, taskTitle, description, priority, deadlineDate, deadlineTime, message, reminderType }) {
  const priorityColor = priority === 'High' ? '#ef4444' : priority === 'Medium' ? '#f59e0b' : '#10b981';
  const priorityBg = priority === 'High' ? '#fef2f2' : priority === 'Medium' ? '#fffbeb' : '#ecfdf5';

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>NoteAlert Reminder</title>
  </head>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 24px; color: #1e293b;">
    <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;">
      
      <!-- Header Banner -->
      <div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); padding: 28px 24px; text-align: center; color: #ffffff;">
        <div style="font-size: 26px; font-weight: 800; letter-spacing: -0.5px;">⏰ NoteAlert</div>
        <div style="font-size: 13px; color: #94a3b8; margin-top: 4px;">Smart Notes & Deadline Reminder</div>
      </div>

      <!-- Main Body -->
      <div style="padding: 28px 24px;">
        <p style="font-size: 15px; color: #475569; margin-top: 0;">Hi <strong>${username || 'there'}</strong>,</p>
        
        <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 14px 16px; border-radius: 8px; margin: 18px 0;">
          <strong style="color: #1e40af; font-size: 15px; display: block;">${message}</strong>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 14px;">
          <tr>
            <td style="padding: 8px 0; color: #64748b; width: 35%;">Task:</td>
            <td style="padding: 8px 0; font-weight: 600; color: #0f172a;">${taskTitle}</td>
          </tr>
          ${description ? `
          <tr>
            <td style="padding: 8px 0; color: #64748b; vertical-align: top;">Description:</td>
            <td style="padding: 8px 0; color: #334155;">${description}</td>
          </tr>` : ''}
          <tr>
            <td style="padding: 8px 0; color: #64748b;">Priority:</td>
            <td style="padding: 8px 0;">
              <span style="display: inline-block; padding: 3px 10px; border-radius: 12px; font-size: 12px; font-weight: 700; color: ${priorityColor}; background-color: ${priorityBg}; border: 1px solid ${priorityColor}33;">
                ${priority}
              </span>
            </td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #64748b;">Deadline:</td>
            <td style="padding: 8px 0; font-weight: 600; color: #0f172a;">
              ${deadlineDate || 'No date set'} at ${deadlineTime || '12:00'}
            </td>
          </tr>
        </table>

        <!-- Call to Action -->
        <div style="text-align: center; margin-top: 32px; margin-bottom: 12px;">
          <a href="http://localhost:5000" style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 10px; font-weight: 600; font-size: 14px; box-shadow: 0 2px 8px rgba(37,99,235,0.25);">
            Open NoteAlert
          </a>
        </div>
      </div>

      <!-- Footer -->
      <div style="background-color: #f8fafc; padding: 16px 24px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8;">
        This automated deadline reminder was dispatched by NoteAlert.<br>
        Manage notification preferences in your application Settings.
      </div>
    </div>
  </body>
  </html>
  `;
}

/**
 * Send an email reminder for a task
 */
async function sendReminderEmail(user, task, reminderType, message) {
  if (!user || !user.email) {
    return { success: false, reason: 'no_email' };
  }

  if (user.emailRemindersEnabled === false) {
    return { success: false, reason: 'user_disabled_email' };
  }

  const subject = `⏰ [NoteAlert Reminder] ${task.taskTitle} (${reminderType.replace(/_/g, ' ')})`;
  const html = buildReminderHtml({
    username: user.username,
    taskTitle: task.taskTitle,
    description: task.description,
    priority: task.priority,
    deadlineDate: task.deadlineDate,
    deadlineTime: task.deadlineTime,
    message,
    reminderType
  });

  const timestamp = new Date().toISOString();

  // If live SMTP is configured
  if (transporter) {
    try {
      const info = await transporter.sendMail({
        from: SMTP_FROM,
        to: user.email,
        subject,
        text: `${message}\n\nTask: ${task.taskTitle}\nDeadline: ${task.deadlineDate} ${task.deadlineTime}\nPriority: ${task.priority}\n\nOpen NoteAlert: http://localhost:5000`,
        html
      });

      console.log(`[EmailService] Live email sent to ${user.email} (MessageId: ${info.messageId})`);
      logEmailRecord({
        timestamp,
        to: user.email,
        subject,
        status: 'Sent',
        mode: 'SMTP Live',
        messageId: info.messageId
      });

      return { success: true, mode: 'live', messageId: info.messageId };
    } catch (err) {
      console.error(`[EmailService] SMTP error sending to ${user.email}:`, err.message);
      logEmailRecord({
        timestamp,
        to: user.email,
        subject,
        status: 'Failed: ' + err.message,
        mode: 'SMTP Error'
      });
      return { success: false, error: err.message };
    }
  }

  // If SMTP is not yet configured, record simulation log
  console.log(`[EmailService] [SIMULATED EMAIL] To: ${user.email} | Subject: "${subject}" | Content: "${message}"`);
  logEmailRecord({
    timestamp,
    to: user.email,
    subject,
    status: 'Logged (Ready for SMTP)',
    mode: 'Simulated Preview'
  });

  return { success: true, mode: 'simulated', message: 'Email reminder recorded. Configure SMTP in .env for live dispatch.' };
}

/**
 * Send a test verification email
 */
async function sendTestEmail(toEmail, username = 'NoteAlert User') {
  if (!toEmail) return { success: false, message: 'Recipient email is required.' };

  const subject = `✅ [NoteAlert Test] Email Reminders are Active!`;
  const html = buildReminderHtml({
    username,
    taskTitle: 'Email Reminder System Verification',
    description: 'This is a test notification confirming that NoteAlert can deliver deadline alerts directly to your inbox.',
    priority: 'High',
    deadlineDate: new Date().toISOString().slice(0, 10),
    deadlineTime: 'Now',
    message: 'Your email notification system is operational!',
    reminderType: 'test'
  });

  const timestamp = new Date().toISOString();

  if (transporter) {
    try {
      const info = await transporter.sendMail({
        from: SMTP_FROM,
        to: toEmail,
        subject,
        text: `Your NoteAlert email notification setup is operational!`,
        html
      });
      logEmailRecord({
        timestamp,
        to: toEmail,
        subject,
        status: 'Sent',
        mode: 'SMTP Live',
        messageId: info.messageId
      });
      return { success: true, mode: 'live', message: `Test email sent successfully to ${toEmail}!` };
    } catch (err) {
      logEmailRecord({
        timestamp,
        to: toEmail,
        subject,
        status: 'Failed: ' + err.message,
        mode: 'SMTP Error'
      });
      return { success: false, message: `SMTP error: ${err.message}` };
    }
  }

  // Simulated
  logEmailRecord({
    timestamp,
    to: toEmail,
    subject,
    status: 'Logged (Ready for SMTP)',
    mode: 'Simulated Preview'
  });
  return {
    success: true,
    mode: 'simulated',
    message: `Test email logged for ${toEmail}. Add SMTP credentials (e.g. Gmail App Password) to .env to deliver live emails to your inbox!`
  };
}

module.exports = {
  sendReminderEmail,
  sendTestEmail,
  reloadTransporter,
  getEmailLogs: () => emailLogs,
  isConfigured: () => Boolean(transporter)
};
