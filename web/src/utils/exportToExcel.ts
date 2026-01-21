 /**
 * Export utilities for call logs to Excel format
 * Supports exporting batches and all logs with recording URLs
 */

interface ExportCallLog {
  callId: string;
  agent: string;
  leadName: string;
  type: string;
  status: string;
  startedAt: string;
  duration: string;
  durationSeconds: number;
  cost: string;
  tags: string;
  recordingUrl: string;
  recordingProxyUrl: string;
  batchId?: string;
  analysis?: string;
}

/**
 * Convert GCS gs:// URL to GCP HTTPS URL
 * gs://bucket/path -> https://storage.googleapis.com/bucket/path
 */
export function convertGcsToHttps(gsUrl: string | undefined): string {
  if (!gsUrl) return "";
  
  if (gsUrl.startsWith("gs://")) {
    const parts = gsUrl.replace("gs://", "").split("/");
    const bucket = parts[0];
    const path = parts.slice(1).join("/");
    return `https://storage.googleapis.com/${bucket}/${path}`;
  }
  
  // If already HTTPS or signed URL, return as is
  if (gsUrl.startsWith("http://") || gsUrl.startsWith("https://")) {
    return gsUrl;
  }
  
  return gsUrl;
}

/**
 * Convert URL to proxy URL for secure access
 * Uses recording-proxy endpoint to stream and analyze recordings
 */
export function convertToProxyUrl(recordingUrl: string | undefined): string {
  if (!recordingUrl) return "";
  
  try {
    const encodedUrl = encodeURIComponent(recordingUrl);
    return `http://localhost:3000/api/recording-proxy?url=${encodedUrl}`;
  } catch {
    return "";
  }
}

/**
 * Generate analysis summary from call data
 * Includes call quality, engagement, and performance metrics
 */
export function generateAnalysis(item: any): string {
  const duration = item.duration || 0;
  const status = (item.status || "").toLowerCase();
  const type = item.type || "Unknown";
  
  const analysisPoints: string[] = [];
  
  // Duration analysis
  if (duration > 300) {
    analysisPoints.push("Long engagement (5+ min)");
  } else if (duration > 60) {
    analysisPoints.push("Good engagement (1-5 min)");
  } else if (duration > 10) {
    analysisPoints.push("Brief conversation (10-60s)");
  } else if (duration > 0) {
    analysisPoints.push("Minimal engagement (<10s)");
  }
  
  // Status analysis
  if (status.includes("completed") || status.includes("ended")) {
    analysisPoints.push("Call completed");
  } else if (status.includes("failed") || status.includes("dropped")) {
    analysisPoints.push("Call failed/dropped");
  } else if (status.includes("missed")) {
    analysisPoints.push("Call missed");
  }
  
  // Direction analysis
  if (type === "Outbound") {
    analysisPoints.push("Outbound call");
  } else if (type === "Inbound") {
    analysisPoints.push("Inbound call");
  }
  
  return analysisPoints.join(" | ");
}

/**
 * Prepare call logs for Excel export
 */
export function prepareExportData(
  items: any[],
  getLeadTag: (item: any) => string
): ExportCallLog[] {
  return items.map((item) => {
    const recordingUrl = convertGcsToHttps(
      item.signed_recording_url ||
        item.recording_url ||
        item.call_recording_url
    );
    
    return {
      callId: item.id?.slice(0, 12) || "N/A",
      agent: item.assistant || "—",
      leadName: item.lead_name || "—",
      type: item.type || "—",
      status: item.status || "—",
      startedAt: item.startedAt
        ? new Date(item.startedAt).toLocaleString()
        : "—",
      duration: item.duration
        ? `${Math.floor(item.duration / 60)}:${String(item.duration % 60).padStart(
            2,
            "0"
          )}`
        : "—",
      durationSeconds: item.duration || 0,
      cost: item.cost || item.call_cost ? `$${Number(item.cost || item.call_cost || 0).toFixed(2)}` : "—",
      tags: getLeadTag(item),
      recordingUrl: recordingUrl,
      recordingProxyUrl: convertToProxyUrl(recordingUrl),
      batchId: item.batch_id,
      analysis: generateAnalysis(item),
    };
  });
}

/**
 * Export to CSV format (simpler, no external dependency)
 */
export function exportToCSV(
  data: ExportCallLog[],
  filename: string
): void {
  const headers = [
    "Call ID",
    "Agent",
    "Lead Name",
    "Type",
    "Status",
    "Started At",
    "Duration",
    "Duration (Seconds)",
    "Cost",
    "Tags",
    "Analysis",
    "Recording URL (GCP HTTPS)",
    "Recording Proxy URL",
    "Batch ID",
  ];

  const rows = data.map((item) => [
    item.callId,
    item.agent,
    item.leadName,
    item.type,
    item.status,
    item.startedAt,
    item.duration,
    item.durationSeconds,
    item.cost,
    item.tags,
    item.analysis || "—",
    item.recordingUrl,
    item.recordingProxyUrl,
    item.batchId || "—",
  ]);

  // Create CSV content
  const csvContent = [
    headers.map((h) => `"${h}"`).join(","),
    ...rows.map((row) =>
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
    ),
  ].join("\n");

  // Create blob and download
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export to JSON format
 */
export function exportToJSON(data: ExportCallLog[], filename: string): void {
  const jsonContent = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonContent], {
    type: "application/json;charset=utf-8;",
  });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export to Excel using SheetJS (if available) or fallback to CSV
 */
export async function exportToExcel(
  data: ExportCallLog[],
  filename: string
): Promise<void> {
  try {
    // Try to use XLSX library if available
    const XLSX = (await import("xlsx")).default;

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Call Logs");

    // Set column widths
    const colWidths = [
      { wch: 15 }, // Call ID
      { wch: 20 }, // Agent
      { wch: 20 }, // Lead Name
      { wch: 12 }, // Type
      { wch: 12 }, // Status
      { wch: 20 }, // Started At
      { wch: 12 }, // Duration
      { wch: 12 }, // Cost
      { wch: 12 }, // Tags
      { wch: 50 }, // Recording URL
      { wch: 15 }, // Batch ID
    ];
    worksheet["!cols"] = colWidths;

    XLSX.writeFile(workbook, filename);
  } catch {
    // Fallback to CSV if XLSX not available
    console.warn("XLSX not available, exporting as CSV instead");
    exportToCSV(data, filename.replace(".xlsx", ".csv"));
  }
}
