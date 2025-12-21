# AI ICP Assistant & Apollo Leads - Frontend Components

## Overview

Created comprehensive frontend components for the AI ICP Assistant with Apollo.io integration, using TypeScript, Tailwind CSS, and shadcn/ui.

## Components Created

### 1. **AIChatSection.tsx** ✅
**Location:** `src/components/ai-icp/AIChatSection.tsx`

**Features:**
- ✅ Conversational AI interface with Maya
- ✅ Welcome screen with 4 quick action buttons
- ✅ User/AI message bubbles with avatars
- ✅ Suggested parameters display as chips
- ✅ "Apply & Search" button for complete params
- ✅ Action result display (collect numbers, filter, etc.)
- ✅ Auto-scroll to latest message
- ✅ Character counter (3000 max)
- ✅ Loading states with spinner
- ✅ Keyboard shortcuts (Enter to send)

**Props:**
```typescript
interface AIChatSectionProps {
  onSendPrompt: (message: string) => void;
  onApplyParams: (params: MayaAISuggestedParams) => void;
  loading?: boolean;
  chatHistory?: MayaAIChatMessage[];
  className?: string;
}
```

---

### 2. **CompanyCard.tsx** ✅
**Location:** `src/components/ai-icp/CompanyCard.tsx`

**Features:**
- ✅ Company avatar with logo/initials
- ✅ Employee count, location, revenue badges
- ✅ AI summary section
- ✅ LinkedIn, website, phone quick actions
- ✅ Selection checkbox
- ✅ "View Details" button
- ✅ Responsive grid layout (1/2/3 columns)
- ✅ Empty state handling

**Components:**
- `CompanyCard` - Individual card
- `CompanyGrid` - Grid container with loading/empty states

---

### 3. **EmployeeCard.tsx** ✅
**Location:** `src/components/ai-icp/EmployeeCard.tsx`

**Features:**
- ✅ Employee avatar with photo/initials
- ✅ Name, title, company display
- ✅ Email reveal button (8 credits)
- ✅ Phone reveal button (8 credits)
- ✅ LinkedIn profile link
- ✅ Selection checkbox
- ✅ Loading states for contact reveal
- ✅ Revealed badge indicator

**Components:**
- `EmployeeCard` - Individual card
- `EmployeeGrid` - Grid container with loading/empty states

---

### 4. **ICPAssistantPage.tsx** ✅
**Location:** `src/components/ai-icp/ICPAssistantPage.tsx`

**Features:**
- ✅ Split layout (Chat 40% | Results 60%)
- ✅ Chat section with reset button
- ✅ Tabs for companies/employees
- ✅ Selection count badges
- ✅ Integrated state management
- ✅ Error handling with toasts
- ✅ Pagination support
- ✅ Contact reveal integration

**State Management:**
```typescript
- chatHistory: MayaAIChatMessage[]
- companies: ApolloCompany[]
- employees: ApolloEmployee[]
- selectedCompanies: Set<string>
- selectedEmployees: Set<string>
- revealingContacts: Map<string, 'email' | 'phone'>
```

---

## Usage

### Basic Setup

```typescript
// In your page component
import ICPAssistantPage from '@/components/ai-icp/ICPAssistantPage';

export default function ICPPage() {
  return <ICPAssistantPage />;
}
```

### Individual Components

```typescript
// Use chat section alone
import AIChatSection from '@/components/ai-icp/AIChatSection';

<AIChatSection
  onSendPrompt={handleMessage}
  onApplyParams={handleParams}
  loading={loading}
  chatHistory={history}
/>

// Use company grid alone
import { CompanyGrid } from '@/components/ai-icp/CompanyCard';

<CompanyGrid
  companies={companies}
  selectedCompanies={selected}
  onSelectCompany={handleSelect}
  onViewCompanyDetails={handleViewDetails}
/>

// Use employee grid alone
import { EmployeeGrid } from '@/components/ai-icp/EmployeeCard';

<EmployeeGrid
  employees={employees}
  selectedEmployees={selected}
  onSelectEmployee={handleSelect}
  onRevealContact={handleReveal}
  revealingContacts={revealing}
/>
```

---

## Styling

All components use:
- **Tailwind CSS** for utility classes
- **shadcn/ui** for base components (Button, Card, Badge, etc.)
- **Lucide React** for icons
- **cn()** utility for conditional classes

### Color Scheme
```typescript
// Primary colors
- Blue: bg-blue-600, text-blue-700
- Purple: from-purple-600 to-blue-600
- Green: from-green-500 to-teal-600
- Amber: bg-amber-100, text-amber-700

// UI colors
- Muted: bg-muted, text-muted-foreground
- Border: border, border-input
- Card: bg-card, text-card-foreground
```

---

## Features Implemented

### AI Chat
- ✅ Conversational interface
- ✅ Parameter extraction display
- ✅ Action command results
- ✅ Quick action buttons
- ✅ Message history
- ✅ Auto-scroll

### Company Display
- ✅ Card-based grid layout
- ✅ Avatar with logo/initials
- ✅ Stats badges (employees, location, revenue)
- ✅ AI summary section
- ✅ Social links (LinkedIn, website, phone)
- ✅ Selection support
- ✅ Details button

### Employee Display
- ✅ Card-based grid layout
- ✅ Avatar with photo/initials
- ✅ Title and company info
- ✅ Contact reveal (email/phone)
- ✅ Credit cost display (8 credits)
- ✅ LinkedIn profile link
- ✅ Reveal status badges

### State Management
- ✅ Chat history tracking
- ✅ Search results caching
- ✅ Selection state (Set-based)
- ✅ Loading states (per action)
- ✅ Error handling with toasts

---

## Integration with Services

### Maya AI Service
```typescript
import { mayaAIService } from '@/services/mayaAIService';

// Send message
const response = await mayaAIService.chat(message, history, results);

// Handle response
if (response.suggestedParams) {
  // Show "Apply & Search" button
}
if (response.actionResult) {
  // Display action results
}
```

### Apollo Leads Service
```typescript
import { apolloLeadsService } from '@/services/apolloLeadsService';

// Search companies
const result = await apolloLeadsService.searchLeads(params);
setCompanies(result.companies);

// Search employees
const employees = await apolloLeadsService.searchEmployees(params);
setEmployees(employees.employees);

// Reveal contact
const contact = await apolloLeadsService.revealContact(id, 'email');
```

---

## Required shadcn/ui Components

Make sure these are installed:
```bash
npx shadcn-ui@latest add button
npx shadcn-ui@latest add card
npx shadcn-ui@latest add badge
npx shadcn-ui@latest add checkbox
npx shadcn-ui@latest add avatar
npx shadcn-ui@latest add tabs
npx shadcn-ui@latest add scroll-area
npx shadcn-ui@latest add toast
```

---

## File Structure

```
src/components/ai-icp/
├── AIChatSection.tsx          # Main chat interface
├── CompanyCard.tsx            # Company display components
├── EmployeeCard.tsx           # Employee display components
├── ICPAssistantPage.tsx       # Main page container
└── README.md                  # This file

src/services/
├── mayaAIService.ts           # AI chat service
└── apolloLeadsService.ts      # Apollo.io integration
```

---

## Next Steps

1. **Add Pagination Controls** - Navigate through pages
2. **Add Export Functionality** - CSV/Excel export
3. **Add Bulk Actions** - Call selected, export selected
4. **Add Filters** - Company size, location, industry
5. **Add Sorting** - Sort by name, employees, revenue
6. **Add Company Details Modal** - Full company view
7. **Add Search History** - View past searches
8. **Add Save ICP** - Save ICP profiles

---

## Testing

```typescript
// Test chat flow
1. Open ICP Assistant page
2. Type "Find SaaS companies in Dubai"
3. AI extracts parameters
4. Click "Apply & Search"
5. View company results
6. Select companies
7. Try "collect all phone numbers"

// Test employee search
1. Type "Find office managers in oil companies"
2. AI extracts parameters
3. Click "Apply & Search"
4. View employee results
5. Click "Reveal Email" on employee card
6. Confirm 8 credits deducted
7. Email is displayed
```

---

## Benefits

1. **Type Safety** - Full TypeScript support
2. **Responsive** - Works on mobile, tablet, desktop
3. **Accessible** - Keyboard navigation, ARIA labels
4. **Performance** - Optimized re-renders with useCallback
5. **Error Handling** - Toast notifications for all errors
6. **Loading States** - Clear feedback for async operations
7. **Modular** - Components can be used independently
8. **Styled** - Modern UI with Tailwind and shadcn/ui

---

## Status

✅ **AIChatSection** - Complete with all features
✅ **CompanyCard/Grid** - Complete with selection
✅ **EmployeeCard/Grid** - Complete with reveal
✅ **ICPAssistantPage** - Complete integration
✅ **Type Definitions** - Full TypeScript support
✅ **Documentation** - Complete guide

Ready for production use! 🚀
