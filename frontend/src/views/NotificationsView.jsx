import React, { useState, useEffect } from 'react';
import {
  Bell,
  CheckCircle2,
  Clock,
  Volume2,
  Trash2,
  CheckCheck,
  Send,
  AlertTriangle
} from 'lucide-react';
import { api } from '../services/api';
import { useApp } from '../context/AppContext';
import { playNotificationSound } from '../services/soundEffects';
import PriorityBadge from '../components/common/PriorityBadge';

export default function NotificationsView() {
  const { refreshGlobalData } = useApp();
  const [activeAlerts, setActiveAlerts] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [testPushMsg, setTestPushMsg] = useState('');

  const fetchNotifs = async () => {
    try {
      const res = await api.get('/api/notifications');
      if (res.ok && res.data.success) {
        setActiveAlerts(res.data.activeAlerts || []);
        setHistory(res.data.history || []);
      }
    } catch (err) {
      console.warn('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifs();
  }, []);

  const handleMarkRead = async (id) => {
    try {
      await api.post(`/api/notifications/${id}/read`);
      fetchNotifs();
      refreshGlobalData();
    } catch (err) {}
  };

  const handleMarkAllRead = async () => {
    try {
      await api.post('/api/notifications/read-all');
      fetchNotifs();
      refreshGlobalData();
    } catch (err) {}
  };

  const handleSnooze = async (id, minutes) => {
    try {
      await api.post(`/api/notifications/${id}/snooze`, { minutes });
      fetchNotifs();
      refreshGlobalData();
    } catch (err) {}
  };

  const handleDismiss = async (id) => {
    try {
      await api.delete(`/api/notifications/${id}`);
      fetchNotifs();
      refreshGlobalData();
    } catch (err) {}
  };

  const handleSendTestPush = async () => {
    try {
      // Request browser notification permission if not yet granted
      if ('Notification' in window && Notification.permission !== 'granted') {
        const perm = await Notification.requestPermission();
        if (perm !== 'granted') {
          setTestPushMsg('Notification permission was denied in your browser.');
          return;
        }
      }

      playNotificationSound();

      // Show local desktop notification
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('NoteAlert Reminder Test', {
          body: 'Your notification system is working perfectly!',
          icon: '/icons/logo.svg'
        });
      }

      const res = await api.post('/api/push/test');
      setTestPushMsg(res.data?.message || 'Test notification triggered.');
      setTimeout(() => setTestPushMsg(''), 5000);
    } catch (err) {
      setTestPushMsg('Push test failed or no subscription found.');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-slate-800/80">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Bell className="w-6 h-6 text-blue-600" />
            Notification Center
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time deadline reminders, audio chime alerts, and Excel Sheet 4 delivery log.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSendTestPush}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition-colors"
          >
            <Send className="w-3.5 h-3.5" /> Test Notification
          </button>
          <button
            onClick={handleMarkAllRead}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors"
          >
            <CheckCheck className="w-4 h-4" /> Mark All as Read
          </button>
        </div>
      </div>

      {testPushMsg && (
        <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 rounded-xl text-xs text-blue-700 dark:text-blue-300">
          {testPushMsg}
        </div>
      )}

      {/* Active Alerts Section */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Active Reminders ({activeAlerts.length})
        </h3>

        {activeAlerts.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-white dark:bg-[#131c2d] border border-slate-200 dark:border-slate-800 text-slate-400 text-xs">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            No pending alerts. All reminders are cleared.
          </div>
        ) : (
          activeAlerts.map((alert) => (
            <div
              key={alert.id}
              className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm ${
                !alert.read
                  ? 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/60'
                  : 'bg-white dark:bg-[#131c2d] border-slate-200 dark:border-slate-800'
              }`}
            >
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <Bell className={`w-5 h-5 mt-0.5 flex-shrink-0 ${!alert.read ? 'text-blue-600 dark:text-blue-400 animate-bounce' : 'text-slate-400'}`} />
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-semibold text-sm sm:text-base text-slate-900 dark:text-white">
                      {alert.taskTitle || 'Deadline Reminder'}
                    </h4>
                    {alert.priority && <PriorityBadge priority={alert.priority} size="xs" />}
                    {!alert.read && (
                      <span className="px-2 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-bold">
                        New
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                    {alert.message}
                  </p>
                  <span className="text-[11px] text-slate-400 font-mono mt-1 block">
                    Triggered at: {new Date(alert.deliveredDate).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Snooze and Dismiss actions */}
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end text-xs">
                {/* Snooze options */}
                <select
                  onChange={(e) => {
                    if (e.target.value) handleSnooze(alert.id, Number(e.target.value));
                  }}
                  defaultValue=""
                  className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none"
                >
                  <option value="" disabled>Snooze...</option>
                  <option value="10">Snooze 10m</option>
                  <option value="30">Snooze 30m</option>
                  <option value="60">Snooze 1h</option>
                  <option value="1440">Snooze 1d</option>
                </select>

                {!alert.read && (
                  <button
                    onClick={() => handleMarkRead(alert.id)}
                    className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 text-slate-700 dark:text-slate-200 font-medium"
                  >
                    Mark Read
                  </button>
                )}

                <button
                  onClick={() => handleDismiss(alert.id)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950"
                  title="Dismiss alert"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Sheet 4 Excel Delivery Records History */}
      <div className="bg-white dark:bg-[#131c2d] border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-600" />
            <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">
              Notification Delivery Log (Excel Sheet 4 Records)
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {history.length} logged records
          </span>
        </div>

        {history.length === 0 ? (
          <div className="py-6 text-center text-slate-400 text-xs">
            No historical delivery logs recorded yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-medium">
                  <th className="py-2 px-3">Reminder Type</th>
                  <th className="py-2 px-3">Message</th>
                  <th className="py-2 px-3">Status</th>
                  <th className="py-2 px-3">Delivered Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                {history.slice(0, 15).map((log) => (
                  <tr key={log.notificationId} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                    <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-200">
                      {log.reminderType}
                    </td>
                    <td className="py-2.5 px-3 max-w-xs truncate">
                      {log.message}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 font-medium text-[10px]">
                        {log.notificationStatus || 'Delivered'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-400">
                      {new Date(log.deliveredDate).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
