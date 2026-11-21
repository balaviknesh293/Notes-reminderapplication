const fs = require('fs');
const path = require('path');

async function runE2E() {
  console.log('--- Starting NoteAlert End-to-End Integration Verification ---');

  const { PORT, EXCEL_FILE, BACKUP_DIR } = require('./src/config');
  const excelManager = require('./src/excel/excelManager');
  const reminderEngine = require('./src/scheduler/reminderEngine');

  // 1. Initialize Excel
  console.log('1. Initializing Excel Workbook...');
  await excelManager.initExcel();

  if (!fs.existsSync(EXCEL_FILE)) {
    throw new Error('Master Excel file was not created!');
  }
  console.log('   Excel Master Workbook verified at:', EXCEL_FILE);

  // 2. Start reminder engine check
  console.log('2. Running Reminder Engine deadline evaluation...');
  await reminderEngine.checkDeadlines();
  console.log('   Reminder engine active without errors.');

  // 3. Test user data creation & isolation
  console.log('3. Testing User, Note, and Task creation...');
  const testUserId = 'user-test-' + Date.now();
  const testUsername = 'sarah_dev';

  excelManager.users.push({
    userId: testUserId,
    username: testUsername,
    passwordHash: '$2a$10$abcdefghijklmnopqrstuvwxyz1234567890',
    securityQuestion: 'Favorite editor?',
    securityAnswerHash: '$2a$10$dummyhashforrecovery',
    createdDate: new Date().toISOString()
  });

  const testNoteId = 'note-test-' + Date.now();
  excelManager.notes.push({
    noteId: testNoteId,
    userId: testUserId,
    noteTitle: 'Project Architecture Blueprint',
    noteDescription: '## System Overview\n• PWA cross-platform\n• Excel storage\n• Web push reminders',
    category: 'Work',
    createdDate: new Date().toISOString(),
    updatedDate: new Date().toISOString(),
    pinned: true,
    archived: false,
    tags: ['design', 'v1'],
    attachments: [{ id: 1, name: 'Spec doc', url: 'https://example.com/spec', type: 'link' }]
  });

  const testTaskId = 'task-test-' + Date.now();
  excelManager.tasks.push({
    taskId: testTaskId,
    userId: testUserId,
    noteId: testNoteId,
    taskTitle: 'Deliver Client Prototype',
    description: 'Ensure PWA offline caching and Excel backups pass.',
    priority: 'Critical',
    startDate: new Date().toISOString().slice(0, 10),
    deadlineDate: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
    deadlineTime: '17:00',
    status: 'Pending',
    completionDate: null,
    customReminders: []
  });

  // 4. Save to Excel & trigger backup
  console.log('4. Saving mutated state to Excel Master Workbook...');
  await excelManager.saveToExcel();
  console.log('   Excel file size:', fs.statSync(EXCEL_FILE).size, 'bytes');

  console.log('5. Creating automated backup snapshot...');
  const backup = await excelManager.createBackup('e2e');
  console.log('   Backup file created:', backup.fileName);

  // 6. Test Excel Export
  console.log('6. Generating individual user Excel download buffer...');
  const exportBuffer = await excelManager.exportUserData(testUserId);
  if (!exportBuffer || exportBuffer.length === 0) {
    throw new Error('User export buffer is empty!');
  }
  console.log('   Exported user .xlsx size:', exportBuffer.length, 'bytes');

  // 7. Verify Sheet reloading from disk
  console.log('7. Verifying cold reload from Excel disk file...');
  await excelManager.initExcel();

  const userFound = excelManager.users.find((u) => u.userId === testUserId);
  const noteFound = excelManager.notes.find((n) => n.noteId === testNoteId);
  const taskFound = excelManager.tasks.find((t) => t.taskId === testTaskId);

  if (!userFound || !noteFound || !taskFound) {
    throw new Error('Data persistence mismatch after Excel reload!');
  }

  console.log('   Cold reload verified: User, Note, and Task reloaded accurately from .xlsx.');
  console.log('--- ALL E2E VERIFICATION CHECKS PASSED! ---');
}

runE2E()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('E2E test failed:', err);
    process.exit(1);
  });
