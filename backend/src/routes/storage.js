const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const excelManager = require('../excel/excelManager');
const authMiddleware = require('../auth/authMiddleware');
const { BACKUP_DIR, EXCEL_FILE } = require('../config');

// Multer memory storage for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 } // 25MB max
});

router.use(authMiddleware);

// 1. Export user data as Excel (.xlsx)
router.get('/export', async (req, res) => {
  try {
    const buffer = await excelManager.exportUserData(req.user.userId);
    const filename = `NoteAlert_${req.user.username}_${new Date().toISOString().slice(0, 10)}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(buffer);
  } catch (err) {
    console.error('Export error:', err);
    return res.status(500).json({ success: false, message: 'Failed to export Excel workbook.' });
  }
});

// 2. Import user data from uploaded Excel (.xlsx)
router.post('/import', upload.single('file'), async (req, res) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ success: false, message: 'Please upload a valid .xlsx file.' });
    }

    const result = await excelManager.importUserData(req.user.userId, req.file.buffer);
    return res.json({
      success: true,
      message: 'Workbook imported successfully!',
      details: result
    });
  } catch (err) {
    console.error('Import error:', err);
    return res.status(500).json({ success: false, message: 'Failed to import workbook: ' + err.message });
  }
});

// 3. List automatic backups
router.get('/backups', (req, res) => {
  try {
    if (!fs.existsSync(BACKUP_DIR)) {
      return res.json({ success: true, backups: [] });
    }

    const files = fs.readdirSync(BACKUP_DIR)
      .filter((f) => f.startsWith('notealert_backup_') && f.endsWith('.xlsx'))
      .map((f) => {
        const stat = fs.statSync(path.join(BACKUP_DIR, f));
        return {
          fileName: f,
          sizeBytes: stat.size,
          sizeKb: (stat.size / 1024).toFixed(1),
          createdAt: stat.mtime.toISOString()
        };
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return res.json({ success: true, count: files.length, backups: files });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to list backups.' });
  }
});

// 4. Download a specific backup file
router.get('/backups/:filename', (req, res) => {
  try {
    const filename = path.basename(req.params.filename);
    const filePath = path.join(BACKUP_DIR, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'Backup file not found.' });
    }

    return res.download(filePath, filename);
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to download backup.' });
  }
});

// 5. Trigger immediate manual backup
router.post('/backup-now', async (req, res) => {
  try {
    const backup = await excelManager.createBackup('manual');
    if (!backup) {
      return res.status(500).json({ success: false, message: 'Failed to create backup.' });
    }
    return res.json({ success: true, message: 'Backup created successfully!', backup });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Error creating manual backup.' });
  }
});

module.exports = router;
