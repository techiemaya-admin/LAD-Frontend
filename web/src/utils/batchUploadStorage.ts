"use client";

import { logger } from "@/lib/logger";

export interface BatchUploadMetadata {
  file_name: string;
  uploaded_at: string;
  rows: number;
}

export interface StoredBatchUpload {
  metadata: BatchUploadMetadata;
  original_file_base64: string; // Original Excel file (immutable)
  json_snapshot: string; // JSON representation (mutable)
}

export interface BatchUploadEntry {
  to_number: string;
  lead_name?: string;
  added_context?: string;
  lead_id?: string;
  knowledge_base_store_ids?: string[];
  name?: string;
  company_name?: string;
  summary?: string;
  requested_id?: string;
  _extra?: Record<string, any>;
}

const STORAGE_KEY_PREFIX = "batch_upload_";

/**
 * Get storage key for a specific upload session
 */
function getStorageKey(timestamp: string): string {
  return `${STORAGE_KEY_PREFIX}${timestamp}`;
}

/**
 * Get the latest batch upload from localStorage
 */
export function getLatestBatchUpload(): StoredBatchUpload | null {
  try {
    // Find all batch upload keys
    const keys = Object.keys(localStorage).filter((key) =>
      key.startsWith(STORAGE_KEY_PREFIX)
    );

    if (keys.length === 0) return null;

    // Sort by timestamp (descending) to get the latest
    keys.sort().reverse();

    const latestKey = keys[0];
    const stored = localStorage.getItem(latestKey);

    if (!stored) return null;

    return JSON.parse(stored) as StoredBatchUpload;
  } catch (error) {
    logger.error("[batchUploadStorage] Failed to get latest batch upload", {
      error,
    });
    return null;
  }
}

/**
 * Save original Excel file and initial JSON snapshot
 * Called immediately after file upload
 */
export async function saveBatchUpload(
  file: File,
  entries: BatchUploadEntry[]
): Promise<StoredBatchUpload> {
  try {
    // Convert file to base64
    const base64 = await fileToBase64(file);

    const timestamp = new Date().toISOString();
    const metadata: BatchUploadMetadata = {
      file_name: file.name,
      uploaded_at: timestamp,
      rows: entries.length,
    };

    const stored: StoredBatchUpload = {
      metadata,
      original_file_base64: base64,
      json_snapshot: JSON.stringify(entries),
    };

    const storageKey = getStorageKey(timestamp);
    localStorage.setItem(storageKey, JSON.stringify(stored));

    logger.debug("[batchUploadStorage] Saved batch upload", {
      fileName: file.name,
      rows: entries.length,
      timestamp,
    });

    return stored;
  } catch (error) {
    logger.error("[batchUploadStorage] Failed to save batch upload", {
      error,
    });
    throw new Error("Failed to save batch upload");
  }
}

/**
 * Update only the JSON snapshot (when rows are edited/deleted)
 * Original file remains unchanged
 */
export function updateJsonSnapshot(
  entries: BatchUploadEntry[],
  timestamp?: string
): void {
  try {
    // If no timestamp provided, get the latest
    let storageKey: string;
    if (timestamp) {
      storageKey = getStorageKey(timestamp);
    } else {
      const keys = Object.keys(localStorage).filter((key) =>
        key.startsWith(STORAGE_KEY_PREFIX)
      );
      if (keys.length === 0) {
        logger.warn(
          "[batchUploadStorage] No batch upload found to update JSON snapshot"
        );
        return;
      }
      keys.sort().reverse();
      storageKey = keys[0];
    }

    const stored = localStorage.getItem(storageKey);
    if (!stored) {
      logger.warn("[batchUploadStorage] Stored batch upload not found", {
        storageKey,
      });
      return;
    }

    const parsed: StoredBatchUpload = JSON.parse(stored);

    // Only update the JSON snapshot, keep original file intact
    parsed.json_snapshot = JSON.stringify(entries);
    parsed.metadata.rows = entries.length; // Update row count

    localStorage.setItem(storageKey, JSON.stringify(parsed));

    logger.debug("[batchUploadStorage] Updated JSON snapshot", {
      rows: entries.length,
      storageKey,
    });
  } catch (error) {
    logger.error("[batchUploadStorage] Failed to update JSON snapshot", {
      error,
    });
  }
}

/**
 * Get the original file as base64 string
 */
export function getOriginalFile(timestamp?: string): {
  base64: string;
  metadata: BatchUploadMetadata;
} | null {
  try {
    let storageKey: string;
    if (timestamp) {
      storageKey = getStorageKey(timestamp);
    } else {
      const keys = Object.keys(localStorage).filter((key) =>
        key.startsWith(STORAGE_KEY_PREFIX)
      );
      if (keys.length === 0) return null;
      keys.sort().reverse();
      storageKey = keys[0];
    }

    const stored = localStorage.getItem(storageKey);
    if (!stored) return null;

    const parsed: StoredBatchUpload = JSON.parse(stored);
    return {
      base64: parsed.original_file_base64,
      metadata: parsed.metadata,
    };
  } catch (error) {
    logger.error("[batchUploadStorage] Failed to get original file", {
      error,
    });
    return null;
  }
}

/**
 * Get current JSON snapshot entries
 */
export function getJsonSnapshot(timestamp?: string): BatchUploadEntry[] | null {
  try {
    let storageKey: string;
    if (timestamp) {
      storageKey = getStorageKey(timestamp);
    } else {
      const keys = Object.keys(localStorage).filter((key) =>
        key.startsWith(STORAGE_KEY_PREFIX)
      );
      if (keys.length === 0) return null;
      keys.sort().reverse();
      storageKey = keys[0];
    }

    const stored = localStorage.getItem(storageKey);
    if (!stored) return null;

    const parsed: StoredBatchUpload = JSON.parse(stored);
    return JSON.parse(parsed.json_snapshot) as BatchUploadEntry[];
  } catch (error) {
    logger.error("[batchUploadStorage] Failed to get JSON snapshot", {
      error,
    });
    return null;
  }
}

/**
 * Clear all batch uploads (cleanup)
 */
export function clearAllBatchUploads(): void {
  try {
    const keys = Object.keys(localStorage).filter((key) =>
      key.startsWith(STORAGE_KEY_PREFIX)
    );
    keys.forEach((key) => localStorage.removeItem(key));
    logger.debug("[batchUploadStorage] Cleared all batch uploads");
  } catch (error) {
    logger.error("[batchUploadStorage] Failed to clear batch uploads", {
      error,
    });
  }
}

/**
 * Convert File to base64 string
 */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Extract base64 part after the data URL prefix
      const base64 = result.split(",")[1] || result;
      resolve(base64);
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

/**
 * Generate a downloadable JSON file from entries
 * File naming format: originalFileName_timestamp.json
 */
export function downloadJsonSnapshot(
  entries: BatchUploadEntry[],
  originalFileName: string,
  timestamp: string
): void {
  try {
    // Clean filename - remove extension and add timestamp
    const baseName = originalFileName.replace(/\.[^/.]+$/, "");
    const cleanTimestamp = timestamp.replace(/[:.]/g, "-");
    const jsonFileName = `${baseName}_${cleanTimestamp}.json`;

    const jsonContent = JSON.stringify(entries, null, 2);
    const blob = new Blob([jsonContent], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = jsonFileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    logger.debug("[batchUploadStorage] Downloaded JSON snapshot", {
      fileName: jsonFileName,
      rows: entries.length,
    });
  } catch (error) {
    logger.error("[batchUploadStorage] Failed to download JSON snapshot", {
      error,
    });
  }
}
