import React, { useState, useEffect } from 'react';
import { CheckCircle2, RotateCcw, Trash2, Calendar, Clock } from 'lucide-react';
import { api } from '../services/api';
import { useApp } from '../context/AppContext';
import PriorityBadge from '../components/common/PriorityBadge';

export default function CompletedTasksView() {
  const { refreshGlobalData } = useApp();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchCompleted = async () => {
    try {
      const res = await api.get('/api/tasks?status=Completed');
      if (res.ok && res.data.success) {
        setTasks(res.data.data || []);
      }
    } catch (err) {
      console.warn('Error fetching completed tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompleted();
  }, []);

  const handleRestore = async (taskId) => {
    try {
      await api.patch(`/api/tasks/${taskId}/status`, { status: 'Pending' });
      fetchCompleted();
      refreshGlobalData();
    } catch (err) {}
  };

  const handleDelete = async (task) => {
    if (window.confirm(`Permanently delete "${task.taskTitle}"?`)) {
      try {
        await api.delete(`/api/tasks/${task.taskId}`);
        fetchCompleted();
        refreshGlobalData();
      } catch (err) {}
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto">
      <div className="pb-4 border-b border-slate-200/80 dark:border-slate-800/80">
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <CheckCircle2 className="w-6 h-6 text-emerald-600" />
          Completed Tasks
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Archive of all completed tasks and their completion timestamps.
        </p>
      </div>

      {tasks.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white dark:bg-[#131c2d] border border-dashed border-slate-200 dark:border-slate-800">
          <CheckCircle2 className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-700 dark:text-slate-200">
            No completed tasks yet
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Tasks you check off will appear here for your records.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {tasks.map((task) => (
            <div
              key={task.taskId}
              className="p-4 rounded-2xl bg-white dark:bg-[#131c2d] border border-slate-200/80 dark:border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm"
            >
              <div className="flex items-center gap-3 min-w-0">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-sm sm:text-base line-through text-slate-500 dark:text-slate-400">
                      {task.taskTitle}
                    </h4>
                    <PriorityBadge priority={task.priority} size="xs" />
                  </div>
                  <span className="text-[11px] text-slate-400 mt-0.5 block">
                    Completed on: {task.completionDate ? new Date(task.completionDate).toLocaleString() : 'Done'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  onClick={() => handleRestore(task.taskId)}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors border border-slate-200 dark:border-slate-700"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Restore
                </button>
                <button
                  onClick={() => handleDelete(task)}
                  className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
