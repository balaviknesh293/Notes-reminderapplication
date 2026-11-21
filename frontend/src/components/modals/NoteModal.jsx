import React, { useState, useEffect, useRef } from 'react';
import Modal from '../common/Modal';
import RichTextToolbar from '../common/RichTextToolbar';
import { Pin, Archive, Tag, Paperclip, CheckSquare, Plus, Trash2, Check } from 'lucide-react';
import { api } from '../../services/api';
import { useApp } from '../../context/AppContext';
import { queueOfflineAction } from '../../services/offlineStorage';

export default function NoteModal() {
  const { noteModal, closeNoteModal, openConvertToTaskModal, refreshGlobalData } = useApp();
  const { isOpen, note, mode } = noteModal;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('General');
  const [pinned, setPinned] = useState(false);
  const [archived, setArchived] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [linkInput, setLinkInput] = useState('');
  const [showAddLink, setShowAddLink] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [categoriesList, setCategoriesList] = useState([]);
  const [saveStatus, setSaveStatus] = useState('');

  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);

  // Load existing note data or defaults
  useEffect(() => {
    if (note) {
      setTitle(note.noteTitle || '');
      setDescription(note.noteDescription || '');
      setCategory(note.category || 'General');
      setPinned(Boolean(note.pinned));
      setArchived(Boolean(note.archived));
      setTags(Array.isArray(note.tags) ? note.tags : []);
      setAttachments(Array.isArray(note.attachments) ? note.attachments : []);
    } else {
      setTitle('');
      setDescription('');
      setCategory('General');
      setPinned(false);
      setArchived(false);
      setTags([]);
      setAttachments([]);
    }
    setSaveStatus('');
  }, [note, isOpen]);

  // Load user categories
  useEffect(() => {
    if (isOpen) {
      api.get('/api/categories').then((res) => {
        if (res.ok && res.data.success) {
          setCategoriesList(res.data.data || []);
        }
      }).catch(() => {});
    }
  }, [isOpen]);

  const handleAddTag = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const trimmed = tagInput.trim().replace(/^#/, '');
      if (trimmed && !tags.includes(trimmed)) {
        setTags([...tags, trimmed]);
        setTagInput('');
      }
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleAddLink = () => {
    if (!linkInput.trim()) return;
    setAttachments([
      ...attachments,
      { id: Date.now(), name: linkInput.trim(), url: linkInput.trim(), type: 'link' }
    ]);
    setLinkInput('');
    setShowAddLink(false);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await api.post('/api/upload', formData);
      if (res.ok && res.data.success) {
        setAttachments([
          ...attachments,
          {
            id: Date.now(),
            name: file.name,
            url: res.data.file.url,
            size: file.size,
            type: 'file'
          }
        ]);
      }
    } catch (err) {
      alert('Upload failed or backend unreachable in offline mode.');
    }
  };

  const handleRemoveAttachment = (id) => {
    setAttachments(attachments.filter((a) => a.id !== id));
  };

  const handleSave = async () => {
    setIsSaving(true);
    const payload = {
      noteTitle: title.trim() || 'Untitled Note',
      noteDescription: description,
      category,
      pinned,
      archived,
      tags,
      attachments
    };

    try {
      if (mode === 'create') {
        const res = await api.post('/api/notes', payload);
        if (res.ok) {
          setSaveStatus('Saved!');
          refreshGlobalData();
          closeNoteModal();
        }
      } else {
        const res = await api.put(`/api/notes/${note.noteId}`, payload);
        if (res.ok) {
          setSaveStatus('Saved!');
          refreshGlobalData();
          closeNoteModal();
        }
      }
    } catch (err) {
      // Offline fallback: queue offline action
      const offlineNote = {
        ...payload,
        noteId: note?.noteId || `offline-${Date.now()}`,
        updatedDate: new Date().toISOString()
      };
      queueOfflineAction({
        type: mode === 'create' ? 'create' : 'update',
        entity: 'note',
        data: offlineNote
      });
      alert('Saved locally. Will synchronize when online.');
      refreshGlobalData();
      closeNoteModal();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={closeNoteModal}
      title={mode === 'create' ? 'Create New Note' : 'Edit Note'}
      maxWidth="max-w-3xl"
    >
      <div className="space-y-4">
        {/* Title Input */}
        <div>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Note Title..."
            className="w-full text-xl font-bold bg-transparent border-0 border-b border-slate-200 dark:border-slate-800 pb-2 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>

        {/* Options Row (Category, Pin, Archive) */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <label className="text-slate-500 dark:text-slate-400 font-medium">Category:</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="General">General</option>
              {categoriesList.map((c) => (
                <option key={c.categoryId} value={c.categoryName}>
                  {c.categoryName}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPinned(!pinned)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                pinned
                  ? 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800'
                  : 'text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <Pin className={`w-3.5 h-3.5 ${pinned ? 'fill-current' : ''}`} />
              {pinned ? 'Pinned' : 'Pin Note'}
            </button>

            <button
              type="button"
              onClick={() => setArchived(!archived)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                archived
                  ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800'
                  : 'text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <Archive className="w-3.5 h-3.5" />
              {archived ? 'Archived' : 'Archive'}
            </button>
          </div>
        </div>

        {/* Rich Formatting Toolbar */}
        <RichTextToolbar
          textareaRef={textareaRef}
          value={description}
          onChange={setDescription}
        />

        {/* Note Body Textarea */}
        <div>
          <textarea
            ref={textareaRef}
            rows={10}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Type your notes here... You can use formatting tools above or markdown (# header, **bold**, *italic*, - [ ] checklist)."
            className="w-full p-3.5 rounded-xl bg-slate-50/70 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none font-mono text-[13px] leading-relaxed transition-all"
          />
        </div>

        {/* Tags Section */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <Tag className="w-3.5 h-3.5" /> Tags
          </label>
          <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-xl bg-slate-50/50 dark:bg-slate-900/30 border border-slate-200/80 dark:border-slate-800/80">
            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-100/70 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300 text-xs font-medium"
              >
                #{tag}
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag)}
                  className="hover:text-blue-900 dark:hover:text-white"
                >
                  &times;
                </button>
              </span>
            ))}
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleAddTag}
              placeholder="Add tag and press Enter..."
              className="text-xs bg-transparent border-none focus:outline-none text-slate-800 dark:text-slate-200 placeholder-slate-400 min-w-[120px] flex-1"
            />
          </div>
        </div>

        {/* Attachments & Reference Links */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <Paperclip className="w-3.5 h-3.5" /> Attachments & Reference Links
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowAddLink(!showAddLink)}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5"
              >
                <Plus className="w-3 h-3" /> Add Link
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5"
              >
                <Plus className="w-3 h-3" /> Upload File
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
          </div>

          {showAddLink && (
            <div className="flex items-center gap-2 p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
              <input
                type="url"
                value={linkInput}
                onChange={(e) => setLinkInput(e.target.value)}
                placeholder="https://example.com/reference-doc"
                className="flex-1 text-xs px-2.5 py-1.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              />
              <button
                type="button"
                onClick={handleAddLink}
                className="px-3 py-1.5 bg-blue-600 text-white rounded text-xs font-medium"
              >
                Add
              </button>
            </div>
          )}

          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {attachments.map((att) => (
                <div
                  key={att.id}
                  className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                >
                  <Paperclip className="w-3 h-3 text-slate-400" />
                  <a
                    href={att.url}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:underline max-w-[180px] truncate"
                  >
                    {att.name}
                  </a>
                  <button
                    type="button"
                    onClick={() => handleRemoveAttachment(att.id)}
                    className="text-slate-400 hover:text-red-500"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
          <div>
            {note?.noteId && (
              <button
                type="button"
                onClick={() => {
                  closeNoteModal();
                  openConvertToTaskModal({
                    noteId: note.noteId,
                    noteTitle: title,
                    noteDescription: description
                  });
                }}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 rounded-xl border border-emerald-200 dark:border-emerald-800 transition-colors"
              >
                <CheckSquare className="w-3.5 h-3.5" />
                Convert into Task
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            {saveStatus && (
              <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> {saveStatus}
              </span>
            )}
            <button
              type="button"
              onClick={closeNoteModal}
              className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="px-5 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-xl shadow-sm shadow-blue-500/20 transition-colors disabled:opacity-60"
            >
              {isSaving ? 'Saving...' : 'Save Note'}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
