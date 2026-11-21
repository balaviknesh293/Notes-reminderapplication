import React from 'react';
import { Bold, Italic, List, CheckSquare, Code, Link as LinkIcon, Heading2 } from 'lucide-react';

export default function RichTextToolbar({ textareaRef, value, onChange }) {
  const insertSyntax = (before, after = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);

    const replacement = `${before}${selectedText || 'text'}${after}`;
    const newValue = value.substring(0, start) + replacement + value.substring(end);

    onChange(newValue);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + before.length,
        start + before.length + (selectedText.length || 4)
      );
    }, 10);
  };

  const insertLinePrefix = (prefix) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const currentLineStart = value.lastIndexOf('\n', start - 1) + 1;
    const newValue = value.substring(0, currentLineStart) + prefix + value.substring(currentLineStart);

    onChange(newValue);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length);
    }, 10);
  };

  return (
    <div className="flex items-center gap-1 p-1 bg-slate-100/80 dark:bg-slate-800/60 rounded-lg border border-slate-200/80 dark:border-slate-700/60 text-slate-600 dark:text-slate-300 mb-2 overflow-x-auto">
      <button
        type="button"
        title="Bold"
        onClick={() => insertSyntax('**', '**')}
        className="p-1.5 rounded hover:bg-white dark:hover:bg-slate-700 hover:text-blue-600 transition-colors"
      >
        <Bold className="w-4 h-4" />
      </button>
      <button
        type="button"
        title="Italic"
        onClick={() => insertSyntax('*', '*')}
        className="p-1.5 rounded hover:bg-white dark:hover:bg-slate-700 hover:text-blue-600 transition-colors"
      >
        <Italic className="w-4 h-4" />
      </button>
      <button
        type="button"
        title="Heading"
        onClick={() => insertLinePrefix('## ')}
        className="p-1.5 rounded hover:bg-white dark:hover:bg-slate-700 hover:text-blue-600 transition-colors"
      >
        <Heading2 className="w-4 h-4" />
      </button>
      <div className="w-[1px] h-4 bg-slate-300 dark:bg-slate-700 mx-1" />
      <button
        type="button"
        title="Bullet List"
        onClick={() => insertLinePrefix('• ')}
        className="p-1.5 rounded hover:bg-white dark:hover:bg-slate-700 hover:text-blue-600 transition-colors"
      >
        <List className="w-4 h-4" />
      </button>
      <button
        type="button"
        title="Task Checklist"
        onClick={() => insertLinePrefix('- [ ] ')}
        className="p-1.5 rounded hover:bg-white dark:hover:bg-slate-700 hover:text-blue-600 transition-colors"
      >
        <CheckSquare className="w-4 h-4" />
      </button>
      <button
        type="button"
        title="Code Block"
        onClick={() => insertSyntax('`', '`')}
        className="p-1.5 rounded hover:bg-white dark:hover:bg-slate-700 hover:text-blue-600 transition-colors"
      >
        <Code className="w-4 h-4" />
      </button>
      <button
        type="button"
        title="Insert Link"
        onClick={() => insertSyntax('[link text](', ')')}
        className="p-1.5 rounded hover:bg-white dark:hover:bg-slate-700 hover:text-blue-600 transition-colors"
      >
        <LinkIcon className="w-4 h-4" />
      </button>
    </div>
  );
}
