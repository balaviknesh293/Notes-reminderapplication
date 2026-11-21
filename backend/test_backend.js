const excelManager = require('./src/excel/excelManager');
const { EXCEL_FILE, BACKUP_DIR } = require('./src/config');
const fs = require('fs');

async function runTest() {
  console.log('Testing ExcelManager initialization...');
  await excelManager.initExcel();

  console.log('Excel file exists:', fs.existsSync(EXCEL_FILE));

  // Add dummy user
  excelManager.users.push({
    userId: 'test-user-1',
    username: 'testuser',
    passwordHash: 'dummyhash',
    securityQuestion: 'Color?',
    securityAnswerHash: 'dummyanswer',
    createdDate: new Date().toISOString()
  });

  // Add dummy note
  excelManager.notes.push({
    noteId: 'note-1',
    userId: 'test-user-1',
    noteTitle: 'Project Proposal',
    noteDescription: 'Detailed architecture notes',
    category: 'Work',
    createdDate: new Date().toISOString(),
    updatedDate: new Date().toISOString(),
    pinned: true,
    archived: false,
    tags: ['important', 'v1'],
    attachments: []
  });

  // Add dummy task
  excelManager.tasks.push({
    taskId: 'task-1',
    userId: 'test-user-1',
    noteId: 'note-1',
    taskTitle: 'Submit Project Proposal',
    description: 'Final review and submission',
    priority: 'Critical',
    startDate: new Date().toISOString().slice(0, 10),
    deadlineDate: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
    deadlineTime: '17:00',
    status: 'Pending',
    completionDate: null,
    customReminders: []
  });

  // Add dummy category
  excelManager.categories.push({
    categoryId: 'cat-1',
    userId: 'test-user-1',
    categoryName: 'Work',
    color: '#3b82f6'
  });

  console.log('Saving to Excel...');
  await excelManager.saveToExcel();
  console.log('Excel saved successfully. Size:', fs.statSync(EXCEL_FILE).size, 'bytes');

  console.log('Testing user export...');
  const exportBuffer = await excelManager.exportUserData('test-user-1');
  console.log('Export buffer size:', exportBuffer.length, 'bytes');

  console.log('Testing backup creation...');
  const backup = await excelManager.createBackup('test');
  console.log('Backup created:', backup.fileName);

  console.log('Testing reload from Excel...');
  await excelManager.initExcel();
  console.log('Users count:', excelManager.users.length);
  console.log('Notes count:', excelManager.notes.length);
  console.log('Tasks count:', excelManager.tasks.length);
  console.log('Categories count:', excelManager.categories.length);

  console.log('ALL EXCEL STORAGE TESTS PASSED!');
}

runTest().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
