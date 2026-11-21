import React, { useState, useEffect } from 'react';
import { FolderOpen, Plus, Trash2, Tag, ArrowRight } from 'lucide-react';
import { api } from '../services/api';
import { useApp } from '../context/AppContext';

export default function CategoriesView() {
  const { setActiveTab } = useApp();
  const [categories, setCategories] = useState([]);
  const [newCatName, setNewCatName] = useState('');
  const [newColor, setNewColor] = useState('#3b82f6');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchCategories = async () => {
    try {
      const res = await api.get('/api/categories');
      if (res.ok && res.data.success) {
        setCategories(res.data.data || []);
      }
    } catch (err) {
      console.warn('Error fetching categories:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await api.post('/api/categories', {
        categoryName: newCatName.trim(),
        color: newColor
      });
      if (res.ok && res.data.success) {
        setNewCatName('');
        fetchCategories();
      } else {
        alert(res.data?.message || 'Failed to create category.');
      }
    } catch (err) {
      alert('Error creating category.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (cat) => {
    if (window.confirm(`Delete category "${cat.categoryName}"? Existing notes won't be deleted.`)) {
      try {
        await api.delete(`/api/categories/${cat.categoryId}`);
        fetchCategories();
      } catch (err) {}
    }
  };

  const presetColors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#64748b'];

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto">
      {/* Header */}
      <div className="pb-4 border-b border-slate-200/80 dark:border-slate-800/80">
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <FolderOpen className="w-6 h-6 text-blue-600" />
          Categories Management
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Organize your notes into folders, workstreams, and subject categories.
        </p>
      </div>

      {/* Create Category Form */}
      <div className="p-5 rounded-2xl bg-white dark:bg-[#131c2d] border border-slate-200/80 dark:border-slate-800/80 shadow-sm">
        <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100 mb-3">
          Create New Category
        </h3>
        <form onSubmit={handleCreateCategory} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <input
            type="text"
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            placeholder="Category name (e.g., Marketing, Client Projects, Research)..."
            className="flex-1 px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Color:</span>
            <div className="flex items-center gap-1.5">
              {presetColors.map((col) => (
                <button
                  key={col}
                  type="button"
                  onClick={() => setNewColor(col)}
                  className={`w-5 h-5 rounded-full transition-transform ${
                    newColor === col ? 'ring-2 ring-blue-500 scale-110' : 'hover:scale-105'
                  }`}
                  style={{ backgroundColor: col }}
                />
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center justify-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-sm transition-colors disabled:opacity-60"
          >
            <Plus className="w-4 h-4" /> Add Category
          </button>
        </form>
      </div>

      {/* Category Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {categories.map((cat) => (
          <div
            key={cat.categoryId}
            className="p-5 rounded-2xl bg-white dark:bg-[#131c2d] border border-slate-200/80 dark:border-slate-800/80 shadow-sm flex flex-col justify-between hover:border-blue-400 transition-all group"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: cat.color || '#3b82f6' }}
                />
                <button
                  onClick={() => handleDelete(cat)}
                  className="p-1 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-950 transition-colors opacity-0 group-hover:opacity-100"
                  title="Delete category"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <h4 className="font-bold text-base text-slate-900 dark:text-white">
                {cat.categoryName}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {cat.noteCount || 0} associated notes
              </p>
            </div>

            <button
              onClick={() => setActiveTab('notes')}
              className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-blue-600 dark:text-blue-400 font-semibold hover:underline"
            >
              <span>View Notes</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
