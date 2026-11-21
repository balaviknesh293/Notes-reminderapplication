import React, { useState, useEffect, useRef } from 'react';
import {
  Settings,
  User,
  Key,
  Volume2,
  VolumeX,
  Sun,
  Moon,
  FileSpreadsheet,
  Download,
  Upload,
  Archive,
  Bell,
  Check,
  AlertCircle,
  RefreshCw,
  Mail,
  Send,
  Sparkles
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { isSoundEnabled, setSoundEnabled, playNotificationSound } from '../services/soundEffects';

export default function SettingsView() {
  const { user, updateProfile, changePassword } = useAuth();
  const { darkMode, toggleDarkMode, refreshGlobalData } = useApp();

  // Profile Form state
  const [username, setUsername] = useState(user?.username || '');
  const [profileMsg, setProfileMsg] = useState({ type: '', text: '' });
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  // Email & Reminder Notification state
  const [userEmail, setUserEmail] = useState(user?.email || 'balaviknesh0293@gmail.com');
  const [emailReminders, setEmailReminders] = useState(user?.emailRemindersEnabled !== false);
  const [emailMsg, setEmailMsg] = useState({ type: '', text: '' });
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);
  const [isSendingTestEmail, setIsSendingTestEmail] = useState(false);
  const [browserPerm, setBrowserPerm] = useState(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default'
  );

  // Password Form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState({ type: '', text: '' });
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // Audio state
  const [soundOn, setSoundOn] = useState(isSoundEnabled());

  // Excel & Backup state
  const [backups, setBackups] = useState([]);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importStatus, setImportStatus] = useState('');
  const [backupStatus, setBackupStatus] = useState('');

  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchBackups();
  }, []);

  const fetchBackups = async () => {
    try {
      const res = await api.get('/api/storage/backups');
      if (res.ok && res.data.success) {
        setBackups(res.data.backups || []);
      }
    } catch (err) {}
  };

  const handleUpdateUsername = async (e) => {
    e.preventDefault();
    if (!username.trim()) return;
    setIsUpdatingProfile(true);
    setProfileMsg({ type: '', text: '' });

    const res = await updateProfile({ newUsername: username.trim() });
    setIsUpdatingProfile(false);
    if (res.success) {
      setProfileMsg({ type: 'success', text: 'Username updated successfully.' });
    } else {
      setProfileMsg({ type: 'error', text: res.message });
    }
  };

  const handleUpdateEmail = async (e) => {
    e.preventDefault();
    setIsUpdatingEmail(true);
    setEmailMsg({ type: '', text: '' });
    const res = await updateProfile({ email: userEmail.trim(), emailRemindersEnabled: emailReminders });
    setIsUpdatingEmail(false);
    if (res.success) {
      setEmailMsg({ type: 'success', text: 'Email reminder preferences saved successfully.' });
    } else {
      setEmailMsg({ type: 'error', text: res.message });
    }
  };

  const handleSendTestEmail = async () => {
    if (!userEmail.trim()) {
      setEmailMsg({ type: 'error', text: 'Please enter a valid email address first.' });
      return;
    }
    setIsSendingTestEmail(true);
    setEmailMsg({ type: '', text: '' });
    try {
      const res = await api.post('/api/notifications/test-email', { email: userEmail.trim() });
      if (res.ok && res.data.success) {
        setEmailMsg({ type: 'success', text: res.data.message });
      } else {
        setEmailMsg({ type: 'error', text: res.data?.message || 'Failed to dispatch test email.' });
      }
    } catch (err) {
      setEmailMsg({ type: 'error', text: 'Could not contact backend email service.' });
    } finally {
      setIsSendingTestEmail(false);
    }
  };

  const handleRequestDesktopPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const perm = await Notification.requestPermission();
        setBrowserPerm(perm);
        if (perm === 'granted') {
          new Notification('NoteAlert Popups Enabled', {
            body: 'Desktop popup messages are now active for all deadline reminders!',
            icon: '/vite.svg'
          });
        }
      } catch (e) {}
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) return;
    setIsUpdatingPassword(true);
    setPasswordMsg({ type: '', text: '' });

    const res = await changePassword(currentPassword, newPassword, confirmPassword);
    setIsUpdatingPassword(false);
    if (res.success) {
      setPasswordMsg({ type: 'success', text: 'Password changed successfully.' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } else {
      setPasswordMsg({ type: 'error', text: res.message });
    }
  };

  const handleToggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    setSoundEnabled(next);
    if (next) playNotificationSound();
  };

  // Export personal Excel workbook
  const handleExportExcel = async () => {
    setIsExporting(true);
    try {
      const res = await api.get('/api/storage/export');
      if (res.ok && res.data) {
        const url = window.URL.createObjectURL(res.data);
        const a = document.createElement('a');
        a.href = url;
        a.download = `NoteAlert_${user?.username || 'Data'}_${new Date().toISOString().slice(0, 10)}.xlsx`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      }
    } catch (err) {
      alert('Failed to export Excel workbook.');
    } finally {
      setIsExporting(false);
    }
  };

  // Import Excel workbook
  const handleImportExcel = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportStatus('');
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await api.post('/api/storage/import', formData);
      if (res.ok && res.data.success) {
        setImportStatus(`Imported ${res.data.details.importedNotesCount} notes, ${res.data.details.importedTasksCount} tasks.`);
        refreshGlobalData();
        fetchBackups();
      } else {
        alert(res.data?.message || 'Failed to import workbook.');
      }
    } catch (err) {
      alert('Error importing Excel file.');
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Trigger manual backup
  const handleBackupNow = async () => {
    try {
      const res = await api.post('/api/storage/backup-now');
      if (res.ok && res.data.success) {
        setBackupStatus('Backup snapshot created successfully.');
        fetchBackups();
        setTimeout(() => setBackupStatus(''), 4000);
      }
    } catch (err) {
      alert('Failed to create backup.');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
      {/* Header */}
      <div className="pb-4 border-b border-slate-200/80 dark:border-slate-800/80">
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Settings className="w-6 h-6 text-blue-600" />
          Application Settings & Storage
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Configure security, preferences, notification alerts, and manage Excel workbooks.
        </p>
      </div>

      {/* 1. Account Profile */}
      <div className="p-6 rounded-2xl bg-white dark:bg-[#131c2d] border border-slate-200/80 dark:border-slate-800/80 shadow-sm space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
          <User className="w-5 h-5 text-blue-600" />
          <h3 className="font-bold text-base text-slate-900 dark:text-white">Profile Details</h3>
        </div>

        <form onSubmit={handleUpdateUsername} className="space-y-3 max-w-md">
          {profileMsg.text && (
            <div className={`p-2.5 rounded-xl text-xs flex items-center gap-1.5 ${
              profileMsg.type === 'success' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300'
            }`}>
              <Check className="w-3.5 h-3.5" /> {profileMsg.text}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <button
            type="submit"
            disabled={isUpdatingProfile}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors disabled:opacity-60"
          >
            {isUpdatingProfile ? 'Saving...' : 'Update Username'}
          </button>
        </form>
      </div>

      {/* 2. Email Reminders & Popup Notifications */}
      <div className="p-6 rounded-2xl bg-white dark:bg-[#131c2d] border border-slate-200/80 dark:border-slate-800/80 shadow-sm space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              Email Reminders & Popup Notifications
            </h3>
          </div>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 font-bold">
            Live Alerts
          </span>
        </div>

        {emailMsg.text && (
          <div className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
            emailMsg.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40'
              : 'bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-300 border border-red-200 dark:border-red-800/40'
          }`}>
            {emailMsg.type === 'success' ? <Check className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
            <span>{emailMsg.text}</span>
          </div>
        )}

        <form onSubmit={handleUpdateEmail} className="space-y-4 max-w-lg">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Your Notification Email Address
            </label>
            <input
              type="email"
              value={userEmail}
              onChange={(e) => setUserEmail(e.target.value)}
              placeholder="e.g. yourname@gmail.com"
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Deadlines (1 day before, 3 hours before, 30 min before, at deadline, and overdue) are automatically dispatched to this inbox.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="emailRemindersToggle"
              checked={emailReminders}
              onChange={(e) => setEmailReminders(e.target.checked)}
              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 dark:border-slate-700"
            />
            <label htmlFor="emailRemindersToggle" className="text-xs font-medium text-slate-800 dark:text-slate-200 cursor-pointer">
              Send automated email reminders for task deadlines
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="submit"
              disabled={isUpdatingEmail}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors disabled:opacity-60"
            >
              {isUpdatingEmail ? 'Saving...' : 'Save Email Preferences'}
            </button>

            <button
              type="button"
              onClick={handleSendTestEmail}
              disabled={isSendingTestEmail}
              className="px-3.5 py-2 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              {isSendingTestEmail ? 'Sending...' : 'Send Test Reminder Email'}
            </button>
          </div>
        </form>

        {/* Desktop & In-App Popups Configuration */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <p className="font-semibold text-sm text-slate-800 dark:text-slate-200">
                Desktop & Browser Popup Messages
              </p>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                browserPerm === 'granted'
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
              }`}>
                {browserPerm === 'granted' ? 'Enabled' : browserPerm === 'denied' ? 'Blocked in Browser' : 'Click to Enable'}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Instant on-screen popup cards appear when deadlines hit, with snooze & view task shortcuts.
            </p>
          </div>

          {browserPerm !== 'granted' && (
            <button
              type="button"
              onClick={handleRequestDesktopPermission}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-colors whitespace-nowrap self-start sm:self-auto"
            >
              Enable Browser Popups
            </button>
          )}
        </div>
      </div>

      {/* 3. Security: Change Password */}
      <div className="p-6 rounded-2xl bg-white dark:bg-[#131c2d] border border-slate-200/80 dark:border-slate-800/80 shadow-sm space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
          <Key className="w-5 h-5 text-blue-600" />
          <h3 className="font-bold text-base text-slate-900 dark:text-white">Change Password</h3>
        </div>

        <form onSubmit={handleChangePassword} className="space-y-3 max-w-md">
          {passwordMsg.text && (
            <div className={`p-2.5 rounded-xl text-xs flex items-center gap-1.5 ${
              passwordMsg.type === 'success' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300'
            }`}>
              {passwordMsg.type === 'success' ? <Check className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
              {passwordMsg.text}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Current Password
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              New Password (min 6 chars)
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Confirm New Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={isUpdatingPassword}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors disabled:opacity-60"
          >
            {isUpdatingPassword ? 'Updating...' : 'Change Password'}
          </button>
        </form>
      </div>

      {/* 3. Preferences (Theme & Sound) */}
      <div className="p-6 rounded-2xl bg-white dark:bg-[#131c2d] border border-slate-200/80 dark:border-slate-800/80 shadow-sm space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
          <Bell className="w-5 h-5 text-blue-600" />
          <h3 className="font-bold text-base text-slate-900 dark:text-white">Preferences & Audio</h3>
        </div>

        <div className="space-y-4">
          {/* Notification Audio Chime */}
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-sm text-slate-800 dark:text-slate-200">
                Notification Sound Chime
              </p>
              <p className="text-xs text-slate-500">
                Play an uplifting synthesized bell chime when deadlines arrive or tasks are completed.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => playNotificationSound()}
                className="px-2.5 py-1 text-xs border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-50"
              >
                Test Chime
              </button>
              <button
                type="button"
                onClick={handleToggleSound}
                className={`p-2 rounded-xl transition-colors ${
                  soundOn ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                }`}
              >
                {soundOn ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Theme Mode */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
            <div>
              <p className="font-semibold text-sm text-slate-800 dark:text-slate-200">
                Appearance Mode
              </p>
              <p className="text-xs text-slate-500">
                Switch between clean light mode and charcoal dark mode.
              </p>
            </div>
            <button
              onClick={toggleDarkMode}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50"
            >
              {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
              {darkMode ? 'Dark Mode' : 'Light Mode'}
            </button>
          </div>
        </div>
      </div>

      {/* 4. Excel-Based Storage & Backup System */}
      <div className="p-6 rounded-2xl bg-white dark:bg-[#131c2d] border border-slate-200/80 dark:border-slate-800/80 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              Excel Storage & Backup Management
            </h3>
          </div>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 font-bold">
            OpenPyXL / ExcelJS
          </span>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          Your personal data is automatically recorded in Microsoft Excel (.xlsx) structure containing all 5 sheets (Users, Notes, Tasks, Notifications, Categories). You can export your personal workbook anytime, or import an existing workbook.
        </p>

        {importStatus && (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs font-medium">
            {importStatus}
          </div>
        )}

        {backupStatus && (
          <div className="p-3 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 rounded-xl text-xs font-medium">
            {backupStatus}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          {/* Export Personal Data */}
          <button
            onClick={handleExportExcel}
            disabled={isExporting}
            className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-blue-500 flex flex-col items-center justify-center text-center gap-2 group transition-all"
          >
            <Download className="w-6 h-6 text-blue-600 group-hover:scale-110 transition-transform" />
            <div>
              <p className="font-semibold text-xs text-slate-800 dark:text-slate-200">
                {isExporting ? 'Generating XLSX...' : 'Download My Data'}
              </p>
              <p className="text-[11px] text-slate-400">Export personal .xlsx workbook</p>
            </div>
          </button>

          {/* Import Workbook */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting}
            className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-emerald-500 flex flex-col items-center justify-center text-center gap-2 group transition-all"
          >
            <Upload className="w-6 h-6 text-emerald-600 group-hover:scale-110 transition-transform" />
            <div>
              <p className="font-semibold text-xs text-slate-800 dark:text-slate-200">
                {isImporting ? 'Importing...' : 'Import Excel Workbook'}
              </p>
              <p className="text-[11px] text-slate-400">Merge records from .xlsx file</p>
            </div>
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImportExcel}
            accept=".xlsx"
            className="hidden"
          />

          {/* Trigger Backup */}
          <button
            onClick={handleBackupNow}
            className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-purple-500 flex flex-col items-center justify-center text-center gap-2 group transition-all"
          >
            <Archive className="w-6 h-6 text-purple-600 group-hover:scale-110 transition-transform" />
            <div>
              <p className="font-semibold text-xs text-slate-800 dark:text-slate-200">
                Create Backup Now
              </p>
              <p className="text-[11px] text-slate-400">Save timestamped master snapshot</p>
            </div>
          </button>
        </div>

        {/* Automated Backups List */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
          <h4 className="font-semibold text-xs text-slate-700 dark:text-slate-300 mb-2">
            Available Automatic System Backups ({backups.length})
          </h4>

          {backups.length === 0 ? (
            <p className="text-xs text-slate-400">No backup snapshots recorded yet.</p>
          ) : (
            <div className="max-h-48 overflow-y-auto space-y-1.5">
              {backups.map((b) => (
                <div
                  key={b.fileName}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800/60 text-xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    <span className="font-mono text-slate-800 dark:text-slate-200 truncate">
                      {b.fileName}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">({b.sizeKb} KB)</span>
                  </div>
                  <a
                    href={`/api/storage/backups/${b.fileName}`}
                    download
                    className="flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline font-semibold flex-shrink-0 ml-2"
                  >
                    <Download className="w-3.5 h-3.5" /> Download
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
