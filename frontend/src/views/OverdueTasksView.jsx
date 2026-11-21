import React, { useState, useEffect } from 'react';
import { AlertTriangle, Calendar, Clock, CheckCircle2, RotateCcw, Plus } from 'lucide-react';
import { api } from '../services/api';
import { useApp } from '../context/AppContext';
import PriorityBadge from '../components/common/PriorityBadge';
import { playCompletionSound } from '../services/soundEffects';
import confetti from 'canvas-confetti';

export default function OverdueTasksView() {
  const { openEditTaskModal, refreshGlobalData } = useApp();
  const [tasks, setTasks] = useState([]);
  const [rescheduleTaskId, setRescheduleTaskId] = useState(null);
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('18:00');
  const [loading, setLoading] = useState(true);

  const fetchOverdue = async () => {
    try {
      const res = await api.get('/api/tasks?overdue=true');
      if (res.ok && res.data.success) {
        setTasks(res.data.data || []);
      }
    } catch (err) {
      console.warn('Error fetching overdue tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverdue();
  }, []);

  const handleMarkComplete = async (task, e) => {
    e.stopPropagation();
    try {
      playCompletionSound();
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
      await api.patch(`/api/tasks/${task.taskId}/status`, { status: 'Completed' });
      fetchOverdue();
      refreshGlobalData();
    } catch (err) {}
  };

  const handleQuickReschedule = async (taskId) => {
    if (!newDate) return;
    try {
      await api.patch(`/api/tasks/${taskId}/reschedule`, {
        deadlineDate: newDate,
        deadlineTime: newTime
      });
      setRescheduleTaskId(null);
      fetchOverdue();
      refreshGlobalData();
    } catch (err) {
      alert('Failed to reschedule task.');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto">
      <div className="pb-4 border-b border-slate-200/80 dark:border-slate-800/80">
        <h2 className="text-xl sm:text-2xl font-bold text-red-600 dark:text-red-400 flex items-center gap-2">
          <AlertTriangle className="w-6 h-6 text-red-500 animate-pulse" />
          Overdue Tasks
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Tasks whose scheduled deadline has passed. Reschedule them or mark them as done.
        </p>
      </div>

      {tasks.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white dark:bg-[#131c2d] border border-dashed border-emerald-200 dark:border-emerald-900/50">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-700 dark:text-slate-200">
            No overdue tasks!
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            You're all caught up with your deadlines.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
            <div
              key={task.taskId}
              className="p-4 rounded-2xl bg-red-50/50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm"
            >
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-bold text-base text-slate-900 dark:text-white">
                      {task.taskTitle}
                    </h4>
                    <PriorityBadge priority={task.priority} size="xs" />
                  </div>
                  <span className="text-xs text-red-600 dark:text-red-400 font-semibold mt-1 block font-mono">
                    Deadline passed: {task.deadlineDate} at {task.deadlineTime || '12:00'}
                  </span>
                  {task.description && (
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">
                      {task.description}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full sm:w-auto">
                {rescheduleTaskId === task.taskId ? (
                  <div className="flex items-center gap-2 p-2 bg-white dark:bg-slate-900 rounded-xl border border-red-200 dark:border-red-800">
                    <input
                      type="date"
                      value={newDate}
                      onChange={(e) => setNewDate(e.target.value)}
                      className="px-2 py-1 text-xs rounded bg-slate-50 dark:bg-slate-800 border text-slate-900 dark:text-white"
                    />
                    <input
                      type="time"
                      value={newTime}
                      onChange={(e) => setNewTime(e.target.value)}
                      className="px-2 py-1 text-xs rounded bg-slate-50 dark:bg-slate-800 border text-slate-900 dark:text-white"
                    />
                    <button
                      onClick={() => handleQuickReschedule(task.taskId)}
                      className="px-2.5 py-1 bg-blue-600 text-white rounded text-xs font-semibold"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setRescheduleTaskId(null)}
                      className="text-xs text-slate-400 hover:text-slate-600 px-1"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        setRescheduleTaskId(task.taskId);
                        setNewDate(new Date(Date.now() + 86400000).toISOString().slice(0, 10));
                      }}
                      className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-blue-500 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition-colors"
                    >
                      Reschedule
                    </button>
                    <button
                      onClick={(e) => handleMarkComplete(task, e)}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors"
                    >
                      Mark Done
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
