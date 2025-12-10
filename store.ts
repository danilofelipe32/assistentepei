import { create } from 'zustand';
import type { ViewType } from './types.ts';

// Interface defining the shape of our global state
interface AppState {
  currentView: ViewType;
  editingPeiId: string | null;
  selectedActivityId: string | null;
  isThinkingModeEnabled: boolean;
  toggleThinkingMode: () => void;
  navigateToView: (view: ViewType) => void;
  navigateToEditPei: (peiId: string) => void;
  navigateToNewPei: () => void;
  navigateToActivityDetail: (activityId: string) => void;
}

/**
 * Gets the initial view from the URL query parameters.
 * This is useful for supporting PWA shortcuts.
 */
const getInitialView = (): ViewType => {
    const params = new URLSearchParams(window.location.search);
    const viewFromUrl = params.get('view') as ViewType;
    const validViews: ViewType[] = ['pei-form-view', 'activity-bank-view', 'pei-list-view', 'files-view', 'privacy-policy-view', 'activity-detail-view'];
    
    if (viewFromUrl && validViews.includes(viewFromUrl)) {
        // Clean the URL to avoid reloading into the same view
        window.history.replaceState({}, document.title, window.location.pathname);
        return viewFromUrl;
    }
    return 'pei-form-view'; // Default view
};

/**
 * Zustand store for global application state management.
 */
export const useAppStore = create<AppState>((set) => ({
  // State
  currentView: getInitialView(),
  editingPeiId: null,
  selectedActivityId: null,
  isThinkingModeEnabled: false,
  
  // Actions
  toggleThinkingMode: () => set((state) => ({ isThinkingModeEnabled: !state.isThinkingModeEnabled })),

  navigateToView: (view) => set({ 
      currentView: view, 
      editingPeiId: view === 'pei-form-view' ? null : undefined,
      selectedActivityId: null
  }),
  
  navigateToEditPei: (peiId) => set({ 
      currentView: 'pei-form-view', 
      editingPeiId: peiId,
      selectedActivityId: null
  }),
  
  navigateToNewPei: () => set({ 
      currentView: 'pei-form-view', 
      editingPeiId: null,
      selectedActivityId: null
  }),

  navigateToActivityDetail: (activityId) => set({
      currentView: 'activity-detail-view',
      selectedActivityId: activityId
  })
}));