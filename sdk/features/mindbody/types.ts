/**
 * MindBody Feature - Types
 *
 * TypeScript interfaces for the MindBody integration.
 */

export interface MindBodyStatus {
  connected: boolean;
  site_id: string | null;
  display_name: string | null;
  target_classes: string[];
  last_verified_at: string | null;
  error?: string;
}

export interface MindBodyConnectPayload {
  site_id: string;
  display_name?: string;
  username: string;
  api_key: string;
  password: string;
  target_classes: string[];
}

export interface MindBodyClass {
  classId: string;
  name: string;
  startDateTime: string;
  spotsAvailable: number;
  instructor: string;
}
