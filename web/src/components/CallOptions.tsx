

"use client";

import { useState } from "react";
import {
  Card, CardHeader, CardTitle, CardDescription, CardContent
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileText, Loader2, Phone, Download, Trash, Eye, EyeOff, SquarePen } from "lucide-react";
import { useToast } from "@/components/ui/app-toaster";
import { apiPost } from "@/lib/api";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogActions } from "@/components/ui/dialog";
import ExcelJS from "exceljs";

  

type BulkEntry = {
  to_number: string;
  lead_name?: string;
  added_context?: string;
  lead_id?: string; // V2: UUID string instead of int
  knowledge_base_store_ids?: string[]; // V2: New field
  
  // Legacy/UI fields for backward compatibility
  name?: string;
  company_name?: string;
  summary?: string;
  requested_id?: string;
  _extra?: Record<string, any>;
};

interface CallOptionsProps {
  useCsv: boolean;
  onUseCsvChange: (useCsv: boolean) => void;

  // Single
  dial: string;
  onDialChange: (dial: string) => void;
  clientName: string;
  onClientNameChange: (clientName: string) => void;

  // Bulk
  bulkEntries?: BulkEntry[];
  onBulkEntriesChange?: (rows: BulkEntry[]) => void;

  loading: boolean;
  selectedNumberId: string | undefined;
  agentId: string | undefined;
  fromNumber: string | undefined;
  onLoadingChange?: (loading: boolean) => void;
  additionalInstructions: string;
  isPrefilled?: boolean;
  onAdditionalInstructionsChange?: (text: string) => void;
  initiatedBy?: string | number;
  dataSource?: 'backend' | 'file' | 'localStorage'; // Track where data came from
  dataType?: 'company' | 'employee'; // Track data type for backend updates
  onDataSourceChange?: (source: 'backend' | 'file' | 'localStorage') => void; // Allow updating data source
}

export function CallOptions(props: CallOptionsProps) {
  const {
    useCsv, onUseCsvChange,
    dial, onDialChange,
    clientName, onClientNameChange,
    bulkEntries = [], onBulkEntriesChange,
    loading, agentId, fromNumber,
    onLoadingChange, additionalInstructions, isPrefilled = false,
    onAdditionalInstructionsChange,
    initiatedBy,
    dataSource = 'localStorage',
    dataType = 'company',
    onDataSourceChange,
  } = props;

  const { push } = useToast();
  const router = useRouter();

  const [expanded, setExpanded] = useState(false);
  const hasBulk = (bulkEntries?.length || 0) > 0;
  const visibleCount = expanded ? bulkEntries.length : Math.min(5, bulkEntries.length);

  // --- new state for radio selection and modal ---
  const [selectedSummaryIndex, setSelectedSummaryIndex] = useState<number | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorRowIndex, setEditorRowIndex] = useState<number | null>(null);
  const [editorValues, setEditorValues] = useState<{
    to_number: string;
    name?: string;
    summary?: string; // UI convenience and added_context
    requested_id?: string;
    sales_summary?: string; // for companies
    company_sales_summary?: string; // for employees
  }>({ to_number: "", name: "", summary: "" });
  const [savingSummary, setSavingSummary] = useState(false);

  const handleSubmit = async () => {
    onLoadingChange?.(true);
    try {
      if (!agentId) throw new Error("Please select a voice agent");
      if (!fromNumber) throw new Error("Please select a valid from number");

      // Determine effective initiator
      const effectiveInitiator =
        initiatedBy !== undefined
          ? initiatedBy
          : (agentId && !Number.isNaN(Number(agentId)) ? Number(agentId) : undefined);

      if (useCsv) {
        if (!hasBulk) throw new Error("No numbers in the bulk list");
// updated bulk payload - include per-row summary and top-level added_context
        const payload = {
          voice_id: "default", // Required by V2 API
          agent_id: agentId,
          from_number: fromNumber,
          // optional global context (Additional Instructions from the UI)
          added_context: (additionalInstructions && String(additionalInstructions).trim()) || undefined,
          entries: bulkEntries
            .filter((r) => !!r.to_number)
            .map((r) => ({
              to_number: r.to_number,
              lead_name: r.name || r.lead_name || undefined,
              // row-level context (uses row.summary if present)
              added_context: r.summary && String(r.summary).trim() ? r.summary.trim() : r.added_context || undefined,
              lead_id: r.lead_id ? String(r.lead_id) : undefined, // V2: Ensure UUID string
              knowledge_base_store_ids: r.knowledge_base_store_ids || undefined, // V2: New field
            })),
          ...(effectiveInitiator !== undefined ? { initiated_by: String(effectiveInitiator) } : {}),
        };

        console.log("📦 Sending bulk payload:", payload);
        // Using backend voice-agent batch calls API (V2 endpoint)
        const res = await apiPost("/api/voice-agent/batch/trigger-batch-call", payload);

        // Expect backend response like { success: true, result: { job_id: "batch-..." } }
        const anyRes: any = res;
        const jobId: string | undefined =
          anyRes?.result?.job_id ||
          anyRes?.batch?.job_id ||
          anyRes?.job_id;

        push({
          title: "Bulk Calls Started",
          description: `${payload.entries.length} numbers queued.`,
        });

        if (jobId) {
          router.push(
            `/call-logs?jobId=${encodeURIComponent(jobId)}&mode=current-batch`
          );
        } else {
          // Fallback: go to generic call logs if no job_id was returned
          router.push("/call-logs");
        }
        return;
      }

      if (!dial) throw new Error("Please enter a phone number to call");
      const singlePayload = {
        voice_id: "default", // Required by V2 API
        agent_id: agentId,
        from_number: fromNumber,
        to_number: dial.replace(/\s+/g, ""), // Remove all spaces from phone number
        lead_name: clientName || undefined,
        added_context: additionalInstructions || "Call initiated from dashboard",
        ...(effectiveInitiator !== undefined ? { initiated_by: String(effectiveInitiator) } : {}),
      } as const;
      console.log("☎️ Sending single-call payload:", singlePayload);
      // Using backend voice-agent calls API (V2 endpoint)
      await apiPost("/api/voice-agent/calls/start-call", singlePayload);
      push({ title: "Success", description: "Call initiated successfully!" });
      onDialChange("");
      onClientNameChange("");
      router.push("/call-logs");
    } catch (e: any) {
      console.error(e);
      push({ variant: "error", title: "Error", description: e?.message || "Failed to initiate call. Please try again." });
    } finally {
      onLoadingChange?.(false);
    }
  };

  const openEditorFor = (idx: number) => {
    const row = bulkEntries[idx];
    setEditorRowIndex(idx);
    const currentText = row.summary || "";
    setEditorValues({
      to_number: row.to_number.replace(/\s+/g, ""),
      name: row.name || row.company_name,
      summary: currentText,
      // initialize specific field depending on type for editing
      sales_summary: dataType === 'company' ? currentText : undefined,
      company_sales_summary: dataType === 'employee' ? currentText : undefined,
      requested_id: (row as any).requested_id,
    });
    setEditorOpen(true);
  };

  const saveEditor = async () => {
    if (editorRowIndex === null) return;
    setSavingSummary(true);
    try {
      // 1. Optimistically update UI
      const copy = [...bulkEntries];
      copy[editorRowIndex] = { ...copy[editorRowIndex], ...editorValues };
      onBulkEntriesChange?.(copy);

      // 2. Persist to localStorage for file-uploaded or localStorage-sourced data
      if (dataSource === 'file' || dataSource === 'localStorage') {
        try {
          localStorage.setItem('bulk_call_targets', JSON.stringify({ data: copy }));
          console.log('[CallOptions] Updated localStorage with edited entry');
        } catch (lsError) {
          console.warn('[CallOptions] Failed to update localStorage:', lsError);
        }
      }

      // 3. Persist to database for backend-sourced data
      if (dataSource === 'backend') {
        try {
          const normalizedPhone = editorValues.to_number.replace(/\s+/g, "");
          const idFromRequested = editorValues.requested_id && String(editorValues.requested_id).trim();
          const identifier = idFromRequested
            ? (dataType === 'employee'
                ? { employee_data_id: idFromRequested }
                : { company_data_id: idFromRequested })
            : null;
          if (!identifier) {
            push({
              variant: 'warning',
              title: 'Identifier required',
              description: 'Backend data requires an ID to update summary. Please ensure this row has an employee/company id.'
            });
            return; // do not attempt phone-only update for backend data
          }
          const activeText = dataType === 'employee' ? (editorValues.company_sales_summary || editorValues.summary || '') : (editorValues.sales_summary || editorValues.summary || '');
          // Keep generic summary for backwards-compat while also sending the specific field
          const payload = {
            ...identifier,
            name: editorValues.name,
            summary: activeText,
            ...(dataType === 'employee' ? { company_sales_summary: activeText } : { sales_summary: activeText }),
            type: dataType,
          } as const;
          await apiPost('/api/voice-agent/update-summary', payload as any);
          console.log('[CallOptions] Updated database summary for identifier:', identifier || normalizedPhone);
        } catch (apiError: any) {
          console.error('[CallOptions] Failed to update database:', apiError);
          // Non-blocking: UI is already updated, just log the error
          push({ 
            variant: 'warning', 
            title: 'Partial save', 
            description: 'UI updated but database sync failed. Changes may not persist on reload.' 
          });
        }
      }

      // If this edited row is currently selected for Additional Instructions, sync the edited summary
      if (selectedSummaryIndex !== null && selectedSummaryIndex === editorRowIndex) {
        const activeText = dataType === 'employee' ? (editorValues.company_sales_summary || editorValues.summary || '') : (editorValues.sales_summary || editorValues.summary || '');
        onAdditionalInstructionsChange?.(activeText);
      }
      push({ title: 'Saved', description: 'Summary saved successfully' });
      setEditorOpen(false);
    } catch (e: any) {
      console.error('Failed saving summary', e);
      push({ variant: 'error', title: 'Save failed', description: e?.message || 'Could not save summary' });
    } finally {
      setSavingSummary(false);
    }
  };

  // When radio selection changes, update Additional Instructions with the selected summary
  const onRadioChange = (idx: number | null) => {
    setSelectedSummaryIndex(idx);
    if (idx === null) {
      onAdditionalInstructionsChange?.('');
      return;
    }
    const s = bulkEntries[idx]?.summary || '';
    onAdditionalInstructionsChange?.(s);
  };

  const removeRow = (idx: number) => {
    const copy = bulkEntries.filter((_, i) => i !== idx);
    onBulkEntriesChange?.(copy);

    // adjust selectedSummaryIndex reliably
    if (selectedSummaryIndex === idx) {
      onRadioChange(null);
    } else if (selectedSummaryIndex !== null && selectedSummaryIndex > idx) {
      // shift selection down by 1
      setSelectedSummaryIndex((prev) => (prev !== null ? prev - 1 : null));
    }
  };

  // ----------------------------
  // Template download (xlsx) using ExcelJS
  // ----------------------------
  const downloadTemplate = async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Template");

    ws.columns = [
      { header: "Phone", key: "phone", width: 20 },
      { header: "Name", key: "name", width: 20 },
      { header: "Summary", key: "summary", width: 40 },
    ];

    ws.addRow({
      phone: "+1XXXXXXXXXX",
      name: "Optional Name",
      summary: "Optional summary for call context",
    });

    ws.eachRow((row) => {
      row.eachCell((cell) => {
        cell.numFmt = "@"; // TEXT format
      });
    });

    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "bulk_call_template.xlsx";
    a.click();
    URL.revokeObjectURL(url);
  };

  const [isRephrasing, setIsRephrasing] = useState(false);
  // ----------------------------
  // Parse uploaded file and update bulkEntries
  // ----------------------------
  const handleFile = async (file: File | null) => {
    if (!file) return;
    const filename = file.name.toLowerCase();

    try {
      // CSV parsing
      if (filename.endsWith(".csv")) {
        const text = await file.text();
        const rows = text.split(/\r\n|\n/).filter(Boolean);
        const parsed: BulkEntry[] = [];
        if (rows.length === 0) {
          push({ variant: "error", title: "Empty file", description: "Uploaded file contained no rows." });
          return;
        }

        // detect header row
        let startIdx = 0;
        const firstCols = rows[0].split(",").map((c) => c.trim().toLowerCase());
        const hasHeader = firstCols.some((c) => /phone|number|to_number|name|summary/.test(c));
        let phoneIdx = 0, nameIdx = 1, summaryIdx = 2;
        let employeeIdIdx: number | null = null;
        let companyIdIdx: number | null = null;
        let requestedIdIdx: number | null = null;
        if (hasHeader) {
          startIdx = 1;
          for (let i = 0; i < firstCols.length; i++) {
            const h = firstCols[i];
            if (/phone|number|to_number/.test(h)) phoneIdx = i;
            if (/^name$|lead|client/.test(h)) nameIdx = i;
            if (/summary|note|notes|context/.test(h)) summaryIdx = i;
            if (/employee_data_id/.test(h)) employeeIdIdx = i;
            if (/company_data_id/.test(h)) companyIdIdx = i;
            if (/requested_id/.test(h)) requestedIdIdx = i;
          }
        }

        for (let i = startIdx; i < rows.length; i++) {
          // naive CSV split (doesn't handle quoted commas); works for simple CSVs
          const cols = rows[i].split(",").map((c) => c.trim());
          const phone = (cols[phoneIdx] || "").replace(/\s+/g, ""); // Remove all spaces from phone number
          const name = cols[nameIdx] || "";
          const summary = cols[summaryIdx] || "";
          let requested_id: string | undefined = undefined;
          if (employeeIdIdx !== null && cols[employeeIdIdx]) requested_id = String(cols[employeeIdIdx]).trim();
          else if (companyIdIdx !== null && cols[companyIdIdx]) requested_id = String(cols[companyIdIdx]).trim();
          else if (requestedIdIdx !== null && cols[requestedIdIdx]) requested_id = String(cols[requestedIdIdx]).trim();
          if (phone) parsed.push({ to_number: phone, name: name || undefined, summary: summary || undefined, requested_id });
        }

        onBulkEntriesChange?.(parsed);
        onUseCsvChange?.(true as any);
        onDataSourceChange?.('file'); // Mark as file-sourced
        // Persist to localStorage
        try {
          localStorage.setItem('bulk_call_targets', JSON.stringify({ data: parsed }));
          console.log('[CallOptions] CSV data saved to localStorage');
        } catch (e) {
          console.warn('[CallOptions] Failed to save CSV to localStorage:', e);
        }
        push({ title: "File parsed", description: `${parsed.length} rows loaded from CSV.` });
        return;
      }

      // Excel parsing (.xlsx) using ExcelJS
      if (filename.endsWith(".xls")) {
        push({
          variant: "error",
          title: "Unsupported format",
          description: "Legacy .xls is not supported. Please save/export as .xlsx and try again.",
        });
        return;
      }

      // Only .xlsx files should reach this point; reject other unsupported types explicitly
      if (!filename.endsWith(".xlsx")) {
        push({
          variant: "error",
          title: "Unsupported file type",
          description: "Only .csv and .xlsx files are supported. Please upload a .csv or .xlsx file.",
        });
        return;
      }
      const arrayBuffer = await file.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(arrayBuffer);

      const worksheet = workbook.worksheets[0];
      if (!worksheet) {
        push({ variant: "error", title: "Invalid file", description: "No worksheet found" });
        return;
      }

      // Read headers
      const headers: string[] = [];
      worksheet.getRow(1).eachCell((cell, col) => {
        headers[col - 1] = String((cell.value as any) || "").toLowerCase().trim();
      });

      // Detect columns
      const phoneIdx = headers.findIndex((h) => /phone|number|to_number/.test(h));
      const nameIdx = headers.findIndex((h) => /name|lead|client/.test(h));
      const summaryIdx = headers.findIndex((h) => /summary|note|context/.test(h));
      const requestedIdx = headers.findIndex((h) => /requested_id|employee_data_id|company_data_id/.test(h));

      if (phoneIdx === -1) {
        push({
          variant: "error",
          title: "Invalid Excel",
          description: "Phone / Number column not found",
        });
        return;
      }

      const parsed: BulkEntry[] = [];

      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;

        const values = row.values as any[];
        const phone = String(values[phoneIdx + 1] || "")
          .replace(/\s+/g, "")
          .trim();
        if (!phone) return;

        const extra: Record<string, any> = {};
        headers.forEach((h, i) => {
          if (![phoneIdx, nameIdx, summaryIdx, requestedIdx].includes(i)) {
            extra[h] = values[i + 1];
          }
        });

        parsed.push({
          to_number: phone,
          name: nameIdx >= 0 ? String(values[nameIdx + 1] || "").trim() : undefined,
          summary: summaryIdx >= 0 ? String(values[summaryIdx + 1] || "").trim() : undefined,
          requested_id: requestedIdx >= 0 ? String(values[requestedIdx + 1] || "").trim() : undefined,
          _extra: Object.keys(extra).length ? extra : undefined,
        });
      });

      onBulkEntriesChange?.(parsed);
      onUseCsvChange?.(true as any);
      onDataSourceChange?.("file");

      try {
        localStorage.setItem("bulk_call_targets", JSON.stringify({ data: parsed }));
      } catch {}

      push({
        title: "Excel imported",
        description: `${parsed.length} rows loaded`,
      });
    } catch (err: any) {
      console.error("Failed to parse file:", err);
      push({ variant: "error", title: "Parse Error", description: "Unable to process uploaded file." });
    }
  };

  const BulkTable = () => {
    // Collect all extra column names dynamically
    const extraColumns = (() => {
      const set = new Set<string>();
      bulkEntries.forEach((row) => {
        Object.keys(row._extra || {}).forEach((k) => {
          const key = String(k || "").trim();
          if (key) set.add(key);
        });
      });
      return Array.from(set);
    })();

    return (
      <div className="w-full mx-0">
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-gray-700 block">Bulk List</label>
          <div className="text-xs text-gray-500">{bulkEntries.length} numbers</div>
        </div>

      {/* New UI row: Download template + Choose file */}
      <div className="flex gap-3 mb-3">
        <Button variant="outline" onClick={downloadTemplate} className="flex items-center gap-2">
          <Download className="w-4 h-4" /> Download Template
        </Button>

        {/* File chooser */}
        <label className="flex-1">
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              handleFile(f);
              e.currentTarget.value = "";
            }}
            className="hidden"
            id="bulk-file-input"
          />
          <div className="w-full h-10 flex items-center justify-center rounded-[10px] border border-dashed cursor-pointer text-sm text-gray-600">
            Choose file (xlsx / csv)
          </div>
        </label>
      </div>

      <div className="max-h-64 overflow-auto border rounded-[10px]">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              <th className="p-2"></th>
              <th className="text-left p-2 font-semibold">Phone</th>
              <th className="text-left p-2 font-semibold">Name</th>
              {/* Extra Excel columns */}
              {extraColumns.map((col) => (
                <th key={col} className="text-left p-2 font-semibold capitalize">
                  {col.replace(/_/g, " ")}
                </th>
              ))}
              <th className="p-2"></th>
            </tr>
          </thead>
          <tbody>
            {bulkEntries.slice(0, visibleCount).map((row, idx) => (
              <tr key={idx} className="border-t">
                {/* --- radio + edit before phone --- */}
                <td className="p-2 align-middle text-center">
                  <div className="flex items-center justify-center gap-2">
                    {/* <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="selectedSummary"
                        checked={selectedSummaryIndex === idx}
                        onChange={() => onRadioChange(idx)}
                        className="w-4 h-4"
                        aria-label={`Select summary from row ${idx}`}
                      />
                    </label> */}

                    <button
                      type="button"
                      aria-label={`View summary for row ${idx}`}
                      onClick={() => onRadioChange(idx)}
                      className={`inline-flex items-center justify-center h-8 w-8 rounded border hover:bg-gray-50
                        ${selectedSummaryIndex === idx ? "bg-gray-100 border-gray-400" : ""}`}
                    >
                      {selectedSummaryIndex === idx ? (
                        <Eye className="w-4 h-4" />
                      ) : (
                        <EyeOff className="w-4 h-4" />
                      )}
                    </button>

                    <button
                      type="button"
                      aria-label={`Edit summary for row ${idx}`}
                      onClick={() => openEditorFor(idx)}
                      className="inline-flex items-center justify-center h-8 w-8 rounded border hover:bg-gray-50"
                    >
                      <SquarePen className="w-4 h-4" />
                    </button>
                  </div>
                </td>

                <td className="p-2">
                  <Input
                    value={row.to_number}
                    onChange={(e) => {
                      const copy = [...bulkEntries];
                      // Normalize phone number - remove spaces when editing
                      copy[idx] = { ...copy[idx], to_number: e.target.value.replace(/\s+/g, "") };
                      onBulkEntriesChange?.(copy);
                    }}
                    placeholder="+1..."
                  />
                </td>

                <td className="p-2">
                  <Input
                    value={row.name || (row as any).company_name || ""}
                    onChange={(e) => {
                      const copy = [...bulkEntries];
                      copy[idx] = { ...copy[idx], name: e.target.value };
                      onBulkEntriesChange?.(copy);
                    }}
                    placeholder="Lead name (optional)"
                  />
                </td>

                {/* Extra Excel data */}
                {extraColumns.map((col) => (
                  <td key={col} className="p-2 text-gray-600 text-sm">
                    {String((row._extra as any)?.[col] ?? "")}
                  </td>
                ))}

                <td className="p-2 text-right">
                  <Button
                    variant="outline"
                    onClick={() => {
                      removeRow(idx);
                    }}
                  >
                    <Trash className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}

            {bulkEntries.length === 0 && (
              <tr>
                <td colSpan={4 + extraColumns.length} className="p-4 text-center text-gray-500">
                  No rows
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {bulkEntries.length > 5 && (
        <div className="mt-3">
          <Button
            variant="outline"
            className="w-full rounded-[10px]"
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? "View less" : `View more (${bulkEntries.length - 5} more)`}
          </Button>
        </div>
      )}

        <p className="text-xs text-gray-500 mt-2">These rows came from your “Resolve Phones” selection.</p>
      </div>
    );
  };

  return (
    <Card className="rounded-2xl transition-all p-6 bg-white border border-gray-100">
      <CardHeader className="backdrop-blur-xl bg-white/80 dark:bg-white/5 rounded-3xl px-6 py-3 border border-white/30 dark:border-white/10 mb-4 -mx-6 mt-0">
        <CardTitle className="text-lg font-bold text-gray-900 dark:text-gray-100">
          <Phone className="w-5 h-5 inline mr-2" /> Call Options
        </CardTitle>
        <CardDescription className="text-sm text-gray-600 dark:text-gray-400">Single or bulk mode</CardDescription>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="flex gap-3">
          <Button
            variant={!useCsv ? "default" : "outline"}
            className="flex-1 h-12 rounded-[10px]"
            onClick={() => onUseCsvChange(false)}
          >
            Single Call
          </Button>

          <Button
            variant={useCsv ? "default" : "outline"}
            className="flex-1 h-12 rounded-[10px]"
            onClick={() => onUseCsvChange(true)}
          >
            Bulk List
          </Button>
        </div>

        {!useCsv ? (
          // — Single Call UI (omitted for brevity) —
          <div className="space-y-3">
            <Input value={dial} onChange={(e) => onDialChange(e.target.value)} placeholder="Enter phone number" />
            <Input value={clientName} onChange={(e) => onClientNameChange(e.target.value)} placeholder="Lead name (optional)" />
          </div>
        ) : (
          <BulkTable />
        )}

        <Button
          disabled={loading || (!useCsv && !dial) || (useCsv && (!bulkEntries || bulkEntries.length === 0))}
          onClick={handleSubmit}
          className="w-full h-14 rounded-[10px] font-semibold shadow-sm mx-0"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Processing...
            </>
          ) : useCsv ? (
            <>
              <FileText className="w-5 h-5 mr-2" /> Start Bulk Calls
            </>
          ) : (
            <>
              <Phone className="w-5 h-5 mr-2" /> Initiate Call
            </>
          )}
        </Button>
      </CardContent>

      {/* Summary editor dialog */}
      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Summary</DialogTitle>
          </DialogHeader>

          <div className="grid gap-2">
            <label className="text-xs text-gray-600">Phone</label>
            <Input value={editorValues.to_number} onChange={(e) => setEditorValues((v) => ({ ...v, to_number: e.target.value.replace(/\s+/g, "") }))} />

            <label className="text-xs text-gray-600">Name</label>
            <Input value={editorValues.name || ""} onChange={(e) => setEditorValues((v) => ({ ...v, name: e.target.value }))} />

            <label className="text-xs text-gray-600">Identifier ({dataType === 'employee' ? 'employee_data_id' : 'company_data_id'})</label>
            <Input
              value={editorValues.requested_id || ""}
              onChange={(e) => setEditorValues((v) => ({ ...v, requested_id: e.target.value }))}
              placeholder={dataType === 'employee' ? 'e.g. 57da3722a6da985435dbab61' : 'e.g. company-id'}
            />

            <div className="relative">

              <textarea
                value={dataType === 'employee' ? (editorValues.company_sales_summary || "") : (editorValues.sales_summary || "")}
                onChange={(e) => setEditorValues((v) => (
                  dataType === 'employee'
                    ? { ...v, company_sales_summary: e.target.value, summary: e.target.value }
                    : { ...v, sales_summary: e.target.value, summary: e.target.value }
                ))}
                className="w-full h-24 p-3 pr-12 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Enter summary to save..."
              />


              <button
                type="button"
                title="Maya-Rephrase"
                onClick={async () => {
                  const activeText = (dataType === 'employee'
                    ? (editorValues.company_sales_summary || editorValues.summary || '')
                    : (editorValues.sales_summary || editorValues.summary || '')).trim();
                  const text = activeText;
                  if (!text) return;

                  try {
                    setIsRephrasing(true);

                    const res = await fetch(
                      `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/gemini/generate-phrase`,
                      {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ context: text }),
                      }
                    );

                    const data = await res.json();
                    if (data.success) {
                      const generated = data.generatedText as string;
                      setEditorValues((v) => (
                        dataType === 'employee'
                          ? { ...v, company_sales_summary: generated, summary: generated }
                          : { ...v, sales_summary: generated, summary: generated }
                      ));
                    } else {
                      console.error("Gemini Error:", data.error);
                    }
                  } catch (err) {
                    console.error("Rephrase Failed:", err);
                  } finally {
                    setIsRephrasing(false);
                  }
                }}
                className="absolute right-2 top-2 p-2 text-gray-500 hover:text-gray-700"
              >
                {isRephrasing ? (
                  <span className="animate-spin text-gray-600">⏳</span>
                ) : (
                  <>✨</>
                )}
              </button>
            </div>
          </div>

          <DialogActions>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setEditorOpen(false)}>Cancel</Button>
              <Button onClick={saveEditor} disabled={savingSummary}>{savingSummary ? 'Saving...' : 'Save & Send'}</Button>
            </div>
          </DialogActions>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

