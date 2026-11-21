import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { playNotificationSound } from '../services/soundEffects';
import { useAuth } from './AuthContext';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const { isAuthenticated } = useAuth();

  // Navigation tab
  const [activeTab, setActiveTab] = useState(() => {
    const hash = window.location.hash.replace('#/', '');
    return hash || 'dashboard';
  });

  // Dark mode
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('notealert_theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // Global search input
  const [searchQuery, setSearchQuery] = useState('');

  // Dashboard stats
  const [stats, setStats] = useState({
    totalNotes: 0,
    totalTasks: 0,
    pendingTasks: 0,
    completedTasks: 0,
    upcomingDeadlines: 0,
    overdueTasks: 0
  });

  // Notifications
  const [activeAlerts, setActiveAlerts] = useState([]);
  const [unreadNotifsCount, setUnreadNotifsCount] = useState(0);
  const [previousAlertIds, setPreviousAlertIds] = useState(new Set());

  // Modals state
  const [noteModal, setNoteModal] = useState({ isOpen: false, note: null, mode: 'create' });
  const [taskModal, setTaskModal] = useState({ isOpen: false, task: null, mode: 'create' });
  const [convertToTaskModal, setConvertToTaskModal] = useState({ isOpen: false, note: null });

  // Sync hash with activeTab
  useEffect(() => {
    window.location.hash = `#/${activeTab}`;
  }, [activeTab]);

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#/', '');
      if (hash) setActiveTab(hash);
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Dark mode effect
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('notealert_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('notealert_theme', 'light');
    }
  }, [darkMode]);

  const toggleDarkMode = () => setDarkMode((prev) => !prev);

  // Fetch summary stats & notifications
  const refreshGlobalData = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      // 1. Stats
      const statsRes = await api.get('/api/dashboard/stats');
      if (statsRes.ok && statsRes.data.success) {
        setStats(statsRes.data.stats);
      }

      // 2. Notifications
      const notifsRes = await api.get('/api/notifications');
      if (notifsRes.ok && notifsRes.data.success) {
        setUnreadNotifsCount(notifsRes.data.unreadCount || 0);
        const currentAlerts = notifsRes.data.activeAlerts || [];
        setActiveAlerts(currentAlerts);

        // Check if any brand new alert arrived that wasn't in previous set
        let hasNewAlert = false;
        currentAlerts.forEach((a) => {
          if (!previousAlertIds.has(a.id) && !a.read) {
            hasNewAlert = true;
          }
        });

        if (hasNewAlert && previousAlertIds.size > 0) {
          playNotificationSound();
        }

        // Update known IDs
        const ids = new Set(currentAlerts.map((a) => a.id));
        setPreviousAlertIds(ids);
      }
    } catch (err) {
      console.warn('Error refreshing global data:', err);
    }
  }, [isAuthenticated, previousAlertIds]);

  // Periodic polling for reminders every 20 seconds
  useEffect(() => {
    if (!isAuthenticated) return;
    refreshGlobalData();
    const interval = setInterval(refreshGlobalData, 20000);
    return () => clearInterval(interval);
  }, [isAuthenticated, refreshGlobalData]);

  // Open helper functions for Modals
  const openNewNoteModal = (category = '') => {
    setNoteModal({ isOpen: true, note: { category: category || 'General' }, mode: 'create' });
  };

  const openEditNoteModal = (note) => {
    setNoteModal({ isOpen: true, note, mode: 'edit' });
  };

  const closeNoteModal = () => {
    setNoteModal({ isOpen: false, note: null, mode: 'create' });
  };

  const openNewTaskModal = (initialData = {}) => {
    setTaskModal({ isOpen: true, task: initialData, mode: 'create' });
  };

  const openEditTaskModal = (task) => {
    setTaskModal({ isOpen: true, task, mode: 'edit' });
  };

  const closeTaskModal = () => {
    setTaskModal({ isOpen: false, task: null, mode: 'create' });
  };

  const openConvertToTaskModal = (note) => {
    setConvertToTaskModal({ isOpen: true, note });
  };

  const closeConvertToTaskModal = () => {
    setConvertToTaskModal({ isOpen: false, note: null });
  };

  return (
    <AppContext.Provider
      value={{
        activeTab,
        setActiveTab,
        darkMode,
        toggleDarkMode,
        searchQuery,
        setSearchQuery,
        stats,
        unreadNotifsCount,
        activeAlerts,
        refreshGlobalData,
        // Modals
        noteModal,
        openNewNoteModal,
        openEditNoteModal,
        closeNoteModal,
        taskModal,
        openNewTaskModal,
        openEditTaskModal,
        closeTaskModal,
        convertToTaskModal,
        openConvertToTaskModal,
        closeConvertToTaskModal
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
