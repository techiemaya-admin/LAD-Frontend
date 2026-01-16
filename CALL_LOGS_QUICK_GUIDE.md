# Quick Integration Guide - Call Logs Enhancements

## What's New

### 1. Sorting
Click on **"Started"** or **"Duration"** column headers to sort. Click again to reverse direction.

**Sortable columns:**
- Started (date/time)
- Duration (seconds)

**Visual indicator:**
- ⬆️ Ascending
- ⬇️ Descending
- ⬆️⬇️ Clickable (not sorted)

---

### 2. Download Recordings
Each row has a **⬇️ Download button** in the Actions column.

**Features:**
- Disabled (grayed out) if no recording available
- Filename auto-generated: `{lead_name}_{date}_{time}.wav`
- Shows error message if download fails
- Loading state during download

**Example filenames:**
- `acme_corp_2025-01-15_14-30-45.wav`
- `john_doe_2025-01-14_09-15-20.wav`

---

### 3. Lead Tags
New **"Tags"** column shows lead engagement level.

**Color coding:**
- 🔴 **Hot** (Red) - Calls > 60 seconds (engaged conversation)
- 🟠 **Warm** (Orange) - Calls 10-60 seconds (brief interaction)  
- 🔵 **Cold** (Blue) - Failed/short/no engagement

---

### 4. Smart Pagination
- Sorting preserved when changing pages
- Page resets to 1 when you change filters
- Handles 10k+ call logs smoothly

---

## Code Usage Examples

### Access Sorting State
```tsx
const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);

// Sort state is passed via onSortChange callback
<CallLogsTable
  onSortChange={(newSort) => setSortConfig(newSort)}
/>
```

### Download Recording Programmatically
```tsx
import { generateRecordingFilename, downloadRecording } from '@/utils/recordingDownload';

const filename = generateRecordingFilename('John Doe', '2025-01-15T14:30:45Z');
await downloadRecording(recordingUrl, filename);
```

### Categorize Leads
```tsx
import { categorizeLead, getTagConfig } from '@/utils/leadCategorization';

const tag = categorizeLead({
  status: 'completed',
  duration: 120,  // 2 minutes
  type: 'Outbound'
});

const config = getTagConfig(tag); // { label: 'Hot', bgColor: 'bg-red-100', ... }
```

### Custom Sorting
```tsx
import { sortCallLogs, toggleSortDirection } from '@/utils/sortingUtils';

const sorted = sortCallLogs(callLogs, {
  field: 'duration',
  direction: 'desc'
});

const newSort = toggleSortDirection(currentSort, 'startedAt');
```

---

## Configuration

### Change Tag Colors
Edit `src/utils/leadCategorization.ts`:
```typescript
const TAG_CONFIGS: Record<LeadTag, LeadTagConfig> = {
  hot: {
    label: "Hot",
    bgColor: "bg-red-100",      // ← Change Tailwind class
    textColor: "text-red-700",
    borderColor: "border-red-300",
  },
  // ... other tags
};
```

### Adjust Tag Thresholds
Edit `src/utils/leadCategorization.ts` - `categorizeLead` function:
```typescript
// Change from >60 to >120 (2 minutes)
if (duration > 120) return "hot";
if (duration >= 30) return "warm";  // Changed from 10 to 30
return "cold";
```

### Support New Recording URL Fields
Edit `src/app/call-logs/page.tsx` - in the API response mapping:
```typescript
const recordingUrl = item.signed_recording_url 
  || item.recording_url 
  || item.call_recording_url
  || item.your_new_field_name;  // ← Add here
```

---

## API Requirements

### Recording URLs
The backend must include at least one of:
- `signed_recording_url`
- `recording_url`
- `call_recording_url`

Example API response:
```json
{
  "logs": [
    {
      "call_log_id": "abc123",
      "status": "completed",
      "duration_seconds": 125,
      "signed_recording_url": "https://storage.com/recordings/abc123.wav",
      "started_at": "2025-01-15T14:30:45Z"
    }
  ]
}
```

---

## Performance Notes

✅ **Sorting** - Applied once to full filtered set (efficient even for 10k+ logs)
✅ **Pagination** - Only current page rendered (10-100 rows visible)
✅ **Download** - Non-blocking, doesn't affect table updates
✅ **Tags** - Computed on render, memoized for efficiency

---

## Troubleshooting

**Q: Download button is disabled/grayed out**
- A: No recording URL available in backend response. Check API response includes `signed_recording_url`, `recording_url`, or `call_recording_url`.

**Q: Sorting not working**
- A: Check that `onSortChange` callback is properly connected to `CallLogsTable`. Verify `sortedFiltered` memo is being used.

**Q: Tags all show "Cold"**
- A: Check API response includes `status` and `duration_seconds` fields. Verify categorization logic in `categorizeLead()`.

**Q: Filename shows "recording_2025-01-15..." instead of lead name**
- A: Lead name is empty/missing in data. Check `lead_first_name`/`lead_last_name` in API response.

---

## Related Components

- **CallLogsHeader** - Filter/search controls
- **CallLogsTable** - Main table with sorting/tags/download
- **CallLogModal** - Detail view (opened on row click)
- **Pagination** - Page navigation
- **StatusBadge** - Call status indicator

---

## Testing

Run type checking:
```bash
npm run type-check
```

Run linting:
```bash
npm run lint
```

No new dependencies added - all utilities are plain TypeScript!

---

## Files Modified

1. `src/components/CallLogsTable.tsx` - Added sorting, tags, download UI
2. `src/app/call-logs/page.tsx` - Added sort state, recording URLs
3. `src/utils/sortingUtils.ts` - NEW: Sorting logic
4. `src/utils/leadCategorization.ts` - NEW: Lead tagging
5. `src/utils/recordingDownload.ts` - NEW: Download helpers

---

## Rollback (if needed)

Each file has clear sections:
- Comments mark new functionality
- Old code preserved in structure
- No destructive changes to existing features

If you need to remove a feature:
1. Remove the column header (`<SortableHeader>`)
2. Remove the cell content in `renderCallRow`
3. Remove the state setter (`onSortChange`)
4. Remove the utility imports

No cascading failures - each feature is independent.
