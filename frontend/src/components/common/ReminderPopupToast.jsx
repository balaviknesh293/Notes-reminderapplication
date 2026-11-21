import React, { useState, useEffect, useRef } from 'react';
import {
  Bell,
  Clock,
  AlertTriangle,
  X,
  ArrowRight,
  ExternalLink,
  Volume2,
  CheckCircle2,
  ShieldAlert
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';
import { playNotificationSound } from '../../services/soundEffects';
import PriorityBadge from './PriorityBadge';

export default function ReminderPopupToast() {
  const { activeAlerts, refreshGlobalData, openEditTaskModal, setActiveTab } = useApp();
  const [dismissedIds, setDismissedIds] = useState(new Set());
  const notifiedIdsRef = useRef(new Set());
  const [browserPerm, setBrowserPerm] = useState(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default'
  );

  // Filter alerts that are not read and not dismissed in this session
  const visibleAlerts = (activeAlerts || []).filter(
    (a) => !a.read && !dismissedIds.has(a.id)
  );

  // Trigger desktop browser popup and sound whenever a brand new alert arrives
  useEffect(() => {
    if (!visibleAlerts.length) return;

    let soundPlayed = false;

    visibleAlerts.forEach((alert) => {
      if (!notifiedIdsRef.current.has(alert.id)) {
        notifiedIdsRef.current.add(alert.id);

        if (!soundPlayed) {
          playNotificationSound();
          soundPlayed = true;
        }

        // Fire native desktop notification if permitted
        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
          try {
            new Notification(`⏰ NoteAlert: ${alert.taskTitle || 'Deadline Reminder'}`, {
              body: alert.message || 'You have an upcoming task deadline!',
              icon: '/vite.svg',
              tag: alert.id,
              renotify: true
            });
          } catch (e) {
            console.warn('Native notification error:', e);
          }
        }
      }
    });
  }, [visibleAlerts]);

  const requestDesktopPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const perm = await Notification.requestPermission();
        setBrowserPerm(perm);
        if (perm === 'granted') {
          new Notification('NoteAlert Popups Enabled', {
            body: 'You will now receive desktop popup reminders for task deadlines!',
            icon: '/vite.svg'
          });
        }
      } catch (e) {}
    }
  };

  const handleDismiss = async (alertId) => {
    setDismissedIds((prev) => new Set([...prev, alertId]));
    try {
      await api.post(`/api/notifications/${alertId}/read`);
      refreshGlobalData();
    } catch (e) {}
  };

  const handleSnooze = async (alertId, minutes = 15) => {
    setDismissedIds((prev) => new Set([...prev, alertId]));
    try {
      await api.post(`/api/notifications/${alertId}/snooze`, { minutes });
      refreshGlobalData();
    } catch (e) {}
  };

  const handleViewTask = async (alert) => {
    handleDismiss(alert.id);
    if (alert.taskId) {
      try {
        const res = await api.get(`/api/tasks/${alert.taskId}`);
        if (res.ok && res.data.success) {
          openEditTaskModal(res.data.task);
          return;
        }
      } catch (e) {}
    }
    setActiveTab('tasks');
  };

  if (visibleAlerts.length === 0 && browserPerm !== 'default') {
    return null;
  }

  return (
    <aside
      aria-label="Deadline reminders"
      className="fixed bottom-20 md:bottom-6 right-4 sm:right-6 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none"
    >
      {/* Optional one-click desktop permission prompt */}
      {browserPerm === 'default' && visibleAlerts.length > 0 && (
        <div className="pointer-events-auto bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-3 rounded-2xl shadow-xl flex items-center justify-between text-xs animate-slide-up border border-blue-400/30">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 animate-bounce" />
            <span>Enable desktop popups for reminders?</span>
          </div>
          <button
            onClick={requestDesktopPermission}
            className="px-2.5 py-1 bg-white text-blue-700 font-bold rounded-xl text-[11px] shadow hover:bg-blue-50 transition-colors"
          >
            Allow
          </button>
        </div>
      )}

      {/* Stack of active reminder popups (up to 3) */}
      {visibleAlerts.slice(0, 3).map((alert) => (
        <div
          key={alert.id}
          className="pointer-events-auto bg-white/95 dark:bg-[#151f32]/95 backdrop-blur-md border-2 border-amber-500/80 dark:border-amber-500/60 rounded-2xl p-4 shadow-2xl shadow-amber-500/10 text-slate-900 dark:text-slate-100 animate-slide-up transition-all hover:scale-[1.01]"
        >
          {/* Top Bar */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500" />
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                Deadline Alert
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <PriorityBadge priority={alert.priority} size="xs" />
              <button
                onClick={() => handleDismiss(alert.id)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Dismiss reminder"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Main Content */}
          <div className="py-2.5">
            <h4 className="font-bold text-sm text-slate-900 dark:text-white line-clamp-1">
              {alert.taskTitle || 'Task Reminder'}
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-snug">
              {alert.message}
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs">
            <button
              onClick={() => handleSnooze(alert.id, 15)}
              className="text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 font-semibold px-2 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Snooze 15m
            </button>

            <button
              onClick={() => handleViewTask(alert)}
              className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-xs shadow-sm transition-colors"
            >
              <span>View Task</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ))}
    </aside>
  );
}
