import React, { useState, useEffect } from 'react';
import {
  CheckSquare,
  Plus,
  Clock,
  Calendar,
  AlertCircle,
  Trash2,
  Edit2,
  FileText,
  Filter,
  CheckCircle2
} from 'lucide-react';
import { api } from '../services/api';
import { useApp } from '../context/AppContext';
import PriorityBadge from '../components/common/PriorityBadge';
import { playCompletionSound } from '../services/soundEffects';
import confetti from 'canvas-confetti';

export default function TasksView() {
  const {
    searchQuery,
    openNewTaskModal,
    openEditTaskModal,
    openEditNoteModal,
    refreshGlobalData
  } = useApp();

  const [tasks, setTasks] = useState([]);
  const [statusFilter, setStatusFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [loading, setLoading] = useState(true);

  const fetchTasks = async () => {
    try {
      const sParam = statusFilter !== 'All' ? `status=${encodeURIComponent(statusFilter)}` : '';
      const pParam = priorityFilter !== 'All' ? `&priority=${encodeURIComponent(priorityFilter)}` : '';
      const searchParam = searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : '';

      const res = await api.get(`/api/tasks?${sParam}${pParam}${searchParam}`);
      if (res.ok && res.data.success) {
        setTasks(res.data.data || []);
      }
    } catch (err) {
      console.warn('Error fetching tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [statusFilter, priorityFilter, searchQuery]);

  const handleToggleStatus = async (task, e) => {
    e.stopPropagation();
    const newStatus = task.status === 'Completed' ? 'Pending' : 'Completed';
    try {
      if (newStatus === 'Completed') {
        playCompletionSound();
        confetti({
          particleCount: 60,
          spread: 70,
          origin: { y: 0.7 }
        });
      }
      await api.patch(`/api/tasks/${task.taskId}/status`, { status: newStatus });
      fetchTasks();
      refreshGlobalData();
    } catch (err) {}
  };

  const handleDelete = async (task, e) => {
    e.stopPropagation();
    if (window.confirm(`Delete task "${task.taskTitle}"?`)) {
      try {
        await api.delete(`/api/tasks/${task.taskId}`);
        fetchTasks();
        refreshGlobalData();
      } catch (err) {}
    }
  };

  const handleOpenLinkedNote = async (noteId, e) => {
    e.stopPropagation();
    try {
      const res = await api.get(`/api/notes/${noteId}`);
      if (res.ok && res.data.success) {
        openEditNoteModal(res.data.data);
      }
    } catch (err) {}
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-slate-800/80">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <CheckSquare className="w-6 h-6 text-blue-600" />
            My Tasks & Deadlines
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Manage deadlines, set automatic reminder schedules, and prioritize work.
          </p>
        </div>

        <button
          onClick={() => openNewTaskModal()}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-sm shadow-blue-500/20 active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4" />
          Add Task
        </button>
      </div>

      {/* Filter Row */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Status Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {['All', 'Pending', 'In Progress', 'Completed', 'Overdue'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-xl font-medium transition-colors ${
                statusFilter === s
                  ? 'bg-blue-600 text-white font-semibold shadow-sm'
                  : 'bg-white dark:bg-[#131c2d] border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50'
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Priority Filter */}
        <div className="flex items-center gap-2">
          <span className="text-slate-500 dark:text-slate-400 font-medium">Priority:</span>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-[#131c2d] border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none"
          >
            <option value="All">All Priorities</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </div>
      </div>

      {/* Task List */}
      {tasks.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white dark:bg-[#131c2d] border border-dashed border-slate-200 dark:border-slate-800">
          <CheckSquare className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-700 dark:text-slate-200">
            No tasks found
          </h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            {searchQuery || statusFilter !== 'All' || priorityFilter !== 'All'
              ? 'Try adjusting your filters.'
              : 'Add your first task with deadline to receive automatic reminder notifications.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {tasks.map((task) => {
            const isCompleted = task.status === 'Completed';
            const isOverdue = task.status === 'Overdue';

            return (
              <div
                key={task.taskId}
                onClick={() => openEditTaskModal(task)}
                className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 cursor-pointer shadow-sm ${
                  isCompleted
                    ? 'bg-slate-50/60 dark:bg-slate-900/30 border-slate-200 dark:border-slate-800/80 opacity-70'
                    : isOverdue
                    ? 'bg-red-50/40 dark:bg-red-950/20 border-red-200 dark:border-red-900/40 hover:border-red-400'
                    : 'bg-white dark:bg-[#131c2d] border-slate-200/80 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-500'
                }`}
              >
                {/* Left side: Checkbox + Title & Description */}
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <button
                    onClick={(e) => handleToggleStatus(task, e)}
                    className={`mt-0.5 w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-colors flex-shrink-0 ${
                      isCompleted
                        ? 'bg-emerald-500 border-emerald-500 text-white'
                        : isOverdue
                        ? 'border-red-400 hover:bg-red-100'
                        : 'border-slate-300 dark:border-slate-600 hover:border-blue-500'
                    }`}
                  >
                    {isCompleted && <CheckCircle2 className="w-4 h-4 text-white" />}
                  </button>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4
                        className={`font-semibold text-sm sm:text-base leading-snug ${
                          isCompleted
                            ? 'line-through text-slate-400 dark:text-slate-500'
                            : 'text-slate-900 dark:text-white'
                        }`}
                      >
                        {task.taskTitle}
                      </h4>
                      <PriorityBadge priority={task.priority} size="xs" />
                      {isOverdue && (
                        <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/60 dark:text-red-300 text-[10px] font-bold uppercase tracking-wider">
                          Overdue
                        </span>
                      )}
                    </div>

                    {task.description && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                        {task.description}
                      </p>
                    )}

                    {/* Linked Note Pill if associated */}
                    {task.noteId && (
                      <button
                        onClick={(e) => handleOpenLinkedNote(task.noteId, e)}
                        className="inline-flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400 hover:underline mt-1.5"
                      >
                        <FileText className="w-3 h-3" />
                        <span>View Linked Note</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Right side: Deadline date, time & action buttons */}
                <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto justify-between sm:justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                  <div className="text-left sm:text-right">
                    <div className="flex items-center sm:justify-end gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 font-mono">
                      <Calendar className="w-3.5 h-3.5 text-blue-500" />
                      <span>{task.deadlineDate}</span>
                    </div>
                    <div className="flex items-center sm:justify-end gap-1 text-[11px] text-slate-400 font-mono mt-0.5">
                      <Clock className="w-3 h-3" />
                      <span>{task.deadlineTime || '12:00'}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditTaskModal(task);
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                      title="Edit task"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => handleDelete(task, e)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                      title="Delete task"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
