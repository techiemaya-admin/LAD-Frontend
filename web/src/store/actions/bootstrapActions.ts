// Thunk action to bootstrap all required data after login
import { setBootstrapLoading, setBootstrapError, setBootstrapFinished } from '../slices/bootstrapSlice';
import { setConversations, setLoading as setConversationLoading, setError as setConversationError } from '../slices/conversationSlice';
import { setNotifications } from '../slices/notificationSlice';
import { setStages, setStagesLoading, setStagesError } from '../../features/deals-pipeline/store/slices/pipelineSlice';
import { setLeads, setLeadsLoading, setLeadsError } from '../../features/deals-pipeline/store/slices/leadsSlice';
import { setStatuses, setSources, setPriorities } from '../slices/masterDataSlice';
import chatService from '../../services/chatService';
import { fetchStages, fetchStatuses, fetchSources, fetchPriorities, fetchLeads } from '../../services/pipelineService';
import { AppDispatch, RootState } from '../store';
import { safeStorage } from '../../utils/storage';

// Thunk type
type AppThunk = (dispatch: AppDispatch, getState: () => RootState) => Promise<void> | void;

export const bootstrapApp = (): AppThunk => async (dispatch, getState) => {
  const state = getState();
  // Guard: If already finished or loading, do not bootstrap again
  if (state.bootstrap && ((state.bootstrap as { finished?: boolean; loading?: boolean }).finished || (state.bootstrap as { loading?: boolean }).loading)) {
    return;
  }
  dispatch(setBootstrapLoading(true));
  try {
    // 1. Load conversations (deduplicate: only fetch if not already loaded)
    const conversations = (state.conversation as { conversations?: unknown[] })?.conversations || [];
    if (!conversations || conversations.length === 0) {
      dispatch(setConversationLoading(true));
      const conversationsData = await chatService.getConversations();
      console.log('Bootstrapped conversations:', conversationsData);
      dispatch(setConversations(conversationsData));
      dispatch(setConversationLoading(false));
    }

    // 2. Load notifications (if API exists) - only if backend has notifications
    try {
      const res = await fetch('/api/conversations/notifications', {
        headers: { Authorization: `Bearer ${safeStorage.getItem('token')}` },
      });
      if (res.ok) {
        const backendNotifications = await res.json();
        if (backendNotifications && Array.isArray(backendNotifications) && backendNotifications.length > 0) {
          console.log('[Bootstrap] Loaded notifications from backend:', backendNotifications.length);
          dispatch(setNotifications(backendNotifications));
        } else {
          console.log('[Bootstrap] No notifications from backend, keeping localStorage notifications');
        }
      } else {
        console.log('[Bootstrap] Backend notifications API not available, keeping localStorage notifications');
      }
    } catch (error) {
      const err = error as Error;
      console.log('[Bootstrap] Error fetching notifications from backend, keeping localStorage notifications:', err.message);
    }

    // 3. Load pipeline data into Redux state
    try {
      console.log('[Bootstrap] Loading pipeline data...');
      dispatch(setStagesLoading(true));
      dispatch(setLeadsLoading(true));
      
      // Load stages and leads in parallel for better performance
      const [stages, leads] = await Promise.all([
        fetchStages().catch(err => { 
          const error = err as Error;
          console.warn('Failed to load stages:', err); 
          dispatch(setStagesError(error.message || 'Failed to load stages'));
          return []; 
        }),
        fetchLeads().catch(err => { 
          const error = err as Error;
          console.warn('Failed to load leads:', err); 
          dispatch(setLeadsError(error.message || 'Failed to load leads'));
          return []; 
        })
      ]);

      // Store data in respective slices
      dispatch(setStages(stages));
      dispatch(setLeads(leads));
      dispatch(setStagesLoading(false));
      dispatch(setLeadsLoading(false));

      console.log('[Bootstrap] Pipeline data loaded:', { 
        stages: stages.length, 
        leads: leads.length 
      });

      // Load master data and store in Redux
      try {
        const [statuses, sources, priorities] = await Promise.all([
          fetchStatuses().catch(err => { 
            console.warn('Failed to load statuses:', err); 
            return []; 
          }),
          fetchSources().catch(err => { 
            console.warn('Failed to load sources:', err); 
            return []; 
          }),
          fetchPriorities().catch(err => { 
            console.warn('Failed to load priorities:', err); 
            return []; 
          })
        ]);
        
        // Dispatch master data to Redux store
        dispatch(setStatuses(statuses));
        dispatch(setSources(sources));
        dispatch(setPriorities(priorities));
        
        console.log('[Bootstrap] Master data loaded and stored in Redux:', { 
          statuses: statuses.length, 
          sources: sources.length, 
          priorities: priorities.length 
        });
      } catch (err) {
        console.warn('[Bootstrap] Failed to load master data:', err);
      }
      
    } catch (err) {
      console.error('[Bootstrap] Failed to load pipeline data:', err);
      dispatch(setStagesLoading(false));
      dispatch(setLeadsLoading(false));
      // Don't fail bootstrap if pipeline data fails
    }

    // 4. Load user settings (if needed)
    // You may want to fetch user settings from API here
    // Example:
    // const userSettings = await fetchUserSettings();
    // dispatch(setUserSettings(userSettings));

    dispatch(setBootstrapFinished(true));
    dispatch(setBootstrapLoading(false));
  } catch (err) {
    const error = err as Error;
    dispatch(setBootstrapError(error.message || 'Failed to bootstrap app'));
    dispatch(setBootstrapLoading(false));
  }
};

