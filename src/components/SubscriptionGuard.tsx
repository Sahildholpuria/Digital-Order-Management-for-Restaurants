import React from 'react';
import { useWorkspace } from '../context/WorkspaceContext';
import { ShieldAlert, CreditCard } from 'lucide-react';

export const SubscriptionGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { subscription } = useWorkspace();

  if (subscription?.isSuspended) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center bg-red-50/50 dark:bg-red-950/5 border border-red-200/40 rounded-3xl animate-fade-in max-w-md mx-auto mt-12">
        <ShieldAlert className="w-14 h-14 text-red-500 mb-4 animate-pulse" />
        <h2 className="text-lg font-black text-slate-805 dark:text-slate-200">Subscription Suspended</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
          Your workspace access has been frozen due to an expired subscription. Your menu configurations and past billing metrics are safe. Please contact administration or renew your plan.
        </p>
        <button 
          type="button"
          onClick={() => window.location.href = '#pricing'}
          className="mt-6 flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold px-5 py-2.5 rounded-xl transition-all cursor-pointer text-xs"
        >
          <CreditCard className="w-4 h-4" />
          <span>Renew Platform Plan</span>
        </button>
      </div>
    );
  }

  return <>{children}</>;
};
