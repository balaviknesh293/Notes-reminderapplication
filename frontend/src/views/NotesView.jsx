import React, { useState, useEffect } from 'react';
import {
  FileText,
  Plus,
  Pin,
  Archive,
  Trash2,
  CheckSquare,
  Tag,
  Paperclip,
  Grid,
  List,
  Search,
  Filter,
  Check
} from 'lucide-react';
import { api } from '../services/api';
import { useApp } from '../context/AppContext';
import { setCachedNotes, getCachedNotes } from '../services/offlineStorage';

export default function NotesView() {
  const {
    searchQuery,
    openNewNoteModal,
    openEditNoteModal,
    openConvertToTaskModal,
    refreshGlobalData
  } = useApp();

  const [notes, setNotes] = useState(getCachedNotes());
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showArchived, setShowArchived] = useState(false);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [loading, setLoading] = useState(true);

  const fetchNotes = async () => {
    try {
      const archivedParam = showArchived ? 'true' : 'false';
      const catParam = selectedCategory !== 'All' ? `&category=${encodeURIComponent(selectedCategory)}` : '';
      const searchParam = searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : '';

      const res = await api.get(`/api/notes?archived=${archivedParam}${catParam}${searchParam}`);
      if (res.ok && res.data.success) {
        setNotes(res.data.data || []);
        if (!showArchived && selectedCategory === 'All' && !searchQuery) {
          setCachedNotes(res.data.data || []);
        }
      }
    } catch (err) {
      console.warn('Could not load notes online, using cache.');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await api.get('/api/categories');
      if (res.ok && res.data.success) {
        setCategories(res.data.data || []);
      }
    } catch (err) {}
  };

  useEffect(() => {
    fetchNotes();
  }, [showArchived, selectedCategory, searchQuery]);

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleTogglePin = async (note, e) => {
    e.stopPropagation();
    try {
      await api.patch(`/api/notes/${note.noteId}/pin`);
      fetchNotes();
      refreshGlobalData();
    } catch (err) {}
  };

  const handleToggleArchive = async (note, e) => {
    e.stopPropagation();
    try {
      await api.patch(`/api/notes/${note.noteId}/archive`);
      fetchNotes();
      refreshGlobalData();
    } catch (err) {}
  };

  const handleDelete = async (note, e) => {
    e.stopPropagation();
    if (window.confirm(`Delete note "${note.noteTitle}"?`)) {
      try {
        await api.delete(`/api/notes/${note.noteId}`);
        fetchNotes();
        refreshGlobalData();
      } catch (err) {}
    }
  };

  const pinnedNotes = notes.filter((n) => n.pinned);
  const otherNotes = notes.filter((n) => !n.pinned);

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto">
      {/* Top Controls Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-slate-800/80">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FileText className="w-6 h-6 text-blue-600" />
            {showArchived ? 'Archived Notes' : 'My Notes'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Create unlimited notes, format content, organize with tags, and convert to deadline tasks.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
          {/* Archive Toggle */}
          <button
            onClick={() => setShowArchived(!showArchived)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-medium transition-colors ${
              showArchived
                ? 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800'
                : 'text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Archive className="w-3.5 h-3.5 inline mr-1" />
            {showArchived ? 'Active Notes' : 'Archive'}
          </button>

          {/* Grid/List View Toggle */}
          <div className="flex items-center rounded-xl border border-slate-200 dark:border-slate-700 p-0.5 bg-slate-100/60 dark:bg-slate-800/60">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg text-xs ${
                viewMode === 'grid'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
              }`}
              title="Grid View"
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg text-xs ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
              }`}
              title="List View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          {/* New Note Button */}
          <button
            onClick={() => openNewNoteModal(selectedCategory !== 'All' ? selectedCategory : 'General')}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-sm shadow-blue-500/20 active:scale-95 transition-all ml-auto sm:ml-0"
          >
            <Plus className="w-4 h-4" />
            New Note
          </button>
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setSelectedCategory('All')}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
            selectedCategory === 'All'
              ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
              : 'bg-white dark:bg-[#131c2d] border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50'
          }`}
        >
          All Categories
        </button>
        {categories.map((cat) => (
          <button
            key={cat.categoryId}
            onClick={() => setSelectedCategory(cat.categoryName)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              selectedCategory === cat.categoryName
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                : 'bg-white dark:bg-[#131c2d] border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50'
            }`}
          >
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: cat.color || '#3b82f6' }}
            />
            {cat.categoryName}
            {cat.noteCount !== undefined && ` (${cat.noteCount})`}
          </button>
        ))}
      </div>

      {/* Notes Content */}
      {notes.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white dark:bg-[#131c2d] border border-dashed border-slate-200 dark:border-slate-800">
          <FileText className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-700 dark:text-slate-200">
            {searchQuery ? 'No notes matched your search' : 'No notes found'}
          </h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            {searchQuery
              ? 'Try searching with a different keyword or category.'
              : 'Create your first note to capture ideas, checklists, and documentation.'}
          </p>
          {!searchQuery && (
            <button
              onClick={() => openNewNoteModal()}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 shadow-sm"
            >
              + Create Note
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Pinned Notes Section */}
          {pinnedNotes.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
                <Pin className="w-3.5 h-3.5 fill-current text-blue-500" />
                <span>Pinned Notes ({pinnedNotes.length})</span>
              </div>
              <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-3'}>
                {pinnedNotes.map((note) => renderNoteCard(note))}
              </div>
            </div>
          )}

          {/* Other Notes Section */}
          <div>
            {pinnedNotes.length > 0 && (
              <div className="flex items-center gap-1.5 mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
                <span>Other Notes ({otherNotes.length})</span>
              </div>
            )}
            <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-3'}>
              {otherNotes.map((note) => renderNoteCard(note))}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  function renderNoteCard(note) {
    return (
      <div
        key={note.noteId}
        onClick={() => openEditNoteModal(note)}
        className="group p-5 rounded-2xl bg-white dark:bg-[#131c2d] border border-slate-200/80 dark:border-slate-800/80 hover:border-blue-400 dark:hover:border-blue-600 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
      >
        <div>
          {/* Card Top: Category & Action Icons */}
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2.5 py-0.5 rounded-full">
              {note.category || 'General'}
            </span>
            <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
              <button
                type="button"
                onClick={(e) => handleTogglePin(note, e)}
                title={note.pinned ? 'Unpin' : 'Pin note'}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-blue-600"
              >
                <Pin className={`w-3.5 h-3.5 ${note.pinned ? 'fill-current text-blue-600' : ''}`} />
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  openConvertToTaskModal(note);
                }}
                title="Convert note into deadline task"
                className="p-1.5 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950 text-slate-400 hover:text-emerald-600"
              >
                <CheckSquare className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={(e) => handleToggleArchive(note, e)}
                title={note.archived ? 'Unarchive' : 'Archive note'}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-amber-600"
              >
                <Archive className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={(e) => handleDelete(note, e)}
                title="Delete note"
                className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950 text-slate-400 hover:text-red-600"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Title */}
          <h3 className="font-bold text-base text-slate-900 dark:text-white line-clamp-1 mb-1">
            {note.noteTitle}
          </h3>

          {/* Description Preview */}
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 line-clamp-4 leading-relaxed font-normal whitespace-pre-line">
            {note.noteDescription || 'No content...'}
          </p>

          {/* Tags */}
          {Array.isArray(note.tags) && note.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-3">
              {note.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Attachment Indicator */}
          {Array.isArray(note.attachments) && note.attachments.length > 0 && (
            <div className="flex items-center gap-1.5 mt-2 text-[11px] text-slate-400">
              <Paperclip className="w-3 h-3" />
              <span>{note.attachments.length} attachment(s)</span>
            </div>
          )}
        </div>

        {/* Card Footer: Updated Date */}
        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
          <span>{new Date(note.updatedDate || note.createdDate).toLocaleDateString()}</span>
          <span className="text-blue-600 dark:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity font-medium">
            Open &rarr;
          </span>
        </div>
      </div>
    );
  }
}
