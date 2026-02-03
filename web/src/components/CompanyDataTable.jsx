
"use client";
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { apolloLeadsService, getDecisionMakerPhone } from '@/features/apollo-leads';
import { Phone as PhoneIcon } from 'lucide-react';
import { safeStorage } from '../utils/storage';
// Get API base URL from environment variable
const API_BASE_URL = `${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3002'}/api`;
// Helper function to get userId from auth token
const getUserId = () => {
  try {
    const token = safeStorage.getItem('token');
    if (!token) return 'demo_user_123';
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.userId || payload.id || 'demo_user_123';
  } catch (error) {
    console.error('Error getting user ID:', error);
    return 'demo_user_123';
  }
};
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { Chip } from '@/components/ui/chip';
import {
  Building2 as Business,
  User as Person,
  Mail as Email,
  Phone,
  Globe as Language,
  MapPin as LocationOn,
  Linkedin as LinkedInIcon,
  Linkedin as LinkedIn,
  ChevronDown as ExpandMore,
  Users as People,
  Briefcase as Work,
  CheckSquare as SelectAll,
  Bot as SmartToy,
  CheckCircle2 as CheckCircle,
  Check,
  Facebook,
  Instagram,
  Calendar as CalendarToday,
  Users as Group,
  DollarSign as AttachMoney,
  Home,
  Tag,
  Settings,
  TrendingUp,
  TrendingDown,
  LineChart as ShowChart,
  Lock,
  Globe as Public,
  Code,
  FileText as Article,
  Rss as RssFeed,
  Grid as ViewModule,
  List as ViewList,
  Briefcase as BusinessCenter,
  Ruler as Straighten,
  Filter as FilterList,
  Loader2
} from 'lucide-react';
import { useToast } from '@/components/ui/app-toaster';
export default function CompanyDataTable({ 
  data = [], 
  columns = [], 
  onUpdateCompany, 
  companySummaries = {},
  searchQuery = null, // { industry: 'oil and gas', location: 'dubai', date: '15/11/2025, 19:12:22' }
  employeeSearchQuery = null, // { person_titles: ['Office Manager'], location: 'dubai', date: '15/11/2025, 19:12:22' }
  employeeData = [], // Employee search results
  onEmployeeSelectionChange = null, // Callback for employee selection
  selectedEmployees = new Set(), // Selected employee indices
  onUnlockEmployeeEmails = null, // Callback to unlock emails for selected employees
  onUnlockEmployeePhones = null, // Callback to unlock phones for selected employees
  onUnlockAllEmployeeEmails = null, // Callback to unlock all employee emails
  onUnlockAllEmployeePhones = null, // Callback to unlock all employee phones
  onSendLinkedInConnections = null, // Callback to send LinkedIn connection requests
  onEmployeeFilterClick = null, // Callback to open employee filter menu
  revealedEmployeeContacts = {}, // Revealed employee contact info
  unlockingEmployeeContacts = {}, // Unlocking status for employees
  showCompanyFirst = true, // Indicates which search was performed most recently
  onActiveTabChange = null, // Callback to notify parent when tab changes
  activeTab: controlledActiveTab = undefined, // Optional prop to control active tab from parent
  paginationControls = null, // Pagination controls to display on right side of selection controls
  employeePaginationControls = null, // Employee pagination controls to display on right side of selection controls
  isLoading = false, // Loading state for company search
  employeeSearchLoading = false // Loading state for employee search
}) {
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCompanies, setSelectedCompanies] = useState(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [selectAllEmployees, setSelectAllEmployees] = useState(false);
  const [showAITrigger, setShowAITrigger] = useState(false);
  const [internalActiveTab, setInternalActiveTab] = useState(0); // 0 = Companies, 1 = Employees
  // Determine if component is controlled (prop was provided)
  const isControlled = controlledActiveTab !== undefined;
  const { push } = useToast(); // For notifications
  const router = useRouter();
  const [intelligentCallingLoading, setIntelligentCallingLoading] = useState(false);
  // Use controlled tab if provided, otherwise use internal state
  const activeTab = isControlled ? controlledActiveTab : internalActiveTab;
  // Helper to update tab - if controlled, notify parent; otherwise update internal state
  const updateActiveTab = (newValue) => {
    if (isControlled) {
      // Controlled: notify parent
      if (onActiveTabChange) {
        onActiveTabChange(newValue);
      } else {
        console.warn('⚠️ Component is controlled but onActiveTabChange is not provided!');
      }
    } else {
      // Uncontrolled: update internal state
      setInternalActiveTab(newValue);
    }
  };
  // Notify parent when activeTab changes (only for uncontrolled mode)
  // When controlled, parent already knows the value, so we don't need to notify
  const onActiveTabChangeRef = useRef(onActiveTabChange);
  const lastNotifiedTabRef = useRef(activeTab);
  useEffect(() => {
    onActiveTabChangeRef.current = onActiveTabChange;
  }, [onActiveTabChange]);
  useEffect(() => {
    // Only notify parent if component is uncontrolled and tab actually changed
    if (!isControlled && activeTab !== lastNotifiedTabRef.current && onActiveTabChangeRef.current) {
      lastNotifiedTabRef.current = activeTab;
      onActiveTabChangeRef.current(activeTab);
    } else if (isControlled) {
      // Update ref to track current value even in controlled mode
      lastNotifiedTabRef.current = activeTab;
    }
  }, [activeTab, isControlled]);
  const filterButtonRef = useRef(null);
  // Helper function to normalize company IDs for comparison
  const normalizeCompanyId = (id) => {
    // Do not treat 0 as null; only undefined or null are invalid
if (!id) return null;
    return String(id).trim();
  };
  // Track employeeData changes (removed console.log for performance)
  // useEffect(() => {
  //   ,
  //     type: typeof employeeData,
  //     firstItem: employeeData[0],
  //     fullData: employeeData
  //   });
  // }, [employeeData]);
  // Track the original data lengths to detect actual search result changes (not filter changes)
  const prevEmployeeDataLengthRef = useRef(employeeData.length);
  const prevDataLengthRef = useRef(data.length);
  const isInitialMountRef = useRef(true);
  const activeTabRef = useRef(activeTab);
  const userManuallyChangedTabRef = useRef(false); // Track if user manually changed tab
  // Update ref when activeTab changes (for use in useEffect without causing re-renders)
  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);
  // Auto-switch tabs based on which search was performed most recently
  // IMPORTANT: Only switch tabs when actual search results change, NOT when filters are applied
  // Filters change the displayed data but shouldn't trigger tab switches
  useEffect(() => {
    // On initial mount, set the correct tab (only if uncontrolled)
    // If controlled, parent manages the tab state
    if (isInitialMountRef.current) {
      if (!isControlled) {
        // Only auto-set initial tab if component is uncontrolled
        if (employeeData.length > 0 && data.length === 0) {
          updateActiveTab(1);
        } else if (data.length > 0 && employeeData.length === 0) {
          updateActiveTab(0);
        } else if (data.length > 0 && employeeData.length > 0) {
          updateActiveTab(showCompanyFirst ? 0 : 1);
        } else {
          // No data - default to Companies tab
          updateActiveTab(0);
        }
      }
      isInitialMountRef.current = false;
      prevEmployeeDataLengthRef.current = employeeData.length;
      prevDataLengthRef.current = data.length;
      return;
    }
    // If component is controlled, parent manages tab switching - don't auto-switch here
    if (isControlled) {
      // Just update refs to track data changes, but don't switch tabs
      prevEmployeeDataLengthRef.current = employeeData.length;
      prevDataLengthRef.current = data.length;
      return;
    }
    // Don't auto-switch if user manually changed the tab
    if (userManuallyChangedTabRef.current) {
      // Update refs but don't switch tabs
      prevEmployeeDataLengthRef.current = employeeData.length;
      prevDataLengthRef.current = data.length;
      return;
    }
    // Special case: If employeeData exists and showCompanyFirst is false, switch to Employees tab
    // This handles restoration of employee searches
    if (employeeData.length > 0 && !showCompanyFirst && activeTabRef.current === 0) {
      // Only switch if employeeData just appeared (was 0 before) OR if we're restoring
      if (prevEmployeeDataLengthRef.current === 0 || (prevEmployeeDataLengthRef.current < employeeData.length && !showCompanyFirst)) {
        updateActiveTab(1);
        prevEmployeeDataLengthRef.current = employeeData.length;
        prevDataLengthRef.current = data.length;
        return;
      }
    }
    // Check if this is a real search result change (not just a filter change)
    const employeeDataChanged = prevEmployeeDataLengthRef.current !== employeeData.length;
    const companyDataChanged = prevDataLengthRef.current !== data.length;
    // CRITICAL: Don't switch tabs if user is currently viewing a tab and just applying filters
    // Only switch tabs when actual new search results arrive (significant length changes)
    // Small length changes are likely filter changes, not new searches
    const significantEmployeeChange = Math.abs(prevEmployeeDataLengthRef.current - employeeData.length) > (prevEmployeeDataLengthRef.current * 0.5);
    const significantCompanyChange = Math.abs(prevDataLengthRef.current - data.length) > (prevDataLengthRef.current * 0.5);
    // Only auto-switch if:
    // 1. Data went from 0 to >0 (new search results arrived)
    // 2. OR there's a significant change (more than 50% difference) indicating new search, not filter
    // 3. AND we're not already on the correct tab (prevent unnecessary switches)
    if ((employeeDataChanged && (prevEmployeeDataLengthRef.current === 0 || significantEmployeeChange)) ||
        (companyDataChanged && (prevDataLengthRef.current === 0 || significantCompanyChange))) {
      // Don't switch if user is actively viewing a tab - only switch on new searches
      // If both tabs have data, respect the current tab choice unless it's a new search
      if (employeeData.length > 0 && data.length === 0) {
        // Only employees exist, switch to Employees tab
        if (activeTabRef.current !== 1) updateActiveTab(1);
      } else if (data.length > 0 && employeeData.length === 0) {
        // Only companies exist, switch to Companies tab
        // BUT: If we were on Employees tab and employeeData just became 0, it might be a filter
        // Only switch if this is a new search (employeeData was 0 before), not a filter result
        if (prevEmployeeDataLengthRef.current === 0 || activeTabRef.current === 0) {
          // It's a new search or we're already on Companies tab - safe to switch
          if (activeTabRef.current !== 0) updateActiveTab(0);
        }
        // Otherwise, if we were on Employees tab and employeeData became 0 due to filtering,
        // keep the Employees tab (don't switch)
      } else if (data.length > 0 && employeeData.length > 0) {
        // Both exist - only switch if it's a new search (one went from 0 to >0)
        // Don't switch if both already had data (user might be filtering)
        if ((prevEmployeeDataLengthRef.current === 0 && employeeData.length > 0) ||
            (prevDataLengthRef.current === 0 && data.length > 0)) {
          updateActiveTab(showCompanyFirst ? 0 : 1);
        }
        // If employee data increased significantly (likely a restore or new search), switch to Employees
        else if (employeeDataChanged && significantEmployeeChange && !showCompanyFirst) {
          updateActiveTab(1);
        }
        // Otherwise, keep current tab (user might be filtering)
      }
      // Update refs to track current lengths
      prevEmployeeDataLengthRef.current = employeeData.length;
      prevDataLengthRef.current = data.length;
    }
  }, [employeeData.length, data.length, showCompanyFirst, isControlled]);
  // Sync selectAllEmployees state with actual selection (optimized)
  useEffect(() => {
    if (employeeData.length === 0) {
      if (selectAllEmployees) setSelectAllEmployees(false);
      return;
    }
    // Only check if selection count matches total (faster than .every())
    const isAllSelected = selectedEmployees.size === employeeData.length && selectedEmployees.size > 0;
    if (isAllSelected !== selectAllEmployees) {
      setSelectAllEmployees(isAllSelected);
    }
  }, [selectedEmployees.size, employeeData.length]); // Removed selectAllEmployees from deps to avoid loop
  // Debug logging (disabled for performance - enable only when debugging)
  // // Discount intelligence removed - no longer needed
  // Filter menu states
  const [filterAnchorEl, setFilterAnchorEl] = useState(null);
  const [selectedFilters, setSelectedFilters] = useState(new Set());
  // Phone number states
  const [phoneData, setPhoneData] = useState({}); // { companyId: { phone, name, title, status } }
  const [phoneLoading, setPhoneLoading] = useState({}); // { companyId: true/false }
  const [phoneError, setPhoneError] = useState({}); // { companyId: errorMessage }
  // Persist company phone data across page refreshes
  useEffect(() => {
    try {
      const saved = localStorage.getItem('phoneData');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          setPhoneData(parsed);
        }
      }
    } catch (e) {
      console.warn('Failed to load phone data from storage');
    }
  }, []);
  // Persist phone data to localStorage whenever it changes
  useEffect(() => {
    try {
      if (Object.keys(phoneData).length > 0) {
        localStorage.setItem('phoneData', JSON.stringify(phoneData));
      }
    } catch (e) {
      console.warn('Failed to save phone data to storage:', e);
    }
  }, [phoneData]);
  // Employee fetching states
  const [fetchedEmployeeData, setFetchedEmployeeData] = useState({}); // { companyId: [employees array] }
  const [employeeLoading, setEmployeeLoading] = useState({}); // { companyId: true/false }
  // Phone reveal confirmation dialog
  const [phoneConfirmDialog, setPhoneConfirmDialog] = useState({
    open: false,
    employee: null
  });
  const [employeeError, setEmployeeError] = useState({}); // { companyId: errorMessage }
  const [employeeDialogOpen, setEmployeeDialogOpen] = useState(false);
  const [selectedEmployeeCompany, setSelectedEmployeeCompany] = useState(null);
  const [employeeViewMode, setEmployeeViewMode] = useState('grid'); // 'grid' or 'list'
  const [employeeRoleFilter, setEmployeeRoleFilter] = useState('all'); // Role filter
  const [employeeCacheInfo, setEmployeeCacheInfo] = useState({}); // { companyId: { from_cache: true, cache_age_days: 5 } }
  const [selectedDialogEmployees, setSelectedDialogEmployees] = useState(new Set()); // Selected employees in dialog
  // Individual employee detail dialog state
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [employeeDetailDialogOpen, setEmployeeDetailDialogOpen] = useState(false);
  // Employee contact reveal states
  const [revealedContacts, setRevealedContacts] = useState({}); // { employeeId: { phone: '...', email: '...' } }
  const [revealingContacts, setRevealingContacts] = useState({}); // { employeeId: { phone: true, email: true } }
  // Helper function to get consistent employee ID (priority: id > linkedin_url > name)
  const getEmployeeId = (employee) => {
    if (!employee) return null;
    // Use consistent priority: id > linkedin_url > name
    return employee.id || employee.linkedin_url || employee.name || null;
  };
  // Persist revealed contacts across dialog open/close and page refreshes
  useEffect(() => {
    try {
      const saved = localStorage.getItem('revealedContacts');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          setRevealedContacts(parsed);
        }
      }
    } catch (e) {
      console.warn('Failed to load revealed contacts from storage');
    }
  }, []);
  // Persist revealed contacts to localStorage whenever they change
  useEffect(() => {
    try {
      if (Object.keys(revealedContacts).length > 0) {
        localStorage.setItem('revealedContacts', JSON.stringify(revealedContacts));
      }
    } catch (e) {
      // ignore storage errors
      console.warn('Failed to save revealed contacts to storage:', e);
    }
  }, [revealedContacts]);
  // Update showAITrigger when employee or company selection changes
  useEffect(() => {
    if (activeTab === 0) {
      // Companies tab
      setShowAITrigger(selectedCompanies.size > 0);
    } else {
      // Employees tab
      setShowAITrigger(selectedEmployees.size > 0);
    }
  }, [selectedEmployees, selectedCompanies, activeTab]);
  // // Disabled for performance
  // Filter employees by role
  const filterEmployeesByRole = (employees, roleFilter) => {
    if (!employees || roleFilter === 'all') return employees;
    const filterLower = roleFilter.toLowerCase();
    return employees.filter(emp => {
      const title = (emp.title || '').toLowerCase();
      switch(roleFilter) {
        case 'executive':
          return title.includes('ceo') || title.includes('cto') || title.includes('cfo') || 
                 title.includes('coo') || title.includes('chief') || title.includes('president');
        case 'director':
          return title.includes('director');
        case 'manager':
          return title.includes('manager');
        case 'hr':
          return title.includes('hr') || title.includes('human resource') || title.includes('recruiter');
        case 'sales':
          return title.includes('sales') || title.includes('business development');
        case 'marketing':
          return title.includes('marketing');
        case 'engineering':
          return title.includes('engineer') || title.includes('developer') || title.includes('architect');
        case 'operations':
          return title.includes('operations') || title.includes('ops');
        case 'finance':
          return title.includes('finance') || title.includes('accounting') || title.includes('accountant');
        default:
          return true;
      }
    });
  };
  // Function to validate LinkedIn URL
  const isValidLinkedInUrl = (url) => {
    if (!url) return false;
    return (url.includes('linkedin.com/company/') || url.includes('linkedin.com/in/')) && url.startsWith('http');
  };
  // Function to get LinkedIn company name from URL
  const getLinkedInCompanyName = (url) => {
    if (!isValidLinkedInUrl(url)) return null;
    // Handle company pages
    const companyMatch = url.match(/linkedin\.com\/company\/([^\/\?]+)/);
    if (companyMatch) {
      return companyMatch[1].replace(/-/g, ' ');
    }
    // Handle personal profiles
    const personalMatch = url.match(/linkedin\.com\/in\/([^\/\?]+)/);
    if (personalMatch) {
      return personalMatch[1].replace(/-/g, ' ');
    }
    return null;
  };
  // Function to detect if LinkedIn URL was likely generated
  const isGeneratedLinkedInUrl = (url) => {
    if (!url) return false;
    // Check if URL looks like it was generated (simple pattern)
    const profileName = getLinkedInCompanyName(url)?.toLowerCase() || '';
    const commonPatterns = ['samover', 'packndash', 'allied', 'moversup', 'relocate', 'wow', 'speed', 'move', 'anymove'];
    // For personal profiles, be more lenient - they're often legitimate
    if (url.includes('linkedin.com/in/')) {
      return false; // Assume personal profiles are legitimate
    }
    return commonPatterns.some(pattern => profileName.includes(pattern));
  };
  if (data.length > 0) {
    }
  const handleViewDetails = async (company) => {
    // Fetch richer company details for Apollo results when available
    try {
      console.log('Viewing company:', company);
      // Get company ID for summary lookup
      const companyId = normalizeCompanyId(company.id || company.company_id || company.apollo_organization_id);
      // First check if company already has summary attached (from restoration)
      let summary = company.summary || 'none';
      // If not, try to find in companySummaries prop with multiple matching strategies
      if (!summary && companyId && Object.keys(companySummaries).length > 0) {
        // Try direct lookup
        summary = companySummaries[companyId] || companySummaries[String(companyId)];
        // If still not found, try normalized matching
        if (!summary) {
          const foundEntry = Object.entries(companySummaries).find(([key]) => {
            const normalizedKey = normalizeCompanyId(key);
            return normalizedKey === companyId;
          });
          if (foundEntry) {
            summary = foundEntry[1];
            }
        }
      }
      // Log summary lookup result
      if (summary) {
        console.log('✓ Using company summary');
      } else {
        console.log('⚠ No summary available for company');
      }
      // Always set company with summary (preserve if it exists, add if found)
        const companyWithSummary = {
          ...company,
          ...(summary ? { summary } : {}) // Always include summary if we have it
        };
        setSelectedCompany(companyWithSummary);
        setDialogOpen(true);
        // Only attempt to fetch details for Apollo-sourced companies with an id
        if (company.source === 'apollo_io' && company.id) {
          // show a temporary loading marker
          setSelectedCompany(prev => ({ ...prev, __loadingDetails: true }));
        try {
          const details = await apolloLeadsService.getCompanyDetails(company.id);
          if (details) {
            // apolloLeadsService returns the raw `company` field from the backend
            const detailed = details.company || details;
            // Merge detailed fields into selected company, preserve summary
            setSelectedCompany(prev => {
              // Prioritize prev.summary (from restoration) over other sources
              const companyIdForSummary = prev.id || prev.company_id || company.id || company.company_id;
              const currentSummary = prev.summary || summary || companySummaries[companyIdForSummary] || companySummaries[String(companyIdForSummary)];
              return {
                ...prev, 
                ...detailed,
                ...(currentSummary ? { summary: currentSummary } : {}) // Always preserve summary if we have it
              };
            });
            // Also propagate enriched fields back to the parent list so cards update
            try {
              if (typeof onUpdateCompany === 'function') {
                onUpdateCompany(company.id, detailed);
              }
            } catch (err) {
              console.warn('⚠️ onUpdateCompany callback failed:', err);
            }
          } else {
            console.warn('⚠️ No additional details returned for company id:', company.id);
          }
        } catch (e) {
          console.error('❌ Failed fetching company details:', e);
        } finally {
          // Clear loading marker
          setSelectedCompany(prev => {
            if (!prev) return prev;
            const copy = { ...prev };
            delete copy.__loadingDetails;
            return copy;
          });
        }
      }
    } catch (e) {
      console.error('❌ Failed in handleViewDetails:', e);
    }
  };
  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedCompany(null);
  };
  // Selection handlers
  const handleSelectCompany = (companyId) => {
    const newSelected = new Set(selectedCompanies);
    if (newSelected.has(companyId)) {
      newSelected.delete(companyId);
    } else {
      newSelected.add(companyId);
    }
    setSelectedCompanies(newSelected);
    setShowAITrigger(newSelected.size > 0);
  };
  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedCompanies(new Set());
      setSelectAll(false);
    } else {
      // Only select filtered/visible companies, not all companies
      const filteredData = getFilteredData();
      // Use the same selection key as individual selection: company.id || index
      // where index is from the filtered array (matching how cards are rendered)
      const allIds = new Set(filteredData.map((company, index) => company.id || index));
      setSelectedCompanies(allIds);
      setSelectAll(true);
    }
    setShowAITrigger(!selectAll);
  };
  const handleSelectAllEmployees = () => {
    if (selectAllEmployees) {
      if (onEmployeeSelectionChange) {
        onEmployeeSelectionChange(new Set());
      }
      setSelectAllEmployees(false);
    } else {
      // Only select filtered/visible employees, not all employees
      const filteredEmployees = getFilteredEmployeeData();
      // Use indices from the filtered array (0, 1, 2, ... for filtered employees)
      // This matches how individual selection works in the rendered cards
      const allEmployeeIndices = new Set(filteredEmployees.map((_, index) => index));
      if (onEmployeeSelectionChange) {
        onEmployeeSelectionChange(allEmployeeIndices);
      }
      setSelectAllEmployees(true);
    }
    setShowAITrigger(!selectAllEmployees);
  };
  // inside CompanyDataTable.jsx
// const handleAITrigger = async () => {
//   const selectedData = data.filter((company, index) =>
//     selectedCompanies.has(company.id || index)
//   );
//   try {
//     const ids = selectedData
//       .map(c => c.apollo_organization_id || c.id)
//       .filter(Boolean);
//     if (!ids.length) {
//       alert("No valid company IDs found. Please select companies with valid IDs.");
//       return;
//     }
//     //     // resolve now so we can decide single vs bulk
//     const res = await fetch(`${API_BASE_URL}/voiceagent/resolve-phones`, {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({ ids }),
//     });
//     const contentType = res.headers.get('content-type') || '';
//     let payload;
//     if (contentType.includes('application/json')) {
//       payload = await res.json();
//     } else {
//       const text = await res.text();
//       throw new Error(`Non-JSON response (status ${res.status}): ${text.slice(0, 200)}`);
//     }
//     if (!res.ok) {
//       const errorMsg = payload?.error || `HTTP ${res.status}`;
//       console.error("❌ API Error:", errorMsg);
//       alert(`Failed to resolve phone numbers: ${errorMsg}`)
//       return;
//     }
 const handleStartIntelligentCallingCompanies = async () => {
    if (selectedCompanies.size === 0) {
      push({ variant: 'error', title: 'No Selection', description: 'Please select at least one company.' });
      return;
    }
    setIntelligentCallingLoading(true);
    try {
      // Build IDs from selected rows, preferring real IDs over indices
      const companyIds = data
        .map((company, index) => {
          const isSelected = selectedCompanies.has(company.id) || selectedCompanies.has(index);
          if (!isSelected) return null;
          const rawId = company.apollo_organization_id || company.company_id || company.id;
          return normalizeCompanyId(rawId);
        })
        .filter(Boolean);
      const response = await fetch(`${API_BASE_URL}/voiceagent/resolve-phones`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
	  body: JSON.stringify({ ids: companyIds, type: 'company' }),
      });
      const json = await response.json();
      if (!response.ok || !json.success) {
        throw new Error(json?.error || 'Failed to resolve phones');
      }
      // Prefer IDs returned by API, but fall back to originally requested IDs if missing
      const apiIds = Array.isArray(json.data)
        ? json.data.map(row => row.company_id || row.id).filter(Boolean)
        : [];
      const idsToForward = apiIds.length > 0 ? apiIds : companyIds;
      const encodedIds = btoa(JSON.stringify(idsToForward));
      push({ title: 'Success', description: `${json.data.length} target(s) resolved. Redirecting to call...` });
      router.push(`/make-call?ids=${encodedIds}&bulk=1&prefilled=1&type=company`);
    } catch (error) {
      console.error('Intelligent calling failed for companies:', error);
      push({ variant: 'error', title: 'Error', description: error.message || 'Failed to start calling.' });
    } finally {
      setIntelligentCallingLoading(false);
    }
  };
  // New: Handle Start Intelligent Calling for Employees Tab
  const handleStartIntelligentCallingEmployees = async () => {
    if (selectedEmployees.size === 0) {
      push({ variant: 'error', title: 'No Selection', description: 'Please select at least one employee.' });
      return;
    }
    setIntelligentCallingLoading(true);
    try {
      const idSet = new Set();
      const filteredEmployees = getFilteredEmployeeData();
      filteredEmployees.forEach((employee, index) => {
        // Selection in UI is tracked by index; use index here
        if (!selectedEmployees.has(index)) return;
        // Prefer Apollo person id with sensible fallbacks
        let personId =
          employee.id ||
          employee.apollo_person_id ||
          employee.person_id;
        // Try nested payload if present
        if (!personId && employee.employee_data) {
          try {
            const full =
              typeof employee.employee_data === "string"
                ? JSON.parse(employee.employee_data)
                : employee.employee_data;
            personId = full?.id || full?.apollo_person_id || full?.person_id;
          } catch (e) {
            // Ignore parsing errors
          }
        }
        if (personId) idSet.add(String(personId).trim());
      });
      const employeeIds = Array.from(idSet);
      if (employeeIds.length === 0) {
        push({
          variant: "error",
          title: "Invalid Selection",
          description: "Selected employees do not have valid Apollo Person IDs.",
        });
        setIntelligentCallingLoading(false);
        return;
      }
      const response = await fetch(`${API_BASE_URL}/voiceagent/resolve-phones`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: employeeIds,
          type: "employee",
        }),
      });
      const json = await response.json();
      if (!response.ok || !json.success) {
        throw new Error(json?.error || "Failed to resolve phones");
      }
      const encodedIds = btoa(JSON.stringify(employeeIds));
      push({
        title: "Success",
        description: `${json.data.length} target(s) resolved. Redirecting to call...`,
      });
      router.push(
        `/make-call?ids=${encodedIds}&bulk=1&prefilled=1&type=employee`
      );
    } catch (error) {
      console.error("❌ Intelligent calling (employees) failed:", error);
      push({
        variant: "error",
        title: "Error",
        description: error.message || "Failed to start calling.",
      });
    } finally {
      setIntelligentCallingLoading(false);
    }
  };
//     const rows = Array.isArray(payload?.data) ? payload.data : [];
//     //     if (rows.length === 0) {
//       alert("No phone numbers found for the selected companies.");
//       return;
//     }
//     const ERP_URL = process.env.NEXT_PUBLIC_ERP_URL || "https://erp.techiemaya.com";
//     if (rows.length === 1) {
//       // ✅ single call via query params
//       const first = rows[0];
//       if (!first.phone) {
//         alert("No phone number available for this contact.");
//         return;
//       }
//       const href = new URL(`${ERP_URL}/make-call`);
//       href.searchParams.set("dial", String(first.phone || "").trim());
//       href.searchParams.set("clientName", String(first.name || "").trim());
//       href.searchParams.set("prefilled", "1");
//       );
//       const newWindow = window.open(href.toString(), "_blank");
//       if (!newWindow) {
//         alert("Popup blocked! Please allow popups for this site to open the calling interface.");
//       }
//     } else if (rows.length > 1) {
//       // ✅ bulk flow — just pass ids, and page.tsx will fetch + show list
//       const encodedIds = encodeURIComponent(btoa(JSON.stringify(ids)));
//       const href = `${ERP_URL}/make-call?bulk=1&ids=${encodedIds}`;
//       //       const newWindow = window.open(href, "_blank");
//       if (!newWindow) {
//         alert("Popup blocked! Please allow popups for this site to open the calling interface.");
//       }
//     }
//   } catch (err) {
//     console.error("❌ resolve-phones trigger error:", err);
//     alert(`Error: ${err.message || "Failed to initiate calling. Please try again."}`);
//   }
// };
  // Filter handlers
  const handleFilterClick = (event) => {
    event.stopPropagation();
    event.preventDefault();
    // Get the button element - use the ref which should be the actual button
    const buttonElement = filterButtonRef.current;
    // Fallback to currentTarget if ref is not available
    const elementToUse = buttonElement || event.currentTarget;
    // Ensure we have a valid DOM element
    if (elementToUse && elementToUse instanceof HTMLElement) {
      setFilterAnchorEl(elementToUse);
    }
  };
  const handleFilterClose = () => {
    setFilterAnchorEl(null);
  };
  const handleFilterToggle = (filterType) => {
    const newFilters = new Set(selectedFilters);
    if (newFilters.has(filterType)) {
      newFilters.delete(filterType);
    } else {
      newFilters.add(filterType);
    }
    setSelectedFilters(newFilters);
  };
  // Apply filters to data
  const getFilteredData = () => {
    if (selectedFilters.size === 0) {
      return data;
    }
    // Separate filters into categories
    const sizeFilters = ['enterprise', 'large', 'medium', 'small'];
    const availabilityFilters = ['with-phone', 'with-linkedin', 'with-website', 'with-summary'];
    const selectedSizeFilters = Array.from(selectedFilters).filter(f => sizeFilters.includes(f));
    const selectedAvailabilityFilters = Array.from(selectedFilters).filter(f => availabilityFilters.includes(f));
    // If no filters selected, return all data
    if (selectedSizeFilters.length === 0 && selectedAvailabilityFilters.length === 0) {
      return data;
    }
    return data.filter((company, index) => {
      // Check Company Size filters (OR logic within this category)
      let matchesSizeCategory = true;
      if (selectedSizeFilters.length > 0) {
        matchesSizeCategory = false; // Must match at least one size filter
        for (const filterType of selectedSizeFilters) {
          let matchesThisSize = false;
          switch (filterType) {
            case 'enterprise':
              const count1 = parseInt(company.employeeCount) || 0;
              matchesThisSize = count1 >= 200;
              break;
            case 'large':
              const count2 = parseInt(company.employeeCount) || 0;
              matchesThisSize = count2 >= 50 && count2 < 200;
              break;
            case 'medium':
              const count3 = parseInt(company.employeeCount) || 0;
              matchesThisSize = count3 >= 10 && count3 < 50;
              break;
            case 'small':
              const count4 = parseInt(company.employeeCount) || 0;
              matchesThisSize = count4 < 10 && count4 > 0;
              break;
          }
          if (matchesThisSize) {
            matchesSizeCategory = true; // Matches at least one size filter
            break;
          }
        }
      }
      // Check Data Availability filters (OR logic within this category)
      let matchesAvailabilityCategory = true;
      if (selectedAvailabilityFilters.length > 0) {
        matchesAvailabilityCategory = false; // Must match at least one availability filter
        for (const filterType of selectedAvailabilityFilters) {
          let matchesThisAvailability = false;
          switch (filterType) {
            case 'with-phone':
              matchesThisAvailability = !!(company.phone || phoneData[company.id]);
              break;
            case 'with-linkedin':
              matchesThisAvailability = !!(company.linkedinProfile);
              break;
            case 'with-website':
              matchesThisAvailability = !!(company.website);
              break;
            case 'with-summary':
              // Check if company has a sales summary with actual travel content
              const companyId = company.id || company.company_id || company.apollo_organization_id;
              const summary = companySummaries[companyId] || companySummaries[String(companyId)];
              // First check: Summary must exist and not be null/empty
              if (!summary || summary === null || typeof summary !== 'string' || summary.trim().length === 0) {
                matchesThisAvailability = false;
              } else {
                const summaryLower = summary.toLowerCase().trim();
                // Second check: Exclude "not related" and "no business trip" messages
                const noSummaryPhrases = [
                  'not related',
                  'no business trip',
                  'no.*travel.*posts found',
                  'no.*posts found',
                  'may not have posted about travel',
                  'no travel-related posts',
                  'no business trip or travel',
                  'no travel activity',
                  'no travel data',
                  'the company may not have posted',
                  'no business trip or travel-related posts found',
                  'no business trip.*travel-related posts',
                  'company may not have posted'
                ];
                const isNoSummaryMessage = noSummaryPhrases.some(phrase => {
                  const regex = new RegExp(phrase.replace(/\*/g, '.*'), 'i');
                  return regex.test(summaryLower);
                });
                if (isNoSummaryMessage) {
                  matchesThisAvailability = false;
                } else {
                  // Third check: Summary must contain business trip/travel keywords
                  const travelKeywords = [
                    'travel', 'trip', 'business trip', 'traveling', 'travelling',
                    'visit', 'visiting', 'destination', 'flight', 'hotel',
                    'conference', 'meeting', 'event', 'exhibition', 'trade show',
                    'client visit', 'site visit', 'project visit', 'business travel',
                    'international travel', 'domestic travel', 'corporate travel',
                    'travel activity', 'travel summary', 'travel insights'
                  ];
                  matchesThisAvailability = travelKeywords.some(keyword => summaryLower.includes(keyword));
                }
              }
              break;
          }
          if (matchesThisAvailability) {
            matchesAvailabilityCategory = true; // Matches at least one availability filter
            break;
          }
        }
      }
      // AND logic between categories: must match both size AND availability (if both are selected)
      return matchesSizeCategory && matchesAvailabilityCategory;
    });
  };
  const getFilteredEmployeeData = () => {
    if (selectedFilters.size === 0) {
      return employeeData;
    }
    // Employee-specific availability filters
    const employeeAvailabilityFilters = ['with-linkedin', 'with-phone', 'with-email', 'with-summary'];
    const selectedEmployeeFilters = Array.from(selectedFilters).filter(f => employeeAvailabilityFilters.includes(f));
    // If no employee filters selected, return all employee data
    if (selectedEmployeeFilters.length === 0) {
      return employeeData;
    }
    return employeeData.filter((employee) => {
      // Check Employee Data Availability filters (AND logic - must match ALL selected filters)
      let matchesAllFilters = true;
      for (const filterType of selectedEmployeeFilters) {
        let matchesThisFilter = false;
        switch (filterType) {
          case 'with-linkedin':
            matchesThisFilter = !!(employee.linkedin_url || employee.linkedin_profile || employee.linkedinProfile);
            break;
          case 'with-phone':
            // Only check company's phone number (NOT employee personal phone)
            let hasCompanyPhone = false;
            try {
              let fullEmployeeData = null;
              if (employee.employee_data) {
                fullEmployeeData = typeof employee.employee_data === 'string' 
                  ? JSON.parse(employee.employee_data) 
                  : employee.employee_data;
              }
              const org = fullEmployeeData?.organization || employee.organization || {};
              // Check company phone from organization data
              let companyPhone = org.phone || org.phone_number || employee.company_phone || '';
              if (!companyPhone) {
                // Check nested phone structures
                companyPhone = org.primary_phone?.number || 
                              org.primary_phone?.sanitized_number ||
                              org.sanitized_phone ||
                              org.phone_numbers?.[0]?.number ||
                              org.phone_numbers?.[0]?.sanitized_number ||
                              '';
              }
              hasCompanyPhone = !!(companyPhone && companyPhone.trim());
              // Also check if company exists in data array and has phone
              if (!hasCompanyPhone) {
                const empCompanyId = normalizeCompanyId(org.id || employee.organization_id || employee.company_id);
                const company = data.find(c => {
                  const cId = normalizeCompanyId(c.id || c.company_id || c.apollo_organization_id);
                  return cId && empCompanyId && cId === empCompanyId;
                });
                if (company?.phone) {
                  hasCompanyPhone = !!(company.phone && company.phone.trim());
                }
              }
              // Also check phoneData state (for fetched/revealed company phone numbers)
              if (!hasCompanyPhone) {
                const empCompanyId = normalizeCompanyId(org.id || employee.organization_id || employee.company_id);
                if (phoneData[empCompanyId]?.phone) {
                  hasCompanyPhone = !!(phoneData[empCompanyId].phone && phoneData[empCompanyId].phone.trim());
                }
              }
            } catch (e) {
              // Ignore parse errors and other errors
            }
            matchesThisFilter = hasCompanyPhone;
            break;
          case 'with-email':
            // Only show employees whose emails have been REVEALED in the UI
            const empId = getEmployeeId(employee);
            let hasRevealedEmail = false;
            if (empId) {
              const revealedEmail = revealedContacts[empId]?.email;
              // Check if email has been revealed (and is not 'not_found')
              if (revealedEmail && revealedEmail !== 'not_found') {
                hasRevealedEmail = true;
              }
            }
            matchesThisFilter = hasRevealedEmail;
            break;
          case 'with-summary':
            // Check if employee's company has a sales summary with actual travel content
            let fullEmployeeData = null;
            if (employee.employee_data) {
              try {
                fullEmployeeData = typeof employee.employee_data === 'string' 
                  ? JSON.parse(employee.employee_data) 
                  : employee.employee_data;
              } catch (e) {
                // Ignore parse errors
              }
            }
            const org = fullEmployeeData?.organization || employee.organization || {};
            const companyId = normalizeCompanyId(org.id || employee.company_id || employee.organization_id);
            // Check summary from multiple sources
            let summary = null;
            // First, check companySummaries prop
            if (companyId) {
              summary = companySummaries[companyId] || companySummaries[String(companyId)];
            }
            // If not found, check if company exists in data array and has summary
            if (!summary && companyId) {
              const company = data.find(c => {
                const cId = normalizeCompanyId(c.id || c.company_id || c.apollo_organization_id);
                return cId && companyId && cId === companyId;
              });
              if (company?.summary) {
                summary = company.summary;
              }
            }
            // If still not found, check nested organization data
            if (!summary && org.summary) {
              summary = org.summary;
            }
            // First check: Summary must exist, be a string, and have meaningful content
            if (!summary || summary === null || typeof summary !== 'string') {
              matchesThisFilter = false;
            } else {
              const summaryTrimmed = summary.trim();
              // Check if summary is empty or just whitespace
              if (summaryTrimmed.length === 0) {
                matchesThisFilter = false;
              } else {
                const summaryLower = summaryTrimmed.toLowerCase();
                // CRITICAL: Early exit - If summary contains ANY indication of "no posts found" or "no activity"
                // This must be checked FIRST before any other validation
                const hasNoPostsIndicators = 
                  summaryLower.includes('no linkedin posts found') || 
                  summaryLower.includes('no posts found') ||
                  summaryLower.includes('linkedin page may not have') ||
                  summaryLower.includes('may not have recent activity') ||
                  summaryLower.includes('no recent activity') ||
                  summaryLower.startsWith('no ') || 
                  summaryLower.startsWith('not ') ||
                  summaryLower.includes('company\'s linkedin page may not have') ||
                  summaryLower.includes('companys linkedin page may not have');
                if (hasNoPostsIndicators) {
                  matchesThisFilter = false;
                } else {
                  // Second check: Exclude "not related", "no posts found", and similar messages
                  // First check for exact patterns that indicate no summary
                  const exactNoSummaryPatterns = [
                    /no linkedin posts found/i,
                    /no posts found/i,
                    /linkedin page may not have/i,
                    /may not have recent activity/i,
                    /not related/i
                  ];
                  const hasExactNoSummaryPattern = exactNoSummaryPatterns.some(pattern => pattern.test(summaryLower));
                  // Also check phrase patterns
                  const noSummaryPhrases = [
                    'not related',
                    'no business trip',
                    'no.*travel.*posts found',
                    'no.*posts found',
                    'no linkedin posts found',
                    'no linkedin.*posts',
                    'linkedin.*may not have',
                    'may not have posted',
                    'may not have recent activity',
                    'no recent activity',
                    'no posts',
                    'no activity',
                    'may not have posted about travel',
                    'no travel-related posts',
                    'no business trip or travel',
                    'no travel activity',
                    'no travel data',
                    'the company may not have posted',
                    'no business trip or travel-related posts found',
                    'no business trip.*travel-related posts',
                    'company may not have posted',
                    'linkedin page.*may not have',
                    'no linkedin.*activity',
                    'linkedin page may not have',
                    'company.*linkedin page may not have',
                    'no linkedin posts',
                    'no posts found for',
                    'company.*linkedin.*may not'
                  ];
                  const isNoSummaryMessage = hasExactNoSummaryPattern || noSummaryPhrases.some(phrase => {
                    const regex = new RegExp(phrase.replace(/\*/g, '.*'), 'i');
                    return regex.test(summaryLower);
                  });
                  if (isNoSummaryMessage) {
                    matchesThisFilter = false;
                  } else {
                    // Third check: Summary MUST contain business trip/travel keywords (strict requirement)
                    const travelKeywords = [
                      'travel', 'trip', 'business trip', 'traveling', 'travelling',
                      'visit', 'visiting', 'destination', 'flight', 'hotel',
                      'conference', 'meeting', 'event', 'exhibition', 'trade show',
                      'client visit', 'site visit', 'project visit', 'business travel',
                      'international travel', 'domestic travel', 'corporate travel',
                      'travel activity', 'travel summary', 'travel insights'
                    ];
                    const hasTravelKeywords = travelKeywords.some(keyword => summaryLower.includes(keyword));
                    // STRICT: Only match if summary has travel keywords (meaningful travel content)
                    // If no travel keywords found, it's not a valid sales summary
                    // This is the FINAL check - if no travel keywords, definitely exclude
                    matchesThisFilter = hasTravelKeywords;
                  }
                }
              }
            }
            // FINAL SAFETY CHECK: If matchesThisFilter is still true but summary doesn't have travel content, set to false
            // This ensures we never accidentally include summaries that shouldn't be shown
            if (matchesThisFilter && summary) {
              const summaryLower = (summary.trim().toLowerCase());
              const travelKeywords = ['travel', 'trip', 'business trip', 'visit', 'conference', 'meeting', 'flight', 'hotel'];
              const hasTravelContent = travelKeywords.some(keyword => summaryLower.includes(keyword));
              if (!hasTravelContent) {
                matchesThisFilter = false;
              }
            }
            break;
        }
        if (!matchesThisFilter) {
          matchesAllFilters = false; // If any filter doesn't match, exclude this employee
          break;
        }
      }
      return matchesAllFilters;
    });
  };
  const handleFilterSelect = (filterType) => {
    let filteredCompanies = new Set();
    switch (filterType) {
      case 'enterprise':
        data.forEach((company, index) => {
          const count = parseInt(company.employeeCount);
          if (count >= 200) {
            filteredCompanies.add(company.id || index);
          }
        });
        break;
      case 'large':
        data.forEach((company, index) => {
          const count = parseInt(company.employeeCount);
          if (count >= 50 && count < 200) {
            filteredCompanies.add(company.id || index);
          }
        });
        break;
      case 'medium':
        data.forEach((company, index) => {
          const count = parseInt(company.employeeCount);
          if (count >= 10 && count < 50) {
            filteredCompanies.add(company.id || index);
          }
        });
        break;
      case 'small':
        data.forEach((company, index) => {
          const count = parseInt(company.employeeCount);
          if (count < 10 && count > 0) {
            filteredCompanies.add(company.id || index);
          }
        });
        break;
      case 'with-phone':
        data.forEach((company, index) => {
          if (company.phone || phoneData[company.id]) {
            filteredCompanies.add(company.id || index);
          }
        });
        break;
      case 'with-linkedin':
        data.forEach((company, index) => {
          if (company.linkedinProfile) {
            filteredCompanies.add(company.id || index);
          }
        });
        break;
      case 'with-website':
        data.forEach((company, index) => {
          if (company.website) {
            filteredCompanies.add(company.id || index);
          }
        });
        break;
      default:
        break;
    }
    setSelectedCompanies(filteredCompanies);
    setShowAITrigger(filteredCompanies.size > 0);
    setSelectAll(filteredCompanies.size === data.length);
    handleFilterClose();
  };
  // Phone number handler
  const handleGetContact = async (company) => {
    // Extract domain from website URL or use direct domain field
    const extractDomain = (url) => {
      if (!url) return null;
      try {
        // Remove protocol and www
        let domain = url.replace(/^https?:\/\/(www\.)?/, '');
        // Remove path and query params
        domain = domain.split('/')[0].split('?')[0];
        return domain;
      } catch {
        return null;
      }
    };
    const companyDomain = company.domain || extractDomain(company.website) || extractDomain(company.linkedinProfile);
    const companyName = company.companyName || company.username || company.name;
    const companyId = company.id || companyDomain;
    // Validate required fields
      if (!companyDomain || !companyName) {
        console.error(`❌ Cannot get phone number: Missing ${!companyName ? 'company name' : 'company domain/website'}`);
        setPhoneError(prev => ({ 
          ...prev, 
          [companyId]: `Missing ${!companyName ? 'company name' : 'company domain/website'}` 
        }));
        return;
      }
    // Check if we already have phone data
    if (phoneData[companyId]) {
      return;
    }
    // Set loading state
    setPhoneLoading(prev => ({ ...prev, [companyId]: true }));
    setPhoneError(prev => ({ ...prev, [companyId]: null }));
    try {
      console.log('Fetching phone for company');
      const phoneResult = await getDecisionMakerPhone(
        companyDomain,
        companyName,
        (update) => {
          if (update.status === 'processing') {
            // Could show a toast or update UI with progress
            }
        }
      );
      // Handle multiple possible data formats from Cloud Run service
      let phoneInfo = null;
      // Format 1: Data inside 'data' object (current Cloud Run format)
      if (phoneResult.data && (phoneResult.data.phoneNumber || phoneResult.data.phone)) {
        // Normalize phone number - remove all spaces but preserve dashes before storing
        const rawPhone = phoneResult.data.phoneNumber || phoneResult.data.phone || '';
        phoneInfo = {
          phone: rawPhone.replace(/\s+/g, ""), // Remove spaces only, preserve dashes (-)
          name: phoneResult.data.personName || phoneResult.data.name || 'Decision Maker',
          title: phoneResult.data.title || 'Decision Maker',
          type: phoneResult.data.phoneType || phoneResult.data.type || 'mobile',
          confidence: phoneResult.data.confidence || 'high',
          status: phoneResult.data.status || 'valid',
        };
      }
      // Format 2: Direct fields at top level
      else if (phoneResult.phoneNumber || phoneResult.phone) {
        // Normalize phone number - remove all spaces but preserve dashes before storing
        const rawPhone = phoneResult.phoneNumber || phoneResult.phone || '';
        phoneInfo = {
          phone: rawPhone.replace(/\s+/g, ""), // Remove spaces only, preserve dashes (-)
          name: phoneResult.personName || phoneResult.name || 'Decision Maker',
          title: phoneResult.title || 'Decision Maker',
          type: phoneResult.phoneType || phoneResult.type || 'mobile',
          confidence: phoneResult.confidence || 'high',
          status: phoneResult.status || 'valid',
        };
      }
      // Format 3: Old format (nested people array)
      else if (phoneResult.people && phoneResult.people.length > 0) {
        const firstPerson = phoneResult.people[0];
        const firstPhone = firstPerson.phone_numbers?.[0];
        if (firstPhone) {
          // Normalize phone number - remove all spaces but preserve dashes before storing
          const rawPhone = firstPhone.sanitized_number || firstPhone.raw_number || '';
          phoneInfo = {
            phone: rawPhone.replace(/\s+/g, ""), // Remove spaces only, preserve dashes (-)
            name: `${firstPerson.first_name || ''} ${firstPerson.last_name || ''}`.trim() || 'Decision Maker',
            title: firstPerson.title || 'Decision Maker',
            type: firstPhone.type_cd || firstPhone.type || 'mobile',
            confidence: firstPhone.confidence_cd || firstPhone.confidence || 'high',
            status: firstPhone.status_cd || firstPhone.status || 'valid',
          };
        }
      }
      if (phoneInfo && phoneInfo.phone) {
        setPhoneData(prev => ({ ...prev, [companyId]: phoneInfo }));
        // Success - phone is now displayed on the card (no alert needed)
        } else {
        console.error('❌ Phone data structure:', phoneResult);
        throw new Error('No phone number found for decision maker');
      }
    } catch (error) {
      console.error('❌ Error getting phone:', error);
      setPhoneError(prev => ({ 
        ...prev, 
        [companyId]: error.message || 'Failed to get phone number' 
      }));
      // Error is logged to console - no popup needed
    } finally {
      setPhoneLoading(prev => ({ ...prev, [companyId]: false }));
    }
  };
  // Employee fetching handler
  const handleGetEmployees = async (company) => {
    const companyId = company.id || company.domain;
    const companyName = company.companyName || company.username || company.name;
    // IMPORTANT: Use Apollo organization ID (NOT domain) for employee search
    // Apollo's people search works with organization_ids, not domains
    let companyIdentifier = company.id;
    // Fallback to domain only if ID looks invalid (generated random string)
    if (!companyIdentifier || companyIdentifier.includes('apollo_unknown') || companyIdentifier.includes('_0.')) {
      companyIdentifier = company.domain;
      }
    // Validate identifier
    if (!companyIdentifier || companyIdentifier.includes('apollo_unknown')) {
      console.error('❌ Invalid company identifier:', companyIdentifier);
      setEmployeeError(prev => ({ 
        ...prev, 
        [companyId]: 'Cannot fetch employees: Invalid company ID' 
      }));
      return;
    }
    // Check if we already have employee data
    if (fetchedEmployeeData[companyId] && fetchedEmployeeData[companyId].length > 0) {
      // // Disabled for performance
      // Just open the dialog with existing data
      setSelectedEmployeeCompany(company);
      setEmployeeDialogOpen(true);
      return;
    }
    // Set loading state
    setEmployeeLoading(prev => ({ ...prev, [companyId]: true }));
    setEmployeeError(prev => ({ ...prev, [companyId]: null }));
    try {
      // Call backend to fetch employees
      // Backend will check database first, then call Apollo if no results
      let response;
      try {
        response = await fetch(`${API_BASE_URL}/apollo-leads/get-employees`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id: companyIdentifier,
            limit: 25  // Default: 25 employees
          }),
        });
      } catch (fetchError) {
        // Network error - connection failed completely
        console.error('❌ Network error fetching employees:', fetchError);
        setEmployeeError(prev => ({ 
          ...prev, 
          [companyId]: 'Network error: Unable to connect to server. Please check your connection and try again.' 
        }));
        setFetchedEmployeeData(prev => ({ ...prev, [companyId]: [] }));
        setSelectedEmployeeCompany(company);
        setEmployeeDialogOpen(true);
        setEmployeeLoading(prev => ({ ...prev, [companyId]: false }));
        return;
      }
      if (!response.ok) {
        // If response is not ok, try to get error message
        let errorMessage = `HTTP error! status: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          // If can't parse error, use status
        }
        throw new Error(errorMessage);
      }
      let data;
      try {
        data = await response.json();
      } catch (jsonError) {
        // Empty or invalid response
        console.error('❌ Invalid response from server:', jsonError);
        setEmployeeError(prev => ({ 
          ...prev, 
          [companyId]: 'Server returned an invalid response. Please try again.' 
        }));
        setFetchedEmployeeData(prev => ({ ...prev, [companyId]: [] }));
        setSelectedEmployeeCompany(company);
        setEmployeeDialogOpen(true);
        setEmployeeLoading(prev => ({ ...prev, [companyId]: false }));
        return;
      }
      if (data.success && data.employees && data.employees.length > 0) {
        const cacheMsg = data.from_cache 
          ? `✅ Found ${data.employees.length} employees (from cache, ${data.cache_age_days} days old)` 
          : `✅ Found ${data.employees.length} employees (from Apollo API)`;
        setFetchedEmployeeData(prev => ({ ...prev, [companyId]: data.employees }));
        // Store cache info
        if (data.from_cache !== undefined) {
          setEmployeeCacheInfo(prev => ({ 
            ...prev, 
            [companyId]: { 
              from_cache: data.from_cache, 
              cache_age_days: data.cache_age_days || 0 
            } 
          }));
        }
        // Also update the company's cLevelExecutives in the selected company if dialog is open
        if (selectedCompany && (selectedCompany.id === company.id || selectedCompany.domain === company.domain)) {
          setSelectedCompany(prev => ({ ...prev, cLevelExecutives: data.employees }));
        }
        // Open employee dialog to show results
        setSelectedEmployeeCompany(company);
        setEmployeeDialogOpen(true);
      } else {
        setFetchedEmployeeData(prev => ({ ...prev, [companyId]: [] }));
        // Check if backend indicated it will try Apollo or if it already tried
        if (data.trying_apollo || data.from_apollo === false) {
          // Backend is trying Apollo or already tried - wait a bit and show loading
          setEmployeeError(prev => ({ ...prev, [companyId]: null }));
        } else {
          // No employees found after database and Apollo check - don't set error, just show empty state
          setEmployeeError(prev => ({ ...prev, [companyId]: null }));
        }
        // Always open dialog to show status (loading, error, or empty)
        setSelectedEmployeeCompany(company);
        setEmployeeDialogOpen(true);
      }
    } catch (error) {
      console.error('❌ Error getting employees:', error);
      setEmployeeError(prev => ({ 
        ...prev, 
        [companyId]: error.message || 'Failed to get employees. Please try again.' 
      }));
      // Open dialog even on error so user can see the error message
      setSelectedEmployeeCompany(company);
      setEmployeeDialogOpen(true);
      // Set empty array so dialog can render
      setFetchedEmployeeData(prev => ({ ...prev, [companyId]: [] }));
    } finally {
      setEmployeeLoading(prev => ({ ...prev, [companyId]: false }));
    }
  };
  // Handler to reveal employee phone number
  const handleRevealPhone = async (employee) => {
    const employeeId = getEmployeeId(employee);
    if (!employeeId) {
      console.warn('Cannot reveal phone: No employee ID available');
      return;
    }
    // Check if already revealed (but allow retry if not_found)
    const currentPhone = revealedContacts[employeeId]?.phone;
    if (currentPhone && currentPhone !== 'not_found') {
      return;
    }
    // Show confirmation dialog
    setPhoneConfirmDialog({
      open: true,
      employee: employee
    });
  };
  // Process phone reveal after confirmation
  const processPhoneReveal = async (employee) => {
    const employeeId = getEmployeeId(employee);
    if (!employeeId) {
      console.warn('Cannot reveal phone: No employee ID available');
      return;
    }
    const personId = employee.id || employee.apollo_id;
    // Set loading state
    setRevealingContacts(prev => ({
      ...prev,
      [employeeId]: { ...prev[employeeId], phone: true }
    }));
    try {
      // First check if phone is already available in employee data
      if (employee.phone && employee.phone.trim() !== '') {
        // Normalize phone number - remove all spaces but preserve dashes before storing
        const normalizedPhone = (employee.phone || '').replace(/\s+/g, ""); // Remove spaces only, preserve dashes (-)
        setRevealedContacts(prev => ({
          ...prev,
          [employeeId]: { ...prev[employeeId], phone: normalizedPhone }
        }));
        // Phone already available - no alert needed
        setRevealingContacts(prev => ({
          ...prev,
          [employeeId]: { ...prev[employeeId], phone: false }
        }));
        return;
      }
      // // Disabled for performance
      const response = await fetch(`${API_BASE_URL}/apollo-leads/reveal-phone`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          person_id: personId,
          employee_name: employee.name
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }
      // Handle ANY immediate success with phone number (cached OR instant reveal)
      if (data.success && data.phone) {
        if (data.from_cache) {
          console.log('Phone from cache');
        } else {
          console.log('Phone revealed instantly');
        }
        // Normalize phone number - remove all spaces but preserve dashes before storing
        const normalizedPhone = (data.phone || '').replace(/\s+/g, ""); // Remove spaces only, preserve dashes (-)
        setRevealedContacts(prev => ({
          ...prev,
          [employeeId]: { ...prev[employeeId], phone: normalizedPhone }
        }));
        // Clear loading state
        setRevealingContacts(prev => ({
          ...prev,
          [employeeId]: { ...prev[employeeId], phone: false }
        }));
        // Phone number revealed - no alert needed (displayed in UI)
        return;
      }
      // Handle "processing" status (webhook-based reveal)
      if (data.status === 'processing') {
        console.log('Phone reveal in progress');
        // Start polling for phone reveal status
        let pollAttempts = 0;
        const maxPollAttempts = 60; // Poll for up to 5 minutes (60 * 5 seconds)
        const pollInterval = setInterval(async () => {
          pollAttempts++;
          try {
            const statusResponse = await fetch(`${API_BASE_URL}/apollo-leads/check-phone-status/${personId}`);
            const statusData = await statusResponse.json();
            if (statusData.success && statusData.phone) {
              // Phone received from webhook!
              clearInterval(pollInterval);
              // Normalize phone number - remove all spaces before storing
              const normalizedPhone = (statusData.phone || '').replace(/\s+/g, "");
              setRevealedContacts(prev => ({
                ...prev,
                [employeeId]: { ...prev[employeeId], phone: normalizedPhone }
              }));
              // Phone number revealed - no alert needed (displayed in UI)
              setRevealingContacts(prev => ({
                ...prev,
                [employeeId]: { ...prev[employeeId], phone: false }
              }));
            } else if (statusData.status === 'processing') {
              // Still processing, continue polling
              } else {
              // Failed or not found
              clearInterval(pollInterval);
              // Phone number not available - set not_found flag
              setRevealedContacts(prev => ({
                ...prev,
                [employeeId]: { ...prev[employeeId], phone: 'not_found' }
              }));
              setRevealingContacts(prev => ({
                ...prev,
                [employeeId]: { ...prev[employeeId], phone: false }
              }));
            }
            // Timeout after max attempts
            if (pollAttempts >= maxPollAttempts) {
              clearInterval(pollInterval);
              // Timeout - set not_found flag
              setRevealedContacts(prev => ({
                ...prev,
                [employeeId]: { ...prev[employeeId], phone: 'not_found' }
              }));
              setRevealingContacts(prev => ({
                ...prev,
                [employeeId]: { ...prev[employeeId], phone: false }
              }));
            }
          } catch (pollError) {
            console.error('❌ Polling error:', pollError);
          }
        }, 5000); // Poll every 5 seconds
        // Don't clear loading state yet - keep it while polling
        // The polling interval will clear it when done
        return;
      }
      // Handle immediate success (shouldn't happen with webhook, but just in case)
      if (data.success && data.phone) {
        // Normalize phone number - remove all spaces before storing
        const normalizedPhone = (data.phone || '').replace(/\s+/g, "");
        setRevealedContacts(prev => ({
          ...prev,
          [employeeId]: { ...prev[employeeId], phone: normalizedPhone }
        }));
        // Phone number revealed - no alert needed (displayed in UI)
        setRevealingContacts(prev => ({
          ...prev,
          [employeeId]: { ...prev[employeeId], phone: false }
        }));
      } else {
        throw new Error(data.error || 'No phone number found');
      }
    } catch (error) {
      console.error('❌ Error revealing phone:', error);
      // Handle specific error messages
      let errorMsg = error.message;
      const isNotFound = error.message.includes('404') || error.message.includes('not found') || error.message.includes('not available') || error.message.includes('No phone number found');
      if (isNotFound) {
        // Set not_found flag when phone is not available
        setRevealedContacts(prev => ({
          ...prev,
          [employeeId]: { ...prev[employeeId], phone: 'not_found' }
        }));
        errorMsg = `❌ Phone Number Not Available\n\nThis person's phone number is not available in Apollo's database.\n\nPossible reasons:\n• Apollo doesn't have this person's phone\n• Person ID is outdated\n• Phone data requires higher subscription tier\n\n💡 Try revealing email instead (1 credit)`;
      } else if (error.message.includes('402') || error.message.includes('credits')) {
        errorMsg = `❌ Insufficient Credits\n\nYour Apollo account doesn't have enough credits.\n\n💰 Phone reveals cost 8 credits each.`;
      } else if (error.message.includes('person ID')) {
        // Set not_found flag when person ID is missing
        setRevealedContacts(prev => ({
          ...prev,
          [employeeId]: { ...prev[employeeId], phone: 'not_found' }
        }));
        errorMsg = `❌ Cannot Reveal Phone\n\nApollo person ID is not available for this employee.\n\n💡 This usually means the employee data is incomplete.`;
      }
      // Error - no alert needed (UI shows loading stopped and user can see lock button is available again)
      setRevealingContacts(prev => ({
        ...prev,
        [employeeId]: { ...prev[employeeId], phone: false }
      }));
    }
  };
  // Handler to reveal employee email (1 credit - INSTANT response, no webhook)
  const handleRevealEmail = async (employee) => {
    const employeeId = getEmployeeId(employee);
    if (!employeeId) {
      console.warn('Cannot reveal email: No employee ID available');
      return;
    }
    const personId = employee.id || employee.apollo_id;
    // Check if already revealed (but allow retry if not_found)
    const currentEmail = revealedContacts[employeeId]?.email;
    if (currentEmail && currentEmail !== 'not_found') {
      return;
    }
    // Email reveals cost 1 credit (8x cheaper than phone - 8 credits)
    // Note: No confirmation needed for emails (only 1 credit vs 8 for phone)
    // Set loading state
    setRevealingContacts(prev => ({
      ...prev,
      [employeeId]: { ...prev[employeeId], email: true }
    }));
    try {
      // // Disabled for performance
      if (!personId) {
        throw new Error('Apollo person ID not available for this employee. Cannot reveal email without person ID.');
      }
      const response = await fetch(`${API_BASE_URL}/apollo-leads/reveal-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          person_id: personId,
          employee_name: employee.name
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }
      if (data.success && data.email) {
        if (data.from_cache) {
          console.log('Email from cache');
        } else {
          console.log('Email revealed instantly');
        }
        setRevealedContacts(prev => ({
          ...prev,
          [employeeId]: { ...prev[employeeId], email: data.email }
        }));
        // Email revealed - no alert needed (displayed in UI)
      } else {
        throw new Error(data.error || 'Email not found');
      }
    } catch (error) {
      console.error('❌ Error revealing email:', error);
      // Handle specific error messages
      let errorMsg = error.message;
      const isNotFound = error.message.includes('404') || error.message.includes('not found') || error.message.includes('not available') || error.message.includes('Email not found');
      if (isNotFound) {
        // Set not_found flag when email is not available
        setRevealedContacts(prev => ({
          ...prev,
          [employeeId]: { ...prev[employeeId], email: 'not_found' }
        }));
        errorMsg = `❌ Email Not Available\n\nThis person's email is not available in Apollo's database.\n\nPossible reasons:\n• Apollo doesn't have this person's email\n• Person ID is outdated\n• Email data requires higher subscription tier`;
      } else if (error.message.includes('402') || error.message.includes('credits')) {
        errorMsg = `❌ Insufficient Credits\n\nYour Apollo account doesn't have enough credits.\n\n💰 Email reveals cost 1 credit each.`;
      } else if (error.message.includes('person ID')) {
        // Set not_found flag when person ID is missing
        setRevealedContacts(prev => ({
          ...prev,
          [employeeId]: { ...prev[employeeId], email: 'not_found' }
        }));
        errorMsg = `❌ Cannot Reveal Email\n\nApollo person ID is not available for this employee.`;
      }
      // Error - no alert needed (UI shows loading stopped and user can see lock button is available again)
    } finally {
      // Clear loading state
      setRevealingContacts(prev => ({
        ...prev,
        [employeeId]: { ...prev[employeeId], email: false }
      }));
    }
  };
  // Handler to send LinkedIn connection requests for selected employees in dialog
  const handleSendLinkedInConnectionsFromDialog = async () => {
    if (selectedDialogEmployees.size === 0) {
      push({ 
        variant: 'error', 
        title: 'No Selection', 
        description: 'Please select at least one employee to send LinkedIn connection requests.' 
      });
      return;
    }
    const companyId = selectedEmployeeCompany?.id || selectedEmployeeCompany?.domain;
    const employees = fetchedEmployeeData[companyId] || [];
    const filteredEmployees = filterEmployeesByRole(employees, employeeRoleFilter);
    const employeesToConnect = Array.from(selectedDialogEmployees)
      .map(index => {
        const employee = filteredEmployees[index];
        if (!employee) return null;
        const linkedinUrl = employee.linkedin_url || 
                           employee.organization?.linkedin_url || 
                           employee.company_linkedin_url;
        if (!linkedinUrl) return null;
        return {
          name: employee.name || `${employee.first_name || ''} ${employee.last_name || ''}`.trim(),
          linkedin_url: linkedinUrl,
          title: employee.title || employee.position,
          company: employee.company_name || employee.organization?.name
        };
      })
      .filter(Boolean);
    if (employeesToConnect.length === 0) {
      push({ 
        variant: 'error', 
        title: 'No LinkedIn URLs', 
        description: 'Selected employees do not have LinkedIn profile URLs.' 
      });
      return;
    }
    try {
      const userId = getUserId();
      const url = `${API_BASE_URL}/linkedin/send-connections?userId=${userId}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employees: employeesToConnect,
          userId: userId
        })
      });
      const data = await response.json();
      // Check HTTP status code first
      if (!response.ok) {
        const errorMessage = data.detail || data.error || data.message || `HTTP ${response.status} error`;
        push({ 
          variant: 'error', 
          title: 'Failed', 
          description: `Failed to send connection requests: ${errorMessage}` 
        });
        return;
      }
      // Check the actual connection request results
      const connectionResults = data.results?.connection_requests || {};
      const successful = connectionResults.successful || 0;
      const failed = connectionResults.failed || 0;
      const total = connectionResults.total || employeesToConnect.length;
      // Check details array for error messages
      const failedDetails = data.details?.filter(d => !d.success) || [];
      const errorMessages = failedDetails
        .map(d => d.error || d.message || d.detail)
        .filter(Boolean);
      // If all failed or no successful requests
      if (failed > 0 && successful === 0) {
        const errorMessage = errorMessages[0] || data.error || data.detail || 'All connection requests failed';
        push({ 
          variant: 'error', 
          title: 'Failed', 
          description: `Failed to send connection requests: ${errorMessage}` 
        });
      } 
      // If some failed (partial success)
      else if (failed > 0 && successful > 0) {
        const errorMessage = errorMessages[0] || 'Some connection requests failed';
        push({ 
          variant: 'error', 
          title: 'Partially Failed', 
          description: `Sent ${successful} request(s), but ${failed} failed: ${errorMessage}` 
        });
      }
      // If all successful
      else if (successful > 0 && failed === 0) {
        push({ 
          variant: 'success', 
          title: 'Successfully Sent', 
          description: `Successfully sent ${successful} LinkedIn connection request(s)!` 
        });
        // Clear selection after successful send
        setSelectedDialogEmployees(new Set());
      }
      // Fallback
      else {
        push({ 
          variant: 'error', 
          title: 'Failed', 
          description: `Failed to send connection requests: ${data.error || data.detail || 'Unknown error'}` 
        });
      }
    } catch (error) {
      console.error('Error sending LinkedIn connections:', error);
      push({ 
        variant: 'error', 
        title: 'Failed', 
        description: `Failed to send connection requests: ${error.message}` 
      });
    }
  };
  const renderCLevelExecutives = (executives) => {
    if (!executives || executives.length === 0) {
      return <p className="text-sm text-muted-foreground">No executive data available</p>;
    }
    // // Disabled for performance
    return (
      <div className="flex flex-col gap-1">
        {executives.map((exec, index) => (
          <Card key={index} className="border p-1">
            <div className="flex items-center gap-1">
              <Avatar className="w-8 h-8 bg-primary">
                <Person className="h-4 w-4" />
              </Avatar>
              <div className="flex-1">
                <p className="text-sm font-bold">
                  {exec.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {exec.position}
                </p>
              </div>
              <div className="flex gap-0.5">
                {exec.email && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="sm" asChild>
                          <a href={`mailto:${exec.email}`}>
                            <Email className="h-4 w-4" />
                          </a>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Email</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
                {exec.linkedin && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="sm" asChild>
                          <a href={exec.linkedin} target="_blank" rel="noopener noreferrer">
                            <Language className="h-4 w-4" />
                          </a>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>LinkedIn</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  };
  const getIndustryColor = (industry) => {
    const colors = {
      'oil and gas': '#9c27b0',
      'technology': '#4caf50',
      'manufacturing': '#2196f3',
      'healthcare': '#e91e63',
      'finance': '#ba68c8',
      'retail': '#9c27b0',
      'real estate': '#795548',
      'automotive': '#607d8b',
      'aerospace': '#3f51b5',
      'telecommunications': '#00bcd4'
    };
    return colors[industry?.toLowerCase()] || '#757575';
  };
  const getCompanySizeColor = (size) => {
    if (size?.includes('Enterprise') || size?.includes('200+')) return '#d32f2f'; // 🔴 Deep Red
    if (size?.includes('Large')) return '#4caf50';
    if (size?.includes('Medium')) return '#ba68c8';
    if (size?.includes('Small')) return '#2196f3';
    return '#757575';
  };
  // Helper function to get employee button color based on count
  const getEmployeeButtonColor = (count) => {
    if (!count) return '#2196f3'; // Default blue
    const numCount = parseInt(count);
    if (numCount >= 200) {
      return '#4caf50'; // Green for 200+
    }
    if (numCount >= 50) {
      return '#2196f3'; // Blue for 50-200
    }
    if (numCount >= 10) {
      return '#ba68c8'; // Purple for 10-50
    }
    return '#f44336'; // Red for 1-10
  };
  return (
    <div className="w-full p-2">
      {/* Header - Matching Image Design */}
      {searchQuery && (
        <div className="mb-3 p-3 rounded-xl bg-gradient-to-br from-slate-800/95 to-slate-700/95 border border-slate-400/20 shadow-lg">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Business className="h-7 w-7 text-blue-400" />
            <h2 className="text-xl font-semibold text-white">
              {searchQuery.industry || 'Company Search Results'}
            </h2>
          </div>
          <p className="text-sm text-white/70 mb-1">
            Found {data.length} leads • {searchQuery.date || new Date().toLocaleString()} 
            {searchQuery.location && ` • Location: ${searchQuery.location}`}
          </p>
          <Chip 
            className="bg-blue-400/20 text-blue-400 font-semibold border border-blue-400/30 text-sm"
          >
            {data.length} results
          </Chip>
        </div>
      )}
      {/* Fallback Header if no search query */}
      {!searchQuery && !employeeSearchQuery && (
        <div className="mb-3 flex items-center gap-2">
          <Business className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-bold">
            Company Data Results
          </h1>
        </div>
      )}
      {/* Header for employee search */}
      {employeeSearchQuery && (
        <div className="mb-3 flex items-center gap-2">
          <Business className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-bold">
            Company Data Results
          </h1>
        </div>
      )}
      {/* Tabs for Companies and Employees - Always show */}
      <div className="border-b border-border mb-3 flex items-center justify-between">
          <Tabs 
            value={String(activeTab)} 
            onValueChange={(newValue) => {
              userManuallyChangedTabRef.current = true; // Mark as manual change
              updateActiveTab(parseInt(newValue));
              // Reset the flag after a short delay to allow auto-switch for new searches
              setTimeout(() => {
                userManuallyChangedTabRef.current = false;
              }, 2000); // 2 seconds delay
            }}
            className="w-auto"
          >
            <TabsList className="h-14">
              <TabsTrigger 
                value="0"
                className="text-base font-semibold min-h-[56px] data-[state=active]:text-[#0b1957]"
              >
                <Business className="mr-2 h-4 w-4" />
                Companies ({(() => {
                  const filtered = getFilteredData().filter(item => {
                    const isCompany = item.companyName || item.username || (item.name && !item.first_name && !item.last_name);
                    if (!isCompany) return false;
                    const hasPhone = Boolean(item.phone);
                    const hasEmployees = Boolean(item.employeeCount && item.employeeCount > 0);
                    return hasPhone || hasEmployees;
                  });
                  return filtered.length;
                })()})
              </TabsTrigger>
              <TabsTrigger 
                value="1"
                className="text-base font-semibold min-h-[56px] data-[state=active]:text-[#0b1957]"
              >
                <Person className="mr-2 h-4 w-4" />
                Employees ({(() => {
                  const filtered = getFilteredEmployeeData().filter(item => {
                    return item.first_name || item.last_name || item.title || (item.name && !item.companyName && !item.username);
                  });
                  return filtered.length;
                })()})
              </TabsTrigger>
            </TabsList>
          </Tabs>
          {/* Buttons on the right side of tabs line */}
          <div className="flex gap-1.5 items-center flex-nowrap">
            {/* Employees Tab Buttons */}
            {activeTab === 1 && selectedEmployees.size > 0 && (
              <div className="flex gap-1.5 items-center flex-nowrap">
                {onUnlockAllEmployeeEmails && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={onUnlockAllEmployeeEmails}
                    disabled={Object.values(unlockingEmployeeContacts).some(v => v?.email)}
                    className="bg-[#0b1957] text-white font-semibold rounded-[20px] whitespace-nowrap px-2 shadow-sm hover:bg-[#0d1f6f] hover:shadow-md hover:-translate-y-0.5 transition-all"
                  >
                    <Email className="mr-2 h-4 w-4" />
                    {selectAllEmployees || selectedEmployees.size === employeeData.length
                      ? 'Unlock All Emails'
                      : `Unlock Emails (${selectedEmployees.size})`}
                  </Button>
                )}
                {onUnlockAllEmployeePhones && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={onUnlockAllEmployeePhones}
                    disabled={Object.values(unlockingEmployeeContacts).some(v => v?.phone)}
                    className="bg-[#0b1957] text-white font-semibold rounded-[20px] whitespace-nowrap px-2 shadow-sm hover:bg-[#0d1f6f] hover:shadow-md hover:-translate-y-0.5 transition-all"
                  >
                    <Phone className="mr-2 h-4 w-4" />
                    {selectAllEmployees || selectedEmployees.size === employeeData.length
                      ? 'Unlock All Numbers'
                      : `Unlock Numbers (${selectedEmployees.size})`}
                  </Button>
                )}
                {showAITrigger && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleStartIntelligentCallingEmployees}
                    disabled={intelligentCallingLoading || selectedEmployees.size === 0}
                    className="bg-[#0b1957] rounded-[20px] shadow-sm text-white font-semibold whitespace-nowrap px-2 transition-all duration-300 ease-in-out hover:bg-[#0d1f6f] hover:shadow-md hover:-translate-y-0.5"
                  >
                    <PhoneIcon className="h-4 w-4 mr-1" />
                    {intelligentCallingLoading ? <Loader2 className="h-5 w-5 text-white mr-1 animate-spin" /> : null}
                    Start Intelligent Calling
                  </Button>
                )}
              </div>
            )}
            {/* Companies Tab Button */}
            {activeTab === 0 && showAITrigger && (
              <Button
                variant="default"
                size="sm"
                onClick={handleStartIntelligentCallingCompanies}
                disabled={intelligentCallingLoading || selectedCompanies.size === 0}
                className="bg-[#0b1957] rounded-[20px] shadow-sm text-white font-semibold whitespace-nowrap px-2 hover:bg-[#0d1f6f] hover:shadow-md hover:-translate-y-0.5 transition-all"
              >
                {intelligentCallingLoading ? <Loader2 className="h-5 w-5 text-white mr-1 animate-spin" /> : <PhoneIcon className="mr-2 h-4 w-4" />}
                Start Intelligent Calling
              </Button>
            )}
          </div>
        </div>
      {/* Selection Controls - Show for both tabs */}
      <div className="p-2 mb-3 relative">
        <div className="flex items-center gap-2 flex-wrap relative justify-between">
          {/* Left side controls */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Filter Button - Moved to the left */}
            <div className="relative inline-block">
              <DropdownMenu open={Boolean(filterAnchorEl)} onOpenChange={(open) => {
                if (!open) {
                  handleFilterClose();
                } else {
                  setFilterAnchorEl(true);
                }
              }}>
                <DropdownMenuTrigger asChild>
                  <Button
                    ref={filterButtonRef}
                    id="filter-button"
                    variant="default"
                    size="sm"
                    className="bg-[#0b1957] text-white rounded-[20px] font-semibold shadow-sm hover:bg-[#0d1f6f] hover:shadow-md"
                  >
                    <FilterList className="mr-2 h-4 w-4" />
                    Filter & Select
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent 
                  align="start"
                  className="min-w-[280px] max-h-[400px] bg-white shadow-lg border border-gray-200 rounded-[20px] mt-1 z-[1300]"
                >
                  {/* Filter content will go here */}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          {/* Right side: Send Connection Button and Pagination controls */}
          <div className="flex items-center gap-2">
            {/* Send Connection Button - Only on Employees tab and when employees are selected */}
            {activeTab === 1 && selectedEmployees.size > 0 && (
              <Button
                variant="default"
                size="sm"
                onClick={() => {
                  if (onSendLinkedInConnections) {
                    onSendLinkedInConnections();
                  } else {
                    alert('LinkedIn connection feature is not available.');
                  }
                }}
                disabled={!onSendLinkedInConnections || selectedEmployees.size === 0}
                className={`rounded-[20px] shadow-sm font-semibold whitespace-nowrap px-2 transition-all ${
                  onSendLinkedInConnections && selectedEmployees.size > 0
                    ? 'bg-[#0077b5] text-white hover:bg-[#005885] hover:shadow-md hover:-translate-y-0.5'
                    : 'bg-gray-400 text-gray-600 cursor-not-allowed opacity-60'
                }`}
              >
                <LinkedInIcon className="mr-2 h-4 w-4" />
                Send Connection {selectedEmployees.size > 0 ? `(${selectedEmployees.size})` : ''}
              </Button>
            )}
            {/* Pagination controls */}
            {(() => {
              const controls = activeTab === 0 ? paginationControls : employeePaginationControls;
              return controls && (
                <div>
                  {controls}
                </div>
              );
            })()}
          </div>
        </div>
      </div>
        {/* Company Filters */}
        {activeTab === 0 && (
          <>
            <DropdownMenuLabel key="company-size-header" className="font-bold text-[#0b1957] text-sm bg-gray-50 px-2 py-1.5">
              Select by Company Size
            </DropdownMenuLabel>
        <DropdownMenuItem 
          onClick={() => handleFilterToggle('enterprise')}
          key="enterprise"
          className="hover:bg-gray-50 py-1.5"
        >
          <div className="flex items-center w-full">
            <Checkbox 
              checked={selectedFilters.has('enterprise')} 
              className="text-[#0b1957] data-[state=checked]:text-[#0b1957]"
            />
            <span className="text-[#0b1957] font-medium ml-2">
            Enterprise (200+ employees)
            </span>
          </div>
        </DropdownMenuItem>,
        <DropdownMenuItem 
          onClick={() => handleFilterToggle('large')}
          key="large"
          className="hover:bg-gray-50 py-1.5"
        >
          <div className="flex items-center w-full">
            <Checkbox 
              checked={selectedFilters.has('large')} 
              className="text-[#0b1957] data-[state=checked]:text-[#0b1957]"
            />
            <span className="text-[#0b1957] font-medium ml-2">
            Large (50-199 employees)
            </span>
          </div>
        </DropdownMenuItem>,
        <DropdownMenuItem 
          onClick={() => handleFilterToggle('medium')}
          key="medium"
          className="hover:bg-gray-50 py-1.5"
        >
          <div className="flex items-center w-full">
            <Checkbox 
              checked={selectedFilters.has('medium')} 
              className="text-[#0b1957] data-[state=checked]:text-[#0b1957]"
            />
            <span className="text-[#0b1957] font-medium ml-2">
            Medium (10-49 employees)
            </span>
          </div>
        </DropdownMenuItem>,
        <DropdownMenuItem 
          onClick={() => handleFilterToggle('small')}
          key="small"
          className="hover:bg-gray-50 py-1.5"
        >
          <div className="flex items-center w-full">
            <Checkbox 
              checked={selectedFilters.has('small')} 
              className="text-[#0b1957] data-[state=checked]:text-[#0b1957]"
            />
            <span className="text-[#0b1957] font-medium ml-2">
            Small (1-10 employees)
            </span>
          </div>
        </DropdownMenuItem>,
        <DropdownMenuSeparator />
        <DropdownMenuLabel key="data-availability-header" className="font-bold text-[#0b1957] text-sm bg-gray-50 px-2 py-1.5 mt-1">
          Select by Data Availability
        </DropdownMenuLabel>,
        <DropdownMenuItem 
          onClick={() => handleFilterToggle('with-phone')}
          key="company-with-phone"
          className="hover:bg-gray-50 py-1.5"
        >
          <div className="flex items-center w-full">
            <Checkbox 
              checked={selectedFilters.has('with-phone')} 
              className="text-[#0b1957] data-[state=checked]:text-[#0b1957]"
            />
            <span className="text-[#0b1957] font-medium ml-2">
            Companies with Phone Number
            </span>
          </div>
        </DropdownMenuItem>,
        <DropdownMenuItem 
          onClick={() => handleFilterToggle('with-linkedin')}
          key="company-with-linkedin"
          className="hover:bg-gray-50 py-1.5"
        >
          <div className="flex items-center w-full">
            <Checkbox 
              checked={selectedFilters.has('with-linkedin')} 
              className="text-[#0b1957] data-[state=checked]:text-[#0b1957]"
            />
            <span className="text-[#0b1957] font-medium ml-2">
            Companies with LinkedIn
            </span>
          </div>
        </DropdownMenuItem>,
        <DropdownMenuItem 
          onClick={() => handleFilterToggle('with-website')}
          className="hover:bg-gray-50 py-1.5"
        >
          <div className="flex items-center w-full">
            <Checkbox 
              checked={selectedFilters.has('with-website')} 
              className="text-[#0b1957] data-[state=checked]:text-[#0b1957]"
            />
            <span className="text-[#0b1957] font-medium ml-2">
            Companies with Website
            </span>
          </div>
        </DropdownMenuItem>,
        <DropdownMenuItem 
          onClick={() => handleFilterToggle('with-summary')}
          key="company-with-summary"
          className="hover:bg-gray-50 py-1.5"
        >
          <div className="flex items-center w-full">
            <Checkbox 
              checked={selectedFilters.has('with-summary')} 
              className="text-[#0b1957] data-[state=checked]:text-[#0b1957]"
            />
            <span className="text-[#0b1957] font-medium ml-2">
            With Sales Summary
            </span>
          </div>
        </DropdownMenuItem>
          </>
        )}
        {/* Employee Filters */}
        {activeTab === 1 && (
          <>
            {[<DropdownMenuLabel key="employee-header" className="font-bold text-[#0b1957] text-sm bg-gray-50 px-2 py-1.5">
              Filter Employees
            </DropdownMenuLabel>,
            <DropdownMenuItem 
              onClick={() => handleFilterToggle('with-linkedin')}
              className="hover:bg-gray-50 py-1.5"
            >
              <div className="flex items-center w-full">
                <Checkbox 
                  checked={selectedFilters.has('with-linkedin')} 
                  className="text-[#0b1957] data-[state=checked]:text-[#0b1957]"
                />
                <span className="text-[#0b1957] font-medium ml-2">
                With LinkedIn Profile
                </span>
              </div>
            </DropdownMenuItem>,
            <DropdownMenuItem 
              onClick={() => handleFilterToggle('with-phone')}
              key="employee-with-phone"
              className="hover:bg-gray-50 py-1.5"
            >
              <div className="flex items-center w-full">
                <Checkbox 
                  checked={selectedFilters.has('with-phone')} 
                  className="text-[#0b1957] data-[state=checked]:text-[#0b1957]"
                />
                <span className="text-[#0b1957] font-medium ml-2">
                With Phone Number
                </span>
              </div>
            </DropdownMenuItem>,
            <DropdownMenuItem 
              onClick={() => handleFilterToggle('with-email')}
              key="employee-with-email"
              className="hover:bg-gray-50 py-1.5"
            >
              <div className="flex items-center w-full">
                <Checkbox 
                  checked={selectedFilters.has('with-email')} 
                  className="text-[#0b1957] data-[state=checked]:text-[#0b1957]"
                />
                <span className="text-[#0b1957] font-medium ml-2">
                With Email Address
                </span>
              </div>
            </DropdownMenuItem>,
            <DropdownMenuItem 
              onClick={() => handleFilterToggle('with-summary')}
              key="employee-with-summary"
              className="hover:bg-gray-50 py-1.5"
            >
              <div className="flex items-center w-full">
                <Checkbox 
                  checked={selectedFilters.has('with-summary')} 
                  className="text-[#0b1957] data-[state=checked]:text-[#0b1957]"
                />
                <span className="text-[#0b1957] font-medium ml-2">
                With Sales Summary
                </span>
              </div>
            </DropdownMenuItem>]}
      {/* Companies Tab Content */}
      {(() => {
        return activeTab === 0;
      })() && (
      <>
      {/* Companies Tab Content - Always show when tab is active */}
      {/* Grid Layout - Only render company cards from data prop (never employee data) */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-2 relative z-[2] items-stretch">
          {[...Array(6)].map((_, index) => (
            <Card key={index} className="bg-[oklch(0.985_0_0)] border border-[oklch(0.89_0_0)] rounded-lg overflow-hidden">
              <CardContent className="p-2.5">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2 flex-1">
                    <Skeleton className="rounded-full w-12 h-12" />
                    <div className="flex-1">
                      <Skeleton className="w-[70%] h-6 mb-0.5" />
                      <Skeleton className="w-[50%] h-5" />
                    </div>
                  </div>
                  <Skeleton className="rounded-full w-6 h-6" />
                </div>
                <div className="mb-2">
                  <Skeleton className="w-[40%] h-5 mb-1" />
                  <Skeleton className="w-[60%] h-5 mb-1" />
                  <Skeleton className="w-[50%] h-5" />
                </div>
                <div className="flex gap-1 mb-2">
                  <Skeleton className="rounded w-20 h-6" />
                  <Skeleton className="rounded w-24 h-6" />
                </div>
                <div className="flex gap-1">
                  <Skeleton className="rounded w-[48%] h-9" />
                  <Skeleton className="rounded w-[48%] h-9" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
      (() => {
        const filteredCompanies = [...getFilteredData()]
          // Additional safety check: ensure we're only rendering company objects, not employee objects
          .filter(item => {
            // Company objects should have companyName, username, or name (not first_name/last_name like employees)
            const isCompany = item.companyName || item.username || (item.name && !item.first_name && !item.last_name);
            return isCompany;
          })
          // Filter out companies with no phone AND no employees
          .filter(company => {
            const hasPhone = Boolean(company.phone);
            const hasEmployees = Boolean(company.employeeCount && company.employeeCount > 0);
            // Keep company if it has phone OR has employees (or both)
            return hasPhone || hasEmployees;
          })
          // Sort companies with phone numbers first
          .sort((a, b) => {
            const aHasPhone = Boolean(a.phone);
            const bHasPhone = Boolean(b.phone);
            if (aHasPhone && !bHasPhone) return -1;
            if (!aHasPhone && bHasPhone) return 1;
            return 0;
          });
        return filteredCompanies.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 relative z-[2] items-stretch">
            {filteredCompanies.map((company, index) => (
          <div key={company.id || index} className="flex flex-col items-stretch">
            <Card 
              onClick={() => handleSelectCompany(company.id || index)}
              className={`w-full h-full flex flex-col min-h-0 transition-all duration-200 ease-in-out rounded-xl overflow-hidden relative bg-white shadow-sm cursor-pointer
                ${selectedCompanies.has(company.id || index) ? 'border-2 border-[#0b1957]' : 'border border-[#e9ecef]'}
                hover:shadow-md ${selectedCompanies.has(company.id || index) ? 'hover:border-[#0b1957]' : 'hover:border-[#dee2e6]'}
                ${selectedCompanies.has(company.id || index) ? 'before:content-[""] before:absolute before:top-0 before:left-0 before:right-0 before:h-[3px] before:bg-[#0b1957] before:z-[1]' : ''}`}
            >
              <CardContent className="flex-grow p-0 relative z-[2]">
                {/* Company Header - Clean White Background */}
                <div className="bg-white p-5 relative">
                  <div className="flex items-start gap-4">
                    <div className="relative">
                    <Avatar 
                      className={`w-14 h-14 flex-shrink-0 transition-all duration-200 ease-in-out ${selectedCompanies.has(company.id || index) ? 'border-[3px] border-[#0b1957]' : 'border-2 border-[#e9ecef]'}`}
                      src={company.logoUrl || company.logo || company.profileImage || company.companyLogo}
                      alt={`${company.companyName || company.username || 'Company'} logo`}
                    >
                      {!(company.logoUrl || company.logo || company.profileImage || company.companyLogo) && (
                        <Business fontSize="large" />
                      )}
                    </Avatar>
                      {selectedCompanies.has(company.id || index) && (
                        <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-[#0b1957] flex items-center justify-center border-2 border-white shadow-md">
                          <CheckCircle className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 min-h-[56px] flex items-center">
                      <h3 
                        className="font-bold text-lg text-black cursor-pointer transition-colors line-clamp-2 hover:text-[#0b1957] hover:underline"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewDetails(company);
                        }}
                      >
                        {company.companyName || company.username || 'Unknown Company'}
                      </h3>
                    </div>
                  </div>
                </div>
                {/* Card Body */}
                <div className="p-2.5 pt-0">
                {/* All Variable Content - Each section has fixed height */}
                <div className="mb-0">
                {/* Industry - Fixed 24px */}
                <div className="min-h-[24px] mb-0.5">
                  {company.industry && (
                    <Chip
                      label={company.industry}
                      size="small" 
                      variant="outlined"
                      className="font-bold h-6"
                    />
                  )}
                </div>
                {/* Decision Maker Contact - Fixed 60px */}
                <div className="min-h-[60px] mb-0">
                {phoneData[company.id] && (
                  <div className="mb-1 p-1.5 bg-green-50 rounded border border-green-600">
                    <p className="text-xs text-green-600 uppercase font-bold tracking-wider mb-1 block">
                      ✓ DECISION MAKER CONTACT
                    </p>
                    {/* Phone Number */}
                    <div className="flex items-center gap-1 mb-0.5">
                        <Phone className="h-4 w-4 text-green-600" />
                        <p className="text-sm text-gray-900 font-bold">
                        {phoneData[company.id].phone}
                      </p>
                  <Badge className="bg-green-600 text-white text-[0.65rem] h-[18px] font-semibold uppercase">
                        {phoneData[company.id].confidence || 'high'}
                      </Badge>
                </div>
                    {/* Contact Name (if available) */}
                    {phoneData[company.id].name && phoneData[company.id].name !== 'Decision Maker' && phoneData[company.id].name.trim() !== '' && (
                      <div className="flex items-center gap-1">
                          <Person className="h-4 w-4 text-green-600" />
                          <p className="text-sm text-gray-900 font-semibold">
                          {phoneData[company.id].name}
                        </p>
                      </div>
                    )}
                    {/* Phone Type (if available) */}
                    {phoneData[company.id].type && (
                      <div className="flex items-center gap-1">
                          <p className="text-xs text-gray-600 capitalize">
                          Type: {phoneData[company.id].type}
                      </p>
                    </div>
                  )}
                    </div>
                  )}
                </div>
                {/* Phone Number - Fixed 28px */}
                <div className="min-h-[40px] mb-1">
                  {company.phone && !phoneData[company.id] && (
                    <div className="flex items-center gap-1">
                      <Phone className="h-4 w-4 text-gray-600" />
                      <p className="text-sm text-gray-900 font-medium">
                        {company.phone}
                      </p>
                    </div>
                  )}
                </div>
                {/* Location - Fixed 48px (allows 2 lines) */}
                <div className="min-h-[40px] mb-1.5">
                  {company.location && (
                    <div className="flex items-center gap-1">
                      <LocationOn className="h-4 w-4 text-gray-600" />
                      <p className="text-sm text-gray-900 font-medium">
                        {company.location}
                      </p>
                    </div>
                  )}
                </div>
                  </div>
                {/* Company Scale Section - Always at same position with fixed height */}
                <div className="mb-1.5">
                  {/* Headline */}
                  <p className="text-xs text-gray-600 uppercase font-bold tracking-wider mb-1 block">
                    Company Scale
                  </p>
                  {/* Circle and Button Row */}
                  <div className="flex items-center justify-between gap-1 h-[65px] flex-nowrap w-full min-w-0">
                    {/* Circular Employee Count - Blue if has employees, Grey if no employees */}
                    {company.employeeCount && parseInt(company.employeeCount) > 0 ? (
                      <div className="w-[65px] h-[65px] rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center shadow-lg flex-shrink-0 p-[3px]">
                        <div className="w-full h-full rounded-full bg-white flex items-center justify-center flex-col gap-0.5">
                          <People className="text-blue-500 h-[22px] w-[22px]" />
                        </div>
                      </div>
                    ) : (
                      <div
                        className="w-[65px] h-[65px] rounded-full flex items-center justify-center flex-shrink-0"
                        style={{
                          background: 'linear-gradient(135deg, #9e9e9e 0%, #757575 100%)',
                          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25)'
                        }}
                      >
                        <div
                          className="w-[55px] h-[55px] rounded-full bg-[#e0e0e0] flex items-center justify-center flex-col gap-0.5"
                        >
                          <People 
                            className="text-[#757575] text-lg"
                          />
                        </div>
                      </div>
                    )}
                    {/* View All Employees Button - Blue if has employees, Grey if no employees */}
                    <Button
                      variant="default"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleGetEmployees(company);
                      }}
                      disabled={!company.employeeCount || parseInt(company.employeeCount) === 0}
                      className={`font-bold text-base px-3 py-1.5 h-12 min-w-0 max-w-[220px] flex-[0_1_auto] whitespace-nowrap rounded-[50px] transition-all duration-300 ease-in-out flex-shrink overflow-hidden text-ellipsis
                        ${(company.employeeCount && parseInt(company.employeeCount) > 0)
                          ? 'bg-gradient-to-br from-[#00d2ff] to-[#3a7bd5] text-white shadow-[0_4px_12px_rgba(0,210,255,0.4)] hover:from-[#3a7bd5] hover:to-[#2a5db0] hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(0,210,255,0.5)] active:translate-y-0 active:shadow-[0_3px_10px_rgba(0,210,255,0.4)]'
                          : 'bg-gradient-to-br from-[#bdbdbd] to-[#9e9e9e] text-[#757575] shadow-[0_4px_12px_rgba(0,0,0,0.25)] hover:from-[#9e9e9e] hover:to-[#757575] hover:shadow-[0_4px_12px_rgba(0,0,0,0.3)] active:shadow-[0_4px_12px_rgba(0,0,0,0.25)]'
                        }
                        disabled:from-[#bdbdbd] disabled:to-[#9e9e9e] disabled:text-[#757575]`}
                    >
                      View All Employees
                    </Button>
                  </div>
                </div>
                {/* Links Section */}
                <div className="mt-8">
                  <p className="text-[#6c757d] uppercase font-semibold tracking-wider text-xs mb-2 block">
                    LINKS
                  </p>
                <div className="flex gap-2 flex-wrap">
                  {company.website && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="sm" asChild>
                          <a href={company.website} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="w-9 h-9 p-1.5 flex items-center justify-center flex-shrink-0 text-gray-600 hover:text-blue-500 hover:bg-blue-50">
                            <Language className="h-6 w-6" />
                          </a>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent><p>Website</p></TooltipContent>
                    </Tooltip>
                  )}
                  {company.linkedinProfile && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="sm" asChild>
                          <a href={company.linkedinProfile} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="w-9 h-9 p-1.5 flex items-center justify-center flex-shrink-0 text-gray-600 hover:text-[#0077b5] hover:bg-blue-50">
                            <LinkedInIcon className="h-6 w-6" />
                          </a>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent><p>LinkedIn</p></TooltipContent>
                    </Tooltip>
                  )}
                    {company.facebookUrl && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="sm" asChild>
                            <a href={company.facebookUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="w-9 h-9 p-1.5 flex items-center justify-center flex-shrink-0 text-gray-600 hover:text-[#1877f2] hover:bg-blue-50">
                              <Facebook className="h-6 w-6" />
                            </a>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent><p>Facebook</p></TooltipContent>
                      </Tooltip>
                  )}
                    {company.twitterUrl && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="sm" asChild>
                            <a href={company.twitterUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="w-9 h-9 p-1.5 flex items-center justify-center flex-shrink-0 text-gray-600 hover:text-purple-400 hover:bg-purple-50 hover:shadow-lg hover:scale-110 transition-all">
                              <span className="text-2xl font-black font-sans leading-6 h-6 w-6 flex items-center justify-center m-0 p-0">𝕏</span>
                            </a>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent><p>X (Twitter)</p></TooltipContent>
                      </Tooltip>
                  )}
                  {company.instagramUrl && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="sm" asChild>
                          <a href={company.instagramUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="w-9 h-9 p-1.5 flex items-center justify-center flex-shrink-0 text-gray-600 hover:text-[#E4405F] hover:bg-pink-50">
                            <Instagram className="h-6 w-6" />
                          </a>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent><p>Instagram</p></TooltipContent>
                    </Tooltip>
                  )}
                  {company.blogUrl && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="sm" asChild>
                          <a href={company.blogUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="w-9 h-9 p-1.5 flex items-center justify-center flex-shrink-0 text-gray-600 hover:text-purple-400 hover:bg-purple-50">
                            <Article className="h-6 w-6" />
                          </a>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent><p>Blog</p></TooltipContent>
                    </Tooltip>
                  )}
                  </div>
                </div>
                {/* Company Size Hashtags - After Links - Always show if employeeCount exists */}
                {company.employeeCount !== undefined && company.employeeCount !== null ? (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {parseInt(company.employeeCount) >= 200 && (
                      <Chip
                        label="#enterprise"
                        size="small" 
                        variant="outlined"
                        className="bg-transparent text-[#6c757d] border-[rgba(0,0,0,0.12)] font-medium text-[0.7rem] h-6"
                      />
                    )}
                    {parseInt(company.employeeCount) >= 50 && parseInt(company.employeeCount) < 200 && (
                      <Chip
                        label="#large"
                        size="small" 
                        variant="outlined"
                        className="bg-transparent text-[#6c757d] border-[rgba(0,0,0,0.12)] font-medium text-[0.7rem] h-6"
                      />
                    )}
                    {parseInt(company.employeeCount) >= 11 && parseInt(company.employeeCount) < 50 && (
                      <Chip
                        label="#medium"
                        size="small"
                        variant="outlined"
                        className="bg-transparent text-[#6c757d] border-[rgba(0,0,0,0.12)] font-medium text-[0.7rem] h-6"
                      />
                    )}
                    {parseInt(company.employeeCount) >= 1 && parseInt(company.employeeCount) < 11 && (
                      <Chip
                        label="#small"
                        size="small"
                        variant="outlined"
                        className="bg-transparent text-[#6c757d] border-[rgba(0,0,0,0.12)] font-medium text-[0.7rem] h-6"
                      />
                    )}
                  </div>
                    ) : null}
                </div>
                </CardContent>
            </Card>
        </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Business className="h-16 w-16 text-muted-foreground mb-2 mx-auto" />
            <h3 className="text-lg text-muted-foreground">
              0 company data found
            </h3>
            <p className="text-sm text-muted-foreground">
              Try searching for companies using keywords like "cleaning services" or "technology companies"
            </p>
          </div>  
        );
      })()
      )}
      </>
    )}
      {/* Employees Tab Content */}
      {activeTab === 1 && (
        <div className="p-2">
          {/* Employee Cards Grid - Only render employee cards from employeeData prop (never company data) */}
          {employeeSearchLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 relative z-[2] items-stretch">
              {[...Array(6)].map((_, index) => (
                <Card key={index} className="bg-[oklch(0.985_0_0)] border border-[oklch(0.89_0_0)] rounded-lg overflow-hidden">
                  <CardContent className="p-2.5">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-4 flex-1">
                        <Skeleton className="rounded-full w-12 h-12" />
                        <div className="flex-1">
                          <Skeleton className="w-[70%] h-6 mb-0.5" />
                          <Skeleton className="w-[50%] h-5" />
                        </div>
                      </div>
                      <Skeleton className="rounded-full w-6 h-6" />
                    </div>
                    <div className="mb-4">
                      <Skeleton className="w-[80%] h-5 mb-1" />
                      <Skeleton className="w-[40%] h-5 mb-1" />
                      <Skeleton className="w-[60%] h-5" />
                    </div>
                    <div className="flex gap-1 mb-4">
                      <Skeleton className="rounded w-[90px] h-6" />
                      <Skeleton className="rounded w-20 h-6" />
                    </div>
                    <div className="flex gap-1 flex-wrap">
                      <Skeleton className="rounded w-[120px] h-8" />
                      <Skeleton className="rounded w-[120px] h-8" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (() => {
            const filteredEmployees = getFilteredEmployeeData()
              // Additional safety check: ensure we're only rendering employee objects, not company objects
              .filter(item => {
                // Employee objects should have first_name, last_name, or title (not companyName/username like companies)
                const isEmployee = item.first_name || item.last_name || item.title || (item.name && !item.companyName && !item.username);
                return isEmployee;
              });
            return filteredEmployees.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 relative z-[2] items-stretch">
              {/* {} */}
            {filteredEmployees
              // Sort employees by company phone number - show companies with phone numbers first
              .sort((a, b) => {
                // Extract company phone for employee a
                let aPhone = '';
                try {
                  const aFullData = a.employee_data ? (typeof a.employee_data === 'string' ? JSON.parse(a.employee_data) : a.employee_data) : null;
                  const aOrg = aFullData?.organization || a.organization || {};
                  aPhone = aOrg.phone || aOrg.phone_number || a.company_phone || 
                          aOrg.primary_phone?.number || aOrg.sanitized_phone || '';
                  // Also check if company exists in data array
                  const aCompanyId = normalizeCompanyId(aOrg.id || a.organization_id || a.company_id);
                  const aCompany = data.find(c => {
                    const cId = normalizeCompanyId(c.id || c.company_id || c.apollo_organization_id);
                    return cId && aCompanyId && cId === aCompanyId;
                  });
                  if (aCompany?.phone) aPhone = aCompany.phone;
                } catch (e) {}
                // Extract company phone for employee b
                let bPhone = '';
                try {
                  const bFullData = b.employee_data ? (typeof b.employee_data === 'string' ? JSON.parse(b.employee_data) : b.employee_data) : null;
                  const bOrg = bFullData?.organization || b.organization || {};
                  bPhone = bOrg.phone || bOrg.phone_number || b.company_phone || 
                          bOrg.primary_phone?.number || bOrg.sanitized_phone || '';
                  // Also check if company exists in data array
                  const bCompanyId = normalizeCompanyId(bOrg.id || b.organization_id || b.company_id);
                  const bCompany = data.find(c => {
                    const cId = normalizeCompanyId(c.id || c.company_id || c.apollo_organization_id);
                    return cId && bCompanyId && cId === bCompanyId;
                  });
                  if (bCompany?.phone) bPhone = bCompany.phone;
                } catch (e) {}
                const aHasPhone = Boolean(aPhone && aPhone.trim());
                const bHasPhone = Boolean(bPhone && bPhone.trim());
                if (aHasPhone && !bHasPhone) return -1;
                if (!aHasPhone && bHasPhone) return 1;
                return 0;
              })
              .map((employee, index) => {
              const isSelected = selectedEmployees.has(index);
              const employeeId = employee.id || employee.linkedin_url || index;
              const revealed = revealedEmployeeContacts[employeeId] || {};
              const revealing = unlockingEmployeeContacts[employeeId] || {};
              // Extract company info from employee data - check multiple possible fields
              let fullEmployeeData = null;
              if (employee.employee_data) {
                try {
                  fullEmployeeData = typeof employee.employee_data === 'string' 
                    ? JSON.parse(employee.employee_data) 
                    : employee.employee_data;
                } catch (e) {
                  // Ignore parse errors
                }
              }
              // Extract from employee_data.organization first, then fallback to employee.organization
              const org = fullEmployeeData?.organization || employee.organization || {};
              const companyName = org.name || employee.company_name || employee.organization_name || org.company_name || 'Unknown Company';
              // Debug logging
              if (companyName === 'Unknown Company') {
                }
              const companyLogo = org.logo_url || org.logo || employee.organization_logo_url || '';
              const companyWebsite = org.website_url || org.website || employee.organization_website_url || '';
              const companyLinkedIn = org.linkedin_url || org.linkedin || employee.organization_linkedin_url || '';
              const companyDomain = org.domain || employee.company_domain || '';
              const companyIndustry = org.industry || employee.company_industry || '';
              // Extract company location - check multiple possible fields
              let companyLocation = org.location || 
                                   org.primary_location ||
                                   org.formatted_address ||
                                   employee.company_location || 
                                   employee.organization?.location ||
                                   employee.organization?.primary_location ||
                                   '';
              // If no direct location, try to build from address components
              if (!companyLocation || companyLocation.trim() === '') {
                const orgAddress = org.raw_address || org.address || employee.organization?.raw_address || employee.organization?.address || {};
                const orgCity = org.city || orgAddress?.city || employee.organization?.city || employee.city || '';
                const orgState = org.state || orgAddress?.state || employee.organization?.state || employee.state || '';
                const orgCountry = org.country || orgAddress?.country || employee.organization?.country || employee.country || '';
                if (orgCity || orgState || orgCountry) {
                  companyLocation = [orgCity, orgState, orgCountry].filter(Boolean).join(', ');
                }
              }
              // Final fallback - try employee's own location fields
              if (!companyLocation || companyLocation.trim() === '') {
                const locationParts = [
                  employee.city,
                  employee.state,
                  employee.country
                ].filter(Boolean);
                if (locationParts.length > 0) {
                  companyLocation = locationParts.join(', ');
                }
              }
              // Extract company phone - check multiple possible fields
              let companyPhone = org.phone || org.phone_number || employee.company_phone || '';
              if (!companyPhone) {
                // Check nested phone structures
                companyPhone = org.primary_phone?.number || 
                              org.primary_phone?.sanitized_number ||
                              org.sanitized_phone ||
                              org.phone_numbers?.[0]?.number ||
                              org.phone_numbers?.[0]?.sanitized_number ||
                              '';
              }
              const companyEmployeeCount = org.employee_count || org.employees || employee.company_employee_count || '';
              // Find company data for this employee from data array (company search results)
              const empCompanyId = normalizeCompanyId(org.id || employee.organization_id || employee.company_id);
              let company = data.find(c => {
                const cId = normalizeCompanyId(c.id || c.company_id || c.apollo_organization_id);
                return cId && empCompanyId && cId === empCompanyId;
              });
              // If company not found in data array, build company object from employee data
              if (!company && companyName !== 'Unknown Company') {
                // Look up summary from companySummaries prop
                const companySummary = empCompanyId ? (companySummaries[empCompanyId] || companySummaries[String(empCompanyId)]) : null;
                company = {
                  id: empCompanyId,
                  company_id: empCompanyId,
                  apollo_organization_id: empCompanyId,
                  companyName: companyName,
                  username: companyName,
                  name: companyName,
                  logoUrl: companyLogo,
                  logo: companyLogo,
                  website: companyWebsite,
                  linkedinProfile: companyLinkedIn,
                  domain: companyDomain,
                  industry: companyIndustry,
                  location: companyLocation || org.address || org.raw_address || org.city || org.primary_location || '',
                  phone: companyPhone || org.phone_number || org.primary_phone?.number || org.sanitized_phone || '',
                  employeeCount: companyEmployeeCount,
                  employees: companyEmployeeCount,
                  ...(companySummary ? { summary: companySummary } : {}) // Attach summary if available
                };
              } else if (company) {
                // If company found but missing phone/location, add from employee data
                if ((!company.phone || company.phone.trim() === '') && companyPhone && companyPhone.trim()) {
                  company.phone = companyPhone;
                }
                if ((!company.location || company.location.trim() === '') && companyLocation && companyLocation.trim()) {
                  company.location = companyLocation;
                }
                if (!company.industry && companyIndustry) {
                  company.industry = companyIndustry;
                }
                // Attach summary if not already present
                if (!company.summary && empCompanyId) {
                  const companySummary = companySummaries[empCompanyId] || companySummaries[String(empCompanyId)];
                  if (companySummary) {
                    company.summary = companySummary;
                  }
                }
              }
              return (
                <div key={employeeId} className="flex flex-col items-stretch h-full">
                  <Card 
                    onClick={() => {
                      if (onEmployeeSelectionChange) {
                        const newSelected = new Set(selectedEmployees);
                        if (isSelected) {
                          newSelected.delete(index);
                        } else {
                          newSelected.add(index);
                        }
                        onEmployeeSelectionChange(newSelected);
                      }
                    }}
                    className={`w-full h-full flex flex-col min-h-0 transition-all cursor-pointer rounded-xl overflow-hidden relative bg-white shadow-sm ${
                      isSelected 
                        ? 'border-2 border-[#0b1957] shadow-md' 
                        : 'border border-[#e9ecef]'
                    } hover:shadow-lg hover:border-[${isSelected ? '#0b1957' : '#dee2e6'}]`}
                    style={{
                      boxShadow: isSelected ? '0 4px 12px rgba(0,0,0,0.08)' : '0 1px 3px rgba(0,0,0,0.05)',
                    }}
                  >
                    {isSelected && (
                      <div className="absolute top-0 left-0 right-0 h-[3px] bg-[#0b1957] z-[1]" />
                    )}
                    <CardContent className="flex-grow p-0 relative z-[2]">
                      {/* Company Header - Clean White Background */}
                      <div className="bg-white px-5 pt-5 pb-0 relative">
                        <div className="flex items-start gap-4 relative">
                          <div className="relative flex-shrink-0">
                          <Avatar 
                            className={`w-12 h-12 flex-shrink-0 ${
                              isSelected ? 'border-[3px] border-[#0b1957]' : 'border-2 border-[#e9ecef]'
                            }`}
                            style={{
                              backgroundColor: 'var(--primary)',
                            }}
                              src={companyLogo || company?.logoUrl || company?.logo}
                              alt={`${companyName} logo`}
                          >
                              {!(companyLogo || company?.logoUrl || company?.logo) && (
                                <Business />
                              )}
                          </Avatar>
                            {isSelected && (
                              <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-[#0b1957] flex items-center justify-center border-2 border-white shadow-md z-[3]">
                                <CheckCircle className="text-white" style={{ fontSize: 16 }} />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0 min-h-[56px] flex items-center">
                            <h3 
                              className="font-bold break-words leading-tight text-lg text-black cursor-pointer transition-colors line-clamp-2 overflow-hidden mb-0 hover:text-[#0b1957] hover:underline"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (company) {
                                  handleViewDetails(company);
                                }
                              }}
                            >
                              {companyName}
                            </h3>
                          </div>
                        </div>
                      </div>
                      {/* Card Body */}
                      <div className="p-5 pt-0 -mt-1">
                        {/* All Variable Content - Each section has fixed height */}
                        <div className="mb-0">
                        {/* Decision Maker Contact - Fixed 60px */}
                        <div className="min-h-[60px] mb-0">
                          {company && phoneData[company.id] && (
                            <div className="mb-2 p-3 bg-[#f0fff4] rounded border border-[#28a745]">
                              <p className="text-[#28a745] uppercase font-bold tracking-wider text-[0.7rem] mb-2 block">
                                ✓ DECISION MAKER CONTACT
                              </p>
                              {/* Phone Number */}
                              <div className="flex items-center gap-2 mb-1">
                                <Phone className="text-[#28a745]" style={{ fontSize: 16 }} />
                                <p className="text-[#212529] font-bold text-[0.95rem]">
                                  {phoneData[company.id].phone}
                                </p>
                                <Badge className="bg-[#28a745] text-white text-[0.65rem] h-[18px] font-semibold uppercase">
                                  {phoneData[company.id].confidence || 'high'}
                                </Badge>
                              </div>
                              {/* Contact Name (if available) */}
                              {phoneData[company.id].name && phoneData[company.id].name !== 'Decision Maker' && phoneData[company.id].name.trim() !== '' && (
                                <div className="flex items-center gap-2 mb-1">
                                  <Person className="text-[#28a745]" style={{ fontSize: 16 }} />
                                  <p className="text-[#212529] font-semibold text-sm">
                                    {phoneData[company.id].name}
                                  </p>
                                </div>
                            )}
                          </div>
                          )}
                        </div>
                        {/* Phone Number - Fixed 28px */}
                        <div className="min-h-[40px] mb-2">
                          {(() => {
                            const displayPhone = (company?.phone && company.phone.trim()) || (companyPhone && companyPhone.trim());
                            return displayPhone && !phoneData[company?.id] ? (
                              <div className="flex items-center gap-2">
                                <Phone className="text-[#6c757d]" style={{ fontSize: 16 }} />
                                <p className="text-[#212529] font-medium text-sm">
                                  {displayPhone}
                                </p>
                              </div>
                            ) : null;
                          })()}
                        </div>
                        {/* Location - Fixed 48px (allows 2 lines) */}
                        <div className="min-h-[40px] mb-3">
                          {(() => {
                            const displayLocation = (company?.location && company.location.trim()) || (companyLocation && companyLocation.trim());
                            return displayLocation ? (
                              <div className="flex items-center gap-2">
                                <LocationOn className="text-[#6c757d]" style={{ fontSize: 16 }} />
                                <p className="text-[#212529] font-medium text-sm">
                                  {displayLocation}
                                </p>
                              </div>
                            ) : null;
                          })()}
                        </div>
                          </div>
                        {/* Company Scale Section - Always at same position with fixed height */}
                        <div className="min-h-[85px] mb-2 mt-1">
                          {/* Headline */}
                          <p className="text-[#6c757d] uppercase font-bold tracking-wider text-[0.7rem] mb-2 block">
                            Company Scale
                          </p>
                          {/* Circle and Button Row */}
                          <div className="flex items-center justify-between gap-2 h-[65px] flex-nowrap w-full min-w-0">
                            {/* Circular Employee Count - Always blue for employee cards */}
                            {(() => {
                              // Get employee count - try multiple sources
                              const empCount = company?.employeeCount || 
                                             company?.employees || 
                                             companyEmployeeCount || 
                                             (company && company.employeeCount) ||
                                             '';
                              const hasCount = empCount && parseInt(empCount) > 0;
                              return (
                                <div className="w-[65px] h-[65px] rounded-full flex items-center justify-center flex-shrink-0 p-[3px]"
                                  style={{
                                    background: 'linear-gradient(135deg, #00d2ff 0%, #3a7bd5 100%)',
                                    boxShadow: '0 4px 12px rgba(0, 210, 255, 0.4)',
                                  }}
                                >
                                  <div className="w-full h-full rounded-full bg-white flex items-center justify-center flex-col gap-0.5">
                                    <People 
                                      className="text-[#3a7bd5]"
                                      style={{ fontSize: 22 }}
                                    />
                          </div>
                                </div>
                              );
                            })()}
                            {/* View Employee Button - Blue gradient */}
                            <Button
                              variant="default"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedEmployee(employee);
                                setEmployeeDetailDialogOpen(true);
                              }}
                              className="bg-gradient-to-br from-[#00d2ff] to-[#3a7bd5] text-white font-bold text-base px-3 py-1.5 h-12 min-w-0 max-w-[220px] flex-[0_1_auto] whitespace-nowrap rounded-[50px] shadow-[0_4px_12px_rgba(0,210,255,0.4)] transition-all duration-300 ease-in-out flex-shrink overflow-hidden text-ellipsis hover:from-[#3a7bd5] hover:to-[#2a5db0] hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(0,210,255,0.5)] active:translate-y-0 active:shadow-[0_3px_10px_rgba(0,210,255,0.4)]"
                            >
                              View Employee
                            </Button>
                          </div>
                        </div>
                        {/* Links Section */}
                        <div className="mt-8">
                          <p className="text-[#6c757d] uppercase font-semibold tracking-wider text-[0.7rem] mb-2 block">
                            LINKS
                          </p>
                            <div className="flex gap-2 flex-wrap">
                            {company?.website && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="sm" asChild>
                                    <a href={company.website} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="w-9 h-9 p-1.5 flex items-center justify-center flex-shrink-0 text-[#6c757d] hover:text-[#1976d2] hover:bg-[#e3f2fd]">
                                      <Language className="h-6 w-6" />
                                    </a>
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent><p>Website</p></TooltipContent>
                              </Tooltip>
                            )}
                            {company?.linkedinProfile && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="sm" asChild>
                                    <a href={company.linkedinProfile} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="w-9 h-9 p-1.5 flex items-center justify-center flex-shrink-0 text-[#6c757d] hover:text-[#0077b5] hover:bg-[#e7f3ff]">
                                      <LinkedInIcon className="h-6 w-6" />
                                    </a>
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent><p>LinkedIn</p></TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        </div>
                        {/* Company Size Hashtags - After Links - Always show if employeeCount exists */}
                        {company?.employeeCount !== undefined && company?.employeeCount !== null ? (
                          <div className="mt-3 flex flex-wrap gap-1">
                            {parseInt(company.employeeCount) >= 200 && (
                              <Badge className="bg-transparent text-[#6c757d] border border-gray-300 font-medium text-[0.7rem] h-6">
                                #enterprise
                              </Badge>
                            )}
                            {parseInt(company.employeeCount) >= 50 && parseInt(company.employeeCount) < 200 && (
                              <Badge className="bg-transparent text-[#6c757d] border border-gray-300 font-medium text-[0.7rem] h-6">
                                #large
                              </Badge>
                            )}
                            {parseInt(company.employeeCount) >= 11 && parseInt(company.employeeCount) < 50 && (
                              <Badge className="bg-transparent text-[#6c757d] border border-gray-300 font-medium text-[0.7rem] h-6">
                                #medium
                              </Badge>
                            )}
                            {parseInt(company.employeeCount) >= 1 && parseInt(company.employeeCount) < 11 && (
                              <Badge className="bg-transparent text-[#6c757d] border border-gray-300 font-medium text-[0.7rem] h-6">
                                #small
                              </Badge>
                            )}
                          </div>
                        ) : null}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              );
            })}
          </div>
            ) : (
            <div className="text-center py-8">
              <Person className="text-gray-500 mb-4" style={{ fontSize: 64 }} />
              <h3 className="text-lg text-gray-500">
                0 employees data found
              </h3>
              <p className="text-sm text-gray-500 mt-2">
                Try searching for employees using the search bar above
              </p>
            </div>
          );
        })()}
        </div>
      )}
      {/* Phone Reveal Confirmation Dialog */}
      <Dialog
        open={phoneConfirmDialog.open}
        onClose={() => setPhoneConfirmDialog({ open: false, employee: null })}
        maxWidth="xs"
        fullWidth
      >
        <DialogHeader>
          <DialogTitle className="pb-2">
            <div className="flex items-center gap-2">
              <Phone className="text-[#1976d2]" />
              <h3 className="text-lg font-semibold">Phone Reveal</h3>
            </div>
          </DialogTitle>
        </DialogHeader>
        <DialogContent>
          <div className="flex flex-col gap-4 pt-2">
            {/* Cost */}
            <div className="p-4 bg-[rgba(186,104,200,0.1)] rounded border border-[#ba68c8]">
              <p className="font-bold text-[#9c27b0]">
                Cost: 8 CREDITS
              </p>
            </div>
            {/* Employee Details */}
            {phoneConfirmDialog.employee && (
              <div className="flex flex-col gap-2">
                <p className="font-semibold text-sm">
                  Employee: {phoneConfirmDialog.employee.name}
                </p>
                <p className="text-sm text-gray-500">
                  Title: {phoneConfirmDialog.employee.title || 'Senior Business Development Manager'}
                </p>
              </div>
            )}
            {/* Process Info */}
            <div className="flex flex-col gap-2">
              <div className="flex items-start gap-2">
                <span className="text-[#4caf50] text-xl">⚡</span>
                <p className="text-sm text-gray-500">
                  Checking database first, then API if needed
                </p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-[#ba68c8] text-xl">⏰</span>
                <p className="text-sm text-gray-500">
                  Webhook delivery: 2-5 minutes if not cached
                </p>
              </div>
            </div>
            {/* Confirmation */}
            <p className="font-semibold text-sm mt-2">
              Continue?
            </p>
          </div>
        </DialogContent>
        <DialogFooter className="px-3 pb-2">
          <Button 
            onClick={() => setPhoneConfirmDialog({ open: false, employee: null })}
            variant="outline"
          >
            Cancel
          </Button>
          <Button 
            onClick={() => {
              const employee = phoneConfirmDialog.employee;
              setPhoneConfirmDialog({ open: false, employee: null });
              processPhoneReveal(employee);
            }}
            autoFocus
            className="bg-[#0b1957] text-white hover:bg-[#0d1f6f]"
          >
            OK
          </Button>
        </DialogFooter>
      </Dialog>
      {/* Detail Dialog */}
      <Dialog 
        open={dialogOpen} 
        onOpenChange={(open) => !open && handleCloseDialog()}
      >
        <DialogHeader>
          <DialogTitle>
            <div className="flex items-center gap-4">
              <Avatar 
                className="w-10 h-10 bg-[#0b1957]"
                src={selectedCompany?.logo || selectedCompany?.profileImage || selectedCompany?.companyLogo}
                alt={`${selectedCompany?.companyName || selectedCompany?.username || 'Company'} logo`}
              >
                {!(selectedCompany?.logo || selectedCompany?.profileImage || selectedCompany?.companyLogo) && (
                  <Business className="text-white" />
                )}
              </Avatar>
              <h3 className="text-lg font-semibold text-[#0b1957]">
                {selectedCompany?.companyName || selectedCompany?.username || 'Company Details'}
              </h3>
            </div>
          </DialogTitle>
        </DialogHeader>
        <DialogContent className="min-h-[400px]">
          {selectedCompany && (
            <div>
              {/* Debug: Log selectedCompany summary status */}
              {console.log('Company summary:', selectedCompany.summary || 'none', 
                'companyId:', selectedCompany.id || selectedCompany.company_id,
                'allKeys:', Object.keys(selectedCompany)
              )}
              {/* Basic Company Info - Always Show */}
              <div className="mb-6 p-4 bg-[oklch(0.97_0_0)] rounded-lg border border-[oklch(0.922_0_0)]">
                <h4 className="text-base font-bold mb-4 text-[#0b1957]">
                  Company Information
                </h4>
                <div className="flex flex-col gap-3">
                  {selectedCompany.industry && (
                    <div className="flex gap-2">
                      <p className="text-sm font-semibold min-w-[120px] text-[#0b1957]">Industry:</p>
                      <p className="text-sm text-[oklch(0.145_0_0)]">{selectedCompany.industry}</p>
                    </div>
                  )}
                  {selectedCompany.phone && (
                    <div className="flex gap-2">
                      <p className="text-sm font-semibold min-w-[120px] text-[#0b1957]">Phone:</p>
                      <p className="text-sm text-[oklch(0.145_0_0)]">{selectedCompany.phone}</p>
                    </div>
                  )}
                  {selectedCompany.location && (
                    <div className="flex gap-2">
                      <p className="text-sm font-semibold min-w-[120px] text-[#0b1957]">Location:</p>
                      <p className="text-sm text-[oklch(0.145_0_0)]">{selectedCompany.location}</p>
                    </div>
                  )}
                  {selectedCompany.website && (
                    <div className="flex gap-2">
                      <p className="text-sm font-semibold min-w-[120px] text-[#0b1957]">Website:</p>
                      <a href={selectedCompany.website} target="_blank" rel="noopener noreferrer" className="text-[#0b1957] hover:text-[#0d1f6f]">{selectedCompany.website}</a>
                    </div>
                  )}
                  {selectedCompany.employees && (
                    <div className="flex gap-2">
                      <p className="text-sm font-semibold min-w-[120px] text-[#0b1957]">Company Size:</p>
                      <p className="text-sm text-[oklch(0.145_0_0)]">{selectedCompany.employees}</p>
                    </div>
                  )}
                </div>
              </div>
              {/* Company Scale Metrics */}
              {selectedCompany.employeeCount && (
                <div className="mb-8">
                  <h4 className="text-base font-bold mb-4 text-[#0b1957]">
                    Company Scale
                  </h4>
                  <div className="flex gap-6 justify-around flex-wrap items-center">
                    {/* Company Size - Circular Design */}
                    <div className="flex flex-col items-center min-w-[120px]">
                      <div className="relative inline-flex mb-2">
                        <div
                          className="w-[120px] h-[120px] rounded-full flex items-center justify-center"
                          style={{
                            background: 'linear-gradient(135deg, #00d2ff 0%, #3a7bd5 100%)',
                            boxShadow: '0 4px 12px rgba(0, 210, 255, 0.4)'
                          }}
                        >
                          <div className="w-[95px] h-[95px] rounded-full bg-white flex items-center justify-center flex-col gap-1">
                            <Business className="text-[#0b1957] mb-1" style={{ fontSize: 32 }} />
                            <p className="text-[#0b1957] font-bold text-[0.7rem] text-center px-2">
                              {selectedCompany.employeeCount >= 200 ? 'Enterprise' :
                               selectedCompany.employeeCount >= 50 ? 'Medium' :
                               selectedCompany.employeeCount >= 11 ? 'Small' :
                               'Startup'}
                            </p>
                          </div>
                        </div>
                      </div>
                      <p className="text-[oklch(0.556_0_0)] font-semibold text-xs">
                        {selectedCompany.employeeCount} Employees
                      </p>
                    </div>
                    {/* View Employees Button - Circular Design */}
                    <div className="flex flex-col items-center min-w-[150px]">
                      <div className="relative inline-flex mb-2">
                        <div
                          onClick={() => handleGetEmployees(selectedCompany)}
                          className={`w-[150px] h-[150px] rounded-full flex items-center justify-center transition-all ${
                            employeeLoading[selectedCompany.id || selectedCompany.domain] 
                              ? 'cursor-not-allowed opacity-60' 
                              : 'cursor-pointer opacity-100 hover:scale-105'
                          }`}
                          style={{
                            background: 'linear-gradient(135deg, #00d2ff 0%, #3a7bd5 100%)',
                            boxShadow: employeeLoading[selectedCompany.id || selectedCompany.domain] 
                              ? '0 4px 12px rgba(0, 210, 255, 0.4)' 
                              : '0 4px 12px rgba(0, 210, 255, 0.4)',
                          }}
                        >
                          <div className="w-[120px] h-[120px] rounded-full bg-white flex items-center justify-center flex-col gap-1">
                            <People className="text-[#3a7bd5] mb-1" style={{ fontSize: 40 }} />
                            <p className="text-[#3a7bd5] font-bold text-[0.85rem] text-center px-2">
                              {employeeLoading[selectedCompany.id || selectedCompany.domain] 
                                ? 'Loading' 
                                : fetchedEmployeeData[selectedCompany.id || selectedCompany.domain]?.length > 0
                                  ? `${fetchedEmployeeData[selectedCompany.id || selectedCompany.domain].length}`
                                  : 'View'
                              }
                            </p>
                          </div>
                        </div>
                      </div>
                      <p className="text-[oklch(0.556_0_0)] font-semibold text-xs">
                        {employeeLoading[selectedCompany.id || selectedCompany.domain] 
                          ? 'Loading...' 
                          : fetchedEmployeeData[selectedCompany.id || selectedCompany.domain]?.length > 0
                            ? 'Employees Found'
                            : 'View Employees'
                        }
                      </p>
                    </div>
                  </div>
                </div>
              )}
              {/* Company Links - Always show if available */}
              {(selectedCompany.linkedinProfile || selectedCompany.website || selectedCompany.twitterUrl || selectedCompany.facebookUrl || selectedCompany.blogUrl) && (
                <div className="mb-8">
                  <h4 className="text-base font-bold mb-4 text-[#0b1957]">
                    Company Links
                  </h4>
                  <div className="flex gap-4 flex-wrap">
                    {selectedCompany.website && (
                      <Badge className="bg-[oklch(0.97_0_0)] text-[#0b1957] border border-[oklch(0.922_0_0)] hover:border-[#0b1957] transition-colors">
                        <Language className="mr-1" />
                        <a href={selectedCompany.website} target="_blank" rel="noopener noreferrer" className="text-[#0b1957]">
                          Website
                        </a>
                      </Badge>
                    )}
                    {selectedCompany.linkedinProfile && (
                      <Badge className="bg-[oklch(0.97_0_0)] text-[#0077b5] border border-[oklch(0.922_0_0)] hover:border-[#0077b5] transition-colors">
                        <LinkedInIcon className="mr-1" />
                        <a href={selectedCompany.linkedinProfile} target="_blank" rel="noopener noreferrer" className="text-[#0077b5]">
                          LinkedIn
                        </a>
                      </Badge>
                    )}
                    {selectedCompany.facebookUrl && (
                      <Badge className="bg-[oklch(0.97_0_0)] text-[#1877F2] border border-[oklch(0.922_0_0)] hover:border-[#1877F2] transition-colors">
                        <Facebook className="mr-1" />
                        <a href={selectedCompany.facebookUrl} target="_blank" rel="noopener noreferrer" className="text-[#1877F2]">
                          Facebook
                        </a>
                      </Badge>
                    )}
                    {selectedCompany.twitterUrl && (
                      <a
                        href={selectedCompany.twitterUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gray-50 text-[#0b1957] border border-gray-200 hover:border-[#0b1957] transition-colors"
                      >
                        <span className="text-base font-black font-sans">𝕏</span>
                        X (Twitter)
                      </a>
                    )}
                    {selectedCompany.blogUrl && (
                      <a
                        href={selectedCompany.blogUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gray-50 text-[#0b1957] border border-gray-200 hover:border-[#0b1957] transition-colors"
                      >
                        <Article className="h-4 w-4" />
                        Blog
                      </a>
                    )}
                  </div>
                </div>
              )}
              {/* Full Address */}
              {selectedCompany.rawAddress && (
                <div className="mb-4 p-2 bg-gray-50 rounded-lg border-l-4 border-[#0b1957] border border-gray-200">
                  <h4 className="font-bold mb-2 text-[#0b1957] flex items-center gap-1">
                    <LocationOn className="h-4 w-4 text-[#0b1957]" /> Full Address
                  </h4>
                  <p className="text-sm text-gray-900 capitalize">
                    {selectedCompany.rawAddress}
                  </p>
                </div>
              )}
              {/* Company Details - Founded Year & Industry Codes */}
              {(selectedCompany.foundingYear || (selectedCompany.naicsCodes && selectedCompany.naicsCodes.length > 0) || (selectedCompany.sicCodes && selectedCompany.sicCodes.length > 0)) && (
                <div className="mb-4">
                  <h4 className="font-bold mb-2 text-[#0b1957]">
                    Company Details
                  </h4>
                  <div className="flex gap-2 flex-wrap">
                    {selectedCompany.foundingYear && (
                      <div className="flex-none min-w-[150px] p-2 bg-gray-50 rounded-lg border-2 border-[#0b1957] text-center">
                        <div className="flex items-center justify-center mb-0.5">
                          <CalendarToday className="h-5 w-5 text-[#0b1957] mr-0.5" />
                          <p className="text-xs font-semibold text-[#0b1957]">Founded</p>
                        </div>
                        <h3 className="text-lg font-bold text-[#0b1957]">
                          {selectedCompany.foundingYear}
                        </h3>
                      </div>
                    )}
                    {selectedCompany.naicsCodes && selectedCompany.naicsCodes.length > 0 && (
                      <div className="flex-[1_1_auto] min-w-[200px] p-4 bg-[oklch(0.97_0_0)] rounded-lg border-2 border-[#0b1957]">
                        <div className="flex items-center mb-1">
                          <Code className="text-[#0b1957] mr-1" style={{ fontSize: 20 }} />
                          <p className="text-xs font-semibold text-[#0b1957]">NAICS Codes</p>
                        </div>
                        <p className="text-sm font-semibold text-[#0b1957]">
                          {selectedCompany.naicsCodes.join(', ')}
                        </p>
                      </div>
                    )}
                    {selectedCompany.sicCodes && selectedCompany.sicCodes.length > 0 && (
                      <div className="flex-1 min-w-[200px] p-2 bg-gray-50 rounded-lg border-2 border-[#0b1957]">
                        <div className="flex items-center mb-0.5">
                          <Tag className="h-5 w-5 text-[#0b1957] mr-0.5" />
                          <p className="text-xs font-semibold text-[#0b1957]">SIC Codes</p>
                        </div>
                        <p className="text-sm font-semibold text-[#0b1957]">
                          {selectedCompany.sicCodes.join(', ')}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
              {/* Sales Summary (from topic filtering) */}
              {selectedCompany.summary && typeof selectedCompany.summary === 'string' && selectedCompany.summary.trim().length > 0 && (
                <div className="mb-8 p-6 bg-white rounded-2xl border-l-4 border-2 border-[#0b1957] shadow-md">
                  <h4 className="text-base font-bold mb-4 text-[#0b1957] flex items-center gap-2">
                    <Article className="text-[#0b1957]" style={{ fontSize: 20 }} />
                    Sales Intelligence Summary
                  </h4>
                  <div className="leading-relaxed whitespace-pre-wrap text-[#212529] text-[0.95rem] [&_strong]:font-bold [&_strong]:text-[#0b1957]">
                    {selectedCompany.summary.split('\n').map((line, idx) => {
                      // Format markdown-style headers
                      if (line.startsWith('##')) {
                        return (
                          <h3 key={idx} className="mt-4 mb-2 text-lg text-[#0b1957] font-bold">
                            {line.replace(/^##+\s*/, '')}
                          </h3>
                        );
                      } else if (line.startsWith('#')) {
                        return (
                          <h2 key={idx} className="mt-4 mb-2 text-xl text-[#0b1957] font-bold">
                            {line.replace(/^#+\s*/, '')}
                          </h2>
                        );
                      } else if (line.trim() === '') {
                        return <br key={idx} />;
                      } else {
                        // Format bold text
                        const parts = line.split(/(\*\*.*?\*\*)/g);
                        return (
                          <p key={idx} className="mb-2 text-[#212529] text-[0.95rem]">
                            {parts.map((part, partIdx) => {
                              if (part.startsWith('**') && part.endsWith('**')) {
                                return <strong key={partIdx}>{part.slice(2, -2)}</strong>;
                              }
                              return <span key={partIdx}>{part}</span>;
                            })}
                          </p>
                        );
                      }
                    })}
                  </div>
                </div>
              )}
              {/* Company Description */}
              {selectedCompany.companyDescription && (
                <div className="mb-8 p-4 bg-[oklch(0.97_0_0)] rounded-lg border-l-4 border-[#0b1957] border border-[oklch(0.922_0_0)]">
                  <h4 className="text-base font-bold mb-4 text-[#0b1957]">
                    About Company
                  </h4>
                  <p className="text-sm text-[oklch(0.145_0_0)] leading-relaxed">
                    {selectedCompany.companyDescription}
                  </p>
                </div>
              )}
              {/* Growth Metrics - Circular Progress */}
              {(selectedCompany.growth6M || selectedCompany.growth12M || selectedCompany.growth24M) && (
                <div className="mb-8">
                  <h4 className="text-base font-bold mb-4 text-[#0b1957]">
                    Growth Analytics
                  </h4>
                  <div className="flex gap-6 justify-around flex-wrap">
                    {selectedCompany.growth6M && (
                      <div className="flex flex-col items-center min-w-[120px]">
                        <div className="relative inline-flex mb-2">
                          <div
                            className="w-[100px] h-[100px] rounded-full flex items-center justify-center"
                            style={{
                              background: `conic-gradient(#0b1957 ${Math.min(parseFloat(selectedCompany.growth6M) * 100, 100) * 3.6}deg, #e0e0e0 0deg)`,
                            }}
                          >
                            <div className="w-[80px] h-[80px] rounded-full bg-white flex items-center justify-center flex-col">
                              <h3 className="text-lg font-bold text-[#0b1957]">
                                {(parseFloat(selectedCompany.growth6M) * 100).toFixed(1)}%
                              </h3>
                            </div>
                          </div>
                        </div>
                        <p className="text-[oklch(0.556_0_0)] font-semibold text-xs">
                          6 Month Growth
                        </p>
                      </div>
                    )}
                    {selectedCompany.growth12M && (
                      <div className="flex flex-col items-center min-w-[120px]">
                        <div className="relative inline-flex mb-2">
                          <div
                            className="w-[100px] h-[100px] rounded-full flex items-center justify-center"
                            style={{
                              background: `conic-gradient(#0b1957 ${Math.min(parseFloat(selectedCompany.growth12M) * 100, 100) * 3.6}deg, #e0e0e0 0deg)`,
                            }}
                          >
                            <div className="w-[80px] h-[80px] rounded-full bg-white flex items-center justify-center flex-col">
                              <h3 className="text-lg font-bold text-[#0b1957]">
                                {(parseFloat(selectedCompany.growth12M) * 100).toFixed(1)}%
                              </h3>
                            </div>
                          </div>
                        </div>
                        <p className="text-[oklch(0.556_0_0)] font-semibold text-xs">
                          12 Month Growth
                        </p>
                      </div>
                    )}
                    {selectedCompany.growth24M && (
                      <div className="flex flex-col items-center min-w-[120px]">
                        <div className="relative inline-flex mb-2">
                          <div
                            className="w-[100px] h-[100px] rounded-full flex items-center justify-center"
                            style={{
                              background: `conic-gradient(#0b1957 ${Math.min(parseFloat(selectedCompany.growth24M) * 100, 100) * 3.6}deg, #e0e0e0 0deg)`,
                            }}
                          >
                            <div className="w-[80px] h-[80px] rounded-full bg-white flex items-center justify-center flex-col">
                              <h3 className="text-lg font-bold text-[#0b1957]">
                                {(parseFloat(selectedCompany.growth24M) * 100).toFixed(1)}%
                              </h3>
                            </div>
                          </div>
                        </div>
                        <p className="text-[oklch(0.556_0_0)] font-semibold text-xs">
                          24 Month Growth
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
              {/* Revenue & Financial Metrics */}
              {(selectedCompany.revenue || selectedCompany.stockInfo || selectedCompany.foundingYear) && (
                <div className="mb-8">
                  <h4 className="text-base font-bold mb-4 text-[#0b1957]">
                    Financial Overview
                  </h4>
                  <div className="flex gap-4 flex-wrap">
                    {selectedCompany.revenue && (
                      <div className="flex-1 min-w-[200px] p-4 bg-[oklch(0.97_0_0)] rounded-lg border-2 border-[#0b1957]">
                        <div className="flex items-center gap-2 mb-2">
                          <AttachMoney className="text-[#0b1957]" style={{ fontSize: 28 }} />
                          <p className="text-xs font-semibold text-[#0b1957] uppercase">
                            Annual Revenue
                          </p>
                        </div>
                        <h3 className="text-xl font-bold text-[#0b1957]">
                          {selectedCompany.revenue}
                        </h3>
                      </div>
                    )}
                    {selectedCompany.stockInfo && (
                      <div className="flex-1 min-w-[200px] p-4 bg-[oklch(0.97_0_0)] rounded-lg border-2 border-[#0b1957]">
                        <div className="flex items-center gap-2 mb-2">
                          <ShowChart className="text-[#0b1957]" style={{ fontSize: 28 }} />
                          <p className="text-xs font-semibold text-[#0b1957] uppercase">
                            Stock Info
                          </p>
                        </div>
                        <h3 className="text-xl font-bold text-[#0b1957]">
                          {selectedCompany.stockInfo}
                        </h3>
                      </div>
                    )}
                    {selectedCompany.foundingYear && (
                      <div className="flex-1 min-w-[200px] p-4 bg-[rgba(186,104,200,0.1)] rounded-lg border-2 border-[#ba68c8]">
                        <div className="flex items-center gap-2 mb-2">
                          <CalendarToday className="text-[#ba68c8]" style={{ fontSize: 28 }} />
                          <p className="text-xs font-semibold text-gray-500 uppercase">
                            Founded
                          </p>
                        </div>
                        <h3 className="text-xl font-bold text-[#9c27b0]">
                          {selectedCompany.foundingYear}
                        </h3>
                        <p className="text-xs text-gray-500">
                          {new Date().getFullYear() - parseInt(selectedCompany.foundingYear)} years in business
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
              {/* NAICS & SIC Codes */}
              {(selectedCompany.naicsCodes?.length > 0 || selectedCompany.sicCodes?.length > 0) && (
                <div className="mb-6">
                  <h4 className="text-sm font-bold mb-2">
                    Industry Codes:
                  </h4>
                  <div className="flex flex-col gap-2">
                    {selectedCompany.naicsCodes?.length > 0 && (
                      <div className="flex gap-2">
                        <p className="text-sm font-semibold">NAICS:</p>
                        <p className="text-sm text-gray-500">{selectedCompany.naicsCodes.join(', ')}</p>
                      </div>
                    )}
                    {selectedCompany.sicCodes?.length > 0 && (
                      <div className="flex gap-2">
                        <p className="text-sm font-semibold">SIC:</p>
                        <p className="text-sm text-gray-500">{selectedCompany.sicCodes.join(', ')}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
              {/* Top Employees / Executive Team */}
              {selectedCompany.cLevelExecutives && selectedCompany.cLevelExecutives.length > 0 && (
                <div className="mb-8">
                  <h4 className="text-base font-bold mb-4 flex items-center gap-2">
                    <People className="text-[#1976d2]" /> Top Employees & Decision Makers
                  </h4>
                  <div className="flex flex-col gap-4">
                    {selectedCompany.cLevelExecutives.slice(0, 10).map((employee, index) => (
                      <div 
                        key={index}
                        className="p-4 bg-[#f8f9fa] rounded-lg border border-[#e9ecef] hover:bg-[#e9ecef] hover:shadow-md transition-all"
                      >
                        <div className="flex items-start gap-4">
                          {/* Employee Avatar */}
                          <Avatar 
                            src={employee.photo_url} 
                            alt={employee.name}
                            className="w-12 h-12 bg-[#1976d2] text-lg font-bold"
                          >
                            {employee.name ? employee.name.charAt(0).toUpperCase() : '👤'}
                          </Avatar>
                          {/* Employee Details */}
                          <div className="flex-1">
                            <h5 className="text-base font-bold text-black mb-1">
                              {employee.name || 'Unknown Name'}
                            </h5>
                            {employee.title && (
                              <p className="text-sm text-gray-600 mb-2">
                                {employee.title}
                              </p>
                            )}
                            {/* Contact Info */}
                            <div className="flex flex-wrap gap-4 mt-2">
                              {employee.email && (
                                <div className="flex items-center gap-1">
                                  <Email className="text-[#ba68c8]" style={{ fontSize: 16, filter: 'drop-shadow(0 0 6px rgba(186, 104, 200, 0.4))' }} />
                                  <p className="text-xs text-gray-700">
                                    {employee.email}
                                  </p>
                                </div>
                              )}
                              {employee.phone && (
                                <div className="flex items-center gap-1">
                                  <Phone className="text-[#ba68c8]" style={{ fontSize: 16, filter: 'drop-shadow(0 0 6px rgba(186, 104, 200, 0.4))' }} />
                                  <p className="text-xs text-gray-700">
                                    {employee.phone}
                                  </p>
                                </div>
                              )}
                              {employee.city && (
                                <div className="flex items-center gap-1">
                                  <LocationOn className="text-[#ba68c8]" style={{ fontSize: 16, filter: 'drop-shadow(0 0 6px rgba(186, 104, 200, 0.4))' }} />
                                  <p className="text-xs text-gray-700">
                                    {employee.city}{employee.country ? `, ${employee.country}` : ''}
                                  </p>
                                </div>
                              )}
                            </div>
                            {/* LinkedIn Link */}
                            {employee.linkedin_url && (
                              <div className="mt-2">
                                <Badge className="bg-[#e3f2fd] text-[#0077b5] hover:bg-[#bbdefb] text-[0.7rem] h-6">
                                  <LinkedInIcon className="mr-1" />
                                  <a href={employee.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-[#0077b5]">
                                    View LinkedIn Profile
                                  </a>
                                </Badge>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {/* Show count if more than 10 employees */}
                  {selectedCompany.cLevelExecutives.length > 10 && (
                    <p className="text-xs text-gray-500 mt-4 block text-center">
                      Showing top 10 of {selectedCompany.cLevelExecutives.length} employees
                    </p>
                  )}
                </div>
              )}
              {/* Services Offered */}
              {selectedCompany.servicesOffered && selectedCompany.servicesOffered.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-sm font-bold mb-2">
                    Services Offered:
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedCompany.servicesOffered.map((service, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {service}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
        <DialogFooter className="p-3 gap-2">
          <Button 
            onClick={handleCloseDialog} 
            className="bg-[#0b1957] text-white rounded-[20px] hover:bg-[#0d1f6f]"
          >
            Close
          </Button>
        </DialogFooter>
      </Dialog>
      {/* Employee List Dialog */}
      <Dialog 
        open={employeeDialogOpen} 
        onOpenChange={(open) => {
          if (!open) {
            setEmployeeDialogOpen(false);
            setEmployeeRoleFilter('all'); // Reset filter when closing
            setSelectedDialogEmployees(new Set()); // Reset selection when closing
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>
            <div className="flex items-center gap-4 justify-between flex-wrap">
              <div className="flex items-center gap-4">
                <Avatar 
                  className="w-10 h-10 bg-[#0b1957]"
                  src={selectedEmployeeCompany?.logoUrl || selectedEmployeeCompany?.logo}
                  alt={`${selectedEmployeeCompany?.companyName || 'Company'} logo`}
                >
                  {!(selectedEmployeeCompany?.logoUrl || selectedEmployeeCompany?.logo) && (
                    <Business />
                  )}
                </Avatar>
                <div>
                  <h3 className="text-lg font-semibold text-[#0b1957]">
                    {selectedEmployeeCompany?.companyName || selectedEmployeeCompany?.username || 'Company'} - Team
                  </h3>
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-[oklch(0.556_0_0)]">
                      {filterEmployeesByRole(fetchedEmployeeData[selectedEmployeeCompany?.id || selectedEmployeeCompany?.domain], employeeRoleFilter)?.length || 0} 
                      {employeeRoleFilter !== 'all' && ` of ${fetchedEmployeeData[selectedEmployeeCompany?.id || selectedEmployeeCompany?.domain]?.length || 0}`} Employees
                    </p>
                    {employeeCacheInfo[selectedEmployeeCompany?.id || selectedEmployeeCompany?.domain]?.from_cache && (
                      <Badge className="h-5 text-[0.7rem] bg-[oklch(0.97_0_0)] text-[#0b1957] font-semibold border border-[oklch(0.922_0_0)]">
                        📦 Cached ({employeeCacheInfo[selectedEmployeeCompany?.id || selectedEmployeeCompany?.domain]?.cache_age_days}d old)
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            {/* Select All on left, Filter/Button/View Toggle on right */}
            <div className="flex gap-4 items-center justify-between flex-wrap w-full">
              {/* Select All Checkbox - Left side */}
              {(() => {
                const companyId = selectedEmployeeCompany?.id || selectedEmployeeCompany?.domain;
                const employees = fetchedEmployeeData[companyId] || [];
                const filteredEmployees = filterEmployeesByRole(employees, employeeRoleFilter);
                const allSelected = filteredEmployees.length > 0 && selectedDialogEmployees.size === filteredEmployees.length;
                const someSelected = selectedDialogEmployees.size > 0 && selectedDialogEmployees.size < filteredEmployees.length;
                return (
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          // Select all filtered employees
                          const allIndices = new Set(filteredEmployees.map((_, idx) => idx));
                          setSelectedDialogEmployees(allIndices);
                        } else {
                          // Deselect all
                          setSelectedDialogEmployees(new Set());
                        }
                      }}
                      className="text-[#0b1957]"
                    />
                    <Label className="text-[#0b1957]">Select All</Label>
                  </div>
                );
              })()}
              {/* Right side: Filter, Send Connection Button, and View Toggle */}
              <div className="flex gap-4 items-center flex-wrap">
                {/* Role Filter Dropdown */}
                <Select value={employeeRoleFilter} onValueChange={setEmployeeRoleFilter}>
                  <SelectTrigger className="min-w-[180px] bg-white border border-[oklch(0.922_0_0)] rounded-lg text-[#0b1957] hover:border-[#0b1957] focus:border-[#0b1957]">
                    <SelectValue placeholder="Filter by Role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Employees</SelectItem>
                    <SelectItem value="executive">Executive (CEO, CTO, CFO)</SelectItem>
                    <SelectItem value="director">Directors</SelectItem>
                    <SelectItem value="manager">Managers</SelectItem>
                    <SelectItem value="hr">HR & Recruitment</SelectItem>
                    <SelectItem value="sales">Sales & Business Dev</SelectItem>
                    <SelectItem value="marketing">Marketing</SelectItem>
                    <SelectItem value="engineering">Engineering & Tech</SelectItem>
                    <SelectItem value="operations">Operations</SelectItem>
                    <SelectItem value="finance">Finance & Accounting</SelectItem>
                  </SelectContent>
                </Select>
                {/* Send Connection Button - Always visible */}
                <Button
                  size="sm"
                  onClick={handleSendLinkedInConnectionsFromDialog}
                  disabled={selectedDialogEmployees.size === 0}
                  className={`rounded-full whitespace-nowrap px-4 font-semibold transition-all ${
                    selectedDialogEmployees.size > 0 
                      ? 'bg-[#0077b5] hover:bg-[#005885] hover:shadow-md hover:-translate-y-0.5 text-white' 
                      : 'bg-[#cccccc] text-[#666666] cursor-not-allowed opacity-60'
                  }`}
                >
                  <LinkedInIcon className="mr-2 h-4 w-4" />
                  Send Connection {selectedDialogEmployees.size > 0 ? `(${selectedDialogEmployees.size})` : ''}
                </Button>
                {/* View Toggle Button */}
                <div className="flex gap-1 bg-[oklch(0.97_0_0)] rounded-lg p-1 border border-[oklch(0.922_0_0)]">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEmployeeViewMode('grid')}
                        className={`${
                          employeeViewMode === 'grid' 
                            ? 'bg-[#0b1957] text-white hover:bg-[#0d1f6f]' 
                            : 'bg-transparent text-[#0b1957] hover:bg-[oklch(0.97_0_0)]'
                        }`}
                      >
                        <ViewModule className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>Grid View</p></TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEmployeeViewMode('list')}
                        className={`${
                          employeeViewMode === 'list' 
                            ? 'bg-[#0b1957] text-white hover:bg-[#0d1f6f]' 
                            : 'bg-transparent text-[#0b1957] hover:bg-[oklch(0.97_0_0)]'
                        }`}
                      >
                        <ViewList className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>List View</p></TooltipContent>
                  </Tooltip>
                </div>
              </div>
            </div>
            </div>
          </DialogTitle>
        </DialogHeader>
        <DialogContent className="min-h-[400px] p-3 w-full max-w-full overflow-y-auto overflow-x-hidden border-t border-b">
          <div className={`grid gap-3 items-stretch w-full box-border ${
            employeeViewMode === 'grid' 
              ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3' 
              : 'grid-cols-1'
          }`}>
            {selectedEmployeeCompany && filterEmployeesByRole(fetchedEmployeeData[selectedEmployeeCompany?.id || selectedEmployeeCompany.domain], employeeRoleFilter)?.map((employee, index) => (
              <div key={index} className="flex flex-col h-full w-full min-w-0 max-w-full">
                <Card 
                  onClick={() => {
                    const newSelected = new Set(selectedDialogEmployees);
                    if (newSelected.has(index)) {
                      newSelected.delete(index);
                    } else {
                      newSelected.add(index);
                    }
                    setSelectedDialogEmployees(newSelected);
                  }}
                  className={`w-full max-w-full flex-1 flex flex-col rounded-xl transition-all relative overflow-hidden min-w-0 cursor-pointer ${
                    selectedDialogEmployees.has(index)
                      ? 'bg-[oklch(0.98_0.01_250)] border-2 border-[#0077b5] shadow-lg'
                      : 'bg-white border border-[oklch(0.922_0_0)] shadow-sm'
                  } ${
                    employeeViewMode === 'grid' 
                      ? 'hover:-translate-y-1' 
                      : 'hover:-translate-y-0.5'
                  } ${
                    selectedDialogEmployees.has(index)
                      ? 'hover:shadow-xl hover:border-[#005885]'
                      : 'hover:shadow-md hover:border-[#0b1957]'
                  }`}
                  style={{
                    boxShadow: selectedDialogEmployees.has(index) 
                      ? '0 4px 12px rgba(0, 119, 181, 0.3)' 
                      : '0 1px 3px rgba(0, 0, 0, 0.1)',
                  }}
                >
                  <CardContent className={`${
                    employeeViewMode === 'grid' ? 'p-4' : 'p-5'
                  } flex flex-col flex-1 w-full max-w-full min-h-0 box-border min-w-0 overflow-hidden relative`}>
                    {/* Selection Indicator - Top Right */}
                    {selectedDialogEmployees.has(index) && (
                      <div className="absolute top-2 right-2 z-10 bg-[#0077b5] rounded-full w-6 h-6 flex items-center justify-center shadow-md">
                        <Check className="text-white" style={{ fontSize: 16 }} />
                      </div>
                    )}
                    {employeeViewMode === 'grid' ? (
                      <>
                        {/* Avatar - Top */}
                        <div className="flex justify-center mb-4 flex-shrink-0">
                          <Avatar 
                            src={employee.photo_url}
                            alt={employee.name}
                            className="w-[90px] h-[90px] border-4 border-[#0b1957] shadow-md"
                          >
                            <Person style={{ fontSize: 50 }} />
                          </Avatar>
                        </div>
                        {/* Employee Details Wrapper - Fills remaining space */}
                        <div className="flex flex-col items-center w-full max-w-full flex-1 min-h-0 min-w-0 self-stretch justify-between">
                          {/* Top Section: Name, Title, Company */}
                          <div className="flex flex-col items-center gap-3 w-full min-w-0 flex-shrink-0">
                            {/* Employee Name */}
                            <h3 className="font-bold text-lg text-[#0b1957] w-full text-center overflow-hidden text-ellipsis whitespace-nowrap px-2">
                              {employee.name || 'Unknown'}
                            </h3>
                            {/* Employee Title/Role */}
                            <Badge className="font-bold text-sm bg-[#0b1957] text-white max-w-full overflow-hidden text-ellipsis whitespace-nowrap px-2">
                              {employee.title || 'No Title'}
                            </Badge>
                            {/* Company Name */}
                            {employee.company_name && (
                              <div className="bg-[oklch(0.97_0_0)] px-3 py-1 rounded border border-[oklch(0.922_0_0)] w-full max-w-full text-center min-w-0 overflow-hidden box-border">
                                <p 
                                  className="font-semibold text-xs text-[#0b1957] overflow-hidden text-ellipsis whitespace-nowrap block w-full max-w-full box-border"
                                  title={`@ ${employee.company_name}`}
                                >
                                  @ {employee.company_name}
                                </p>
                              </div>
                            )}
                            {/* Divider */}
                            <div className="w-full h-px bg-[#e0e0e0] my-3" />
                          </div>
                          {/* Contact Details List - Bottom */}
                          <div className="w-full flex flex-col gap-3 items-stretch flex-shrink-0">
                        {/* Location */}
                        {(employee.city || employee.country) && (
                          <div className="flex items-center gap-2 w-full min-w-0 max-w-full">
                            <LocationOn className="text-[#0b1957] flex-shrink-0" style={{ fontSize: 18 }} />
                            <p 
                              className="text-[oklch(0.145_0_0)] text-xs flex-1 min-w-0 max-w-full overflow-hidden text-ellipsis whitespace-nowrap block"
                              title={[employee.city, employee.state, employee.country].filter(Boolean).join(', ')}
                            >
                              {[employee.city, employee.state, employee.country].filter(Boolean).join(', ')}
                            </p>
                          </div>
                        )}
                        {/* LinkedIn */}
                        {employee.linkedin_url && (
                          <div className="flex items-center gap-2 w-full">
                            <LinkedInIcon className="text-[#0077b5]" style={{ fontSize: 18 }} />
                            <a
                              href={employee.linkedin_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[#0077b5] text-xs no-underline hover:underline overflow-hidden text-ellipsis whitespace-nowrap flex-1"
                            >
                              View LinkedIn Profile
                            </a>
                          </div>
                        )}
                        {/* Phone Number (Blurred) */}
                        <div className="flex items-center gap-2 w-full">
                          <div className="bg-[#0b1957] rounded-full p-1 flex items-center justify-center">
                            <Phone className="text-white" style={{ fontSize: 16 }} />
                          </div>
                          {(() => {
                            const empId = getEmployeeId(employee);
                            const empRevealed = empId ? (revealedContacts[empId] || {}) : {};
                            const empRevealing = empId ? (revealingContacts[empId] || {}) : {};
                            const phoneNotFound = empRevealed.phone === 'not_found';
                            const hasPhone = empRevealed.phone && empRevealed.phone !== 'not_found';
                            const displayPhone = hasPhone 
                              ? empRevealed.phone 
                              : phoneNotFound 
                                ? 'Number not found' 
                                : '+971 50 123 4567';
                            return (
                              <>
                                <p className={`text-xs flex-1 overflow-hidden text-ellipsis whitespace-nowrap ${
                                  hasPhone 
                                    ? 'text-[#0b1957] font-semibold' 
                                    : phoneNotFound 
                                      ? 'text-[#d32f2f] font-semibold italic' 
                                      : 'text-[oklch(0.556_0_0)] font-normal blur-sm select-none'
                                }`}
                                  style={{
                                    letterSpacing: hasPhone ? 'normal' : '1px',
                                  }}
                                >
                                  {displayPhone}
                                </p>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleRevealPhone(employee);
                                      }}
                                      disabled={empRevealing?.phone || hasPhone}
                                      className="bg-[oklch(0.97_0_0)] border border-[oklch(0.922_0_0)] hover:bg-[oklch(0.97_0_0)] hover:border-[#0b1957] p-1"
                                    >
                                      {empRevealing?.phone ? (
                                          <Loader2 className="h-5 w-5 text-[#0b1957] animate-spin" />
                                      ) : hasPhone ? (
                                          <CheckCircle className="text-[#0b1957]" style={{ fontSize: 20 }} />
                                      ) : (
                                          <Lock className="text-[#0b1957]" style={{ fontSize: 20 }} />
                                      )}
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>{hasPhone ? "Phone number revealed" : phoneNotFound ? "Phone number not available" : "Click to reveal phone number"}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </>
                            );
                          })()}
                        </div>
                        {/* Email (Blurred) */}
                        <div className="flex items-center gap-2 w-full">
                          <div className="bg-[#0b1957] rounded-full p-1 flex items-center justify-center">
                            <Email className="text-white" style={{ fontSize: 16 }} />
                          </div>
                          {(() => {
                            const empId = getEmployeeId(employee);
                            const empRevealed = empId ? (revealedContacts[empId] || {}) : {};
                            const empRevealing = empId ? (revealingContacts[empId] || {}) : {};
                            const emailNotFound = empRevealed.email === 'not_found';
                            const hasEmail = empRevealed.email && empRevealed.email !== 'not_found';
                            const displayEmail = hasEmail 
                              ? empRevealed.email 
                              : emailNotFound 
                                ? 'Email not found' 
                                : 'name@company.com';
                            return (
                              <>
                                <p className={`text-xs flex-1 overflow-hidden text-ellipsis whitespace-nowrap ${
                                  hasEmail 
                                    ? 'text-[#0b1957] font-semibold' 
                                    : emailNotFound 
                                      ? 'text-[#d32f2f] font-semibold italic' 
                                      : 'text-[oklch(0.556_0_0)] font-normal blur-sm select-none'
                                }`}
                                  style={{
                                    letterSpacing: hasEmail ? 'normal' : '1px',
                                  }}
                                >
                                  {displayEmail}
                                </p>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleRevealEmail(employee);
                                      }}
                                      disabled={empRevealing?.email || hasEmail}
                                      className="bg-[oklch(0.97_0_0)] border border-[oklch(0.922_0_0)] hover:bg-[oklch(0.97_0_0)] hover:border-[#0b1957] p-1"
                                    >
                                      {empRevealing?.email ? (
                                          <Loader2 className="h-5 w-5 text-[#0b1957] animate-spin" />
                                      ) : hasEmail ? (
                                          <CheckCircle className="text-[#0b1957]" style={{ fontSize: 20 }} />
                                      ) : (
                                          <Lock className="text-[#0b1957]" style={{ fontSize: 20 }} />
                                      )}
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>{hasEmail ? "Email address revealed" : emailNotFound ? "Email address not available" : "Click to reveal email address"}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </>
                            );
                          })()}
                        </div>
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        {/* List View Layout */}
                        <div className="flex flex-row items-center gap-4 justify-between flex-1 w-full">
                          {/* Left Section: Photo + Basic Info */}
                          <div className="flex flex-row items-center gap-3 flex-[0_0_auto]">
                            <Avatar 
                              src={employee.photo_url}
                              alt={employee.name}
                              className="w-20 h-20 border-[3px] border-[#0b1957] shadow-lg flex-shrink-0"
                            >
                              <Person style={{ fontSize: 40 }} />
                            </Avatar>
                            <div className="flex flex-col gap-2 min-w-[200px] max-w-[300px]">
                              <h3 className="font-bold text-base text-[#0b1957] whitespace-nowrap overflow-hidden text-ellipsis leading-tight">
                                {employee.name || 'Unknown'}
                              </h3>
                              <Badge className="font-semibold text-xs max-w-fit h-[26px] bg-[#0b1957] text-white">
                                {employee.title || 'No Title'}
                              </Badge>
                              {employee.company_name && (
                                <p className="text-[oklch(0.556_0_0)] text-xs font-medium">
                                  @ {employee.company_name}
                                </p>
                              )}
                            </div>
                          </div>
                          {/* Middle Section: Contact Details (List View) */}
                          {employeeViewMode === 'list' && (
                        <div className="flex items-center gap-5 flex-1 min-w-0 pl-4">
                          {/* Location */}
                          {(employee.city || employee.country) && (
                            <div className="flex items-center gap-3 min-w-0">
                              <LocationOn className="text-[#0b1957] flex-shrink-0" style={{ fontSize: 22 }} />
                              <p className="text-[oklch(0.145_0_0)] text-sm whitespace-nowrap overflow-hidden text-ellipsis font-medium">
                                {employee.city || employee.country}
                              </p>
                            </div>
                          )}
                          {/* LinkedIn */}
                          {employee.linkedin_url && (
                            <div className="flex items-center gap-3 min-w-0">
                              <LinkedInIcon className="text-[#0077b5] flex-shrink-0" style={{ fontSize: 22 }} />
                              <a
                                href={employee.linkedin_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[#0077b5] text-sm no-underline font-medium hover:underline hover:text-[#005582] whitespace-nowrap overflow-hidden text-ellipsis"
                              >
                                LinkedIn
                              </a>
                            </div>
                          )}
                          {/* Phone with Lock */}
                          <div className="flex items-center gap-3">
                            <Phone className="text-[#0b1957]" style={{ fontSize: 22 }} />
                            {(() => {
                                const empId = getEmployeeId(employee);
                                const empRevealed = empId ? (revealedContacts[empId] || {}) : {};
                                const empRevealing = empId ? (revealingContacts[empId] || {}) : {};
                                const phoneNotFound = empRevealed.phone === 'not_found';
                                const hasPhone = empRevealed.phone && empRevealed.phone !== 'not_found';
                                const displayPhone = hasPhone ? empRevealed.phone : (phoneNotFound ? 'Number not found' : '+971 50 123 4567');
                                return (
                                  <>
                                    <p className={`text-sm flex-1 overflow-hidden text-ellipsis whitespace-nowrap ${
                                      hasPhone 
                                        ? 'text-[#0b1957] font-semibold' 
                                        : phoneNotFound 
                                          ? 'text-[#d32f2f] font-semibold italic' 
                                          : 'text-[oklch(0.556_0_0)] font-normal blur-sm select-none'
                                    }`}
                                      style={{
                                        letterSpacing: hasPhone ? 'normal' : '1px',
                                      }}
                                    >
                                      {displayPhone}
                                    </p>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button 
                                          variant="ghost"
                                          size="sm"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleRevealPhone(employee);
                                          }}
                                          disabled={empRevealing?.phone || hasPhone}
                                          className={`p-1 ${
                                            hasPhone 
                                              ? 'bg-[#c8e6c9] hover:bg-[#c8e6c9]' 
                                              : 'bg-[#e3f2fd] hover:bg-[#bbdefb]'
                                          }`}
                                        >
                                          {empRevealing?.phone ? (
                                            <Loader2 className="h-4 w-4 text-[#0b1957] animate-spin" />
                                          ) : hasPhone ? (
                                            <CheckCircle className="text-[#0b1957]" style={{ fontSize: 16 }} />
                                          ) : (
                                            <Lock className="text-[#0b1957]" style={{ fontSize: 16 }} />
                                          )}
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>{hasPhone ? "Phone number revealed" : phoneNotFound ? "Phone number not available" : "Click to reveal phone number"}</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </>
                                );
                              })()}
                          </div>
                          {/* Email with Lock */}
                          <div className="flex items-center gap-3">
                            <Email className="text-[#0b1957]" style={{ fontSize: 22 }} />
                            {(() => {
                              const empId = getEmployeeId(employee);
                              const empRevealed = empId ? (revealedContacts[empId] || {}) : {};
                              const empRevealing = empId ? (revealingContacts[empId] || {}) : {};
                              const emailNotFound = empRevealed.email === 'not_found';
                              const hasEmail = empRevealed.email && empRevealed.email !== 'not_found';
                              const displayEmail = hasEmail ? empRevealed.email : (emailNotFound ? 'Email not found' : 'name@company.com');
                              return (
                                <>
                                  <p className={`text-sm max-w-[200px] flex-1 overflow-hidden text-ellipsis whitespace-nowrap ${
                                    hasEmail 
                                      ? 'text-[#0b1957] font-semibold' 
                                      : emailNotFound 
                                        ? 'text-[#d32f2f] font-semibold italic' 
                                        : 'text-[oklch(0.556_0_0)] font-normal blur-sm select-none'
                                  }`}
                                    style={{
                                      letterSpacing: hasEmail ? 'normal' : '1px',
                                    }}
                                  >
                                    {displayEmail}
                                  </p>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button 
                                        variant="ghost"
                                        size="sm"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleRevealEmail(employee);
                                        }}
                                        disabled={empRevealing?.email || hasEmail}
                                        className={`p-1 ${
                                          hasEmail 
                                            ? 'bg-[#c8e6c9] hover:bg-[#c8e6c9]' 
                                            : 'bg-[#e8f5e9] hover:bg-[#c8e6c9]'
                                        }`}
                                      >
                                        {empRevealing?.email ? (
                                          <Loader2 className="h-4 w-4 text-[#0b1957] animate-spin" />
                                        ) : hasEmail ? (
                                          <CheckCircle className="text-[#0b1957]" style={{ fontSize: 16 }} />
                                        ) : (
                                          <Lock className="text-[#0b1957]" style={{ fontSize: 16 }} />
                                        )}
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>{hasEmail ? "Email address revealed" : emailNotFound ? "Email address not available" : "Click to reveal email address"}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </>
                              );
                            })()}
                          </div>
                        </div>
                      )}
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
          {/* Error Message (shows even when loading if it's an Apollo fetching message) */}
          {selectedEmployeeCompany && 
           employeeError[selectedEmployeeCompany.id || selectedEmployeeCompany.domain] && (
            <div className="text-center py-12">
              {(employeeError[selectedEmployeeCompany.id || selectedEmployeeCompany.domain]?.includes('fetching') || 
                employeeError[selectedEmployeeCompany.id || selectedEmployeeCompany.domain]?.includes('Apollo')) && (
                <Loader2 className="h-15 w-15 text-[#0b1957] animate-spin mb-4" />
              )}
              <h3 className="text-lg text-gray-500 font-semibold mb-2">
                {employeeError[selectedEmployeeCompany.id || selectedEmployeeCompany.domain]?.includes('fetching') || 
                 employeeError[selectedEmployeeCompany.id || selectedEmployeeCompany.domain]?.includes('Apollo')
                  ? 'Fetching from Apollo API...'
                  : 'Error Loading Employees'}
              </h3>
              <p className="text-sm text-gray-500 mt-2 max-w-[500px] mx-auto">
                {employeeError[selectedEmployeeCompany.id || selectedEmployeeCompany.domain]}
              </p>
            </div>
          )}
          {/* Loading State (only show if no error message or error is not Apollo fetching) */}
          {selectedEmployeeCompany && 
           employeeLoading[selectedEmployeeCompany.id || selectedEmployeeCompany.domain] &&
           !employeeError[selectedEmployeeCompany.id || selectedEmployeeCompany.domain] && (
            <div className="text-center py-12">
              <Loader2 className="h-15 w-15 text-[#0b1957] animate-spin mb-4" />
              <h3 className="text-lg text-gray-500">
                Loading employees...
              </h3>
            </div>
          )}
          {/* No Employees Message */}
          {selectedEmployeeCompany && 
           !employeeLoading[selectedEmployeeCompany.id || selectedEmployeeCompany.domain] &&
           !employeeError[selectedEmployeeCompany.id || selectedEmployeeCompany.domain] &&
           (!fetchedEmployeeData[selectedEmployeeCompany.id || selectedEmployeeCompany.domain] || 
            filterEmployeesByRole(fetchedEmployeeData[selectedEmployeeCompany.id || selectedEmployeeCompany.domain], employeeRoleFilter)?.length === 0) && (
            <div className="text-center py-12">
              <People className="text-gray-400 mb-4 opacity-50" style={{ fontSize: 80 }} />
              <h2 className="text-xl text-gray-500 font-semibold mb-2">
                {employeeRoleFilter !== 'all' 
                  ? `No ${employeeRoleFilter} employees found` 
                  : 'No employees found'}
              </h2>
              <p className="text-sm text-gray-500 mt-2">
                This company doesn't have any employees in the database.
              </p>
            </div>
          )}
        </DialogContent>
        <DialogFooter className="p-2">
          <Button 
            onClick={() => {
              setEmployeeDialogOpen(false);
              setEmployeeRoleFilter('all'); // Reset filter when closing
            }} 
            className="bg-[#0b1957] text-white rounded-full hover:bg-[#0d1f6f]"
          >
            Close
          </Button>
        </DialogFooter>
      </Dialog>
      {/* Employee Detail Dialog */}
      <Dialog
        open={employeeDetailDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setEmployeeDetailDialogOpen(false);
            setSelectedEmployee(null);
          }
        }}
      >
        <DialogContent className="p-0">
          {selectedEmployee && (
            <Card 
              className="bg-white rounded-[20px] border border-[oklch(0.922_0_0)] shadow-sm overflow-hidden"
            >
              <CardContent className="p-6">
                <div className="flex flex-col items-center gap-3 w-full">
                  {/* Employee Photo */}
                  <Avatar 
                    src={selectedEmployee.photo_url}
                    alt={selectedEmployee.name}
                    className="w-[90px] h-[90px] border-4 border-[#0b1957] shadow-md flex-shrink-0"
                  >
                    <Person className="h-[50px] w-[50px]" />
                  </Avatar>
                  {/* Employee Name */}
                  <h3 className="font-bold text-lg text-[#0b1957] mt-2 text-center">
                    {selectedEmployee.name || 'Unknown'}
                  </h3>
                  {/* Employee Title/Role */}
                  <Badge className="max-w-full font-bold text-sm bg-[#0b1957] text-white">
                    {selectedEmployee.title || 'No Title'}
                  </Badge>
                  {/* Company Name with Logo - Clickable */}
                  {(() => {
                    const org = selectedEmployee.organization || {};
                    const empCompanyName = org.name || selectedEmployee.organization_name || 'Unknown Company';
                    const empCompanyLogo = org.logo_url || selectedEmployee.organization_logo_url || '';
                    const empCompanyId = normalizeCompanyId(org.id || selectedEmployee.organization_id || selectedEmployee.company_id);
                    const empCompany = data.find(c => {
                      const cId = normalizeCompanyId(c.id || c.company_id || c.apollo_organization_id);
                      return cId && empCompanyId && cId === empCompanyId;
                    });
                    return empCompanyName && (
                      <div 
                        onClick={(e) => {
                          e.stopPropagation();
                          if (empCompany) {
                            handleViewDetails(empCompany);
                            setEmployeeDetailDialogOpen(false);
                          }
                        }}
                        className={`bg-[oklch(0.97_0_0)] px-4 py-1 rounded border border-[oklch(0.922_0_0)] w-full text-center flex items-center justify-center gap-2 transition-all ${
                          empCompany ? 'cursor-pointer hover:border-[#0b1957] hover:scale-[1.02]' : 'cursor-default'
                        }`}
                      >
                        {empCompanyLogo && (
                          <Avatar 
                            src={empCompanyLogo}
                            className="w-5 h-5 flex-shrink-0"
                          >
                            <Business style={{ fontSize: 12 }} />
                          </Avatar>
                        )}
                        <p className="font-semibold text-xs text-[#0b1957] overflow-hidden text-ellipsis whitespace-nowrap">
                          @ {empCompanyName}
                        </p>
                      </div>
                    );
                  })()}
                  {/* Divider */}
                  <div className="w-full h-px bg-[oklch(0.922_0_0)] my-3" />
                  {/* Contact Details List */}
                  <div className="w-full flex flex-col gap-3">
                    {/* Location */}
                    {(selectedEmployee.city || selectedEmployee.country) && (
                      <div className="flex items-center gap-2">
                        <LocationOn className="text-[#0b1957]" style={{ fontSize: 18 }} />
                        <p className="text-[oklch(0.145_0_0)] text-xs flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
                          {[selectedEmployee.city, selectedEmployee.state, selectedEmployee.country].filter(Boolean).join(', ')}
                        </p>
                      </div>
                    )}
                    {/* LinkedIn */}
                    {selectedEmployee.linkedin_url && (
                      <div className="flex items-center gap-2">
                        <LinkedInIcon className="text-[#0077b5]" style={{ fontSize: 18 }} />
                        <a
                          href={selectedEmployee.linkedin_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-[#0077b5] text-xs no-underline hover:underline overflow-hidden text-ellipsis whitespace-nowrap flex-1"
                        >
                          View LinkedIn Profile
                        </a>
                      </div>
                    )}
                    {/* Phone Number (Blurred) */}
                    {(() => {
                      const empId = getEmployeeId(selectedEmployee);
                      const empRevealed = empId ? (revealedContacts[empId] || {}) : {};
                      const empRevealing = empId ? (revealingContacts[empId] || {}) : {};
                      // Check if phone was attempted but not found
                      const phoneNotFound = empRevealed.phone === 'not_found';
                      const hasPhone = empRevealed.phone && empRevealed.phone !== 'not_found';
                      const displayPhone = hasPhone 
                        ? empRevealed.phone 
                        : phoneNotFound 
                          ? 'Number not found' 
                          : (selectedEmployee.phone_number || '+971 50 123 4567');
                      return (
                        <div className="flex items-center gap-2">
                          <div className="bg-[#0b1957] rounded-full p-1 flex items-center justify-center">
                            <Phone className="text-white" style={{ fontSize: 16 }} />
                          </div>
                          <p className={`text-xs flex-1 overflow-hidden text-ellipsis whitespace-nowrap ${
                            hasPhone 
                              ? 'text-[#0b1957] font-semibold' 
                              : phoneNotFound 
                                ? 'text-[#d32f2f] font-semibold italic' 
                                : 'text-[oklch(0.556_0_0)] font-normal blur-sm select-none'
                          }`}
                            style={{
                              letterSpacing: hasPhone ? 'normal' : '1px',
                            }}
                          >
                            {displayPhone}
                          </p>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRevealPhone(selectedEmployee);
                                }}
                                disabled={empRevealing?.phone || hasPhone}
                                className="bg-[oklch(0.97_0_0)] border border-[oklch(0.922_0_0)] hover:bg-[oklch(0.97_0_0)] hover:border-[#0b1957] p-1"
                              >
                                {empRevealing?.phone ? (
                                  <Loader2 className="h-5 w-5 text-[#0b1957] animate-spin" />
                                ) : hasPhone ? (
                                  <CheckCircle className="text-[#0b1957]" style={{ fontSize: 20 }} />
                                ) : (
                                  <Lock className="text-[#0b1957]" style={{ fontSize: 20 }} />
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{hasPhone ? "Phone number revealed" : phoneNotFound ? "Phone number not available" : "Click to reveal phone number"}</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      );
                    })()}
                    {/* Email (Blurred) */}
                    {(() => {
                      const empId = selectedEmployee.id || selectedEmployee.linkedin_url || selectedEmployee.name;
                      const empRevealed = revealedContacts[empId] || {};
                      const empRevealing = revealingContacts[empId] || {};
                      // Check if email was attempted but not found
                      const emailNotFound = empRevealed.email === 'not_found';
                      const hasEmail = empRevealed.email && empRevealed.email !== 'not_found';
                      const displayEmail = hasEmail 
                        ? empRevealed.email 
                        : emailNotFound 
                          ? 'Email not found' 
                          : (selectedEmployee.email || 'name@company.com');
                      return (
                        <div className="flex items-center gap-2">
                          <div className="bg-[#0b1957] rounded-full p-1 flex items-center justify-center">
                            <Email className="text-white" style={{ fontSize: 16 }} />
                          </div>
                          <p className={`text-xs flex-1 overflow-hidden text-ellipsis whitespace-nowrap ${
                            hasEmail 
                              ? 'text-[#0b1957] font-semibold' 
                              : emailNotFound 
                                ? 'text-[#d32f2f] font-semibold italic' 
                                : 'text-[oklch(0.556_0_0)] font-normal blur-sm select-none'
                          }`}
                            style={{
                              letterSpacing: hasEmail ? 'normal' : '1px',
                            }}
                          >
                            {displayEmail}
                          </p>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRevealEmail(selectedEmployee);
                                }}
                                disabled={empRevealing?.email || hasEmail}
                                className="bg-[oklch(0.97_0_0)] border border-[oklch(0.922_0_0)] hover:bg-[oklch(0.97_0_0)] hover:border-[#0b1957] p-1"
                              >
                                {empRevealing?.email ? (
                                  <Loader2 className="h-5 w-5 text-[#0b1957] animate-spin" />
                                ) : hasEmail ? (
                                  <CheckCircle className="text-[#0b1957]" style={{ fontSize: 20 }} />
                                ) : (
                                  <Lock className="text-[#0b1957]" style={{ fontSize: 20 }} />
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{hasEmail ? "Email address revealed" : emailNotFound ? "Email address not available" : "Click to reveal email address"}</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </DialogContent>
        <DialogFooter className="p-2">
          <Button 
            onClick={() => {
              setEmployeeDetailDialogOpen(false);
              setSelectedEmployee(null);
            }} 
            className="bg-[#0b1957] text-white rounded-[20px] hover:bg-[#0d1f6f]"
          >
            Close
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
