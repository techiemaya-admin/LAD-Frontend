# Campaigns Feature - Complete Folder Structure

## 📁 Latest Modified Files Structure

```
LAD-Frontend-develop/
├── sdk/                                    [NEW - SDK Layer]
│   └── features/
│       └── campaigns/                      [✅ NEWLY CREATED]
│           ├── api.ts                      [✅ NEW - All API functions]
│           ├── types.ts                    [✅ NEW - TypeScript types]
│           ├── index.ts                    [✅ NEW - Public exports]
│           └── hooks/                      [✅ NEW - React hooks]
│               ├── useCampaigns.ts         [✅ NEW - List campaigns hook]
│               ├── useCampaign.ts          [✅ NEW - Single campaign hook]
│               ├── useCampaignStats.ts     [✅ NEW - Stats hook]
│               ├── useCampaignAnalytics.ts [✅ NEW - Analytics hook]
│               └── useCampaignLeads.ts     [✅ NEW - Leads hook]
│
└── web/                                    [MODIFIED - Web Layer]
    └── src/
        ├── app/
        │   └── campaigns/                  [✅ REFACTORED]
        │       ├── page.tsx                 [✅ COMPLIANT - Thin wrapper]
        │       └── [id]/
        │           ├── page.tsx             [✅ REFACTORED - Uses SDK hooks]
        │           └── analytics/
        │               ├── page.tsx         [✅ REFACTORED - Uses SDK hooks]
        │               └── leads/
        │                   └── page.tsx     [✅ REFACTORED - Uses SDK hooks]
        │
        └── features/
            └── campaigns/                   [✅ REFACTORED]
                └── components/
                    ├── CampaignsList.tsx    [✅ REFACTORED - Uses SDK hooks]
                    ├── CampaignStatsCards.tsx [✅ NEW - Split from CampaignsList]
                    ├── CampaignFilters.tsx   [✅ NEW - Split from CampaignsList]
                    ├── CampaignsTable.tsx    [✅ NEW - Split from CampaignsList]
                    ├── CampaignActionsMenu.tsx [✅ NEW - Split from CampaignsList]
                    ├── CreateCampaignDialog.tsx [✅ NEW - Split from CampaignsList]
                    ├── campaignUtils.tsx     [✅ RENAMED - .ts → .tsx (JSX support)]
                    ├── CampaignBuilder.tsx   [EXISTING - Campaign builder]
                    ├── FlowCanvas.tsx        [EXISTING - Flow editor]
                    ├── StepLibrary.tsx       [EXISTING - Step library]
                    ├── StepSettings.tsx      [EXISTING - Step settings]
                    ├── EmployeeCard.tsx      [EXISTING - Employee card]
                    ├── ProfileSummaryDialog.tsx [EXISTING - Profile dialog]
                    └── nodes/
                        └── CustomNode.tsx    [EXISTING - Custom node]
```

## 📊 File Status Summary

### ✅ NEWLY CREATED (SDK Layer)
- `sdk/features/campaigns/api.ts` - All API functions
- `sdk/features/campaigns/types.ts` - TypeScript types
- `sdk/features/campaigns/index.ts` - Public exports
- `sdk/features/campaigns/hooks/useCampaigns.ts` - Campaigns list hook
- `sdk/features/campaigns/hooks/useCampaign.ts` - Single campaign hook
- `sdk/features/campaigns/hooks/useCampaignStats.ts` - Stats hook
- `sdk/features/campaigns/hooks/useCampaignAnalytics.ts` - Analytics hook
- `sdk/features/campaigns/hooks/useCampaignLeads.ts` - Leads hook

### ✅ NEWLY CREATED (Web Components - Split from CampaignsList)
- `web/src/features/campaigns/components/CampaignStatsCards.tsx` - Stats cards
- `web/src/features/campaigns/components/CampaignFilters.tsx` - Search/filter
- `web/src/features/campaigns/components/CampaignsTable.tsx` - Campaigns table
- `web/src/features/campaigns/components/CampaignActionsMenu.tsx` - Actions menu
- `web/src/features/campaigns/components/CreateCampaignDialog.tsx` - Create dialog

### ✅ REFACTORED (Now Uses SDK)
- `web/src/features/campaigns/components/CampaignsList.tsx` - Main list component
- `web/src/app/campaigns/[id]/page.tsx` - Campaign detail page
- `web/src/app/campaigns/[id]/analytics/page.tsx` - Analytics page
- `web/src/app/campaigns/[id]/analytics/leads/page.tsx` - Leads page

### ✅ RENAMED
- `campaignUtils.ts` → `campaignUtils.tsx` (Added JSX support)

### ✅ COMPLIANT (No Changes Needed)
- `web/src/app/campaigns/page.tsx` - Already a thin wrapper

## 📈 Architecture Compliance

### ✅ SDK Layer (Framework-Independent)
```
sdk/features/campaigns/
├── api.ts              ✅ No Next.js imports
├── types.ts            ✅ Pure TypeScript types
├── hooks/              ✅ React hooks only (no JSX)
└── index.ts            ✅ Public exports only
```

### ✅ Web Layer (Next.js Specific)
```
web/src/
├── app/campaigns/      ✅ Thin page wrappers
└── features/campaigns/ ✅ UI components using SDK
```

## 🔄 Data Flow

```
Backend API
    ↓
SDK Layer (api.ts)
    ↓
SDK Hooks (hooks/*.ts)
    ↓
Web Components (components/*.tsx)
    ↓
Pages (app/campaigns/*.tsx)
    ↓
Browser UI
```

## 📝 File Size Compliance

All files are **< 400 lines** (LAD Architecture Rule):

| File | Lines | Status |
|------|-------|--------|
| CampaignsList.tsx | 201 | ✅ |
| CampaignStatsCards.tsx | 187 | ✅ |
| CampaignsTable.tsx | 135 | ✅ |
| CampaignFilters.tsx | 57 | ✅ |
| CampaignActionsMenu.tsx | 70 | ✅ |
| CreateCampaignDialog.tsx | 69 | ✅ |
| campaignUtils.tsx | 137 | ✅ |
| api.ts | ~120 | ✅ |
| All hooks | < 100 each | ✅ |

## 🎯 Key Changes Summary

1. **Created SDK Layer** - All business logic moved to SDK
2. **Split Large Component** - CampaignsList (728 lines) → 6 smaller components
3. **Refactored Pages** - All pages now use SDK hooks instead of direct API calls
4. **Fixed File Extension** - campaignUtils.ts → .tsx (JSX support)
5. **Type Safety** - All types centralized in SDK types.ts

## 🚀 Import Patterns

### SDK Usage (Web Layer)
```typescript
// ✅ CORRECT - Import from SDK
import { useCampaigns, useCampaignStats, type Campaign } from '@/features/campaigns';

// ❌ WRONG - Direct API calls
import { apiGet } from '@/lib/api';
```

### Component Imports
```typescript
// ✅ CORRECT - Import from same feature
import CampaignStatsCards from './CampaignStatsCards';
import { getStatusColor } from './campaignUtils';
```

