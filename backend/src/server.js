const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { PORT, UPLOADS_DIR } = require('./config');
const excelManager = require('./excel/excelManager');
const reminderEngine = require('./scheduler/reminderEngine');

// Import routes
const authRoutes = require('./routes/auth');
const notesRoutes = require('./routes/notes');
const tasksRoutes = require('./routes/tasks');
const categoriesRoutes = require('./routes/categories');
const notificationsRoutes = require('./routes/notifications');
const dashboardRoutes = require('./routes/dashboard');
const calendarRoutes = require('./routes/calendar');
const storageRoutes = require('./routes/storage');
const pushRoutes = require('./routes/push');
const syncRoutes = require('./routes/sync');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Static uploads directory
app.use('/uploads', express.static(UPLOADS_DIR));

// File attachment upload handler
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  }
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB limit

app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded.' });
  }
  const fileUrl = `/uploads/${req.file.filename}`;
  return res.json({
    success: true,
    file: {
      originalName: req.file.originalname,
      fileName: req.file.filename,
      size: req.file.size,
      mimetype: req.file.mimetype,
      url: fileUrl
    }
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/notes', notesRoutes);
app.use('/api/tasks', tasksRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/storage', storageRoutes);
app.use('/api/push', pushRoutes);
app.use('/api/sync', syncRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'NoteAlert',
    time: new Date().toISOString(),
    excelStats: {
      users: excelManager.users.length,
      notes: excelManager.notes.length,
      tasks: excelManager.tasks.length,
      notifications: excelManager.notifications.length,
      categories: excelManager.categories.length
    }
  });
});

// Serve frontend static build if present
const frontendDist = path.join(__dirname, '..', '..', 'frontend', 'dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api') && !req.path.startsWith('/uploads')) {
      res.sendFile(path.join(frontendDist, 'index.html'));
    }
  });
}

// Global error handler
app.use((err, req, res, next) => {
  console.error('[Unhandled Error]:', err);
  res.status(500).json({ success: false, message: err.message || 'Internal Server Error' });
});

// Start Server
async function start() {
  try {
    console.log('[NoteAlert] Initializing Excel Master Workbook...');
    await excelManager.initExcel();
    console.log('[NoteAlert] Excel Master Workbook ready.');

    reminderEngine.startReminderEngine();

    app.listen(PORT, () => {
      console.log(`=======================================================`);
      console.log(`  NoteAlert Backend running on http://localhost:${PORT}`);
      console.log(`  Excel Storage: ${path.resolve(require('./config').EXCEL_FILE)}`);
      console.log(`=======================================================`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();
