import { AppDispatch, RootState } from '../store';
import { setDashboardLoading, setAnalytics, setLeadStats, setDashboardError, setLastFetchParams } from '../slices/dashboardSlice';
import { fetchAnalytics, fetchLeadStats } from '../../services/dashboardService';
type FetchParams = Record<string, string | number>;
// In-flight request cache to deduplicate API calls even across double-mounts
const inflightRequests: Record<string, Promise<void>> = {};
export const fetchDashboardData = (params: FetchParams) => async (dispatch: AppDispatch, getState: () => RootState) => {
  const paramsString = JSON.stringify(params);
  const lastParams = getState().dashboard.lastFetchParams;
  if (lastParams && JSON.stringify(lastParams) === paramsString) {
    // Already fetched for these params, skip
    return;
  }
  if (paramsString in inflightRequests) {
    // If a request is already in flight for these params, wait for it
    await inflightRequests[paramsString];
    return;
  }
  let resolveInflight: () => void = () => {};
  let rejectInflight: (error: any) => void = () => {};
  inflightRequests[paramsString] = new Promise<void>((resolve, reject) => {
    resolveInflight = resolve;
    rejectInflight = reject;
  });
  dispatch(setDashboardLoading(true));
  try {
    const analytics = await fetchAnalytics(params);
    const leadStats = await fetchLeadStats(params);
    dispatch(setAnalytics(analytics));
    dispatch(setLeadStats(leadStats));
    dispatch(setLastFetchParams(params));
    resolveInflight();
  } catch (err: any) {
    dispatch(setDashboardError(err.message || 'Failed to fetch dashboard data'));
    rejectInflight(err);
  } finally {
    delete inflightRequests[paramsString];
    dispatch(setDashboardLoading(false));
  }
};