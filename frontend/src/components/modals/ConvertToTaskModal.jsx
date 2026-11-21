import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import PriorityBadge from '../common/PriorityBadge';
import { Calendar, Clock, CheckSquare } from 'lucide-react';
import { api } from '../../services/api';
import { useApp } from '../../context/AppContext';

export default function ConvertToTaskModal() {
  const { convertToTaskModal, closeConvertToTaskModal, refreshGlobalData, setActiveTab } = useApp();
  const { isOpen, note } = convertToTaskModal;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('High');
  const [deadlineDate, setDeadlineDate] = useState('');
  const [deadlineTime, setDeadlineTime] = useState('17:00');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (note) {
      setTitle(note.noteTitle || 'Task from Note');
      setDescription(note.noteDescription || '');
      setPriority('High');
      setDeadlineDate(new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10));
      setDeadlineTime('17:00');
    }
  }, [note, isOpen]);

  const handleConvert = async () => {
    if (!note?.noteId) return;
    setIsSubmitting(true);

    try {
      const res = await api.post(`/api/notes/${note.noteId}/convert-to-task`, {
        taskTitle: title,
        description,
        priority,
        deadlineDate,
        deadlineTime
      });

      if (res.ok && res.data.success) {
        refreshGlobalData();
        closeConvertToTaskModal();
        setActiveTab('tasks');
      } else {
        alert(res.data?.message || 'Failed to convert note to task.');
      }
    } catch (err) {
      alert('Network error while converting note.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={closeConvertToTaskModal}
      title="Convert Note into Deadline Task"
      maxWidth="max-w-lg"
    >
      <div className="space-y-4">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          This converts note "<strong>{note?.noteTitle}</strong>" into an actionable task with automatic deadline reminders while preserving the note.
        </p>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Task Title *
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-slate-100/70 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Priority
          </label>
          <div className="grid grid-cols-4 gap-2">
            {['Critical', 'High', 'Medium', 'Low'].map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPriority(p)}
                className={`py-1.5 px-2 rounded-xl border text-xs font-semibold flex items-center justify-center transition-all ${
                  priority === p
                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40 ring-1 ring-blue-500'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                }`}
              >
                <PriorityBadge priority={p} size="xs" />
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-blue-500" /> Deadline Date
            </label>
            <input
              type="date"
              value={deadlineDate}
              onChange={(e) => setDeadlineDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-blue-500" /> Deadline Time
            </label>
            <input
              type="time"
              value={deadlineTime}
              onChange={(e) => setDeadlineTime(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={closeConvertToTaskModal}
            className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConvert}
            disabled={isSubmitting}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm shadow-blue-500/20 disabled:opacity-60"
          >
            <CheckSquare className="w-3.5 h-3.5" />
            {isSubmitting ? 'Converting...' : 'Create Task'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
