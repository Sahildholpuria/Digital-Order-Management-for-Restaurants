import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRestaurant } from './RestaurantContext'; // Auth reference
import { supabase } from '../services/supabase';
import { dbService } from '../services/database';

interface Workspace {
  id: string;
  name: string;
  slug: string;
}

interface WorkspaceContextType {
  activeRestaurantId: string;
  activeBranchId: string;
  availableWorkspaces: Workspace[];
  subscription: {
    plan: 'free' | 'starter' | 'pro' | 'enterprise';
    expiryDate: string;
    maxTables: number;
    maxStaff: number;
    isSuspended: boolean;
  } | null;
  switchWorkspace: (restaurantId: string, branchId?: string) => Promise<void>;
  isLoadingWorkspace: boolean;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export const WorkspaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useRestaurant();
  const [activeRestaurantId, setActiveRestaurantId] = useState<string>('');
  const [activeBranchId, setActiveBranchId] = useState<string>('');
  const [availableWorkspaces, setAvailableWorkspaces] = useState<Workspace[]>([]);
  const [subscription, setSubscription] = useState<any>(null);
  const [isLoadingWorkspace, setIsLoadingWorkspace] = useState(true);

  // Sync available workspaces from staff user profile database
  useEffect(() => {
    if (currentUser) {
      const loadWorkspaces = async () => {
        try {
          // Fetch workspaces detailed info matching array of accessible ids
          const { data: workspaces, error } = await supabase
            .from('restaurants')
            .select('id, name')
            .in('id', currentUser.accessibleRestaurants || [currentUser.restaurantId || 'demo-restaurant']);

          if (!error && workspaces) {
            setAvailableWorkspaces(workspaces.map(w => ({
              id: w.id,
              name: w.name,
              slug: w.id // Using ID as slug fallback
            })));
          }
        } catch (err) {
          console.error('Failed loading workspaces:', err);
        }
      };

      loadWorkspaces();
      
      const savedRest = localStorage.getItem('last_active_restaurant') || currentUser.activeRestaurantId || currentUser.restaurantId || 'demo-restaurant';
      const savedBranch = localStorage.getItem('last_active_branch') || '';
      
      setActiveRestaurantId(savedRest);
      setActiveBranchId(savedBranch);
    } else {
      // Fallback for anonymous users / guests accessing customer menu
      // They parse the restaurantId from URL pathname or defaults
      const pathParts = window.location.pathname.split('/');
      // Path might be: /menu/:restaurantId or /track/:orderId
      // Let's grab it from local storage or fallback to demo
      const localRest = localStorage.getItem('last_active_restaurant') || 'demo-restaurant';
      setActiveRestaurantId(localRest);
      setIsLoadingWorkspace(false);
    }
  }, [currentUser]);

  // Load active subscription limits and primary branch ID on tenant shift
  useEffect(() => {
    if (!activeRestaurantId) return;

    const loadWorkspaceMetadata = async () => {
      setIsLoadingWorkspace(true);
      try {
        // Fetch Tenant Subscription
        const subData = await dbService.getSubscriptionDetails(activeRestaurantId);
        setSubscription(subData);

        // Fetch primary branch if activeBranchId is empty
        if (!activeBranchId) {
          const { data: branches } = await supabase
            .from('branches')
            .select('id')
            .eq('restaurant_id', activeRestaurantId)
            .limit(1);
          if (branches && branches.length > 0) {
            setActiveBranchId(branches[0].id);
          } else {
            setActiveBranchId('branch-' + activeRestaurantId);
          }
        }
      } catch (err) {
        console.error('Workspace metadata fetch error:', err);
      } finally {
        setIsLoadingWorkspace(false);
      }
    };

    loadWorkspaceMetadata();
  }, [activeRestaurantId, activeBranchId]);

  // Switch workspace and update user table record on Supabase to align RLS policies
  const switchWorkspace = async (restaurantId: string, branchId?: string) => {
    setIsLoadingWorkspace(true);
    try {
      if (currentUser) {
        // Update user profile active_restaurant_id in database
        const { error } = await supabase
          .from('users')
          .update({ active_restaurant_id: restaurantId })
          .eq('id', currentUser.id);

        if (error) throw error;
      }

      setActiveRestaurantId(restaurantId);
      localStorage.setItem('last_active_restaurant', restaurantId);
      
      if (branchId) {
        setActiveBranchId(branchId);
        localStorage.setItem('last_active_branch', branchId);
      } else {
        localStorage.removeItem('last_active_branch');
      }

      // Reload to clean and re-bind all real-time pg replication listeners
      window.location.reload();
    } catch (err) {
      console.error('Workspace switch failure:', err);
    } finally {
      setIsLoadingWorkspace(false);
    }
  };

  return (
    <WorkspaceContext.Provider value={{
      activeRestaurantId,
      activeBranchId,
      availableWorkspaces,
      subscription,
      switchWorkspace,
      isLoadingWorkspace
    }}>
      {children}
    </WorkspaceContext.Provider>
  );
};

export const useWorkspace = () => {
  const context = useContext(WorkspaceContext);
  if (!context) throw new Error('useWorkspace must be used inside WorkspaceProvider');
  return context;
};
