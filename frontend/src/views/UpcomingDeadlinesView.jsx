import React, { useState, useEffect } from 'react';
import { Clock, Calendar, CheckCircle2, AlertCircle, Plus } from 'lucide-react';
import { api } from '../services/api';
import { useApp } from '../context/AppContext';
import PriorityBadge from '../components/common/PriorityBadge';
import { playCompletionSound } from '../services/soundEffects';
import confetti from 'canvas-confetti';

export default function UpcomingDeadlinesView() {
  const { openNewTaskModal, openEditTaskModal, refreshGlobalData } = useApp();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchUpcoming = async () => {
    try {
      const res = await api.get('/api/tasks?upcoming=true');
      if (res.ok && res.data.success) {
        setTasks(res.data.data || []);
      }
    } catch (err) {
      console.warn('Error fetching upcoming tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUpcoming();
  }, []);

  const handleToggleStatus = async (task, e) => {
    e.stopPropagation();
    try {
      playCompletionSound();
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
      await api.patch(`/api/tasks/${task.taskId}/status`, { status: 'Completed' });
      fetchUpcoming();
      refreshGlobalData();
    } catch (err) {}
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-slate-800/80">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Clock className="w-6 h-6 text-amber-500" />
            Upcoming Deadlines (Next 7 Days)
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Tasks with deadlines due within the next week, sorted chronologically.
          </p>
        </div>

        <button
          onClick={() => openNewTaskModal()}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-sm"
        >
          <Plus className="w-4 h-4" /> Add Task
        </button>
      </div>

      {tasks.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white dark:bg-[#131c2d] border border-dashed border-slate-200 dark:border-slate-800">
          <Clock className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-700 dark:text-slate-200">
            No upcoming deadlines in the next 7 days!
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            You're ahead of schedule. Great job!
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
            <div
              key={task.taskId}
              onClick={() => openEditTaskModal(task)}
              className="p-4 rounded-2xl bg-white dark:bg-[#131c2d] border border-slate-200/80 dark:border-slate-800 hover:border-amber-400 dark:hover:border-amber-500 shadow-sm transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 cursor-pointer"
            >
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <button
                  onClick={(e) => handleToggleStatus(task, e)}
                  className="mt-0.5 w-5 h-5 rounded-lg border-2 border-slate-300 dark:border-slate-600 hover:border-blue-500 flex-shrink-0"
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-semibold text-sm sm:text-base text-slate-900 dark:text-white">
                      {task.taskTitle}
                    </h4>
                    <PriorityBadge priority={task.priority} size="xs" />
                  </div>
                  {task.description && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                      {task.description}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end text-xs">
                <div className="text-left sm:text-right font-mono">
                  <div className="flex items-center sm:justify-end gap-1.5 font-semibold text-slate-800 dark:text-slate-200">
                    <Calendar className="w-3.5 h-3.5 text-amber-500" />
                    <span>{task.deadlineDate}</span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {task.deadlineTime || '12:00'}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
