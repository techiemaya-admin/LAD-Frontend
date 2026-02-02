/**
 * Recording download utilities
 * Handles file naming, download initiation, and error handling
 */

import { logger } from "@/lib/logger";

/**
 * Generate filename for call recording download
 * Format: {lead_name}_{date}_{time}.wav
 */
export function generateRecordingFilename(
  leadName?: string,
  startedAt?: string
): string {
  const name = (leadName || "recording")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");

  if (startedAt) {
    try {
      const date = new Date(startedAt);
      const dateStr = date.toISOString().split("T")[0]; // YYYY-MM-DD
      const timeStr = date.toISOString().split("T")[1].split(".")[0].replace(/:/g, "-"); // HH-MM-SS
      return `${name || "recording"}_${dateStr}_${timeStr}.wav`;
    } catch {
      return `${name || "recording"}.wav`;
    }
  }

  return `${name || "recording"}.wav`;
}

/**
 * Initiate file download from URL
 * Uses a temporary anchor element to trigger browser download
 */
export function downloadFile(url: string, filename: string): void {
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.style.display = "none";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Download recording from URL with proper error handling
 */
export async function downloadRecording(
  recordingUrl: string,
  filename: string,
  onError?: (error: Error) => void
): Promise<void> {
  try {
    // Verify URL is valid
    if (!recordingUrl || !recordingUrl.startsWith("http")) {
      throw new Error("Invalid recording URL");
    }

    logger.debug(`Attempting to download recording from: ${recordingUrl.substring(0, 100)}...`);

    let blob: Blob | null = null;
    let response: Response | null = null;

    // First, try with normal CORS (this allows us to see error responses and read content properly)
    try {
      logger.debug("Attempting fetch with default CORS mode...");
      response = await fetch(recordingUrl, {
        method: 'GET',
        headers: {
          'Accept': 'audio/*',
        },
        // Default mode uses CORS
      });

      logger.debug(`CORS fetch response status: ${response.status} ${response.statusText}, type: ${response.type}`);

      if (response.ok) {
        blob = await response.blob();
        logger.debug(`Successfully fetched blob with CORS. Content-Type: ${blob.type}, Size: ${blob.size} bytes`);
      } else {
        logger.warn(`CORS fetch returned non-OK status: ${response.status}. Will try no-cors fallback.`);
      }
    } catch (corsError) {
      logger.warn(`CORS fetch failed (${corsError}), will try no-cors mode...`);
    }

    // Fallback to no-cors if CORS fetch didn't work
    if (!blob) {
      logger.debug("Attempting fetch with no-cors mode...");
      response = await fetch(recordingUrl, {
        method: 'GET',
        headers: {
          'Accept': 'audio/*',
        },
        mode: 'no-cors',
      });

      logger.debug(`No-cors fetch response status: ${response.status} ${response.statusText}, type: ${response.type}`);
      blob = await response.blob();
      logger.debug(`Fetched blob with no-cors. Content-Type: ${blob.type}, Size: ${blob.size} bytes`);
    }

    // Validate blob
    if (!blob || blob.size === 0) {
      const isLocalhost = recordingUrl.includes('storage.googleapis.com') && typeof window !== 'undefined' && window.location.hostname === 'localhost';
      const errorMsg = isLocalhost 
        ? "CORS limitation on localhost: Cannot download from Google Cloud Storage in development. This works fine in cloud deployment."
        : "Downloaded file is empty. The signed URL may have expired or the file may not exist on the server.";
      
      logger.error(`${errorMsg} Blob type: ${blob?.type || 'undefined'}. URL: ${recordingUrl.substring(0, 150)}...`);
      throw new Error(errorMsg);
    }

    logger.debug(`Successfully obtained blob. Size: ${blob.size} bytes, Type: ${blob.type}`);
    
    // Create object URL from blob
    const objectUrl = URL.createObjectURL(blob);
    
    // Use direct anchor download
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = filename;
    link.style.display = "none";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up object URL
    setTimeout(() => {
      URL.revokeObjectURL(objectUrl);
    }, 100);

    logger.debug(`Download completed successfully for file: ${filename}`);
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error(`Recording download error: ${err.message}`);
    onError?.(err);
    throw err;
  }
}
