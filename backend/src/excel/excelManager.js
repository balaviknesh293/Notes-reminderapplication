const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');
const { EXCEL_FILE, BACKUP_DIR, MAX_BACKUPS_COUNT } = require('../config');

// In-memory data collections
let users = [];
let notes = [];
let tasks = [];
let notifications = [];
let categories = [];
let pushSubscriptions = []; // Store push subscriptions in memory & optional sheet

// Write lock to prevent concurrent file write conflicts
let isWriting = false;
const writeQueue = [];

function acquireWriteLock() {
  return new Promise((resolve) => {
    if (!isWriting) {
      isWriting = true;
      resolve();
    } else {
      writeQueue.push(resolve);
    }
  });
}

function releaseWriteLock() {
  if (writeQueue.length > 0) {
    const next = writeQueue.shift();
    next();
  } else {
    isWriting = false;
  }
}

// Styling helpers for ExcelJS
const HEADER_FILL = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FF1E293B' } // Navy blue
};

const HEADER_FONT = {
  name: 'Calibri',
  size: 11,
  bold: true,
  color: { argb: 'FFFFFFFF' }
};

function formatHeaders(sheet) {
  const row = sheet.getRow(1);
  row.height = 24;
  row.eachCell((cell) => {
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });
}

// Initialize Excel Workbook structure
async function initExcel() {
  try {
    if (fs.existsSync(EXCEL_FILE)) {
      await loadFromExcel();
    } else {
      await createInitialWorkbook();
      await saveToExcel();
    }
    // Create initial backup on startup
    await createBackup('startup');
  } catch (err) {
    console.error('Error during initExcel:', err);
    // If master is corrupted, try restoring latest backup
    const restored = await tryRestoreLatestBackup();
    if (!restored) {
      await createInitialWorkbook();
      await saveToExcel();
    }
  }
}

async function createInitialWorkbook() {
  users = [];
  notes = [];
  tasks = [];
  notifications = [];
  categories = [];
  pushSubscriptions = [];
}

async function loadFromExcel() {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(EXCEL_FILE);

  // 1. Users sheet
  const usersSheet = workbook.getWorksheet('Users');
  users = [];
  if (usersSheet) {
    const headerRow = usersSheet.getRow(1).values.slice(1).map(h => String(h || '').trim());
    const emailIdx = headerRow.findIndex(h => /email/i.test(h) && !/reminder/i.test(h));
    const emailRemindersIdx = headerRow.findIndex(h => /email.*reminder/i.test(h));

    usersSheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header
      const values = row.values.slice(1);
      const userId = values[0];
      const username = values[1];
      let email = '';
      let emailRemindersEnabled = true;

      let passwordHash = '';
      let securityQuestion = '';
      let securityAnswerHash = '';
      let createdDate = '';

      if (emailIdx !== -1) {
        email = values[emailIdx] ? String(values[emailIdx]) : '';
        if (emailRemindersIdx !== -1) {
          const val = values[emailRemindersIdx];
          emailRemindersEnabled = val !== false && val !== 'false' && val !== 0;
        }
        const pwdIdx = headerRow.findIndex(h => /password/i.test(h));
        const sqIdx = headerRow.findIndex(h => /security.*question/i.test(h));
        const saIdx = headerRow.findIndex(h => /security.*answer/i.test(h));
        const cdIdx = headerRow.findIndex(h => /created.*date/i.test(h));

        passwordHash = pwdIdx !== -1 && values[pwdIdx] ? String(values[pwdIdx]) : '';
        securityQuestion = sqIdx !== -1 && values[sqIdx] ? String(values[sqIdx]) : '';
        securityAnswerHash = saIdx !== -1 && values[saIdx] ? String(values[saIdx]) : '';
        createdDate = cdIdx !== -1 && values[cdIdx] ? new Date(values[cdIdx]).toISOString() : new Date().toISOString();
      } else {
        passwordHash = values[2] ? String(values[2]) : '';
        securityQuestion = values[3] ? String(values[3]) : '';
        securityAnswerHash = values[4] ? String(values[4]) : '';
        createdDate = values[5] ? new Date(values[5]).toISOString() : new Date().toISOString();
      }

      if (userId && username) {
        users.push({
          userId: String(userId),
          username: String(username),
          email,
          emailRemindersEnabled,
          passwordHash,
          securityQuestion,
          securityAnswerHash,
          createdDate
        });
      }
    });
  }

  // 2. Notes sheet
  const notesSheet = workbook.getWorksheet('Notes');
  notes = [];
  if (notesSheet) {
    notesSheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const [noteId, userId, noteTitle, noteDescription, category, createdDate, updatedDate, pinned, archived, tags, attachments] = row.values.slice(1);
      if (noteId && userId) {
        notes.push({
          noteId: String(noteId),
          userId: String(userId),
          noteTitle: String(noteTitle || ''),
          noteDescription: String(noteDescription || ''),
          category: String(category || 'General'),
          createdDate: createdDate ? new Date(createdDate).toISOString() : new Date().toISOString(),
          updatedDate: updatedDate ? new Date(updatedDate).toISOString() : new Date().toISOString(),
          pinned: Boolean(pinned === true || pinned === 'true' || pinned === 1),
          archived: Boolean(archived === true || archived === 'true' || archived === 1),
          tags: tags ? (typeof tags === 'string' ? tags.split(',').map(t => t.trim()).filter(Boolean) : []) : [],
          attachments: attachments ? (typeof attachments === 'string' ? JSON.parse(attachments || '[]') : attachments) : []
        });
      }
    });
  }

  // 3. Tasks sheet
  const tasksSheet = workbook.getWorksheet('Tasks');
  tasks = [];
  if (tasksSheet) {
    tasksSheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const [taskId, userId, noteId, taskTitle, description, priority, startDate, deadlineDate, deadlineTime, status, completionDate, customReminders] = row.values.slice(1);
      if (taskId && userId) {
        tasks.push({
          taskId: String(taskId),
          userId: String(userId),
          noteId: noteId ? String(noteId) : null,
          taskTitle: String(taskTitle || ''),
          description: String(description || ''),
          priority: String(priority || 'Medium'),
          startDate: startDate ? new Date(startDate).toISOString().slice(0, 10) : '',
          deadlineDate: deadlineDate ? (typeof deadlineDate === 'object' ? new Date(deadlineDate).toISOString().slice(0, 10) : String(deadlineDate)) : '',
          deadlineTime: deadlineTime ? String(deadlineTime) : '12:00',
          status: String(status || 'Pending'),
          completionDate: completionDate ? new Date(completionDate).toISOString() : null,
          customReminders: customReminders ? (typeof customReminders === 'string' ? JSON.parse(customReminders || '[]') : customReminders) : []
        });
      }
    });
  }

  // 4. Notifications sheet
  const notifSheet = workbook.getWorksheet('Notifications');
  notifications = [];
  if (notifSheet) {
    notifSheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const [notificationId, userId, taskId, reminderType, scheduledDate, notificationStatus, deliveredDate, message] = row.values.slice(1);
      if (notificationId && userId) {
        notifications.push({
          notificationId: String(notificationId),
          userId: String(userId),
          taskId: taskId ? String(taskId) : null,
          reminderType: String(reminderType || 'Default'),
          scheduledDate: scheduledDate ? new Date(scheduledDate).toISOString() : new Date().toISOString(),
          notificationStatus: String(notificationStatus || 'Delivered'),
          deliveredDate: deliveredDate ? new Date(deliveredDate).toISOString() : new Date().toISOString(),
          message: message ? String(message) : ''
        });
      }
    });
  }

  // 5. Categories sheet
  const catSheet = workbook.getWorksheet('Categories');
  categories = [];
  if (catSheet) {
    catSheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const [categoryId, userId, categoryName, color] = row.values.slice(1);
      if (categoryId && userId && categoryName) {
        categories.push({
          categoryId: String(categoryId),
          userId: String(userId),
          categoryName: String(categoryName),
          color: color ? String(color) : '#3b82f6'
        });
      }
    });
  }

  console.log(`[ExcelManager] Loaded ${users.length} users, ${notes.length} notes, ${tasks.length} tasks, ${categories.length} categories.`);
}

async function buildWorkbook() {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'NoteAlert System';
  workbook.lastModifiedBy = 'NoteAlert Backend';
  workbook.created = new Date();
  workbook.modified = new Date();

  // Sheet 1: Users
  const usersSheet = workbook.addWorksheet('Users', { views: [{ state: 'frozen', ySplit: 1 }] });
  usersSheet.columns = [
    { header: 'User ID', key: 'userId', width: 38 },
    { header: 'Username', key: 'username', width: 22 },
    { header: 'Email', key: 'email', width: 30 },
    { header: 'Email Reminders', key: 'emailRemindersEnabled', width: 16 },
    { header: 'Password Hash', key: 'passwordHash', width: 64 },
    { header: 'Security Question', key: 'securityQuestion', width: 30 },
    { header: 'Security Answer Hash', key: 'securityAnswerHash', width: 64 },
    { header: 'Created Date', key: 'createdDate', width: 24 }
  ];
  users.forEach((u) => usersSheet.addRow(u));
  formatHeaders(usersSheet);

  // Sheet 2: Notes
  const notesSheet = workbook.addWorksheet('Notes', { views: [{ state: 'frozen', ySplit: 1 }] });
  notesSheet.columns = [
    { header: 'Note ID', key: 'noteId', width: 38 },
    { header: 'User ID', key: 'userId', width: 38 },
    { header: 'Note Title', key: 'noteTitle', width: 32 },
    { header: 'Note Description', key: 'noteDescription', width: 45 },
    { header: 'Category', key: 'category', width: 20 },
    { header: 'Created Date', key: 'createdDate', width: 24 },
    { header: 'Updated Date', key: 'updatedDate', width: 24 },
    { header: 'Pinned', key: 'pinned', width: 12 },
    { header: 'Archived', key: 'archived', width: 12 },
    { header: 'Tags', key: 'tags', width: 25 },
    { header: 'Attachments', key: 'attachments', width: 30 }
  ];
  notes.forEach((n) => {
    notesSheet.addRow({
      ...n,
      tags: Array.isArray(n.tags) ? n.tags.join(', ') : '',
      attachments: JSON.stringify(n.attachments || [])
    });
  });
  formatHeaders(notesSheet);

  // Sheet 3: Tasks
  const tasksSheet = workbook.addWorksheet('Tasks', { views: [{ state: 'frozen', ySplit: 1 }] });
  tasksSheet.columns = [
    { header: 'Task ID', key: 'taskId', width: 38 },
    { header: 'User ID', key: 'userId', width: 38 },
    { header: 'Note ID', key: 'noteId', width: 38 },
    { header: 'Task Title', key: 'taskTitle', width: 32 },
    { header: 'Description', key: 'description', width: 45 },
    { header: 'Priority', key: 'priority', width: 16 },
    { header: 'Start Date', key: 'startDate', width: 16 },
    { header: 'Deadline Date', key: 'deadlineDate', width: 16 },
    { header: 'Deadline Time', key: 'deadlineTime', width: 16 },
    { header: 'Status', key: 'status', width: 16 },
    { header: 'Completion Date', key: 'completionDate', width: 24 },
    { header: 'Custom Reminders', key: 'customReminders', width: 28 }
  ];
  tasks.forEach((t) => {
    tasksSheet.addRow({
      ...t,
      customReminders: JSON.stringify(t.customReminders || [])
    });
  });
  formatHeaders(tasksSheet);

  // Sheet 4: Notifications
  const notifSheet = workbook.addWorksheet('Notifications', { views: [{ state: 'frozen', ySplit: 1 }] });
  notifSheet.columns = [
    { header: 'Notification ID', key: 'notificationId', width: 38 },
    { header: 'User ID', key: 'userId', width: 38 },
    { header: 'Task ID', key: 'taskId', width: 38 },
    { header: 'Reminder Type', key: 'reminderType', width: 24 },
    { header: 'Scheduled Date', key: 'scheduledDate', width: 24 },
    { header: 'Notification Status', key: 'notificationStatus', width: 20 },
    { header: 'Delivered Date', key: 'deliveredDate', width: 24 },
    { header: 'Message', key: 'message', width: 45 }
  ];
  notifications.forEach((notif) => notifSheet.addRow(notif));
  formatHeaders(notifSheet);

  // Sheet 5: Categories
  const catSheet = workbook.addWorksheet('Categories', { views: [{ state: 'frozen', ySplit: 1 }] });
  catSheet.columns = [
    { header: 'Category ID', key: 'categoryId', width: 38 },
    { header: 'User ID', key: 'userId', width: 38 },
    { header: 'Category Name', key: 'categoryName', width: 25 },
    { header: 'Color', key: 'color', width: 16 }
  ];
  categories.forEach((c) => catSheet.addRow(c));
  formatHeaders(catSheet);

  return workbook;
}

// Atomic save to Excel with write lock
async function saveToExcel() {
  await acquireWriteLock();
  try {
    const workbook = await buildWorkbook();
    const tempFile = `${EXCEL_FILE}.${Date.now()}.tmp`;
    await workbook.xlsx.writeFile(tempFile);
    if (fs.existsSync(EXCEL_FILE)) {
      try {
        fs.unlinkSync(EXCEL_FILE);
      } catch (e) {
        // Fallback for Windows file locks
      }
    }
    fs.renameSync(tempFile, EXCEL_FILE);
  } catch (err) {
    console.error('[ExcelManager] Error saving to Excel:', err);
    throw err;
  } finally {
    releaseWriteLock();
  }
}

// Create automatic backup
async function createBackup(reason = 'auto') {
  try {
    if (!fs.existsSync(EXCEL_FILE)) return null;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFileName = `notealert_backup_${reason}_${timestamp}.xlsx`;
    const backupPath = path.join(BACKUP_DIR, backupFileName);

    fs.copyFileSync(EXCEL_FILE, backupPath);

    // Maintain max backups count
    const files = fs.readdirSync(BACKUP_DIR)
      .filter((f) => f.startsWith('notealert_backup_') && f.endsWith('.xlsx'))
      .map((f) => ({
        name: f,
        path: path.join(BACKUP_DIR, f),
        time: fs.statSync(path.join(BACKUP_DIR, f)).mtime.getTime()
      }))
      .sort((a, b) => b.time - a.time);

    if (files.length > MAX_BACKUPS_COUNT) {
      files.slice(MAX_BACKUPS_COUNT).forEach((f) => {
        try { fs.unlinkSync(f.path); } catch (e) {}
      });
    }

    return { fileName: backupFileName, path: backupPath, createdAt: new Date().toISOString() };
  } catch (err) {
    console.error('[ExcelManager] Failed to create backup:', err);
    return null;
  }
}

// Restore from latest backup if corrupted
async function tryRestoreLatestBackup() {
  if (!fs.existsSync(BACKUP_DIR)) return false;
  const files = fs.readdirSync(BACKUP_DIR)
    .filter((f) => f.startsWith('notealert_backup_') && f.endsWith('.xlsx'))
    .map((f) => ({
      path: path.join(BACKUP_DIR, f),
      time: fs.statSync(path.join(BACKUP_DIR, f)).mtime.getTime()
    }))
    .sort((a, b) => b.time - a.time);

  if (files.length > 0) {
    console.warn(`[ExcelManager] Restoring from latest backup: ${files[0].path}`);
    fs.copyFileSync(files[0].path, EXCEL_FILE);
    await loadFromExcel();
    return true;
  }
  return false;
}

// Generate user-specific export workbook
async function exportUserData(userId) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'NoteAlert';
  workbook.created = new Date();

  // Notes
  const userNotes = notes.filter((n) => n.userId === userId);
  const nSheet = workbook.addWorksheet('My Notes');
  nSheet.columns = [
    { header: 'Title', key: 'noteTitle', width: 30 },
    { header: 'Description', key: 'noteDescription', width: 45 },
    { header: 'Category', key: 'category', width: 20 },
    { header: 'Pinned', key: 'pinned', width: 12 },
    { header: 'Tags', key: 'tags', width: 25 },
    { header: 'Created Date', key: 'createdDate', width: 22 },
    { header: 'Updated Date', key: 'updatedDate', width: 22 }
  ];
  userNotes.forEach((n) => nSheet.addRow({
    ...n,
    tags: Array.isArray(n.tags) ? n.tags.join(', ') : ''
  }));
  formatHeaders(nSheet);

  // Tasks
  const userTasks = tasks.filter((t) => t.userId === userId);
  const tSheet = workbook.addWorksheet('My Tasks');
  tSheet.columns = [
    { header: 'Task Title', key: 'taskTitle', width: 30 },
    { header: 'Description', key: 'description', width: 40 },
    { header: 'Priority', key: 'priority', width: 15 },
    { header: 'Deadline Date', key: 'deadlineDate', width: 16 },
    { header: 'Deadline Time', key: 'deadlineTime', width: 16 },
    { header: 'Status', key: 'status', width: 16 },
    { header: 'Start Date', key: 'startDate', width: 16 },
    { header: 'Completion Date', key: 'completionDate', width: 22 }
  ];
  userTasks.forEach((t) => tSheet.addRow(t));
  formatHeaders(tSheet);

  // Notifications
  const userNotifs = notifications.filter((notif) => notif.userId === userId);
  const notifSheet = workbook.addWorksheet('Notifications');
  notifSheet.columns = [
    { header: 'Reminder Type', key: 'reminderType', width: 24 },
    { header: 'Delivered Date', key: 'deliveredDate', width: 22 },
    { header: 'Message', key: 'message', width: 40 }
  ];
  userNotifs.forEach((notif) => notifSheet.addRow(notif));
  formatHeaders(notifSheet);

  // Categories
  const userCats = categories.filter((c) => c.userId === userId);
  const cSheet = workbook.addWorksheet('Categories');
  cSheet.columns = [
    { header: 'Category Name', key: 'categoryName', width: 25 },
    { header: 'Color', key: 'color', width: 16 }
  ];
  userCats.forEach((c) => cSheet.addRow(c));
  formatHeaders(cSheet);

  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
}

// Import data from uploaded workbook
async function importUserData(userId, fileBuffer) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(fileBuffer);

  let importedNotesCount = 0;
  let importedTasksCount = 0;
  let importedCategoriesCount = 0;

  // Import Categories
  const catSheet = workbook.getWorksheet('Categories');
  if (catSheet) {
    catSheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const values = row.values.slice(1);
      const catName = values[0] ? String(values[0]).trim() : '';
      const color = values[1] ? String(values[1]) : '#3b82f6';
      if (catName && !categories.some((c) => c.userId === userId && c.categoryName.toLowerCase() === catName.toLowerCase())) {
        categories.push({
          categoryId: require('crypto').randomUUID(),
          userId,
          categoryName: catName,
          color
        });
        importedCategoriesCount++;
      }
    });
  }

  // Import Notes
  const notesSheet = workbook.getWorksheet('My Notes') || workbook.getWorksheet('Notes');
  if (notesSheet) {
    notesSheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const values = row.values.slice(1);
      const title = values[0] ? String(values[0]).trim() : 'Untitled Note';
      const desc = values[1] ? String(values[1]) : '';
      const cat = values[2] ? String(values[2]) : 'General';
      const pinned = values[3] === true || values[3] === 'true' || values[3] === 1;
      const rawTags = values[4] ? String(values[4]) : '';
      const tags = rawTags.split(',').map((t) => t.trim()).filter(Boolean);

      // Check duplicates
      const exists = notes.some((n) => n.userId === userId && n.noteTitle.toLowerCase() === title.toLowerCase() && n.noteDescription === desc);
      if (!exists) {
        notes.push({
          noteId: require('crypto').randomUUID(),
          userId,
          noteTitle: title,
          noteDescription: desc,
          category: cat,
          createdDate: new Date().toISOString(),
          updatedDate: new Date().toISOString(),
          pinned,
          archived: false,
          tags,
          attachments: []
        });
        importedNotesCount++;
      }
    });
  }

  // Import Tasks
  const tasksSheet = workbook.getWorksheet('My Tasks') || workbook.getWorksheet('Tasks');
  if (tasksSheet) {
    tasksSheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const values = row.values.slice(1);
      const title = values[0] ? String(values[0]).trim() : 'Untitled Task';
      const desc = values[1] ? String(values[1]) : '';
      const priority = ['Critical', 'High', 'Medium', 'Low'].includes(values[2]) ? values[2] : 'Medium';
      const deadlineDate = values[3] ? (typeof values[3] === 'object' ? new Date(values[3]).toISOString().slice(0, 10) : String(values[3])) : '';
      const deadlineTime = values[4] ? String(values[4]) : '12:00';
      const status = ['Pending', 'In Progress', 'Completed', 'Overdue'].includes(values[5]) ? values[5] : 'Pending';

      const exists = tasks.some((t) => t.userId === userId && t.taskTitle.toLowerCase() === title.toLowerCase() && t.deadlineDate === deadlineDate);
      if (!exists) {
        tasks.push({
          taskId: require('crypto').randomUUID(),
          userId,
          noteId: null,
          taskTitle: title,
          description: desc,
          priority,
          startDate: new Date().toISOString().slice(0, 10),
          deadlineDate,
          deadlineTime,
          status,
          completionDate: status === 'Completed' ? new Date().toISOString() : null,
          customReminders: []
        });
        importedTasksCount++;
      }
    });
  }

  // Save changes to Excel and create a backup
  await saveToExcel();
  await createBackup('import');

  return {
    importedNotesCount,
    importedTasksCount,
    importedCategoriesCount
  };
}

module.exports = {
  initExcel,
  saveToExcel,
  createBackup,
  exportUserData,
  importUserData,
  get users() { return users; },
  set users(val) { users = val; },
  get notes() { return notes; },
  set notes(val) { notes = val; },
  get tasks() { return tasks; },
  set tasks(val) { tasks = val; },
  get notifications() { return notifications; },
  set notifications(val) { notifications = val; },
  get categories() { return categories; },
  set categories(val) { categories = val; },
  get pushSubscriptions() { return pushSubscriptions; },
  set pushSubscriptions(val) { pushSubscriptions = val; }
};
