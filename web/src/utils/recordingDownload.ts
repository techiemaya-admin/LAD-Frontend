/**
 * Recording download utilities
 * Handles file naming, download initiation, and error handling
 */

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

    // Fetch the file - signed URLs don't need credentials
    const response = await fetch(recordingUrl);

    if (!response.ok) {
      throw new Error(`Download failed: ${response.statusText}`);
    }

    const blob = await response.blob();
    
    // Only proceed if blob has data
    if (blob.size === 0) {
      throw new Error("Downloaded file is empty");
    }
    
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
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    onError?.(err);
    throw err;
  }
}
