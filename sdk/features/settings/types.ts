/**
 * Settings Feature — Types
 * sdk/features/settings/types.ts
 */

export interface BusinessHoursPayload {
    /** 24-hour format: "09:00" */
    startTime: string;
    /** 24-hour format: "18:00" */
    endTime: string;
    /** e.g. "GST+4", "IST+5:30" */
    timezone: string;
    /** 0=Mon … 6=Sun */
    activeDays: number[];
}

export interface BusinessHoursRecord extends BusinessHoursPayload {
    updatedAt: string | null;
}

export interface BusinessHoursResponse {
    success: boolean;
    data: BusinessHoursRecord;
}


\n