import React, { useState } from 'react';
import { useWorkspace } from '../context/WorkspaceContext';
import { Building2, ChevronDown, Check } from 'lucide-react';

export const WorkspaceSwitcher: React.FC = () => {
  const { activeRestaurantId, availableWorkspaces, switchWorkspace } = useWorkspace();
  const [isOpen, setIsOpen] = useState(false);

  if (availableWorkspaces.length <= 1) return null;

  const currentWorkspaceName = availableWorkspaces.find(w => w.id === activeRestaurantId)?.name || 'Select Workspace';

  return (
    <div className="relative mb-4">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2.5 bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200/50 dark:border-slate-700/50 rounded-2xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-700 transition-all cursor-pointer"
      >
        <div className="flex items-center gap-2 truncate">
          <Building2 className="w-4 h-4 text-brand-500" />
          <span className="truncate">{currentWorkspaceName}</span>
        </div>
        <ChevronDown className="w-4 h-4 opacity-60" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute left-0 mt-2 w-56 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 shadow-xl z-20 py-2 animate-fade-in">
            <p className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400 px-4 py-1.5">Switch Restaurant</p>
            {availableWorkspaces.map(w => (
              <button
                type="button"
                key={w.id}
                onClick={async () => {
                  setIsOpen(false);
                  await switchWorkspace(w.id);
                }}
                className={`w-full flex items-center justify-between px-4 py-2.5 text-xs text-left font-semibold transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60 ${
                  activeRestaurantId === w.id ? 'text-brand-600 dark:text-brand-400' : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                <span>{w.name}</span>
                {activeRestaurantId === w.id && <Check className="w-4 h-4" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
