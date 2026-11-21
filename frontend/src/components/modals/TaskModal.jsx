import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import PriorityBadge from '../common/PriorityBadge';
import { Calendar, Clock, Bell, AlertCircle, Link as LinkIcon, Plus, Trash2, Check } from 'lucide-react';
import { api } from '../../services/api';
import { useApp } from '../../context/AppContext';
import { queueOfflineAction } from '../../services/offlineStorage';

export default function TaskModal() {
  const { taskModal, closeTaskModal, refreshGlobalData } = useApp();
  const { isOpen, task, mode } = taskModal;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [startDate, setStartDate] = useState('');
  const [deadlineDate, setDeadlineDate] = useState('');
  const [deadlineTime, setDeadlineTime] = useState('12:00');
  const [status, setStatus] = useState('Pending');
  const [noteId, setNoteId] = useState('');
  const [notesList, setNotesList] = useState([]);
  const [customReminders, setCustomReminders] = useState([]);
  const [customDate, setCustomDate] = useState('');
  const [customTime, setCustomTime] = useState('09:00');
  const [showAddCustom, setShowAddCustom] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Default reminder schedule checkboxes
  const [remindersEnabled, setRemindersEnabled] = useState({
    r7d: true,
    r3d: true,
    r1d: true,
    r3h: true,
    r30m: true,
    rAt: true
  });

  useEffect(() => {
    if (task) {
      setTitle(task.taskTitle || '');
      setDescription(task.description || '');
      setPriority(task.priority || 'Medium');
      setStartDate(task.startDate || new Date().toISOString().slice(0, 10));
      setDeadlineDate(
        task.deadlineDate ||
        new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
      );
      setDeadlineTime(task.deadlineTime || '12:00');
      setStatus(task.status || 'Pending');
      setNoteId(task.noteId || '');
      setCustomReminders(Array.isArray(task.customReminders) ? task.customReminders : []);
    } else {
      setTitle('');
      setDescription('');
      setPriority('Medium');
      setStartDate(new Date().toISOString().slice(0, 10));
      setDeadlineDate(new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10));
      setDeadlineTime('12:00');
      setStatus('Pending');
      setNoteId('');
      setCustomReminders([]);
    }
  }, [task, isOpen]);

  // Load available notes for linking
  useEffect(() => {
    if (isOpen) {
      api.get('/api/notes').then((res) => {
        if (res.ok && res.data.success) {
          setNotesList(res.data.data || []);
        }
      }).catch(() => {});
    }
  }, [isOpen]);

  const handleAddCustomReminder = () => {
    if (!customDate) return;
    const scheduledIso = `${customDate}T${customTime || '09:00'}:00`;
    const label = `${customDate} at ${customTime}`;
    setCustomReminders([
      ...customReminders,
      { id: Date.now(), scheduledIso, label }
    ]);
    setShowAddCustom(false);
  };

  const handleRemoveCustomReminder = (id) => {
    setCustomReminders(customReminders.filter((c) => c.id !== id));
  };

  const handleSave = async () => {
    if (!title.trim()) {
      alert('Task title is required.');
      return;
    }

    setIsSaving(true);
    const payload = {
      taskTitle: title.trim(),
      description,
      priority,
      startDate,
      deadlineDate,
      deadlineTime,
      status,
      noteId: noteId || null,
      customReminders
    };

    try {
      if (mode === 'create') {
        await api.post('/api/tasks', payload);
      } else {
        await api.put(`/api/tasks/${task.taskId}`, payload);
      }
      refreshGlobalData();
      closeTaskModal();
    } catch (err) {
      const offlineTask = {
        ...payload,
        taskId: task?.taskId || `offline-${Date.now()}`,
        updatedDate: new Date().toISOString()
      };
      queueOfflineAction({
        type: mode === 'create' ? 'create' : 'update',
        entity: 'task',
        data: offlineTask
      });
      alert('Saved locally. Will synchronize when online.');
      refreshGlobalData();
      closeTaskModal();
    } finally {
      setIsSaving(false);
    }
  };

  const priorities = ['Critical', 'High', 'Medium', 'Low'];

  return (
    <Modal
      isOpen={isOpen}
      onClose={closeTaskModal}
      title={mode === 'create' ? 'Create New Task & Deadline' : 'Edit Task & Deadline'}
      maxWidth="max-w-2xl"
    >
      <div className="space-y-4">
        {/* Title Input */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Task Title *
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Submit quarterly budget report..."
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100/70 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>

        {/* Priority Selection */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            Priority Level
          </label>
          <div className="grid grid-cols-4 gap-2">
            {priorities.map((p) => {
              const isSelected = priority === p;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                    isSelected
                      ? 'border-blue-600 ring-2 ring-blue-500/30 bg-blue-50/50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 shadow-sm'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <PriorityBadge priority={p} size="xs" />
                </button>
              );
            })}
          </div>
        </div>

        {/* Deadline Date & Time Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-blue-500" /> Deadline Date *
            </label>
            <input
              type="date"
              value={deadlineDate}
              onChange={(e) => setDeadlineDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-100/70 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-blue-500" /> Deadline Time *
            </label>
            <input
              type="time"
              value={deadlineTime}
              onChange={(e) => setDeadlineTime(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-100/70 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Status Selection */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Task Status
          </label>
          <div className="grid grid-cols-3 gap-2">
            {['Pending', 'In Progress', 'Completed'].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatus(s)}
                className={`py-2 px-3 rounded-xl border text-xs font-medium transition-colors ${
                  status === s
                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-semibold shadow-sm'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Description & Notes
          </label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Key deliverables, steps, or instructions..."
            className="w-full p-3 rounded-xl bg-slate-100/70 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
          />
        </div>

        {/* Associated Note Link */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
            <LinkIcon className="w-3.5 h-3.5" /> Associated Note
          </label>
          <select
            value={noteId}
            onChange={(e) => setNoteId(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-slate-100/70 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          >
            <option value="">None (Standalone task)</option>
            {notesList.map((n) => (
              <option key={n.noteId} value={n.noteId}>
                {n.noteTitle} ({n.category})
              </option>
            ))}
          </select>
        </div>

        {/* Deadline Reminder Schedule Section */}
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Bell className="w-4 h-4 text-amber-500" />
              Automatic Reminder Schedule
            </span>
            <span className="text-[11px] text-slate-400">Server & Push notifications</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-slate-600 dark:text-slate-300">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={remindersEnabled.r7d}
                onChange={(e) => setRemindersEnabled({ ...remindersEnabled, r7d: e.target.checked })}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span>7 days before</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={remindersEnabled.r3d}
                onChange={(e) => setRemindersEnabled({ ...remindersEnabled, r3d: e.target.checked })}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span>3 days before</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={remindersEnabled.r1d}
                onChange={(e) => setRemindersEnabled({ ...remindersEnabled, r1d: e.target.checked })}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span>1 day before</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={remindersEnabled.r3h}
                onChange={(e) => setRemindersEnabled({ ...remindersEnabled, r3h: e.target.checked })}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span>3 hours before</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={remindersEnabled.r30m}
                onChange={(e) => setRemindersEnabled({ ...remindersEnabled, r30m: e.target.checked })}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span>30 mins before</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-blue-600 dark:text-blue-400">
              <input
                type="checkbox"
                checked={remindersEnabled.rAt}
                onChange={(e) => setRemindersEnabled({ ...remindersEnabled, rAt: e.target.checked })}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span>At deadline</span>
            </label>
          </div>

          {/* Custom Reminders */}
          <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800/60">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Custom Reminders:</span>
              <button
                type="button"
                onClick={() => setShowAddCustom(!showAddCustom)}
                className="text-xs text-blue-600 dark:text-blue-400 font-medium hover:underline flex items-center gap-0.5"
              >
                <Plus className="w-3 h-3" /> Add Custom
              </button>
            </div>

            {showAddCustom && (
              <div className="flex items-center gap-2 p-2 bg-slate-100 dark:bg-slate-800 rounded-lg mb-2">
                <input
                  type="date"
                  value={customDate}
                  onChange={(e) => setCustomDate(e.target.value)}
                  className="px-2 py-1 text-xs rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                />
                <input
                  type="time"
                  value={customTime}
                  onChange={(e) => setCustomTime(e.target.value)}
                  className="px-2 py-1 text-xs rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                />
                <button
                  type="button"
                  onClick={handleAddCustomReminder}
                  className="px-2.5 py-1 bg-blue-600 text-white rounded text-xs font-medium"
                >
                  Save
                </button>
              </div>
            )}

            {customReminders.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {customReminders.map((rem) => (
                  <span
                    key={rem.id}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-xs"
                  >
                    <Clock className="w-3 h-3" />
                    {rem.label}
                    <button
                      type="button"
                      onClick={() => handleRemoveCustomReminder(rem.id)}
                      className="hover:text-red-600 ml-1"
                    >
                      &times;
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={closeTaskModal}
            className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-xl shadow-sm shadow-blue-500/20 transition-colors disabled:opacity-60"
          >
            {isSaving ? 'Saving...' : 'Save Task & Set Reminders'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
