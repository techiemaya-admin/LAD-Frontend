# Frontend Architecture - Complete Structure

## 📁 Full Directory Structure

```
LAD/frontend/
│
├── ARCHITECTURE_FIXED.md              # This file
├── README-DEPLOYMENT.md               # Deployment documentation
│
├── sdk/                               ✅ Framework-Agnostic Feature SDKs
│   ├── package.json                   # @LAD/frontend-features
│   ├── tsconfig.json                  # TypeScript config
│   ├── vitest.config.ts              # Test configuration
│   ├── featureFlags.tsx              # Feature flags component
│   │
│   ├── features/
│   │   │
│   │   ├── ai-icp-assistant/         # AI ICP Assistant Feature
│   │   │   ├── index.ts              # Public exports
│   │   │   ├── types.ts              # TypeScript interfaces
│   │   │   ├── README.md             # Feature documentation
│   │   │   ├── aiICPAssistantService.ts
│   │   │   └── services/
│   │   │       └── mayaAIService.ts
│   │   │
│   │   ├── apollo-leads/             # Lead Generation Feature
│   │   │   ├── index.ts
│   │   │   ├── manifest.json
│   │   │   ├── README.md
│   │   │   ├── ApolloLeadsSearch.tsx
│   │   │   ├── useApolloLeads.ts
│   │   │   ├── services/
│   │   │   │   ├── apolloLeadsService.ts
│   │   │   │   └── apolloPhoneService.ts
│   │   │   └── types/
│   │   │       └── apollo.types.ts
│   │   │
│   │   ├── campaigns/                # Campaign Management Feature
│   │   │   ├── index.ts
│   │   │   ├── types.ts
│   │   │   ├── types/index.ts
│   │   │   ├── api.ts
│   │   │   ├── hooks.ts
│   │   │   ├── README.md
│   │   │   ├── SANDBOX_SETUP.md
│   │   │   ├── components/
│   │   │   │   ├── CampaignBuilder.tsx
│   │   │   │   ├── CampaignList.tsx
│   │   │   │   ├── CompanyCard.tsx
│   │   │   │   ├── EmployeeCard.tsx
│   │   │   │   ├── FlowCanvas.tsx
│   │   │   │   ├── LeadCard.tsx
│   │   │   │   ├── ProfileSummaryDialog.tsx
│   │   │   │   ├── StepLibrary.tsx
│   │   │   │   ├── StepSettings.tsx
│   │   │   │   └── nodes/
│   │   │   │       └── CustomNode.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useCampaign.ts
│   │   │   │   ├── useCampaignLeads.ts
│   │   │   │   ├── useCampaigns.ts
│   │   │   │   ├── useCampaignStats.ts
│   │   │   │   └── useCampaignSteps.ts
│   │   │   ├── services/
│   │   │   │   └── campaignService.ts
│   │   │   └── __tests__/
│   │   │       ├── api.test.ts
│   │   │       ├── hooks.test.ts
│   │   │       └── setup.ts
│   │   │
│   │   ├── deals-pipeline/           # Pipeline Management Feature
│   │   │   ├── index.ts
│   │   │   ├── types.ts
│   │   │   ├── types/index.ts
│   │   │   ├── components/
│   │   │   │   ├── index.ts
│   │   │   │   ├── AddStageDialog.tsx
│   │   │   │   ├── CreateCardDialog.tsx
│   │   │   │   ├── EditLeadDialog.tsx
│   │   │   │   ├── EnhancedAddStageDialog.tsx
│   │   │   │   ├── LeadDetailsDialog.tsx
│   │   │   │   ├── PipelineBoard.tsx
│   │   │   │   ├── PipelineBoardHeader.tsx
│   │   │   │   ├── PipelineBoardSettings.tsx
│   │   │   │   ├── PipelineBoardToolbar.tsx
│   │   │   │   ├── PipelineBoardToolbar_old.tsx
│   │   │   │   ├── PipelineFilterDialog.tsx
│   │   │   │   ├── PipelineKanbanView.tsx
│   │   │   │   ├── PipelineLeadCard.tsx
│   │   │   │   ├── PipelineLeadCard.jsx
│   │   │   │   ├── PipelineListView.tsx
│   │   │   │   ├── PipelineSortDialog.tsx
│   │   │   │   ├── PipelineStageColumn.tsx
│   │   │   │   ├── SlotBasedPipelineBoard.tsx
│   │   │   │   ├── config/
│   │   │   │   │   └── pipelineConfig.ts
│   │   │   │   ├── leads/
│   │   │   │   │   └── types.ts
│   │   │   │   └── slots/
│   │   │   │       ├── CounsellorScheduleSlot.tsx
│   │   │   │       ├── EducationStudentSlot.tsx
│   │   │   │       └── LeadDetailsSlot.tsx
│   │   │   ├── services/
│   │   │   │   ├── api.ts
│   │   │   │   └── pipelineService.ts
│   │   │   ├── store/
│   │   │   │   └── slices/
│   │   │   │       ├── masterDataSlice.ts
│   │   │   │       └── pipelineSlice.ts
│   │   │   └── utils/
│   │   │       ├── fieldMappings.ts
│   │   │       ├── statusMappings.ts
│   │   │       └── storage.ts
│   │   │
│   │   └── voice-agent/              # Voice Agent Feature
│   │       ├── index.ts
│   │       ├── types.ts
│   │       └── services/
│   │           └── voiceAgentService.ts
│   │
│   ├── shared/                       # Shared SDK utilities
│   │   └── apiClient.ts
│   │
│   └── docs/
│       ├── FEATURE_REPOSITORY_RULES.md
│       ├── IMPLEMENTATION_CAMPAIGNS.md
│       ├── REFACTORING_HOOKS_SPLIT.md
│       └── SDK_TEMPLATE.md
│
└── web/                              ✅ Next.js Application Layer
    ├── package.json                  # Web app dependencies
    ├── tsconfig.json                 # TypeScript config
    ├── next-env.d.ts                 # Next.js types
    ├── middleware.ts                 # Next.js middleware
    ├── tailwind.config.js            # Tailwind CSS config
    ├── components.json               # Shadcn/ui config
    ├── README.md
    ├── REFACTORING_COMPLETE.md
    │
    ├── src/
    │   ├── middleware.ts             # Auth middleware
    │   │
    │   ├── app/                      # Next.js 13+ App Router
    │   │   ├── page.tsx              # Home page
    │   │   ├── layout.tsx            # Root layout
    │   │   ├── providers.tsx         # Context providers
    │   │   │
    │   │   ├── api/                  # API Routes (Backend proxy)
    │   │   │   ├── [feature]/[...path]/
    │   │   │   │   └── route.ts      # Dynamic feature proxy
    │   │   │   ├── auth/
    │   │   │   │   ├── login/route.ts
    │   │   │   │   ├── logout/route.ts
    │   │   │   │   ├── me/route.ts
    │   │   │   │   └── resolve-login/route.ts
    │   │   │   ├── calendar/google/
    │   │   │   │   ├── disconnect/route.ts
    │   │   │   │   ├── start/route.ts
    │   │   │   │   └── status/route.ts
    │   │   │   ├── feature-flags/route.ts
    │   │   │   ├── gemini/generate-phrase/route.ts
    │   │   │   ├── health/route.ts
    │   │   │   ├── metrics/route.ts
    │   │   │   ├── onboarding/gemini/chat/route.ts
    │   │   │   ├── recording-proxy/route.ts
    │   │   │   ├── settings/route.ts
    │   │   │   ├── stripe/
    │   │   │   │   ├── config/route.ts
    │   │   │   │   └── subscription-plans/route.ts
    │   │   │   ├── users/
    │   │   │   │   ├── [userId]/
    │   │   │   │   │   ├── capabilities/route.ts
    │   │   │   │   │   ├── role/route.ts
    │   │   │   │   │   └── route.ts
    │   │   │   │   └── route.ts
    │   │   │   ├── webhooks/route.ts
    │   │   │   └── utils/
    │   │   │       └── backend.ts    # Backend URL utility
    │   │   │
    │   │   ├── auth/sync/page.tsx
    │   │   ├── billing/page.tsx
    │   │   ├── call-logs/page.tsx
    │   │   ├── campaigns/
    │   │   │   ├── page.tsx
    │   │   │   └── [id]/
    │   │   │       ├── page.tsx
    │   │   │       └── analytics/
    │   │   │           ├── page.tsx
    │   │   │           └── leads/page.tsx
    │   │   ├── dashboard/page.tsx
    │   │   ├── login/page.tsx
    │   │   ├── make-call/page.tsx
    │   │   ├── onboarding/
    │   │   │   ├── page.tsx
    │   │   │   ├── OnboardingLayout.tsx
    │   │   │   ├── Onboarding3Panel.tsx
    │   │   │   ├── Screen*.tsx       # Multiple onboarding screens
    │   │   │   └── SplitScreenOnboarding.tsx
    │   │   ├── payment-success/page.tsx
    │   │   ├── phone-numbers/page.tsx
    │   │   ├── pipeline/
    │   │   │   ├── page.tsx
    │   │   │   └── loading.tsx
    │   │   ├── pricing/page.tsx
    │   │   ├── settings/
    │   │   │   ├── page.tsx
    │   │   │   └── linkedin/callback/page.tsx
    │   │   ├── wallet/
    │   │   │   ├── page.tsx
    │   │   │   ├── cancel/page.tsx
    │   │   │   └── success/page.tsx
    │   │   └── components/ui/        # Page-level UI components
    │   │       └── *.tsx
    │   │
    │   ├── components/               # Shared Components
    │   │   ├── 3d/                   # 3D components
    │   │   │   ├── Feature3DCard.tsx
    │   │   │   ├── FloatingCommunicationOrbs.tsx
    │   │   │   ├── LADLogo3D.tsx
    │   │   │   └── index.ts
    │   │   ├── auth/
    │   │   │   ├── Login.tsx
    │   │   │   └── PrivateRoute.tsx
    │   │   ├── clients/
    │   │   │   ├── app-shell.tsx
    │   │   │   └── content-gate.tsx
    │   │   ├── common/
    │   │   │   ├── AttachmentPreview.tsx
    │   │   │   ├── GlobalSnackbar.jsx
    │   │   │   └── StyledComponents.jsx
    │   │   ├── loader/
    │   │   │   └── index.tsx
    │   │   ├── onboarding/
    │   │   │   ├── ChatInputClaude.tsx
    │   │   │   ├── ChatMessageBubble.tsx
    │   │   │   ├── ChatPanel.tsx
    │   │   │   ├── EditorPanel.tsx
    │   │   │   ├── GuidedFlowPanel.tsx
    │   │   │   ├── OnboardingStepLibrary.tsx
    │   │   │   ├── RequirementsCollection.tsx
    │   │   │   ├── SearchResultsCards.tsx
    │   │   │   ├── StepLayout.tsx
    │   │   │   ├── WorkflowLibrary.tsx
    │   │   │   ├── WorkflowPreview.tsx
    │   │   │   └── WorkflowPreviewPanel.tsx
    │   │   ├── providers/
    │   │   │   └── loading-provider.tsx
    │   │   ├── settings/
    │   │   │   ├── BillingSettings.tsx
    │   │   │   ├── CompanySettings.tsx
    │   │   │   ├── CreditsHighlightCard.tsx
    │   │   │   ├── CreditsSettings.tsx
    │   │   │   ├── GoogleAuthIntegration.tsx
    │   │   │   ├── IntegrationsSettings.tsx
    │   │   │   ├── LinkedInIntegration.tsx
    │   │   │   ├── TeamManagement.tsx
    │   │   │   ├── VoiceAgentHighlights.tsx
    │   │   │   ├── VoiceAgentSettings.tsx
    │   │   │   └── WhatsAppIntegration.tsx
    │   │   ├── ui/                   # Shadcn/ui components
    │   │   │   ├── alert.tsx
    │   │   │   ├── app-toaster.tsx
    │   │   │   ├── avatar.tsx
    │   │   │   ├── badge.tsx
    │   │   │   ├── button.tsx
    │   │   │   ├── card.tsx
    │   │   │   ├── chart.tsx
    │   │   │   ├── checkbox.tsx
    │   │   │   ├── chip.tsx
    │   │   │   ├── dialog.tsx
    │   │   │   ├── dropdown-menu.tsx
    │   │   │   ├── dropzone.tsx
    │   │   │   ├── input.tsx
    │   │   │   ├── label.tsx
    │   │   │   ├── progress.tsx
    │   │   │   ├── radio-group.tsx
    │   │   │   ├── scroll-area.tsx
    │   │   │   ├── select.tsx
    │   │   │   ├── select-multi-column.tsx
    │   │   │   ├── skeleton.tsx
    │   │   │   ├── skeleton-overlay.tsx
    │   │   │   ├── skeleton-page.tsx
    │   │   │   ├── slider.tsx
    │   │   │   ├── switch.tsx
    │   │   │   ├── table.tsx
    │   │   │   ├── tabs.tsx
    │   │   │   ├── textarea.tsx
    │   │   │   ├── tooltip.tsx
    │   │   │   ├── use-toast.ts
    │   │   │   ├── icons/
    │   │   │   │   └── lucide-phone-outgoing.tsx
    │   │   │   └── shadcn-io/
    │   │   │       └── area-chart-09/index.tsx
    │   │   └── *.tsx                 # Other shared components
    │   │
    │   ├── config/
    │   │   └── api.js                # API configuration
    │   │
    │   ├── contexts/                 # React Contexts
    │   │   ├── AuthContext.tsx
    │   │   └── StripeContext.tsx
    │   │
    │   ├── lib/                      # Utilities
    │   │   ├── api.ts
    │   │   ├── api-utils.ts
    │   │   ├── auth.ts
    │   │   ├── categoryFilters.ts
    │   │   ├── loading-bus.ts
    │   │   ├── loading-fetch.ts
    │   │   ├── localAuth.ts
    │   │   ├── onboardingQuestions.ts
    │   │   ├── platformFeatures.ts
    │   │   ├── utils.ts
    │   │   └── validation.ts
    │   │
    │   ├── services/                 # Service Adapters (Thin Layer)
    │   │   ├── api.js
    │   │   ├── api.ts
    │   │   ├── apolloLeadsService.ts
    │   │   ├── authService.js
    │   │   ├── authService.ts
    │   │   ├── campaignService.ts
    │   │   ├── chatService.ts
    │   │   ├── Customer360Service.ts
    │   │   ├── dashboardService.ts
    │   │   ├── geminiFlashService.ts
    │   │   ├── leadsService.ts
    │   │   ├── mayaAIService.ts
    │   │   ├── pipelineService.ts
    │   │   ├── userPreferencesService.ts
    │   │   ├── userService.ts
    │   │   └── FRONTEND_SERVICES_UPDATE.md
    │   │
    │   ├── store/                    # Redux Store
    │   │   ├── store.ts              # Store configuration
    │   │   ├── campaignStore.ts
    │   │   ├── onboardingStore.ts
    │   │   ├── actions/
    │   │   │   ├── bootstrapActions.ts
    │   │   │   ├── dashboardActions.ts
    │   │   │   ├── leadsActions.ts
    │   │   │   ├── pipelineActions.ts
    │   │   │   └── usersActions.ts
    │   │   ├── selectors/
    │   │   │   └── pipelineSelectors.ts
    │   │   └── slices/
    │   │       ├── authSlice.ts
    │   │       ├── bootstrapSlice.ts
    │   │       ├── conversationSlice.ts
    │   │       ├── dashboardSlice.ts
    │   │       ├── leadsSlice.ts
    │   │       ├── masterDataSlice.ts
    │   │       ├── notificationSlice.ts
    │   │       ├── pipelineSlice.ts
    │   │       ├── settingsSlice.ts
    │   │       ├── uiSlice.ts
    │   │       └── usersSlice.ts
    │   │
    │   ├── types/                    # TypeScript types
    │   │   └── campaign.ts
    │   │
    │   ├── utils/                    # Utility functions
    │   │   ├── avatarUtils.ts
    │   │   ├── conversationAssignmentTest.ts
    │   │   ├── dateTime.ts
    │   │   ├── fieldMappings.ts
    │   │   ├── insightsCalculator.ts
    │   │   ├── leadStageUtils.ts
    │   │   ├── statusMappings.ts
    │   │   ├── storage.ts
    │   │   ├── validation.js
    │   │   └── validation.ts
    │   │
    │   └── assets/                   # Static assets
    │
    └── old_archive/                  # Archived legacy code (to be removed)
        ├── deals-pipeline/
        ├── campaigns/
        ├── ai-icp/
        ├── leads/
        ├── slices/
        └── ...
```

## 📊 File Type Distribution

### SDK (`frontend/sdk/`)
- **TypeScript (.ts, .tsx)**: 80+ files
  - Services, types, components, hooks
- **JSON (.json)**: package.json, manifest files
- **Markdown (.md)**: README, documentation
- **Config**: tsconfig.json, vitest.config.ts

### Web (`frontend/web/`)
- **TypeScript/React (.tsx, .ts)**: 200+ files
  - Pages, components, services, utilities
- **JavaScript (.js, .jsx)**: Legacy files (being phased out)
- **JSON (.json)**: package.json, components.json
- **Config**: next-env.d.ts, tailwind.config.js, tsconfig.json
- **Markdown (.md)**: Documentation

## Changes Made

### 1. Created SDK Package (`frontend/sdk/`)
- Package name: `@LAD/frontend-features`
- Contains all framework-agnostic feature modules
- Exports: `deals-pipeline`, `campaigns`, `apollo-leads`, `voice-agent`, `ai-icp-assistant`

### 2. Moved Features to SDK
- ✅ `deals-pipeline/` - Moved from web/src/features
- ✅ `campaigns/` - Moved from web/src/features  
- ✅ Other features already in SDK

### 3. Updated Web App
- Added SDK dependency: `"@LAD/frontend-features": "file:../sdk"`
- Kept only `ai-icp-assistant` in web/src/features (Next.js specific)
- Archived old component structure to `old_archive/`

### 4. Archived Legacy Code
Moved to `web/old_archive/`:
- Old component folders (deals-pipeline, campaigns, ai-icp, leads)
- Redundant services (archive_old_apollo, linkedinLeadsService.js)
- Deprecated pages (lad-showcase, scraper, cancel, success)
- Backup files (*.bak, duplicates)
- Old Redux slices

## Usage Pattern

### Import from SDK in Web App:
```typescript
// In Next.js pages or components
import { PipelineService, type PipelineLead } from '@LAD/frontend-features/deals-pipeline';
import { Campaign } from '@LAD/frontend-features/campaigns';
```

### Service Adapter Pattern:
```typescript
// web/src/services/pipelineService.ts (thin adapter)
import { PipelineService } from '@LAD/frontend-features/deals-pipeline';

export const pipelineService = new PipelineService(
  process.env.NEXT_PUBLIC_API_URL,
  () => ({ Authorization: `Bearer ${getToken()}` })
);
```

## Benefits

✅ **Framework-Agnostic** - SDK has no Next.js dependencies
✅ **Reusable** - Can be used in React, Vue, or vanilla JS
✅ **Testable** - Easy to unit test without framework
✅ **Type-Safe** - Full TypeScript support
✅ **Maintainable** - Clear separation of concerns
✅ **Scalable** - Each feature is self-contained

## Next Steps

1. Run `npm install` in `frontend/web` to link SDK
2. Update imports in pages to use `@LAD/frontend-features/*`
3. Test all features
4. Remove `old_archive/` after verification
