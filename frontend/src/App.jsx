import React from 'react';
import { useAuth } from './context/AuthContext';
import { useApp } from './context/AppContext';
import AuthView from './views/AuthView';
import DashboardView from './views/DashboardView';
import NotesView from './views/NotesView';
import TasksView from './views/TasksView';
import CalendarView from './views/CalendarView';
import UpcomingDeadlinesView from './views/UpcomingDeadlinesView';
import CompletedTasksView from './views/CompletedTasksView';
import OverdueTasksView from './views/OverdueTasksView';
import NotificationsView from './views/NotificationsView';
import CategoriesView from './views/CategoriesView';
import SettingsView from './views/SettingsView';

import Header from './components/layout/Header';
import Sidebar from './components/layout/Sidebar';
import BottomNav from './components/layout/BottomNav';
import OfflineBanner from './components/layout/OfflineBanner';
import InstallPrompt from './components/layout/InstallPrompt';

import NoteModal from './components/modals/NoteModal';
import TaskModal from './components/modals/TaskModal';
import ConvertToTaskModal from './components/modals/ConvertToTaskModal';
import ReminderPopupToast from './components/common/ReminderPopupToast';

export default function App() {
  const { isAuthenticated, loading } = useAuth();
  const { activeTab } = useApp();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0b0f17] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthView />;
  }

  const renderActiveView = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardView />;
      case 'notes':
        return <NotesView />;
      case 'tasks':
        return <TasksView />;
      case 'calendar':
        return <CalendarView />;
      case 'upcoming':
        return <UpcomingDeadlinesView />;
      case 'completed':
        return <CompletedTasksView />;
      case 'overdue':
        return <OverdueTasksView />;
      case 'notifications':
        return <NotificationsView />;
      case 'categories':
        return <CategoriesView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#0b0f17] text-slate-900 dark:text-slate-100 transition-colors">
      <OfflineBanner />

      <div className="flex-1 flex overflow-hidden">
        {/* Desktop Collapsible Sidebar */}
        <Sidebar />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto pb-20 md:pb-6">
          <Header />
          <main className="flex-1 p-4 sm:p-6 lg:p-8">
            {renderActiveView()}
          </main>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <BottomNav />

      {/* Global Modals */}
      <NoteModal />
      <TaskModal />
      <ConvertToTaskModal />

      {/* Real-time Reminder Popup Messages */}
      <ReminderPopupToast />

      {/* PWA Install Banner */}
      <InstallPrompt />
    </div>
  );
}
