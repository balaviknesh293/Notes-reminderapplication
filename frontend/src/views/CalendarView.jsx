import React, { useState, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileText,
  Plus,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { api } from '../services/api';
import { useApp } from '../context/AppContext';
import PriorityBadge from '../components/common/PriorityBadge';

export default function CalendarView() {
  const { openNewTaskModal, openEditTaskModal, openEditNoteModal, refreshGlobalData } = useApp();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarMode, setCalendarMode] = useState('month'); // 'month' | 'week' | 'day'
  const [events, setEvents] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);

  const fetchEvents = async () => {
    try {
      const res = await api.get('/api/calendar/events');
      if (res.ok && res.data.success) {
        setEvents(res.data.data || []);
      }
    } catch (err) {
      console.warn('Error fetching calendar events:', err);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  // Navigation handlers
  const handlePrev = () => {
    const next = new Date(currentDate);
    if (calendarMode === 'month') next.setMonth(next.getMonth() - 1);
    else if (calendarMode === 'week') next.setDate(next.getDate() - 7);
    else next.setDate(next.getDate() - 1);
    setCurrentDate(next);
  };

  const handleNext = () => {
    const next = new Date(currentDate);
    if (calendarMode === 'month') next.setMonth(next.getMonth() + 1);
    else if (calendarMode === 'week') next.setDate(next.getDate() + 7);
    else next.setDate(next.getDate() + 1);
    setCurrentDate(next);
  };

  const handleToday = () => setCurrentDate(new Date());

  // Reschedule task handler
  const handleSaveReschedule = async () => {
    if (!selectedTask || !rescheduleDate) return;
    try {
      await api.patch(`/api/tasks/${selectedTask.taskId}/reschedule`, {
        deadlineDate: rescheduleDate,
        deadlineTime: rescheduleTime || '12:00'
      });
      setShowRescheduleModal(false);
      setSelectedTask(null);
      fetchEvents();
      refreshGlobalData();
    } catch (err) {
      alert('Failed to reschedule task.');
    }
  };

  const openReschedule = (task, e) => {
    e.stopPropagation();
    setSelectedTask(task);
    setRescheduleDate(task.date || '');
    setRescheduleTime(task.time || '12:00');
    setShowRescheduleModal(true);
  };

  // Month rendering calculation
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Helper: get events for a date string 'YYYY-MM-DD'
  const getEventsForDate = (dateStr) => {
    return events.filter((e) => e.date === dateStr);
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto">
      {/* Calendar Header Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-slate-800/80">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <CalendarIcon className="w-6 h-6 text-blue-600" />
            Calendar & Deadlines
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Visualize scheduled task deadlines, inspect associated notes, and reschedule dates.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
          {/* Mode Switcher */}
          <div className="flex items-center rounded-xl border border-slate-200 dark:border-slate-700 p-0.5 bg-slate-100/60 dark:bg-slate-800/60 text-xs font-semibold">
            <button
              onClick={() => setCalendarMode('month')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                calendarMode === 'month'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              Month
            </button>
            <button
              onClick={() => setCalendarMode('week')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                calendarMode === 'week'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              Week
            </button>
            <button
              onClick={() => setCalendarMode('day')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                calendarMode === 'day'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              Day
            </button>
          </div>

          {/* Today Button & Arrows */}
          <button
            onClick={handleToday}
            className="px-3 py-1.5 bg-white dark:bg-[#131c2d] border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50"
          >
            Today
          </button>

          <div className="flex items-center gap-1">
            <button
              onClick={handlePrev}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleNext}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => openNewTaskModal()}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm ml-auto sm:ml-0"
          >
            <Plus className="w-3.5 h-3.5" /> New Task
          </button>
        </div>
      </div>

      {/* Month/Year Title Bar */}
      <div className="text-center font-bold text-lg text-slate-800 dark:text-slate-100">
        {monthNames[month]} {year}
      </div>

      {/* 1. Monthly Calendar View */}
      {calendarMode === 'month' && (
        <div className="bg-white dark:bg-[#131c2d] border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-4 shadow-sm overflow-hidden">
          {/* Day Name Headers */}
          <div className="grid grid-cols-7 gap-1 text-center font-semibold text-xs text-slate-400 pb-2 border-b border-slate-100 dark:border-slate-800">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div key={d} className="py-1">{d}</div>
            ))}
          </div>

          {/* Grid Cells */}
          <div className="grid grid-cols-7 gap-1 pt-2">
            {/* Blank leading slots */}
            {Array.from({ length: firstDayOfMonth }).map((_, i) => (
              <div key={`empty-${i}`} className="min-h-[90px] sm:min-h-[110px] p-1.5 bg-slate-50/40 dark:bg-slate-900/20 rounded-xl opacity-40" />
            ))}

            {/* Days in Month */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
              const dayEvents = getEventsForDate(dateStr);
              const isToday =
                new Date().toISOString().slice(0, 10) === dateStr;

              return (
                <div
                  key={dayNum}
                  onClick={() => openNewTaskModal({ deadlineDate: dateStr })}
                  className={`min-h-[90px] sm:min-h-[110px] p-2 rounded-xl border transition-all flex flex-col justify-between cursor-pointer ${
                    isToday
                      ? 'border-blue-500 bg-blue-50/20 dark:bg-blue-950/20'
                      : 'border-slate-100 dark:border-slate-800/60 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-[#172236]/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center ${
                        isToday
                          ? 'bg-blue-600 text-white'
                          : 'text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {dayNum}
                    </span>
                    {dayEvents.length > 0 && (
                      <span className="text-[10px] text-slate-400 font-medium">
                        {dayEvents.length}
                      </span>
                    )}
                  </div>

                  {/* Event Badges in Cell */}
                  <div className="space-y-1 mt-1 overflow-y-auto max-h-[70px] scrollbar-none">
                    {dayEvents.map((evt) => {
                      let badgeBg = 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300';
                      if (evt.priority === 'Critical') badgeBg = 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300';
                      else if (evt.priority === 'High') badgeBg = 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300';

                      return (
                        <div
                          key={evt.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditTaskModal({ taskId: evt.taskId, taskTitle: evt.title, priority: evt.priority, deadlineDate: evt.date, deadlineTime: evt.time, status: evt.status });
                          }}
                          className={`text-[10px] p-1 rounded font-medium truncate flex items-center justify-between group ${badgeBg}`}
                        >
                          <span className="truncate">{evt.time} {evt.title}</span>
                          <button
                            type="button"
                            onClick={(e) => openReschedule(evt, e)}
                            title="Reschedule deadline"
                            className="text-[9px] opacity-0 group-hover:opacity-100 hover:underline pl-1 flex-shrink-0"
                          >
                            Move
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. Weekly Calendar View */}
      {calendarMode === 'week' && (
        <div className="bg-white dark:bg-[#131c2d] border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-4 shadow-sm">
          <div className="grid grid-cols-1 sm:grid-cols-7 gap-3">
            {Array.from({ length: 7 }).map((_, i) => {
              const startOfWeek = new Date(currentDate);
              startOfWeek.setDate(currentDate.getDate() - currentDate.getDay() + i);
              const dateStr = startOfWeek.toISOString().slice(0, 10);
              const dayEvents = getEventsForDate(dateStr);
              const isToday = new Date().toISOString().slice(0, 10) === dateStr;

              return (
                <div
                  key={i}
                  className={`p-3 rounded-2xl border ${
                    isToday
                      ? 'border-blue-500 bg-blue-50/30 dark:bg-blue-950/30'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30'
                  }`}
                >
                  <div className="text-center pb-2 border-b border-slate-200 dark:border-slate-800 mb-2">
                    <span className="text-xs font-semibold uppercase text-slate-400">
                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][i]}
                    </span>
                    <h4 className="text-base font-bold text-slate-800 dark:text-slate-100">
                      {startOfWeek.getDate()}
                    </h4>
                  </div>

                  <div className="space-y-2 min-h-[160px]">
                    {dayEvents.length === 0 ? (
                      <p className="text-[11px] text-slate-400 text-center pt-4">No tasks</p>
                    ) : (
                      dayEvents.map((evt) => (
                        <div
                          key={evt.id}
                          onClick={() => openEditTaskModal({ taskId: evt.taskId, taskTitle: evt.title, priority: evt.priority, deadlineDate: evt.date, deadlineTime: evt.time, status: evt.status })}
                          className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs cursor-pointer hover:border-blue-500"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] font-mono text-slate-400">{evt.time}</span>
                            <PriorityBadge priority={evt.priority} size="xs" />
                          </div>
                          <p className="font-semibold text-slate-800 dark:text-slate-100 truncate">
                            {evt.title}
                          </p>
                          {evt.noteTitle && (
                            <span className="text-[10px] text-blue-500 hover:underline block mt-1">
                              Note: {evt.noteTitle}
                            </span>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. Daily Schedule View */}
      {calendarMode === 'day' && (
        <div className="bg-white dark:bg-[#131c2d] border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-4">
            <h3 className="font-bold text-base text-slate-800 dark:text-slate-100">
              Schedule for {currentDate.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </h3>
            <button
              onClick={() => openNewTaskModal({ deadlineDate: currentDate.toISOString().slice(0, 10) })}
              className="px-3 py-1.5 bg-blue-600 text-white rounded-xl text-xs font-semibold"
            >
              + Add Task for Today
            </button>
          </div>

          <div className="space-y-3">
            {getEventsForDate(currentDate.toISOString().slice(0, 10)).length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                No deadline tasks scheduled for this day.
              </div>
            ) : (
              getEventsForDate(currentDate.toISOString().slice(0, 10)).map((evt) => (
                <div
                  key={evt.id}
                  onClick={() => openEditTaskModal({ taskId: evt.taskId, taskTitle: evt.title, priority: evt.priority, deadlineDate: evt.date, deadlineTime: evt.time, status: evt.status })}
                  className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4 cursor-pointer hover:border-blue-400"
                >
                  <div className="flex items-center gap-3">
                    <div className="text-xs font-bold font-mono px-2.5 py-1 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {evt.time}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                        {evt.title}
                      </h4>
                      {evt.description && (
                        <p className="text-xs text-slate-500 line-clamp-1">{evt.description}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <PriorityBadge priority={evt.priority} />
                    <button
                      type="button"
                      onClick={(e) => openReschedule(evt, e)}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
                    >
                      Reschedule
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Reschedule Task Modal Dialog */}
      {showRescheduleModal && selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-white dark:bg-[#151d2a] rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              Reschedule Task Deadline
            </h3>
            <p className="text-xs text-slate-500">
              Moving deadline for "<strong>{selectedTask.title}</strong>"
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  New Date
                </label>
                <input
                  type="date"
                  value={rescheduleDate}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  New Time
                </label>
                <input
                  type="time"
                  value={rescheduleTime}
                  onChange={(e) => setRescheduleTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowRescheduleModal(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveReschedule}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700"
              >
                Confirm Move
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
