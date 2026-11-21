# NoteAlert – Smart Notes & Deadline Reminder Application

> **NoteAlert** is a fully functional, cross-platform Notes and Deadline Reminder Progressive Web Application (PWA) with a clean, minimal, modern interface and an Excel (`.xlsx`) storage and backup engine.

---

## 🌟 Key Highlights & Capabilities

- **Cross-Platform Progressive Web App (PWA)**:
  - Installable without browser chrome on **Windows**, **macOS**, **Android**, **iPhone**, and **iPad**.
  - **Offline Mode**: View, create, and update notes and tasks completely offline with local storage caching.
  - **Background Sync**: Automatically synchronizes queued offline actions with the backend when internet connectivity returns.
- **Excel-Based Storage Architecture (`.xlsx`)**:
  - Automatically creates and maintains a structured 5-sheet Excel workbook (`backend/data/notealert_master.xlsx`).
  - **Sheet 1 – Users**: User ID, Username, Password Hash (bcrypt), Security Question, Created Date.
  - **Sheet 2 – Notes**: Note ID, User ID, Note Title, Description, Category, Created/Updated Date, Pinned, Archived, Tags, Attachments.
  - **Sheet 3 – Tasks**: Task ID, User ID, Note ID, Task Title, Description, Priority, Start Date, Deadline Date, Deadline Time, Status, Completion Date.
  - **Sheet 4 – Notifications**: Notification ID, User ID, Task ID, Reminder Type, Scheduled Date, Status, Delivered Date, Message.
  - **Sheet 5 – Categories**: Category ID, User ID, Category Name, Color.
  - **Automated Backups & Recovery**: Rotating snapshots saved automatically in `backend/data/backups/`.
  - **Export & Import**: Download your personal Excel workbook anytime or import existing spreadsheets.
- **Smart Deadline Reminder Engine**:
  - Server-side background scheduler checks upcoming task deadlines every 30 seconds.
  - Scheduled reminder triggers: **7 days before**, **3 days before**, **1 day before**, **3 hours before**, **30 minutes before**, and **At deadline**.
  - Support for **custom reminder timings**.
  - Notification delivery channels:
    - **Web Push API** (delivered even when application is closed).
    - **Desktop browser notifications**.
    - **In-app notification center** with real-time badges.
    - **Synthesized audio chime** (Web Audio API crystal-clear pleasant bell, zero external MP3 dependencies).
    - **Snooze reminders** (10 min, 30 min, 1 hr, 1 day).
    - **Overdue task alerts** with high-visibility warnings and 1-click rescheduling.
- **Notes Management**:
  - Create unlimited notes with rich text formatting (Bold, Italic, Headings, Bullet Lists, Checklists, Code, Links).
  - Pin important notes to the top.
  - Archive notes.
  - Search notes by keyword, description, or tags in real-time.
  - Organize notes by categories and custom tags (`#tag`).
  - Attach files and reference links.
  - **1-Click Convert Note to Task**: Turn any note into a deadline-driven task with priority and reminders while preserving the note.
- **Calendar & Scheduling**:
  - **Monthly Calendar**, **Weekly Calendar**, and **Daily Schedule** views.
  - Tasks marked with priority color coding.
  - Click any event to open details, launch the linked note, or reschedule the deadline inline.
- **10 Core Navigation Sections**:
  1. **Dashboard**: Summary metrics (Total Notes, Total Tasks, Pending, Completed, Upcoming Deadlines, Overdue), Today's Schedule, Quick Add buttons.
  2. **My Notes**: Grid and List views with pin/archive/category filters.
  3. **My Tasks**: Filter by status and priority, complete tasks with uplifting chime and confetti.
  4. **Calendar**: Month, Week, and Day views with drag/click rescheduling.
  5. **Upcoming Deadlines**: Focused chronological view of tasks due in the next 7 days.
  6. **Completed Tasks**: History log with completion timestamps and restore action.
  7. **Overdue Tasks**: Immediate attention view for tasks whose deadline has passed.
  8. **Notifications**: Active reminders, snooze actions, and Excel Sheet 4 delivery history.
  9. **Categories**: Folder management with color palettes and note count indicators.
  10. **Settings**: Profile, password change, audio chime test, dark mode toggle, and Excel export/import/backup manager.

---

## 🚀 Quick Start Guide

### Prerequisites
- Node.js (v18 or higher installed)
- npm

### Launching the Application
You can start the complete application using any of the following methods:

#### Option 1: Double Click (Windows)
Double-click `start.bat` or run `start.ps1`.

#### Option 2: Command Line
From the root directory:
```bash
npm start
```

Open your browser to:
```
http://localhost:5000
```

> **Note**: The backend on port `5000` serves the built, high-performance production frontend, API endpoints, static assets, and Excel storage synchronously!

---

## 🛠️ Development Mode (Live Hot Reloading)

If you wish to edit frontend code with Vite hot module replacement:

1. In one terminal, start backend:
   ```bash
   cd backend
   npm run dev
   ```
2. In a second terminal, start Vite frontend:
   ```bash
   cd frontend
   npm run dev
   ```
3. Open `http://localhost:3000`. API requests are automatically proxied to port `5000`.

---

## 📱 Installing as a PWA (Progressive Web App)

- **Windows / macOS (Chrome, Edge, Brave)**:
  - Open `http://localhost:5000`.
  - Look for the **"Install NoteAlert"** banner in the bottom right corner or click the install icon in the browser address bar (top right).
  - NoteAlert will launch as a standalone desktop application in its own native window without address bars.
- **Android (Chrome)**:
  - Tap the three dots menu &rarr; **"Add to Home screen"** or tap the prompt.
- **iPhone & iPad (Safari)**:
  - Tap the **Share** button &rarr; **"Add to Home Screen"**.

---

## 📂 Project Architecture

```
Notes_application/
├── backend/
│   ├── data/
│   │   ├── notealert_master.xlsx    # Primary Excel Workbook (5 Sheets)
│   │   └── backups/                 # Timestamped automated rolling backups
│   ├── src/
│   │   ├── auth/                    # JWT authentication & session verification
│   │   ├── excel/                   # ExcelJS workbook manager with concurrency locking
│   │   ├── routes/                  # Express API routes (auth, notes, tasks, calendar, storage...)
│   │   ├── scheduler/               # Reminder Engine checking deadlines every 30s
│   │   ├── config.js                # App configuration, paths, VAPID push keys
│   │   └── server.js                # Express server
│   └── test_e2e.js                  # Automated integration test suite
│
├── frontend/
│   ├── public/
│   │   ├── icons/logo.svg           # NoteAlert application icon
│   │   ├── manifest.webmanifest     # PWA Web App Manifest
│   │   └── sw.js                    # Service Worker (offline cache & Web Push)
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/              # Modal, PriorityBadge, RichTextToolbar
│   │   │   ├── layout/              # Header, Sidebar, BottomNav, OfflineBanner, InstallPrompt
│   │   │   └── modals/              # NoteModal, TaskModal, ConvertToTaskModal
│   │   ├── context/                 # AuthContext and AppContext
│   │   ├── services/                # API client, OfflineStorage, Synthesized Audio
│   │   ├── views/                   # 11 App Views (Dashboard, Notes, Tasks, Calendar, Settings...)
│   │   ├── App.jsx                  # Main view switcher and layout container
│   │   └── main.jsx                 # React root mount
│   ├── vite.config.js
│   └── tailwind.config.js
│
├── start.bat                        # 1-click Windows starter
├── start.ps1                        # PowerShell starter
└── package.json                     # Root scripts
```

---

## 🔒 Security & Data Privacy

- Passwords are **never stored in plain text**. All passwords and security answers are hashed using **bcrypt** with salt rounds before being written to the database.
- Excel worksheets store encrypted hashes, notes, tasks, and notification logs.
- Safe concurrent read/write mutex locks guarantee zero file corruption during multiple user operations.
- Per-user account isolation ensures each user strictly accesses their own notes and tasks.
