import React from 'react';
import { useRestaurant } from '../context/RestaurantContext';
import { Sparkles, Building, ArrowRight, ShieldCheck, CreditCard } from 'lucide-react';

export const WorkspaceSwitcher: React.FC = () => {
  const { workspaces, activeWorkspace, switchWorkspace, showWorkspaceSwitcher, setShowWorkspaceSwitcher } = useRestaurant();

  if (!showWorkspaceSwitcher || workspaces.length <= 1) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200/50 dark:border-slate-800/80 shadow-2xl relative">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-brand-500/10 text-brand-600 dark:text-brand-400 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-brand-500/20">
            <Building className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Select Workspace
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Choose which restaurant portal you want to manage.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3.5 max-h-[300px] overflow-y-auto pr-1">
          {workspaces.map((w) => {
            const isSelected = w.id === activeWorkspace?.id;
            return (
              <button
                key={w.id}
                onClick={() => switchWorkspace(w.id)}
                className={`w-full text-left p-4 rounded-2xl transition-all duration-200 border flex items-center gap-4 group ${
                  isSelected
                    ? 'bg-brand-50/50 dark:bg-brand-950/10 border-brand-500/40'
                    : 'bg-slate-50/50 dark:bg-slate-800/10 hover:bg-slate-100 dark:hover:bg-slate-800 border-slate-100 dark:border-slate-850'
                }`}
              >
                {w.logoUrl ? (
                  <img
                    src={w.logoUrl}
                    alt={w.name}
                    className="w-10 h-10 rounded-xl object-cover border border-slate-200 dark:border-slate-850"
                  />
                ) : (
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-md"
                    style={{ backgroundColor: w.themeColor || '#6366F1' }}
                  >
                    {w.name.charAt(0).toUpperCase()}
                  </div>
                )}
                
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-extrabold text-slate-800 dark:text-white text-sm truncate max-w-[180px]">{w.name}</h4>
                    {isSelected && (
                      <span className="bg-brand-100 dark:bg-brand-950/60 text-brand-655 dark:text-brand-400 text-[8px] font-black uppercase px-2 py-0.5 rounded-full border border-brand-500/10">
                        Active
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-3 mt-1 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    <span className="flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-slate-400" />
                      {w.role}
                    </span>
                    <span className="flex items-center gap-1">
                      <CreditCard className="w-3 h-3 text-slate-400" />
                      {w.plan}
                    </span>
                  </div>
                </div>

                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-brand-500 group-hover:translate-x-1 transition-all" />
              </button>
            );
          })}
        </div>

        {activeWorkspace && (
          <button
            onClick={() => setShowWorkspaceSwitcher(false)}
            className="w-full text-center mt-6 text-xs text-slate-400 hover:text-slate-655 font-bold cursor-pointer transition-colors"
          >
            Cancel and stay in {activeWorkspace.name}
          </button>
        )}
      </div>
    </div>
  );
};
export default WorkspaceSwitcher;
