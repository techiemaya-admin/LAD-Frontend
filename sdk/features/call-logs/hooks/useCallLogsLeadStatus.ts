import { useCallLogs } from "./useCallLogs";
import type { GetCallLogsParams } from "../types";

export function useCallLogsLeadStatus(params?: GetCallLogsParams, enabled: boolean = true) {
  return useCallLogs(params, enabled);
}
