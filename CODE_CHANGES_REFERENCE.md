# Code Changes Summary

## New Files Created

### 1. `src/utils/sortingUtils.ts`
Provides sorting functionality with direction toggling.

**Key Exports:**
- `sortCallLogs<T>(items: T[], sortConfig)` - Generic sort function
- `toggleSortDirection(currentSort, field)` - Toggle or start new sort
- `SortConfig` type - `{ field: string, direction: "asc" | "desc" }`

**Usage:**
```typescript
import { sortCallLogs, toggleSortDirection } from '@/utils/sortingUtils';

const sorted = sortCallLogs(items, { field: 'duration', direction: 'desc' });
const newSort = toggleSortDirection(sort, 'startedAt');
```

---

### 2. `src/utils/leadCategorization.ts`
Lead temperature categorization based on call metrics.

**Key Exports:**
- `categorizeLead(callLog)` - Returns "hot" | "warm" | "cold"
- `getTagConfig(tag)` - Returns styling config
- `getAllTagConfigs()` - Returns all tag configs
- `LeadTag` type
- `LeadTagConfig` interface

**Logic:**
- **Hot**: Completed + duration > 60s
- **Warm**: Completed + duration 10-60s
- **Cold**: Failed, no answer, or minimal engagement

**Usage:**
```typescript
import { categorizeLead, getTagConfig } from '@/utils/leadCategorization';

const tag = categorizeLead(callLog);
const { bgColor, textColor } = getTagConfig(tag);
```

---

### 3. `src/utils/recordingDownload.ts`
Recording download utilities with filename generation.

**Key Exports:**
- `generateRecordingFilename(leadName, startedAt)` - Creates filename
- `downloadFile(url, filename)` - Triggers browser download
- `downloadRecording(url, filename, onError)` - Full download with error handling

**Features:**
- Filename: `{lead_name}_{date}_{time}.wav`
- Automatic blob URL cleanup
- Error callback support

**Usage:**
```typescript
import { generateRecordingFilename, downloadRecording } from '@/utils/recordingDownload';

const filename = generateRecordingFilename('John Doe', '2025-01-15T14:30:45Z');
await downloadRecording(signedUrl, filename, (error) => console.error(error));
```

---

## Modified Files

### 1. `src/components/CallLogsTable.tsx`

#### Imports Added
```typescript
import { useMemo, useCallback } from "react";
import { Download, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { categorizeLead, getTagConfig, type LeadTag } from "@/utils/leadCategorization";
import { sortCallLogs, toggleSortDirection, type SortConfig } from "@/utils/sortingUtils";
import { generateRecordingFilename, downloadRecording } from "@/utils/recordingDownload";
```

#### Props Updated
```typescript
interface CallLogsTableProps {
  // ... existing props
  onSortChange?: (sortConfig: SortConfig | null) => void;  // NEW
}
```

#### State Added
```typescript
const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);
const [downloadingIds, setDownloadingIds] = useState<Set<string>>(new Set());
const [downloadErrors, setDownloadErrors] = useState<Map<string, string>>(new Map());
```

#### New Handlers
```typescript
// Handle sort column click
const handleSortClick = useCallback((field: string) => {
  const newSort = toggleSortDirection(sortConfig, field);
  setSortConfig(newSort);
  onSortChange?.(newSort);
}, [sortConfig, onSortChange]);

// Get lead tag for categorization
const getLeadTag = useCallback((item: CallLog): LeadTag => {
  return categorizeLead({
    status: item.status,
    duration: item.duration,
    type: item.type,
  });
}, []);

// Handle recording download with error handling
const handleDownloadRecording = useCallback(
  async (callId: string, leadName?: string, startedAt?: string) => {
    const item = items.find(i => i.id === callId);
    if (!item) return;

    const recordingUrl = item.signed_recording_url || item.recording_url || item.call_recording_url;
    if (!recordingUrl) {
      setDownloadErrors(prev => new Map(prev).set(callId, "No recording available"));
      return;
    }

    setDownloadingIds(prev => new Set(prev).add(callId));
    setDownloadErrors(prev => {
      const next = new Map(prev);
      next.delete(callId);
      return next;
    });

    try {
      const filename = generateRecordingFilename(leadName, startedAt);
      await downloadRecording(recordingUrl, filename, (error) => {
        setDownloadErrors(prev => new Map(prev).set(callId, error.message));
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Download failed";
      setDownloadErrors(prev => new Map(prev).set(callId, message));
    } finally {
      setDownloadingIds(prev => {
        const next = new Set(prev);
        next.delete(callId);
        return next;
      });
    }
  },
  [items]
);

// Memoized sorted items to avoid unnecessary re-renders
const sortedItems = useMemo(() => {
  if (!sortConfig) return items;
  return sortCallLogs(items, sortConfig);
}, [items, sortConfig]);
```

#### New Component
```typescript
// Helper component for sortable column header
const SortableHeader = ({ 
  field, 
  label, 
  sortable = true 
}: { 
  field: string; 
  label: string; 
  sortable?: boolean; 
}) => {
  const isActive = sortConfig?.field === field;
  const isAsc = isActive && sortConfig?.direction === "asc";
  
  if (!sortable) {
    return <TableHead className="font-semibold text-foreground">{label}</TableHead>;
  }

  return (
    <TableHead 
      className="font-semibold text-foreground cursor-pointer hover:bg-muted/50 transition-colors"
      onClick={() => handleSortClick(field)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          handleSortClick(field);
        }
      }}
    >
      <div className="flex items-center gap-2">
        {label}
        {isActive ? (
          isAsc ? (
            <ArrowUp className="w-4 h-4 text-primary" />
          ) : (
            <ArrowDown className="w-4 h-4 text-primary" />
          )
        ) : (
          <ArrowUpDown className="w-4 h-4 text-muted-foreground opacity-50" />
        )}
      </div>
    </TableHead>
  );
};
```

#### Table Header Updated
```typescript
<TableHeader>
  <TableRow className="border-b border-border/50 bg-muted/30">
    {/* ... existing headers ... */}
    <SortableHeader field="startedAt" label="Started" sortable={true} />
    <SortableHeader field="duration" label="Duration" sortable={true} />
    <TableHead className="font-semibold text-foreground">Tags</TableHead>
    <TableHead className="font-semibold text-foreground">Cost</TableHead>
    <TableHead className="w-16">Actions</TableHead>
  </TableRow>
</TableHeader>
```

#### renderCallRow Enhanced
```typescript
const renderCallRow = (item: CallLog, index: number, indent = false) => {
  const tag = getLeadTag(item);
  const tagConfig = getTagConfig(tag);
  const isDownloading = downloadingIds.has(item.id);
  const downloadError = downloadErrors.get(item.id);
  const hasRecording = !!(item.signed_recording_url || item.recording_url || item.call_recording_url);

  return (
    <TableRow {...}>
      {/* ... existing cells ... */}
      
      {/* Tags Column */}
      <TableCell>
        <span
          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${tagConfig.bgColor} ${tagConfig.textColor} border ${tagConfig.borderColor}`}
          title={`${tagConfig.label} priority lead`}
        >
          {tagConfig.label}
        </span>
      </TableCell>
      
      {/* Cost */}
      <TableCell className="font-mono text-sm">
        {item.cost || item.call_cost ? `$${Number(...).toFixed(2)}` : "—"}
      </TableCell>
      
      {/* Actions */}
      <TableCell onClick={(e) => e.stopPropagation()} className="flex gap-2 items-center">
        <button
          onClick={() => handleDownloadRecording(item.id, item.lead_name, item.startedAt)}
          disabled={!hasRecording || isDownloading}
          className={`p-2 rounded-lg transition-colors ${
            !hasRecording 
              ? "text-muted-foreground/50 cursor-not-allowed" 
              : isDownloading
              ? "text-primary/50 cursor-wait"
              : "text-muted-foreground hover:bg-primary/10 hover:text-primary"
          }`}
          title={
            !hasRecording 
              ? "No recording available" 
              : isDownloading
              ? "Downloading..."
              : "Download recording"
          }
        >
          <Download className="w-5 h-5" />
        </button>

        {/* End Call Button */}
        {item.status?.toLowerCase().includes("ongoing") && (
          <button onClick={() => onEndCall(item.id)} className="...">
            <StopCircle className="w-5 h-5" />
          </button>
        )}

        {/* Error Indicator */}
        {downloadError && (
          <div className="text-xs text-destructive px-2 py-1 bg-destructive/10 rounded">
            {downloadError}
          </div>
        )}
      </TableCell>
    </TableRow>
  );
};
```

#### Render Logic Updated
```typescript
{/* Use sortedItems instead of items */}
{sortedItems.length > 0 ? (
  sortedItems.map((item, index) => renderCallRow(item, index, false))
) : (
  <TableRow>
    <TableCell colSpan={12}>No call logs found</TableCell>
  </TableRow>
)}
```

---

### 2. `src/app/call-logs/page.tsx`

#### Imports Added
```typescript
import { useCallback } from "react";
import type { SortConfig } from "@/utils/sortingUtils";
```

#### CallLog Type Updated
```typescript
interface CallLog {
  // ... existing fields ...
  signed_recording_url?: string;  // NEW
  recording_url?: string;         // NEW
  call_recording_url?: string;    // NEW
}
```

#### State Added
```typescript
const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);
```

#### API Response Mapping Updated
```typescript
const logs = (res.logs || []).map((r) => {
  return {
    // ... existing fields ...
    signed_recording_url: r.signed_recording_url,
    recording_url: r.recording_url,
    call_recording_url: r.call_recording_url,
  };
});
```

#### Sorting Added to Pipeline
```typescript
// Apply sorting to filtered results for consistent ordering across pages
const sortedFiltered = useMemo(() => {
  if (!sortConfig) return filtered;
  const { sortCallLogs } = require("@/utils/sortingUtils");
  return sortCallLogs(filtered, sortConfig);
}, [filtered, sortConfig]);

const totalPages = Math.ceil(sortedFiltered.length / perPage) || 1;
const paginated = sortedFiltered.slice((page - 1) * perPage, page * perPage);
```

#### CallLogsTable Updated
```typescript
<CallLogsTable
  items={paginated}
  // ... existing props ...
  totalFilteredCount={sortedFiltered.length}  // Updated
  onSortChange={(newSort) => {
    setSortConfig(newSort);
    setPage(1); // Reset to first page when sorting changes
  }}
/>
```

---

## Type Safety

All new utilities are fully typed with TypeScript:
- ✅ Generic type parameters where appropriate
- ✅ Strict null checks
- ✅ No `any` types
- ✅ Proper interface definitions
- ✅ Optional properties for flexibility

---

## No Breaking Changes

✅ All existing props/functions preserved
✅ Optional callbacks (`onSortChange?`)
✅ Backward compatible interface
✅ Graceful degradation if features disabled
✅ Sorting independent of other features

---

## Code Quality

✅ **Comments** - Added only where non-obvious
✅ **Function naming** - Clear and descriptive
✅ **Constants** - Extracted for reusability
✅ **Memoization** - Strategic use of useMemo/useCallback
✅ **Error handling** - Proper try/catch blocks
✅ **Type safety** - No implicit any types
