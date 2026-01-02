
"use client";
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { apolloLeadsService, getDecisionMakerPhone } from '@/features/apollo-leads';
import { Phone as PhoneIcon } from '@mui/icons-material';
import { safeStorage } from '../utils/storage';

// Get API base URL from environment variable
const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL ? `${process.env.NEXT_PUBLIC_BACKEND_URL}/api` : '';

// Helper function to get userId from auth token
const getUserId = () => {
  try {
    const token = safeStorage.getItem('auth_token');
    if (!token) return 'demo_user_123';
    
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.userId || payload.id || 'demo_user_123';
  } catch (error) {
    console.error('Error getting user ID:', error);
    return 'demo_user_123';
  }
};
import {
  Box,
  Grid,
  Typography,
  Chip,
  Tooltip,
  IconButton,
  Card,
  CardContent,
  CardActions,
  Avatar,
  Link,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Checkbox,
  FormControlLabel,
  Paper,
  Fade,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  Alert,
  Menu,
  Tabs,
  Tab,
  Skeleton,
  Stack
} from '@mui/material';
import {
  Business,
  Person,
  Email,
  Phone,
  Language,
  LocationOn,
  LinkedIn as LinkedInIcon,
  LinkedIn,
  ExpandMore,
  People,
  Work,
  SelectAll,
  SmartToy,
  CheckCircle,
  Check,
  Facebook,
  Instagram,
  CalendarToday,
  Group,
  AttachMoney,
  Home,
  Tag,
  Settings,
  TrendingUp,
  TrendingDown,
  ShowChart,
  Lock,
  Public,
  Code,
  Article,
  RssFeed,
  ViewModule,
  ViewList,
  BusinessCenter,
  Straighten,
  FilterList
} from '@mui/icons-material';
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
    console.log('🔄 updateActiveTab called:', newValue, 'isControlled:', isControlled, 'onActiveTabChange exists:', !!onActiveTabChange);
    if (isControlled) {
      // Controlled: notify parent
      if (onActiveTabChange) {
        console.log('📞 Calling onActiveTabChange with:', newValue);
        onActiveTabChange(newValue);
      } else {
        console.warn('⚠️ Component is controlled but onActiveTabChange is not provided!');
      }
    } else {
      // Uncontrolled: update internal state
      console.log('📝 Updating internal tab state to:', newValue);
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
  //   console.log('👥 EmployeeData changed in CompanyDataTable:', {
  //     length: employeeData.length,
  //     isArray: Array.isArray(employeeData),
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
  // console.log('🔍 CompanyDataTable received data:', { 
  //   companiesCount: data.length, 
  //   employeesCount: employeeData.length,
  //   activeTab,
  // });
  
  // Discount intelligence removed - no longer needed
  
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

  // console.log('🔍 CompanyDataTable received data:', data); // Disabled for performance

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
  console.log('📊 Data length:', data.length);
  if (data.length > 0) {
    console.log('📋 First company in CompanyDataTable:', data[0]);
    console.log('👥 First company executives in CompanyDataTable:', data[0].cLevelExecutives);
    console.log('📝 First company description in CompanyDataTable:', data[0].companyDescription);
    console.log('🔗 First company LinkedIn Profile in CompanyDataTable:', data[0].linkedinProfile);
  }

  const handleViewDetails = async (company) => {
    // Fetch richer company details for Apollo results when available
      try {
        console.log('🔍 Company Details Data (initial):', company);
        console.log('📝 Available companySummaries keys:', Object.keys(companySummaries));
        
        // Get company ID for summary lookup
      const companyId = normalizeCompanyId(company.id || company.company_id || company.apollo_organization_id);
      console.log('🔑 Looking up summary for company ID:', companyId);
      
      // First check if company already has summary attached (from restoration)
      let summary = company.summary;
      console.log('🔍 Initial summary check:', {
        companyHasSummary: !!company.summary,
        summaryLength: company.summary?.length || 0,
        summaryPreview: company.summary?.substring(0, 50) || 'none'
      });
      
      // If not, try to find in companySummaries prop with multiple matching strategies
      if (!summary && companyId && Object.keys(companySummaries).length > 0) {
        console.log('🔍 Looking up summary in companySummaries prop...');
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
            console.log('✅ Found summary using normalized matching');
          }
        }
      }
      
      // Log summary lookup result
      if (summary) {
        console.log('✅ Summary found for company:', companyId, 'Length:', summary.length);
      } else {
        console.log('⚠️ No summary found for company ID:', companyId);
        console.log('   Company object has summary?', !!company.summary);
        console.log('   Company summary value:', company.summary);
        console.log('   Available company IDs in summaries:', Object.keys(companySummaries));
      }
        
        // Always set company with summary (preserve if it exists, add if found)
        const companyWithSummary = {
          ...company,
          ...(summary ? { summary } : {}) // Always include summary if we have it
        };
        
        console.log('📦 Setting selectedCompany with summary:', !!companyWithSummary.summary);
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
            console.log('✅ Company details fetched:', detailed);
            // Merge detailed fields into selected company, preserve summary
            setSelectedCompany(prev => {
              // Prioritize prev.summary (from restoration) over other sources
              const companyIdForSummary = prev.id || prev.company_id || company.id || company.company_id;
              const currentSummary = prev.summary || summary || companySummaries[companyIdForSummary] || companySummaries[String(companyIdForSummary)];
              
              console.log('🔄 Merging Apollo details, preserving summary:', {
                prevHasSummary: !!prev.summary,
                summaryVar: !!summary,
                companySummariesHasIt: !!companySummaries[companyIdForSummary],
                finalSummary: !!currentSummary
              });
              
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
      console.error('❌ Failed fetching company details:', e);
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

//     console.log("📞 Resolving phones for IDs:", ids);

//     // resolve now so we can decide single vs bulk
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
//     console.log("📞 Resolved phones:", rows);

//     if (rows.length === 0) {
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
//       console.log("📞 Opening single call URL:", href.toString());
//       const newWindow = window.open(href.toString(), "_blank");
//       if (!newWindow) {
//         alert("Popup blocked! Please allow popups for this site to open the calling interface.");
//       }
//     } else if (rows.length > 1) {
//       // ✅ bulk flow — just pass ids, and page.tsx will fetch + show list
//       const encodedIds = encodeURIComponent(btoa(JSON.stringify(ids)));
//       const href = `${ERP_URL}/make-call?bulk=1&ids=${encodedIds}`;
//       console.log("📞 Opening bulk call URL:", href);
//       const newWindow = window.open(href, "_blank");
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

    console.log('🔍 Company data:', {
      name: companyName,
      companyName: company.companyName,
      username: company.username,
      domain: companyDomain,
      website: company.website,
      linkedinProfile: company.linkedinProfile
    });

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
      console.log(`ℹ️ Phone already displayed on card: ${phoneData[companyId].phone}`);
      return;
    }

    // Set loading state
    setPhoneLoading(prev => ({ ...prev, [companyId]: true }));
    setPhoneError(prev => ({ ...prev, [companyId]: null }));

    try {
      console.log('📞 Getting decision maker phone for:', companyName, '(', companyDomain, ')');
      
      const phoneResult = await getDecisionMakerPhone(
        companyDomain,
        companyName,
        (update) => {
          console.log('📞 Phone reveal status:', update);
          if (update.status === 'processing') {
            // Could show a toast or update UI with progress
            console.log('⏳', update.message);
          }
        }
      );

      console.log('✅ Phone data received:', phoneResult);

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
        console.log(`✅ Phone number added to card: ${phoneInfo.phone}`);
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
      console.log('⚠️ Company has invalid ID, using domain:', companyIdentifier);
    }

    console.log('👥 Getting employees for:', companyName);
    console.log('   Company ID:', company.id);
    console.log('   Company Domain:', company.domain);
    console.log('   Using identifier:', companyIdentifier);

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
      // console.log(`ℹ️ Employees already fetched: ${fetchedEmployeeData[companyId].length} employees`); // Disabled for performance
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
        console.log(cacheMsg, data.employees);
        
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
        console.log('ℹ️ No employees found in database, backend should call Apollo API');
        setFetchedEmployeeData(prev => ({ ...prev, [companyId]: [] }));
        
        // Check if backend indicated it will try Apollo or if it already tried
        if (data.trying_apollo || data.from_apollo === false) {
          // Backend is trying Apollo or already tried - wait a bit and show loading
          console.log('⏳ Backend is fetching from Apollo API...');
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
      console.log('📞 Phone already revealed for:', employee.name);
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
        console.log('✅ Phone already available in employee data:', normalizedPhone);
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
      
      console.log('📞 ============================================');
      console.log('📞 PHONE REVEAL REQUEST');
      console.log('📞 ============================================');
      console.log('🔍 Step 1: Checking database cache...');
      // console.log('   Employee:', employee.name); // Disabled for performance
      console.log('   Person ID:', personId);
      
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
          console.log('✅ Phone found in database cache!');
          console.log('   Phone:', data.phone);
          console.log('   💰 Credits used: 0 (from cache)');
        } else {
          console.log('✅ Phone revealed immediately!');
          console.log('   Phone:', data.phone);
          console.log('   💰 Credits used:', data.credits_used || 0);
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
        console.log('🔄 Phone NOT in database cache');
        console.log('📤 Request sent to Apollo API (8 credits charged)');
        console.log('⏰ Webhook delivery: 2-5 minutes');
        console.log('🔍 Starting polling to check for webhook result...');
        
        // Start polling for phone reveal status
        let pollAttempts = 0;
        const maxPollAttempts = 60; // Poll for up to 5 minutes (60 * 5 seconds)
        
        const pollInterval = setInterval(async () => {
          pollAttempts++;
          console.log(`🔄 Polling attempt ${pollAttempts}/${maxPollAttempts}...`);
          
          try {
            const statusResponse = await fetch(`${API_BASE_URL}/apollo-leads/check-phone-status/${personId}`);
            const statusData = await statusResponse.json();
            
            if (statusData.success && statusData.phone) {
              // Phone received from webhook!
              clearInterval(pollInterval);
              console.log('✅ ============================================');
              console.log('✅ PHONE NUMBER RECEIVED FROM WEBHOOK!');
              console.log('✅ ============================================');
              console.log('   Phone:', statusData.phone);
              console.log('   💰 Credits used:', statusData.credits_used);
              console.log('   📦 Now cached in database for future use');
              
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
              console.log('   Still processing...');
            } else {
              // Failed or not found
              clearInterval(pollInterval);
              console.log('❌ Phone reveal failed:', statusData.message);
              
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
              console.log('⏰ Phone reveal timed out');
              
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
        console.log(`✅ Phone revealed immediately: ${data.phone}`);
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
      console.log('📧 Email already revealed for:', employee.name);
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
      console.log('📧 ============================================');
      console.log('📧 EMAIL REVEAL REQUEST');
      console.log('📧 ============================================');
      console.log('🔍 Step 1: Checking database cache...');
      // console.log('   Employee:', employee.name); // Disabled for performance
      console.log('   Person ID:', personId);
      
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
          console.log('✅ Email found in database cache!');
          console.log('   Email:', data.email);
          console.log('   💰 Credits used: 0 (from cache)');
        } else {
          console.log('✅ Email revealed from Apollo API');
          console.log('   Email:', data.email);
          console.log('   💰 Credits used:', data.credits_used);
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
      console.log('[LinkedIn] Sending connection requests to:', url);
      console.log('[LinkedIn] API_BASE_URL:', API_BASE_URL);
      console.log('[LinkedIn] userId:', userId);
      console.log('[LinkedIn] Employees:', employeesToConnect);
      
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
    console.log('🔍 renderCLevelExecutives called with:', executives);
    console.log('📊 Executives type:', typeof executives);
    console.log('📊 Executives length:', executives?.length);
    console.log('📊 Executives JSON:', JSON.stringify(executives, null, 2));
    
    if (!executives || executives.length === 0) {
      console.log('⚠️ No executives data available');
      return <Typography variant="body2" color="text.secondary">No executive data available</Typography>;
    }

    // console.log('✅ Rendering executives:', executives); // Disabled for performance
    console.log('✅ First executive:', executives[0]);
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {executives.map((exec, index) => (
          <Card key={index} variant="outlined" sx={{ p: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
                <Person fontSize="small" />
              </Avatar>
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle2" fontWeight="bold">
                  {exec.name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {exec.position}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 0.5 }}>
                {exec.email && (
                  <Tooltip title="Email">
                    <IconButton size="small" href={`mailto:${exec.email}`}>
                      <Email fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
                {exec.linkedin && (
                  <Tooltip title="LinkedIn">
                    <IconButton size="small" href={exec.linkedin} target="_blank">
                      <Language fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
              </Box>
            </Box>
          </Card>
        ))}
      </Box>
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
    <Box sx={{ width: '100%', p: 2 }}>
      {/* Header - Matching Image Design */}
      {searchQuery && (
        <Box sx={{ 
          mb: 3, 
          p: 3,
          borderRadius: '12px',
          background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.95) 0%, rgba(51, 65, 85, 0.95) 100%)',
          border: '1px solid rgba(148, 163, 184, 0.2)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
        }}>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
            <Business sx={{ fontSize: 28, color: '#64b5f6' }} />
            <Typography variant="h5" fontWeight="600" sx={{ color: '#ffffff' }}>
              {searchQuery.industry || 'Company Search Results'}
            </Typography>
          </Box>
          
          <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)', mb: 1 }}>
            Found {data.length} leads • {searchQuery.date || new Date().toLocaleString()} 
            {searchQuery.location && ` • Location: ${searchQuery.location}`}
          </Typography>
          
          <Chip 
            label={`${data.length} results`}
            size="small"
            sx={{ 
              bgcolor: 'rgba(100, 181, 246, 0.2)',
              color: '#64b5f6',
              fontWeight: 600,
              border: '1px solid rgba(100, 181, 246, 0.3)',
              fontSize: '0.85rem'
            }}
          />
        </Box>

      )}
      
      {/* Fallback Header if no search query */}
      {!searchQuery && !employeeSearchQuery && (
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Business sx={{ fontSize: 32, color: 'primary.main' }} />
          <Typography variant="h4" fontWeight="bold">
            Company Data Results
          </Typography>
        </Box>
      )}
      
      {/* Header for employee search */}
      {employeeSearchQuery && (
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Business sx={{ fontSize: 32, color: 'primary.main' }} />
          <Typography variant="h4" fontWeight="bold">
            Company Data Results
          </Typography>
        </Box>
      )}

      {/* Tabs for Companies and Employees - Always show */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Tabs 
            value={activeTab} 
            onChange={(e, newValue) => {
              console.log('Tab clicked, switching to:', newValue === 0 ? 'Companies' : 'Employees');
              userManuallyChangedTabRef.current = true; // Mark as manual change
              updateActiveTab(newValue);
              // Reset the flag after a short delay to allow auto-switch for new searches
              setTimeout(() => {
                userManuallyChangedTabRef.current = false;
              }, 2000); // 2 seconds delay
            }}
            sx={{
              '& .MuiTab-root': {
                fontSize: '1rem',
                fontWeight: 600,
                textTransform: 'none',
                minHeight: 56,
                color: 'oklch(0.556 0 0)',
                '&.Mui-selected': {
                  color: '#0b1957',
                }
              },
              '& .MuiTabs-indicator': {
                backgroundColor: '#0b1957',
              }
            }}
          >
            <Tab 
              label={`Companies (${(() => {
                const filtered = getFilteredData().filter(item => {
                  const isCompany = item.companyName || item.username || (item.name && !item.first_name && !item.last_name);
                  if (!isCompany) return false;
                  const hasPhone = Boolean(item.phone);
                  const hasEmployees = Boolean(item.employeeCount && item.employeeCount > 0);
                  return hasPhone || hasEmployees;
                });
                return filtered.length;
              })()})`} 
              icon={<Business />}
              iconPosition="start"
              disabled={false}
            />
            <Tab 
              label={`Employees (${(() => {
                const filtered = getFilteredEmployeeData().filter(item => {
                  return item.first_name || item.last_name || item.title || (item.name && !item.companyName && !item.username);
                });
                return filtered.length;
              })()})`} 
              icon={<Person />}
              iconPosition="start"
              disabled={false}
            />
          </Tabs>
          
          {/* Buttons on the right side of tabs line */}
          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'nowrap' }}>
            {/* Employees Tab Buttons */}
            {activeTab === 1 && selectedEmployees.size > 0 && (
              <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'nowrap' }}>
                {onUnlockAllEmployeeEmails && (
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<Email />}
                    onClick={onUnlockAllEmployeeEmails}
                    disabled={Object.values(unlockingEmployeeContacts).some(v => v?.email)}
                    sx={{
                      background: '#0b1957',
                      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                      color: '#ffffff',
                      fontWeight: 600,
                      borderRadius: '20px',
                      whiteSpace: 'nowrap',
                      px: 2,
                      '&:hover': {
                        background: '#0d1f6f',
                        boxShadow: '0 2px 6px rgba(11, 25, 87, 0.3)',
                        transform: 'translateY(-1px)',
                      },
                      transition: 'all 0.3s ease-in-out',
                    }}
                  >
                    {selectAllEmployees || selectedEmployees.size === employeeData.length
                      ? 'Unlock All Emails'
                      : `Unlock Emails (${selectedEmployees.size})`}
                  </Button>
                )}
                {onUnlockAllEmployeePhones && (
                  <Button
                    variant="contained"
                    color="secondary"
                    size="small"
                    startIcon={<Phone />}
                    onClick={onUnlockAllEmployeePhones}
                    disabled={Object.values(unlockingEmployeeContacts).some(v => v?.phone)}
                    sx={{
                      background: '#0b1957',
                      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                      color: '#ffffff',
                      fontWeight: 600,
                      borderRadius: '20px',
                      whiteSpace: 'nowrap',
                      px: 2,
                      '&:hover': {
                        background: '#0d1f6f',
                        boxShadow: '0 2px 6px rgba(11, 25, 87, 0.3)',
                        transform: 'translateY(-1px)',
                      },
                      transition: 'all 0.3s ease-in-out',
                    }}
                  >
                    {selectAllEmployees || selectedEmployees.size === employeeData.length
                      ? 'Unlock All Numbers'
                      : `Unlock Numbers (${selectedEmployees.size})`}
                  </Button>
                )}
                {showAITrigger && (
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<PhoneIcon />}
                    onClick={handleStartIntelligentCallingEmployees}
                    disabled={intelligentCallingLoading || selectedEmployees.size === 0}
                    sx={{ 
                      background: '#0b1957', 
                      borderRadius: '20px',
                      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                      color: '#ffffff',
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                      px: 2,
                      '&:hover': { 
                        background: '#0d1f6f',
                        boxShadow: '0 2px 6px rgba(11, 25, 87, 0.3)',
                        transform: 'translateY(-1px)',
                      },
                      transition: 'all 0.3s ease-in-out',
                    }}
                  >
                    {intelligentCallingLoading ? <CircularProgress size={20} sx={{ color: 'white', mr: 1 }} /> : null}
                    Start Intelligent Calling
                  </Button>
                )}
              </Box>
            )}
            
            {/* Companies Tab Button */}
            {activeTab === 0 && showAITrigger && (
              <Button
                variant="contained"
                size="small"
                startIcon={<PhoneIcon />}
                onClick={handleStartIntelligentCallingCompanies}
                disabled={intelligentCallingLoading || selectedCompanies.size === 0}
                sx={{ 
                  background: '#0b1957', 
                  borderRadius: '20px',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                  color: '#ffffff',
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  px: 2,
                  '&:hover': { 
                    background: '#0d1f6f',
                    boxShadow: '0 2px 6px rgba(11, 25, 87, 0.3)',
                    transform: 'translateY(-1px)',
                  },
                  transition: 'all 0.3s ease-in-out',
                }}
              >
                {intelligentCallingLoading ? <CircularProgress size={20} sx={{ color: 'white', mr: 1 }} /> : null}
                Start Intelligent Calling
              </Button>
            )}
          </Box>
        </Box>

      {/* Selection Controls - Show for both tabs */}
      <Box sx={{ p: 2, mb: 3, position: 'relative' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap', position: 'relative', justifyContent: 'space-between' }}>
          {/* Left side controls */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            {/* Filter Button - Moved to the left */}
            <Box sx={{ position: 'relative', display: 'inline-block' }}>
              <Button
                ref={filterButtonRef}
                id="filter-button"
                variant="contained"
                size="small"
                startIcon={<FilterList />}
                onClick={handleFilterClick}
                sx={{
                  background: '#0b1957',
                  color: '#ffffff',
                  borderRadius: '20px',
                  fontWeight: 600,
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                  '&:hover': {
                    background: '#0d1f6f',
                    boxShadow: '0 2px 6px rgba(11, 25, 87, 0.3)',
                  }
                }}
              >
                Filter & Select
              </Button>
            </Box>
            
            <FormControlLabel
              control={
                <Checkbox
                  checked={activeTab === 0 ? selectAll : selectAllEmployees}
                  onChange={activeTab === 0 ? handleSelectAll : handleSelectAllEmployees}
                  icon={<SelectAll />}
                  checkedIcon={<CheckCircle />}
                  sx={{
                    color: '#0b1957',
                    '&.Mui-checked': {
                      color: '#0b1957',
                    }
                  }}
                />
              }
              label="Select All"
              sx={{ color: '#0b1957' }}
            />
            
            <Typography variant="body2" sx={{ color: 'oklch(0.145 0 0)' }}>
              {activeTab === 0 
                ? `${selectedCompanies.size} of ${getFilteredData().length} companies selected`
                : `${selectedEmployees.size} of ${getFilteredEmployeeData().length} employees selected`
              }
            </Typography>
          </Box>
          
          {/* Right side: Send Connection Button and Pagination controls */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {/* Send Connection Button - Only on Employees tab and when employees are selected */}
            {activeTab === 1 && selectedEmployees.size > 0 && (
              <Button
                variant="contained"
                size="small"
                startIcon={<LinkedInIcon />}
                onClick={() => {
                  console.log('Send Connection clicked', { hasHandler: !!onSendLinkedInConnections, selected: selectedEmployees.size });
                  if (onSendLinkedInConnections) {
                    onSendLinkedInConnections();
                  } else {
                    alert('LinkedIn connection feature is not available.');
                  }
                }}
                disabled={!onSendLinkedInConnections || selectedEmployees.size === 0}
                sx={{
                  background: (onSendLinkedInConnections && selectedEmployees.size > 0) ? '#0077b5' : '#cccccc',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                  color: '#ffffff',
                  fontWeight: 600,
                  borderRadius: '20px',
                  whiteSpace: 'nowrap',
                  px: 2,
                  '&:hover': {
                    background: (onSendLinkedInConnections && selectedEmployees.size > 0) ? '#005885' : '#cccccc',
                    boxShadow: (onSendLinkedInConnections && selectedEmployees.size > 0) ? '0 2px 6px rgba(0, 119, 181, 0.3)' : 'none',
                    transform: (onSendLinkedInConnections && selectedEmployees.size > 0) ? 'translateY(-1px)' : 'none',
                  },
                  '&:disabled': {
                    background: '#cccccc',
                    color: '#666666',
                    cursor: 'not-allowed',
                    opacity: 0.6
                  },
                  transition: 'all 0.3s ease-in-out',
                }}
              >
                Send Connection {selectedEmployees.size > 0 ? `(${selectedEmployees.size})` : ''}
              </Button>
            )}
            
            {/* Pagination controls */}
            {(() => {
              const controls = activeTab === 0 ? paginationControls : employeePaginationControls;
              console.log('🔍 Pagination Debug:', {
                activeTab,
                hasPaginationControls: !!paginationControls,
                hasEmployeePaginationControls: !!employeePaginationControls,
                selectedControls: controls ? 'yes' : 'no',
                paginationControlsType: typeof paginationControls,
                employeePaginationControlsType: typeof employeePaginationControls,
                isReactElement: controls && typeof controls === 'object',
                controlsValue: controls
              });
              return controls && (
                <Box>
                  {controls}
                </Box>
              );
            })()}
          </Box>
        </Box>
      </Box>

      {/* Filter Menu - Always render for proper positioning */}
      <Menu
        anchorEl={filterAnchorEl}
        open={Boolean(filterAnchorEl)}
        onClose={handleFilterClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
        disableScrollLock={false}
        disablePortal={false}
        MenuListProps={{
          'aria-labelledby': 'filter-button',
          dense: false,
        }}
        PaperProps={{
          elevation: 8,
          sx: {
            bgcolor: '#ffffff',
            minWidth: 280,
            maxHeight: 400,
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
            border: '1px solid oklch(0.922 0 0)',
            borderRadius: '20px',
            mt: 0.5,
          }
        }}
        slotProps={{
          root: {
            sx: {
              zIndex: 1300,
            }
          }
        }}
        sx={{
          '& .MuiPaper-root': {
            marginTop: '4px !important',
          }
        }}
      >
        {/* Company Filters */}
        {activeTab === 0 && [
            <MenuItem key="company-size-header" disabled sx={{ fontWeight: 700, color: '#0b1957', fontSize: '0.875rem', opacity: 1, bgcolor: 'oklch(0.97 0 0)' }}>
              Select by Company Size
            </MenuItem>,
        <MenuItem 
          onClick={() => handleFilterToggle('enterprise')}
          key="enterprise"
          sx={{
            '&:hover': { bgcolor: 'oklch(0.97 0 0)' },
            py: 1.5,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
            <Checkbox 
              checked={selectedFilters.has('enterprise')} 
              size="small"
              sx={{ color: '#0b1957', '&.Mui-checked': { color: '#0b1957' } }}
            />
            <Typography sx={{ color: '#0b1957', fontWeight: 500 }}>
            Enterprise (200+ employees)
            </Typography>
          </Box>
        </MenuItem>,
        <MenuItem 
          onClick={() => handleFilterToggle('large')}
          key="large"
          sx={{
            '&:hover': { bgcolor: 'oklch(0.97 0 0)' },
            py: 1.5,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
            <Checkbox 
              checked={selectedFilters.has('large')} 
              size="small"
              sx={{ color: '#0b1957', '&.Mui-checked': { color: '#0b1957' } }}
            />
            <Typography sx={{ color: '#0b1957', fontWeight: 500 }}>
            Large (50-199 employees)
            </Typography>
          </Box>
        </MenuItem>,
        <MenuItem 
          onClick={() => handleFilterToggle('medium')}
          key="medium"
          sx={{
            '&:hover': { bgcolor: 'oklch(0.97 0 0)' },
            py: 1.5,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
            <Checkbox 
              checked={selectedFilters.has('medium')} 
              size="small"
              sx={{ color: '#0b1957', '&.Mui-checked': { color: '#0b1957' } }}
            />
            <Typography sx={{ color: '#0b1957', fontWeight: 500 }}>
            Medium (10-49 employees)
            </Typography>
          </Box>
        </MenuItem>,
        <MenuItem 
          onClick={() => handleFilterToggle('small')}
          key="small"
          sx={{
            '&:hover': { bgcolor: 'oklch(0.97 0 0)' },
            py: 1.5,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
            <Checkbox 
              checked={selectedFilters.has('small')} 
              size="small"
              sx={{ color: '#0b1957', '&.Mui-checked': { color: '#0b1957' } }}
            />
            <Typography sx={{ color: '#0b1957', fontWeight: 500 }}>
            Small (1-10 employees)
            </Typography>
          </Box>
        </MenuItem>,
        
        <MenuItem disabled key="data-availability-header" sx={{ fontWeight: 700, color: '#0b1957', fontSize: '0.875rem', opacity: 1, bgcolor: 'oklch(0.97 0 0)', mt: 1 }}>
          Select by Data Availability
        </MenuItem>,
        <MenuItem 
          onClick={() => handleFilterToggle('with-phone')}
          key="company-with-phone"
          sx={{
            '&:hover': { bgcolor: 'oklch(0.97 0 0)' },
            py: 1.5,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
            <Checkbox 
              checked={selectedFilters.has('with-phone')} 
              size="small"
              sx={{ color: '#0b1957', '&.Mui-checked': { color: '#0b1957' } }}
            />
            <Typography sx={{ color: '#0b1957', fontWeight: 500 }}>
            Companies with Phone Number
            </Typography>
          </Box>
        </MenuItem>,
        <MenuItem 
          onClick={() => handleFilterToggle('with-linkedin')}
          key="company-with-linkedin"
          sx={{
            '&:hover': { bgcolor: 'oklch(0.97 0 0)' },
            py: 1.5,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
            <Checkbox 
              checked={selectedFilters.has('with-linkedin')} 
              size="small"
              sx={{ color: '#0b1957', '&.Mui-checked': { color: '#0b1957' } }}
            />
            <Typography sx={{ color: '#0b1957', fontWeight: 500 }}>
            Companies with LinkedIn
            </Typography>
          </Box>
        </MenuItem>,
        <MenuItem 
          onClick={() => handleFilterToggle('with-website')}
          sx={{
            '&:hover': { bgcolor: 'oklch(0.97 0 0)' },
            py: 1.5,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
            <Checkbox 
              checked={selectedFilters.has('with-website')} 
              size="small"
              sx={{ color: '#0b1957', '&.Mui-checked': { color: '#0b1957' } }}
            />
            <Typography sx={{ color: '#0b1957', fontWeight: 500 }}>
            Companies with Website
            </Typography>
          </Box>
        </MenuItem>,
        <MenuItem 
          onClick={() => handleFilterToggle('with-summary')}
          key="company-with-summary"
          sx={{
            '&:hover': { bgcolor: 'oklch(0.97 0 0)' },
            py: 1.5,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
            <Checkbox 
              checked={selectedFilters.has('with-summary')} 
              size="small"
              sx={{ color: '#0b1957', '&.Mui-checked': { color: '#0b1957' } }}
            />
            <Typography sx={{ color: '#0b1957', fontWeight: 500 }}>
            With Sales Summary
            </Typography>
          </Box>
        </MenuItem>]}

        {/* Employee Filters */}
        {activeTab === 1 && [<MenuItem disabled key="employee-header" sx={{ fontWeight: 700, color: '#0b1957', fontSize: '0.875rem', opacity: 1, bgcolor: 'oklch(0.97 0 0)' }}>
              Filter Employees
            </MenuItem>,
            <MenuItem 
              onClick={() => handleFilterToggle('with-linkedin')}
              sx={{
                '&:hover': { bgcolor: 'oklch(0.97 0 0)' },
                py: 1.5,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                <Checkbox 
                  checked={selectedFilters.has('with-linkedin')} 
                  size="small"
                  sx={{ color: '#0b1957', '&.Mui-checked': { color: '#0b1957' } }}
                />
                <Typography sx={{ color: '#0b1957', fontWeight: 500 }}>
                With LinkedIn Profile
                </Typography>
              </Box>
            </MenuItem>,
            <MenuItem 
              onClick={() => handleFilterToggle('with-phone')}
              key="employee-with-phone"
              sx={{
                '&:hover': { bgcolor: 'oklch(0.97 0 0)' },
                py: 1.5,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                <Checkbox 
                  checked={selectedFilters.has('with-phone')} 
                  size="small"
                  sx={{ color: '#0b1957', '&.Mui-checked': { color: '#0b1957' } }}
                />
                <Typography sx={{ color: '#0b1957', fontWeight: 500 }}>
                With Phone Number
                </Typography>
              </Box>
            </MenuItem>,
            <MenuItem 
              onClick={() => handleFilterToggle('with-email')}
              key="employee-with-email"
              sx={{
                '&:hover': { bgcolor: 'oklch(0.97 0 0)' },
                py: 1.5,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                <Checkbox 
                  checked={selectedFilters.has('with-email')} 
                  size="small"
                  sx={{ color: '#0b1957', '&.Mui-checked': { color: '#0b1957' } }}
                />
                <Typography sx={{ color: '#0b1957', fontWeight: 500 }}>
                With Email Address
                </Typography>
              </Box>
            </MenuItem>,
            <MenuItem 
              onClick={() => handleFilterToggle('with-summary')}
              key="employee-with-summary"
              sx={{
                '&:hover': { bgcolor: 'oklch(0.97 0 0)' },
                py: 1.5,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                <Checkbox 
                  checked={selectedFilters.has('with-summary')} 
                  size="small"
                  sx={{ color: '#0b1957', '&.Mui-checked': { color: '#0b1957' } }}
                />
                <Typography sx={{ color: '#0b1957', fontWeight: 500 }}>
                With Sales Summary
                </Typography>
              </Box>
            </MenuItem>]}
      </Menu>

      {/* Companies Tab Content */}
      {(() => {
        console.log('🔍 Companies tab check - activeTab:', activeTab, 'should render:', activeTab === 0);
        return activeTab === 0;
      })() && (
      <>
      {/* Companies Tab Content - Always show when tab is active */}
      {/* Grid Layout - Only render company cards from data prop (never employee data) */}
      {isLoading ? (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(1, 1fr)', sm: 'repeat(2, 1fr)', md: 'repeat(auto-fit, minmax(280px, 1fr))' }, gap: 2, position: 'relative', zIndex: 2, alignItems: 'stretch' }}>
          {[...Array(6)].map((_, index) => (
            <Card key={index} sx={{ bgcolor: 'oklch(0.985 0 0)', border: '1px solid oklch(0.89 0 0)', borderRadius: 2, overflow: 'hidden' }}>
              <CardContent sx={{ p: 2.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
                    <Skeleton variant="circular" width={48} height={48} />
                    <Box sx={{ flex: 1 }}>
                      <Skeleton variant="text" width="70%" height={24} sx={{ mb: 0.5 }} />
                      <Skeleton variant="text" width="50%" height={20} />
                    </Box>
                  </Box>
                  <Skeleton variant="circular" width={24} height={24} />
                </Box>
                <Box sx={{ mb: 2 }}>
                  <Skeleton variant="text" width="40%" height={20} sx={{ mb: 1 }} />
                  <Skeleton variant="text" width="60%" height={20} sx={{ mb: 1 }} />
                  <Skeleton variant="text" width="50%" height={20} />
                </Box>
                <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                  <Skeleton variant="rounded" width={80} height={24} />
                  <Skeleton variant="rounded" width={100} height={24} />
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Skeleton variant="rounded" width="48%" height={36} />
                  <Skeleton variant="rounded" width="48%" height={36} />
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>
      ) : (
      (() => {
        console.log('🔍 Companies tab rendering - activeTab:', activeTab, 'data.length:', data.length);
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

        console.log('📊 Filtered companies count:', filteredCompanies.length);
        return filteredCompanies.length > 0 ? (
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(1, 1fr)', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }, gap: 2, position: 'relative', zIndex: 2, alignItems: 'stretch' }}>
            {filteredCompanies.map((company, index) => (
          <Box key={company.id || index} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
            <Card 
              onClick={() => handleSelectCompany(company.id || index)}
              sx={{ 
                width: '100%',
                height: '100%',
                display: 'flex', 
                flexDirection: 'column',
                minHeight: 0,
                transition: 'all 0.2s ease',
                border: selectedCompanies.has(company.id || index) ? '2px solid' : '1px solid',
                borderColor: selectedCompanies.has(company.id || index) ? '#0b1957' : '#e9ecef',
                borderRadius: '12px',
                overflow: 'hidden',
                position: 'relative',
                bgcolor: '#ffffff',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                cursor: 'pointer',
                '&:hover': {
                  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                  borderColor: selectedCompanies.has(company.id || index) ? '#0b1957' : '#dee2e6'
                },
                '&::before': selectedCompanies.has(company.id || index) ? {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                  height: '3px',
                  background: '#0b1957',
                  zIndex: 1
                } : {}
              }}
            >
              <CardContent sx={{ flexGrow: 1, p: 0, position: 'relative', zIndex: 2 }}>
                {/* Company Header - Clean White Background */}
                <Box sx={{ 
                  bgcolor: '#ffffff',
                  p: 2.5,
                  position: 'relative'
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                    <Box 
                      sx={{ 
                        position: 'relative'
                      }}
                    >
                    <Avatar 
                      sx={{ 
                        width: 56, 
                        height: 56, 
                        bgcolor: 'primary.main',
                        color: 'white',
                        border: selectedCompanies.has(company.id || index) ? '3px solid #0b1957' : '2px solid #e9ecef',
                        flexShrink: 0,
                        transition: 'all 0.2s ease'
                      }}
                      src={company.logoUrl || company.logo || company.profileImage || company.companyLogo}
                      alt={`${company.companyName || company.username || 'Company'} logo`}
                    >
                      {!(company.logoUrl || company.logo || company.profileImage || company.companyLogo) && (
                        <Business fontSize="large" />
                      )}
                    </Avatar>
                      {selectedCompanies.has(company.id || index) && (
                        <Box
                          sx={{
                            position: 'absolute',
                            top: -4,
                            right: -4,
                            width: 24,
                            height: 24,
                            borderRadius: '50%',
                            bgcolor: '#0b1957',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: '2px solid white',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                          }}
                        >
                          <CheckCircle sx={{ fontSize: 16, color: 'white' }} />
                        </Box>
                      )}
                    </Box>
                    <Box sx={{ 
                      flex: 1, 
                      minWidth: 0,
                      minHeight: '56px',
                      display: 'flex',
                      alignItems: 'center'
                    }}>
                      <Typography 
                        variant="h6" 
                        fontWeight="bold"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewDetails(company);
                        }}
                        sx={{ 
                          wordBreak: 'break-word',
                          lineHeight: 1.3,
                          fontSize: '1.125rem',
                          color: '#000000',
                          cursor: 'pointer',
                          transition: 'color 0.2s',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          '&:hover': {
                            color: '#0b1957',
                            textDecoration: 'underline'
                          }
                        }}
                      >
                        {company.companyName || company.username || 'Unknown Company'}
                      </Typography>
                    </Box>
                  </Box>
                </Box>

                {/* Card Body */}
                <Box sx={{ 
                  p: 2.5, 
                  pt: 0
                }}>

                {/* All Variable Content - Each section has fixed height */}
                <Box sx={{ mb: 0 }}>
                
                {/* Industry - Fixed 24px */}
                <Box sx={{ minHeight: '24px', mb: 0.5 }}>
                  {company.industry && (
                    <Chip
                      label={company.industry}
                      size="small" 
                      variant="outlined"
                      sx={{ fontWeight: 'bold', height: 24 }}
                    />
                  )}
                </Box>
                  
                {/* Decision Maker Contact - Fixed 60px */}
                <Box sx={{ minHeight: '60px', mb: 0 }}>
                {phoneData[company.id] && (
                  <Box sx={{ 
                    mb: 1, 
                      p: 1.5, 
                      bgcolor: '#f0fff4', 
                      borderRadius: 1,
                      border: '1px solid #28a745'
                  }}>
                    <Typography variant="caption" sx={{ 
                        color: '#28a745', 
                      textTransform: 'uppercase',
                      fontWeight: 700,
                      letterSpacing: '0.5px',
                      fontSize: '0.7rem',
                      mb: 1,
                        display: 'block'
                    }}>
                      ✓ DECISION MAKER CONTACT
                    </Typography>
                    
                    {/* Phone Number */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <Phone sx={{ fontSize: 16, color: '#28a745' }} />
                        <Typography variant="body2" sx={{ color: '#212529', fontWeight: 700, fontSize: '0.95rem' }}>
                        {phoneData[company.id].phone}
                      </Typography>
                  <Chip
                        label={phoneData[company.id].confidence || 'high'} 
                    size="small"
                    sx={{
                            bgcolor: '#28a745', 
                      color: 'white',
                          fontSize: '0.65rem',
                          height: '18px',
                          fontWeight: 600,
                            textTransform: 'uppercase'
                        }} 
                      />
                </Box>

                    {/* Contact Name (if available) */}
                    {phoneData[company.id].name && phoneData[company.id].name !== 'Decision Maker' && phoneData[company.id].name.trim() !== '' && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Person sx={{ fontSize: 16, color: '#28a745' }} />
                          <Typography variant="body2" sx={{ color: '#212529', fontWeight: 600, fontSize: '0.85rem' }}>
                          {phoneData[company.id].name}
                        </Typography>
                      </Box>
                    )}
                    
                    {/* Phone Type (if available) */}
                    {phoneData[company.id].type && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="caption" sx={{ color: '#6c757d', textTransform: 'capitalize' }}>
                          Type: {phoneData[company.id].type}
                      </Typography>
                    </Box>
                  )}
                    </Box>
                  )}
                </Box>
                
                {/* Phone Number - Fixed 28px */}
                <Box sx={{ minHeight: '40px', mb: 1 }}>
                  {company.phone && !phoneData[company.id] && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Phone sx={{ fontSize: 16, color: '#6c757d' }} />
                      <Typography variant="body2" sx={{ color: '#212529', fontWeight: 500 }}>
                        {company.phone}
                      </Typography>
                    </Box>
                  )}
                </Box>
                {/* Location - Fixed 48px (allows 2 lines) */}
                <Box sx={{ minHeight: '40px', mb: 1.5 }}>
                  {company.location && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LocationOn sx={{ fontSize: 16, color: '#6c757d' }} />
                      <Typography variant="body2" sx={{ color: '#212529', fontWeight: 500 }}>
                        {company.location}
                      </Typography>
                    </Box>
                  )}
                </Box>
                  </Box>
                {/* Company Scale Section - Always at same position with fixed height */}
                <Box sx={{ mb: 1.5 }}>
                  {/* Headline */}
                  <Typography variant="caption" sx={{ 
                    color: '#6c757d', 
                    textTransform: 'uppercase',
                    fontWeight: 700,
                    letterSpacing: '0.5px',
                    fontSize: '0.7rem',
                    mb: 1,
                    display: 'block'
                  }}>
                    Company Scale
                  </Typography>
                  
                  {/* Circle and Button Row */}
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    gap: 1,
                    height: '65px',
                    flexWrap: 'nowrap',
                    width: '100%',
                    minWidth: 0
                  }}>
                    {/* Circular Employee Count - Blue if has employees, Grey if no employees */}
                    {company.employeeCount && parseInt(company.employeeCount) > 0 ? (
                      <Box
                        sx={{
                          width: 65,
                          height: 65,
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #00d2ff 0%, #3a7bd5 100%)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 4px 12px rgba(0, 210, 255, 0.4)',
                          flexShrink: 0,
                          p: '3px'
                        }}
                      >
                        <Box
                          sx={{
                            width: '100%',
                            height: '100%',
                            borderRadius: '50%',
                            bgcolor: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexDirection: 'column',
                            gap: 0.3
                          }}
                        >
                          <People 
                            sx={{ 
                              color: '#3a7bd5',
                              fontSize: 22
                            }} 
                          />
                        </Box>
                      </Box>
                    ) : (
                      <Box
                        sx={{
                          width: 65,
                          height: 65,
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #9e9e9e 0%, #757575 100%)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25)',
                          flexShrink: 0
                        }}
                      >
                        <Box
                          sx={{
                            width: 55,
                            height: 55,
                            borderRadius: '50%',
                            bgcolor: '#e0e0e0',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexDirection: 'column',
                            gap: 0.3
                          }}
                        >
                          <People 
                            sx={{ 
                              color: '#757575',
                              fontSize: 18
                            }} 
                          />
                        </Box>
                      </Box>
                    )}
                    
                    {/* View All Employees Button - Blue if has employees, Grey if no employees */}
                    <Button
                      variant="contained"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleGetEmployees(company);
                      }}
                      disabled={!company.employeeCount || parseInt(company.employeeCount) === 0}
                      sx={{
                        background: (company.employeeCount && parseInt(company.employeeCount) > 0) 
                          ? 'linear-gradient(135deg, #00d2ff 0%, #3a7bd5 100%)'
                          : 'linear-gradient(135deg, #bdbdbd 0%, #9e9e9e 100%)',
                        color: (company.employeeCount && parseInt(company.employeeCount) > 0) 
                          ? 'white'
                          : '#757575',
                        fontWeight: 700,
                        fontSize: '1rem',
                        textTransform: 'none',
                        px: 3,
                        py: 1.5,
                        height: '48px',
                        minWidth: 0,
                        maxWidth: '220px',
                        flex: '0 1 auto',
                        whiteSpace: 'nowrap',
                        borderRadius: '50px',
                        boxShadow: (company.employeeCount && parseInt(company.employeeCount) > 0)
                          ? '0 4px 12px rgba(0, 210, 255, 0.4)'
                          : '0 4px 12px rgba(0, 0, 0, 0.25)',
                        transition: 'all 0.3s ease',
                        flexShrink: 1,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        '&:hover': {
                          background: (company.employeeCount && parseInt(company.employeeCount) > 0)
                            ? 'linear-gradient(135deg, #3a7bd5 0%, #2a5db0 100%)'
                            : 'linear-gradient(135deg, #9e9e9e 0%, #757575 100%)',
                          transform: (company.employeeCount && parseInt(company.employeeCount) > 0)
                            ? 'translateY(-2px)'
                            : 'none',
                          boxShadow: (company.employeeCount && parseInt(company.employeeCount) > 0)
                            ? '0 6px 20px rgba(0, 210, 255, 0.5)'
                            : '0 4px 12px rgba(0, 0, 0, 0.3)'
                        },
                        '&:active': {
                          transform: 'translateY(0)',
                          boxShadow: (company.employeeCount && parseInt(company.employeeCount) > 0)
                            ? '0 3px 10px rgba(0, 210, 255, 0.4)'
                            : '0 4px 12px rgba(0, 0, 0, 0.25)'
                        },
                        '&.Mui-disabled': {
                          background: 'linear-gradient(135deg, #bdbdbd 0%, #9e9e9e 100%)',
                          color: '#757575'
                        }
                      }}
                    >
                      View All Employees
                    </Button>
                  </Box>
                </Box>
                {/* Links Section */}
                <Box sx={{ mt: 4 }}>
                  <Typography variant="caption" sx={{ 
                    color: '#6c757d', 
                    textTransform: 'uppercase',
                    fontWeight: 600,
                    letterSpacing: '0.5px',
                    fontSize: '0.7rem',
                    mb: 1,
                    display: 'block'
                  }}>
                    LINKS
                  </Typography>
                <Box sx={{ 
                  display: 'flex', 
                  gap: 1, 
                  
                  flexWrap: 'wrap'
                  
                }}>
                  {company.website && (
                    <Tooltip title="Website" arrow>
                      <IconButton 
                        size="small" 
                        href={company.website} 
                        target="_blank"
                          onClick={(e) => e.stopPropagation()}
                        sx={{ 
                            color: '#6c757d',
                          width: 36,
                            height: 36,
                            p: 0.75,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            '&:hover': { color: '#2196f3', bgcolor: 'rgba(33, 150, 243, 0.1)' }
                          }}
                        >
                          <Language sx={{ fontSize: 24, display: 'block', lineHeight: 0 }} />
                      </IconButton>
                    </Tooltip>
                  )}
                  {company.linkedinProfile && (
                    <Tooltip title="LinkedIn" arrow>
                      <IconButton 
                        size="small" 
                        href={company.linkedinProfile} 
                        target="_blank"
                          onClick={(e) => e.stopPropagation()}
                        sx={{ 
                            color: '#6c757d',
                          width: 36,
                            height: 36,
                            p: 0.75,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            '&:hover': { color: '#0077b5', bgcolor: 'rgba(0, 119, 181, 0.1)' }
                          }}
                        >
                          <LinkedInIcon sx={{ fontSize: 24, display: 'block', lineHeight: 0 }} />
                      </IconButton>
                    </Tooltip>
                  )}
                    {company.facebookUrl && (
                      <Tooltip title="Facebook" arrow>
                      <IconButton 
                        size="small" 
                          href={company.facebookUrl} 
                        target="_blank"
                          onClick={(e) => e.stopPropagation()}
                        sx={{ 
                            color: '#6c757d',
                          width: 36,
                            height: 36,
                            p: 0.75,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            '&:hover': { color: '#1877f2', bgcolor: 'rgba(24, 119, 242, 0.1)' }
                          }}
                        >
                          <Facebook sx={{ fontSize: 24, display: 'block', lineHeight: 0 }} />
                      </IconButton>
                    </Tooltip>
                  )}
                    {company.twitterUrl && (
                      <Tooltip title="X (Twitter)" arrow>
                      <IconButton 
                        size="small" 
                          href={company.twitterUrl} 
                        target="_blank"
                          onClick={(e) => e.stopPropagation()}
                        sx={{ 
                            color: '#6c757d',
                          width: 36,
                            height: 36,
                            p: 0.75,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            '&:hover': { 
                              color: '#ba68c8', 
                              background: 'rgba(186, 104, 200, 0.2)',
                              boxShadow: '0 0 15px rgba(186, 104, 200, 0.4)',
                              transform: 'scale(1.1)'
                            }
                          }}
                        >
                          <Box sx={{ 
                            fontSize: 24, 
                            fontWeight: 900, 
                            fontFamily: 'Arial, sans-serif',
                            lineHeight: '24px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            height: '24px',
                            width: '24px',
                            m: 0,
                            p: 0
                          }}>
                            𝕏
                          </Box>
                      </IconButton>
                    </Tooltip>
                  )}
                  {company.instagramUrl && (
                    <Tooltip title="Instagram" arrow>
                      <IconButton 
                        size="small" 
                        href={company.instagramUrl} 
                        target="_blank"
                          onClick={(e) => e.stopPropagation()}
                        sx={{ 
                            color: '#6c757d',
                          width: 36,
                            height: 36,
                            p: 0.75,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            '&:hover': { 
                              color: '#E4405F', 
                              bgcolor: '#ffebef' 
                            }
                          }}
                        >
                          <Instagram sx={{ fontSize: 24, display: 'block', lineHeight: 0 }} />
                      </IconButton>
                    </Tooltip>
                  )}
                  {company.blogUrl && (
                    <Tooltip title="Blog" arrow>
                      <IconButton 
                        size="small" 
                        href={company.blogUrl} 
                        target="_blank"
                          onClick={(e) => e.stopPropagation()}
                        sx={{ 
                            color: '#6c757d',
                          width: 36,
                            height: 36,
                            p: 0.75,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            '&:hover': { color: '#ba68c8', bgcolor: 'rgba(186, 104, 200, 0.1)' }
                          }}
                        >
                          <Article sx={{ fontSize: 24, display: 'block', lineHeight: 0 }} />
                      </IconButton>
                    </Tooltip>
                  )}
                  </Box>
                </Box>
                
                {/* Company Size Hashtags - After Links - Always show if employeeCount exists */}
                {company.employeeCount !== undefined && company.employeeCount !== null ? (
                  <Box sx={{ mt: 1.5, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {parseInt(company.employeeCount) >= 200 && (
                      <Chip
                        label="#enterprise"
                        size="small" 
                        variant="outlined"
                        sx={{ 
                          bgcolor: 'transparent',
                          color: '#6c757d',
                          borderColor: 'rgba(0, 0, 0, 0.12)',
                          fontWeight: 500,
                          fontSize: '0.7rem',
                          height: '24px',
                          '& .MuiChip-label': {
                            px: 1
                          }
                        }}
                      />
                    )}
                    {parseInt(company.employeeCount) >= 50 && parseInt(company.employeeCount) < 200 && (
                      <Chip
                        label="#large"
                        size="small" 
                        variant="outlined"
                        sx={{ 
                          bgcolor: 'transparent',
                          color: '#6c757d',
                          borderColor: 'rgba(0, 0, 0, 0.12)',
                          fontWeight: 500,
                          fontSize: '0.7rem',
                          height: '24px',
                          '& .MuiChip-label': {
                            px: 1
                          }
                        }}
                      />
                    )}
                    {parseInt(company.employeeCount) >= 11 && parseInt(company.employeeCount) < 50 && (
                      <Chip
                        label="#medium"
                        size="small"
                        variant="outlined"
                        sx={{
                          bgcolor: 'transparent',
                          color: '#6c757d',
                          borderColor: 'rgba(0, 0, 0, 0.12)',
                          fontWeight: 500,
                          fontSize: '0.7rem',
                          height: '24px',
                          '& .MuiChip-label': {
                            px: 1
                          }
                        }}
                      />
                    )}
                    {parseInt(company.employeeCount) >= 1 && parseInt(company.employeeCount) < 11 && (
                      <Chip
                        label="#small"
                        size="small"
                        variant="outlined"
                        sx={{
                          bgcolor: 'transparent',
                          color: '#6c757d',
                          borderColor: 'rgba(0, 0, 0, 0.12)',
                          fontWeight: 500,
                          fontSize: '0.7rem',
                          height: '24px',
                          '& .MuiChip-label': {
                            px: 1
                          }
                        }}
                      />
                    )}
                  </Box>
                    ) : null}
                  </Box>

                </CardContent>


            </Card>
        </Box>

            ))}
          </Box>
        ) : (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Business sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary">
              0 company data found
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Try searching for companies using keywords like "cleaning services" or "technology companies"
            </Typography>
          </Box>  
        );
      })()
      )}
  
  
      </>
    )}
      {/* Employees Tab Content */}
      {activeTab === 1 && (
        <Box sx={{ p: 2 }}>
          
          {/* Employee Cards Grid - Only render employee cards from employeeData prop (never company data) */}
          {employeeSearchLoading ? (
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(1, 1fr)', sm: 'repeat(2, 1fr)', md: 'repeat(auto-fit, minmax(280px, 1fr))' }, gap: 2, position: 'relative', zIndex: 2, alignItems: 'stretch' }}>
              {[...Array(6)].map((_, index) => (
                <Card key={index} sx={{ bgcolor: 'oklch(0.985 0 0)', border: '1px solid oklch(0.89 0 0)', borderRadius: 2, overflow: 'hidden' }}>
                  <CardContent sx={{ p: 2.5 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
                        <Skeleton variant="circular" width={48} height={48} />
                        <Box sx={{ flex: 1 }}>
                          <Skeleton variant="text" width="70%" height={24} sx={{ mb: 0.5 }} />
                          <Skeleton variant="text" width="50%" height={20} />
                        </Box>
                      </Box>
                      <Skeleton variant="circular" width={24} height={24} />
                    </Box>
                    <Box sx={{ mb: 2 }}>
                      <Skeleton variant="text" width="80%" height={20} sx={{ mb: 1 }} />
                      <Skeleton variant="text" width="40%" height={20} sx={{ mb: 1 }} />
                      <Skeleton variant="text" width="60%" height={20} />
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                      <Skeleton variant="rounded" width={90} height={24} />
                      <Skeleton variant="rounded" width={80} height={24} />
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      <Skeleton variant="rounded" width={120} height={32} />
                      <Skeleton variant="rounded" width={120} height={32} />
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Box>
          ) : (() => {
            const filteredEmployees = getFilteredEmployeeData()
              // Additional safety check: ensure we're only rendering employee objects, not company objects
              .filter(item => {
                // Employee objects should have first_name, last_name, or title (not companyName/username like companies)
                const isEmployee = item.first_name || item.last_name || item.title || (item.name && !item.companyName && !item.username);
                return isEmployee;
              });
            
            return filteredEmployees.length > 0 ? (
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(1, 1fr)', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }, gap: 2, position: 'relative', zIndex: 2, alignItems: 'stretch' }}>
              {/* {console.log('👥 Rendering employee cards, count:', employeeData.length)} */}
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
                console.log('⚠️ Company name not found for employee:', {
                  employeeName: employee.name,
                  employeeId: employeeId,
                  org: org,
                  employeeCompanyName: employee.company_name,
                  employeeOrganizationName: employee.organization_name,
                  fullEmployeeData: fullEmployeeData
                });
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
                <Box key={employeeId} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', height: '100%' }}>
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
                    sx={{ 
                      width: '100%',
                      height: '100%', 
                      display: 'flex', 
                      flexDirection: 'column',
                      minHeight: 0,
                      transition: 'all 0.2s ease',
                      border: isSelected ? '2px solid' : '1px solid',
                      borderColor: isSelected ? '#0b1957' : '#e9ecef',
                      borderRadius: '12px',
                      overflow: 'hidden',
                      position: 'relative',
                      bgcolor: '#ffffff',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                      cursor: 'pointer',
                      '&:hover': {
                        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                        borderColor: isSelected ? '#0b1957' : '#dee2e6'
                      },
                      '&::before': isSelected ? {
                        content: '""',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: '3px',
                        background: '#0b1957',
                        zIndex: 1
                      } : {}
                    }}
                  >
                    <CardContent sx={{ flexGrow: 1, p: 0, position: 'relative', zIndex: 2 }}>
                      {/* Company Header - Clean White Background */}
                      <Box sx={{ 
                        bgcolor: '#ffffff',
                        px: 2.5,
                        pt: 2.5,
                        pb: 0,
                        position: 'relative'
                      }}>
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, position: 'relative' }}>
                          <Box sx={{ position: 'relative', flexShrink: 0 }}>
                          <Avatar 
                            sx={{ 
                                width: 48, 
                                height: 48,
                              bgcolor: 'primary.main',
                              flexShrink: 0,
                                border: isSelected ? '3px solid #0b1957' : '2px solid #e9ecef',
                            }}
                              src={companyLogo || company?.logoUrl || company?.logo}
                              alt={`${companyName} logo`}
                          >
                              {!(companyLogo || company?.logoUrl || company?.logo) && (
                                <Business />
                              )}
                          </Avatar>
                            {isSelected && (
                              <Box
                              sx={{ 
                                  position: 'absolute',
                                  top: -4,
                                  right: -4,
                                  width: 24,
                                  height: 24,
                                  borderRadius: '50%',
                                  bgcolor: '#0b1957',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  border: '2px solid white',
                                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                                  zIndex: 3,
                                }}
                              >
                                <CheckCircle sx={{ fontSize: 16, color: 'white' }} />
                              </Box>
                            )}
                          </Box>
                          <Box sx={{ 
                            flex: 1, 
                            minWidth: 0,
                            minHeight: '56px',
                            display: 'flex',
                            alignItems: 'center'
                          }}>
                            <Typography 
                              variant="h6" 
                              fontWeight="bold"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (company) {
                                  handleViewDetails(company);
                                }
                              }}
                              sx={{ 
                                wordBreak: 'break-word',
                                lineHeight: 1.1,
                                fontSize: '1.125rem',
                                color: '#000000',
                                cursor: company ? 'pointer' : 'default',
                                transition: 'color 0.2s',
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                                mb: 0,
                                '&:hover': {
                                  color: company ? '#0b1957' : '#000000',
                                  textDecoration: company ? 'underline' : 'none'
                                }
                              }}
                            >
                              {companyName}
                            </Typography>
                          </Box>
                        </Box>
                      </Box>

                      {/* Card Body */}
                      <Box sx={{ 
                        p: 2.5, 
                        pt: 0,
                        mt: -1
                      }}>
                        {/* All Variable Content - Each section has fixed height */}
                        <Box sx={{ mb: 0 }}>
                        

                          
                        {/* Decision Maker Contact - Fixed 60px */}
                        <Box sx={{ minHeight: '60px', mb: 0 }}>
                          {company && phoneData[company.id] && (
                            <Box sx={{ 
                              mb: 1, 
                              p: 1.5, 
                              bgcolor: '#f0fff4', 
                              borderRadius: 1,
                              border: '1px solid #28a745'
                            }}>
                              <Typography variant="caption" sx={{ 
                                color: '#28a745', 
                                textTransform: 'uppercase',
                                fontWeight: 700,
                                letterSpacing: '0.5px',
                                fontSize: '0.7rem',
                                mb: 1,
                                display: 'block'
                              }}>
                                ✓ DECISION MAKER CONTACT
                              </Typography>
                              
                              {/* Phone Number */}
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                <Phone sx={{ fontSize: 16, color: '#28a745' }} />
                                <Typography variant="body2" sx={{ color: '#212529', fontWeight: 700, fontSize: '0.95rem' }}>
                                  {phoneData[company.id].phone}
                                </Typography>
                                <Chip
                                  label={phoneData[company.id].confidence || 'high'} 
                                  size="small"
                              sx={{ 
                                    bgcolor: '#28a745', 
                                    color: 'white',
                                    fontSize: '0.65rem',
                                    height: '18px',
                                fontWeight: 600,
                                    textTransform: 'uppercase'
                                  }} 
                                />
                              </Box>

                              {/* Contact Name (if available) */}
                              {phoneData[company.id].name && phoneData[company.id].name !== 'Decision Maker' && phoneData[company.id].name.trim() !== '' && (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                  <Person sx={{ fontSize: 16, color: '#28a745' }} />
                                  <Typography variant="body2" sx={{ color: '#212529', fontWeight: 600 }}>
                                    {phoneData[company.id].name}
                            </Typography>
                                </Box>
                            )}
                          </Box>
                          )}
                        </Box>

                        {/* Phone Number - Fixed 28px */}
                        <Box sx={{ minHeight: '40px', mb: 1 }}>
                          {(() => {
                            const displayPhone = (company?.phone && company.phone.trim()) || (companyPhone && companyPhone.trim());
                            return displayPhone && !phoneData[company?.id] ? (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Phone sx={{ fontSize: 16, color: '#6c757d' }} />
                                <Typography variant="body2" sx={{ color: '#212529', fontWeight: 500 }}>
                                  {displayPhone}
                                </Typography>
                              </Box>
                            ) : null;
                          })()}
                        </Box>
                        {/* Location - Fixed 48px (allows 2 lines) */}
                        <Box sx={{ minHeight: '40px', mb: 1.5 }}>
                          {(() => {
                            const displayLocation = (company?.location && company.location.trim()) || (companyLocation && companyLocation.trim());
                            return displayLocation ? (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <LocationOn sx={{ fontSize: 16, color: '#6c757d' }} />
                                <Typography variant="body2" sx={{ color: '#212529', fontWeight: 500 }}>
                                  {displayLocation}
                                </Typography>
                              </Box>
                            ) : null;
                          })()}
                        </Box>
                          </Box>
                        {/* Company Scale Section - Always at same position with fixed height */}
                        <Box sx={{ minHeight: '85px', mb: 1, mt: 0.5 }}>
                          {/* Headline */}
                          <Typography variant="caption" sx={{ 
                            color: '#6c757d', 
                            textTransform: 'uppercase',
                            fontWeight: 700,
                            letterSpacing: '0.5px',
                            fontSize: '0.7rem',
                            mb: 1,
                            display: 'block'
                          }}>
                            Company Scale
                          </Typography>
                          
                          {/* Circle and Button Row */}
                          <Box sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'space-between',
                            gap: 1,
                            height: '65px',
                            flexWrap: 'nowrap',
                            width: '100%',
                            minWidth: 0
                          }}>
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
                                <Box
                              sx={{ 
                                    width: 65,
                                    height: 65,
                                    borderRadius: '50%',
                                    background: 'linear-gradient(135deg, #00d2ff 0%, #3a7bd5 100%)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    boxShadow: '0 4px 12px rgba(0, 210, 255, 0.4)',
                                    flexShrink: 0,
                                    p: '3px'
                                  }}
                                >
                                  <Box
                                    sx={{
                                      width: '100%',
                                      height: '100%',
                                      borderRadius: '50%',
                                      bgcolor: 'white',
                            display: 'flex', 
                            alignItems: 'center', 
                                      justifyContent: 'center',
                                      flexDirection: 'column',
                                      gap: 0.3
                                    }}
                                  >
                                    <People 
                                      sx={{ 
                                        color: '#3a7bd5',
                                        fontSize: 22
                                      }} 
                                    />
                          </Box>
                                </Box>
                              );
                            })()}
                            
                            {/* View Employee Button - Blue gradient */}
                            <Button
                              variant="contained"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedEmployee(employee);
                                setEmployeeDetailDialogOpen(true);
                              }}
                              sx={{
                                background: 'linear-gradient(135deg, #00d2ff 0%, #3a7bd5 100%)',
                                color: 'white',
                                fontWeight: 700,
                                fontSize: '1rem',
                                textTransform: 'none',
                                px: 3,
                                py: 1.5,
                                height: '48px',
                                minWidth: 0,
                                maxWidth: '220px',
                                flex: '0 1 auto',
                                whiteSpace: 'nowrap',
                                borderRadius: '50px',
                                boxShadow: '0 4px 12px rgba(0, 210, 255, 0.4)',
                                transition: 'all 0.3s ease',
                                flexShrink: 1,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                '&:hover': {
                                  background: 'linear-gradient(135deg, #3a7bd5 0%, #2a5db0 100%)',
                                  transform: 'translateY(-2px)',
                                  boxShadow: '0 6px 20px rgba(0, 210, 255, 0.5)'
                                },
                                '&:active': {
                                  transform: 'translateY(0)',
                                  boxShadow: '0 3px 10px rgba(0, 210, 255, 0.4)'
                                },
                              }}
                            >
                              View Employee
                            </Button>
                          </Box>
                        </Box>
                        {/* Links Section */}
                        <Box sx={{ mt: 4 }}>
                          <Typography variant="caption" sx={{ 
                            color: '#6c757d', 
                            textTransform: 'uppercase',
                            fontWeight: 600,
                            letterSpacing: '0.5px',
                            fontSize: '0.7rem',
                            mb: 1,
                            display: 'block'
                          }}>
                            LINKS
                          </Typography>
                            <Box sx={{ 
                              display: 'flex', 
                              gap: 1, 
                              flexWrap: 'wrap'
                            }}>
                            {company?.website && (
                              <Tooltip title="Website" arrow>
                                <IconButton 
                                  size="small" 
                                  href={company.website} 
                                target="_blank"
                                onClick={(e) => e.stopPropagation()}
                                sx={{ 
                                    color: '#6c757d',
                                    width: 36,
                                    height: 36,
                                    p: 0.75,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0,
                                  '&:hover': {
                                      color: '#1976d2', 
                                      bgcolor: '#e3f2fd' 
                                    }
                                  }}
                                >
                                  <Public sx={{ fontSize: 24, display: 'block', lineHeight: 0 }} />
                                </IconButton>
                              </Tooltip>
                            )}
                            {company?.linkedinProfile && (
                              <Tooltip title="LinkedIn" arrow>
                                <IconButton 
                                  size="small" 
                                  href={company.linkedinProfile} 
                                  target="_blank"
                                  onClick={(e) => e.stopPropagation()}
                                  sx={{ 
                                    color: '#6c757d',
                                    width: 36,
                                    height: 36,
                                    p: 0.75,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                                    flexShrink: 0,
                                    '&:hover': { 
                                      color: '#0077b5', 
                                      bgcolor: '#e7f3ff' 
                                    }
                                  }}
                                >
                                  <LinkedInIcon sx={{ fontSize: 24, display: 'block', lineHeight: 0 }} />
                                </IconButton>
                              </Tooltip>
                            )}
                          </Box>
                        </Box>

                        {/* Company Size Hashtags - After Links - Always show if employeeCount exists */}
                        {company?.employeeCount !== undefined && company?.employeeCount !== null ? (
                          <Box sx={{ mt: 1.5, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {parseInt(company.employeeCount) >= 200 && (
                              <Chip
                                label="#enterprise"
                                size="small" 
                                variant="outlined"
                                sx={{ 
                                  bgcolor: 'transparent',
                                  color: '#6c757d',
                                  borderColor: 'rgba(0, 0, 0, 0.12)',
                                  fontWeight: 500,
                                  fontSize: '0.7rem',
                                  height: '24px',
                                  '& .MuiChip-label': {
                                    px: 1
                                  }
                                }}
                              />
                            )}
                            {parseInt(company.employeeCount) >= 50 && parseInt(company.employeeCount) < 200 && (
                              <Chip
                                label="#large"
                                size="small" 
                                variant="outlined"
                                sx={{ 
                                  bgcolor: 'transparent',
                                  color: '#6c757d',
                                  borderColor: 'rgba(0, 0, 0, 0.12)',
                                  fontWeight: 500,
                                  fontSize: '0.7rem',
                                  height: '24px',
                                  '& .MuiChip-label': {
                                    px: 1
                                  }
                                }}
                              />
                            )}
                            {parseInt(company.employeeCount) >= 11 && parseInt(company.employeeCount) < 50 && (
                              <Chip
                                label="#medium"
                                size="small"
                                variant="outlined"
                                sx={{
                                  bgcolor: 'transparent',
                                  color: '#6c757d',
                                  borderColor: 'rgba(0, 0, 0, 0.12)',
                                  fontWeight: 500,
                                  fontSize: '0.7rem',
                                  height: '24px',
                                  '& .MuiChip-label': {
                                    px: 1
                                  }
                                }}
                              />
                            )}
                            {parseInt(company.employeeCount) >= 1 && parseInt(company.employeeCount) < 11 && (
                              <Chip
                                label="#small"
                                size="small"
                                variant="outlined"
                                sx={{
                                  bgcolor: 'transparent',
                                  color: '#6c757d',
                                  borderColor: 'rgba(0, 0, 0, 0.12)',
                                  fontWeight: 500,
                                  fontSize: '0.7rem',
                                  height: '24px',
                                  '& .MuiChip-label': {
                                    px: 1
                                  }
                                }}
                              />
                            )}
                          </Box>
                        ) : null}
                      </Box>
                    </CardContent>
                  </Card>
                </Box>
              );
            })}
          </Box>
            ) : (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <Person sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary">
                0 employees data found
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Try searching for employees using the search bar above
              </Typography>
            </Box>
          );
        })()}
        </Box>
      )}

      {/* Phone Reveal Confirmation Dialog */}
      <Dialog
        open={phoneConfirmDialog.open}
        onClose={() => setPhoneConfirmDialog({ open: false, employee: null })}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Phone sx={{ color: '#1976d2' }} />
            <Typography variant="h6">Phone Reveal</Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            {/* Cost */}
            <Box sx={{ 
              p: 2, 
              bgcolor: 'rgba(186, 104, 200, 0.1)', 
              borderRadius: 1,
              border: '1px solid #ba68c8'
            }}>
              <Typography variant="body1" fontWeight="bold" sx={{ color: '#9c27b0' }}>
                Cost: 8 CREDITS
              </Typography>
            </Box>

            {/* Employee Details */}
            {phoneConfirmDialog.employee && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Typography variant="body2" fontWeight="600">
                  Employee: {phoneConfirmDialog.employee.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Title: {phoneConfirmDialog.employee.title || 'Senior Business Development Manager'}
                </Typography>
              </Box>
            )}

            {/* Process Info */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                <Typography sx={{ color: '#4caf50', fontSize: '1.2rem' }}>⚡</Typography>
                <Typography variant="body2" color="text.secondary">
                  Checking database first, then API if needed
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                <Typography sx={{ color: '#ba68c8', fontSize: '1.2rem' }}>⏰</Typography>
                <Typography variant="body2" color="text.secondary">
                  Webhook delivery: 2-5 minutes if not cached
                </Typography>
              </Box>
            </Box>

            {/* Confirmation */}
            <Typography variant="body2" fontWeight="600" sx={{ mt: 1 }}>
              Continue?
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button 
            onClick={() => setPhoneConfirmDialog({ open: false, employee: null })}
            variant="outlined"
          >
            Cancel
          </Button>
          <Button 
            onClick={() => {
              const employee = phoneConfirmDialog.employee;
              setPhoneConfirmDialog({ open: false, employee: null });
              processPhoneReveal(employee);
            }}
            variant="contained"
            autoFocus
          >
            OK
          </Button>
        </DialogActions>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog 
        open={dialogOpen} 
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: '#ffffff',
            borderRadius: '20px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)'
          }
        }}
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar 
              sx={{ width: 40, height: 40, bgcolor: '#0b1957' }}
              src={selectedCompany?.logo || selectedCompany?.profileImage || selectedCompany?.companyLogo}
              alt={`${selectedCompany?.companyName || selectedCompany?.username || 'Company'} logo`}
            >
              {!(selectedCompany?.logo || selectedCompany?.profileImage || selectedCompany?.companyLogo) && (
                <Business sx={{ color: '#ffffff' }} />
              )}
            </Avatar>
            <Typography variant="h6" sx={{ color: '#0b1957' }}>
              {selectedCompany?.companyName || selectedCompany?.username || 'Company Details'}
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ minHeight: 400 }}>
          {selectedCompany && (
            <Box>
              {/* Debug: Log selectedCompany summary status */}
              {console.log('🔍 Dialog rendering - selectedCompany summary check:', {
                hasSummary: !!selectedCompany.summary,
                summaryType: typeof selectedCompany.summary,
                summaryLength: selectedCompany.summary?.length || 0,
                summaryPreview: selectedCompany.summary?.substring(0, 50) || 'none',
                companyId: selectedCompany.id || selectedCompany.company_id,
                allKeys: Object.keys(selectedCompany)
              })}
              {/* Basic Company Info - Always Show */}
              <Box sx={{ mb: 3, p: 2, bgcolor: 'oklch(0.97 0 0)', borderRadius: 2, border: '1px solid oklch(0.922 0 0)' }}>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom sx={{ color: '#0b1957' }}>
                  Company Information
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {selectedCompany.industry && (
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Typography variant="body2" fontWeight="600" sx={{ minWidth: 120, color: '#0b1957' }}>Industry:</Typography>
                      <Typography variant="body2" sx={{ color: 'oklch(0.145 0 0)' }}>{selectedCompany.industry}</Typography>
                    </Box>
                  )}
                  {selectedCompany.phone && (
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Typography variant="body2" fontWeight="600" sx={{ minWidth: 120, color: '#0b1957' }}>Phone:</Typography>
                      <Typography variant="body2" sx={{ color: 'oklch(0.145 0 0)' }}>{selectedCompany.phone}</Typography>
                    </Box>
                  )}
                  {selectedCompany.location && (
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Typography variant="body2" fontWeight="600" sx={{ minWidth: 120, color: '#0b1957' }}>Location:</Typography>
                      <Typography variant="body2" sx={{ color: 'oklch(0.145 0 0)' }}>{selectedCompany.location}</Typography>
                    </Box>
                  )}
                  {selectedCompany.website && (
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Typography variant="body2" fontWeight="600" sx={{ minWidth: 120, color: '#0b1957' }}>Website:</Typography>
                      <Link href={selectedCompany.website} target="_blank" variant="body2" sx={{ color: '#0b1957', '&:hover': { color: '#0d1f6f' } }}>{selectedCompany.website}</Link>
                    </Box>
                  )}
                  {selectedCompany.employees && (
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Typography variant="body2" fontWeight="600" sx={{ minWidth: 120, color: '#0b1957' }}>Company Size:</Typography>
                      <Typography variant="body2" sx={{ color: 'oklch(0.145 0 0)' }}>{selectedCompany.employees}</Typography>
                    </Box>
                  )}
                </Box>
              </Box>

              {/* Company Scale Metrics */}
              {selectedCompany.employeeCount && (
                <Box sx={{ mb: 4 }}>
                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom sx={{ mb: 2, color: '#0b1957' }}>
                    Company Scale
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 3, justifyContent: 'space-around', flexWrap: 'wrap', alignItems: 'center' }}>
                    {/* Company Size - Circular Design */}
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 120 }}>
                      <Box sx={{ position: 'relative', display: 'inline-flex', mb: 1 }}>
                        <Box
                          sx={{
                            width: 120,
                            height: 120,
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, #00d2ff 0%, #3a7bd5 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 4px 12px rgba(0, 210, 255, 0.4)'
                          }}
                        >
                          <Box
                            sx={{
                              width: 95,
                              height: 95,
                              borderRadius: '50%',
                              bgcolor: '#ffffff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexDirection: 'column',
                              gap: 0.5
                            }}
                          >
                            <Business sx={{ 
                              color: '#0b1957',
                              fontSize: 32,
                              mb: 0.5
                            }} />
                            <Typography variant="caption" fontWeight="bold" sx={{ 
                              color: '#0b1957',
                              fontSize: '0.7rem',
                              textAlign: 'center',
                              px: 1
                            }}>
                              {selectedCompany.employeeCount >= 200 ? 'Enterprise' :
                               selectedCompany.employeeCount >= 50 ? 'Medium' :
                               selectedCompany.employeeCount >= 11 ? 'Small' :
                               'Startup'}
                            </Typography>
                          </Box>
                        </Box>
                      </Box>
                      <Typography variant="caption" sx={{ color: 'oklch(0.556 0 0)' }} fontWeight="600">
                        {selectedCompany.employeeCount} Employees
                      </Typography>
                    </Box>

                    {/* View Employees Button - Circular Design */}
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 150 }}>
                      <Box sx={{ position: 'relative', display: 'inline-flex', mb: 1 }}>
                        <Box
                          onClick={() => handleGetEmployees(selectedCompany)}
                          sx={{
                            width: 150,
                            height: 150,
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, #00d2ff 0%, #3a7bd5 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 4px 12px rgba(0, 210, 255, 0.4)',
                            cursor: employeeLoading[selectedCompany.id || selectedCompany.domain] ? 'not-allowed' : 'pointer',
                            transition: 'all 0.3s ease',
                            opacity: employeeLoading[selectedCompany.id || selectedCompany.domain] ? 0.6 : 1,
                            '&:hover': {
                              transform: employeeLoading[selectedCompany.id || selectedCompany.domain] ? 'none' : 'scale(1.05)',
                              boxShadow: employeeLoading[selectedCompany.id || selectedCompany.domain] ? '0 4px 12px rgba(0, 210, 255, 0.4)' : '0 6px 16px rgba(0, 210, 255, 0.6)',
                            }
                          }}
                        >
                          <Box
                            sx={{
                              width: 120,
                              height: 120,
                              borderRadius: '50%',
                              bgcolor: '#ffffff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexDirection: 'column',
                              gap: 0.5
                            }}
                          >
                            <People sx={{ color: '#3a7bd5', fontSize: 40, mb: 0.5 }} />
                            <Typography variant="caption" fontWeight="bold" sx={{ 
                              color: '#3a7bd5',
                              fontSize: '0.85rem',
                              textAlign: 'center',
                              px: 1
                            }}>
                              {employeeLoading[selectedCompany.id || selectedCompany.domain] 
                                ? 'Loading' 
                                : fetchedEmployeeData[selectedCompany.id || selectedCompany.domain]?.length > 0
                                  ? `${fetchedEmployeeData[selectedCompany.id || selectedCompany.domain].length}`
                                  : 'View'
                              }
                            </Typography>
                          </Box>
                        </Box>
                      </Box>
                      <Typography variant="caption" sx={{ color: 'oklch(0.556 0 0)' }} fontWeight="600">
                        {employeeLoading[selectedCompany.id || selectedCompany.domain] 
                          ? 'Loading...' 
                          : fetchedEmployeeData[selectedCompany.id || selectedCompany.domain]?.length > 0
                            ? 'Employees Found'
                            : 'View Employees'
                        }
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              )}

              {/* Company Links - Always show if available */}
              {(selectedCompany.linkedinProfile || selectedCompany.website || selectedCompany.twitterUrl || selectedCompany.facebookUrl || selectedCompany.blogUrl) && (
                <Box sx={{ mb: 4 }}>
                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom sx={{ mb: 2, color: '#0b1957' }}>
                    Company Links
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    {selectedCompany.website && (
                      <Chip
                        icon={<Language />}
                        label="Website"
                        component="a"
                        href={selectedCompany.website}
                        target="_blank"
                        clickable
                        sx={{ 
                          bgcolor: 'oklch(0.97 0 0)',
                          color: '#0b1957',
                          border: '1px solid oklch(0.922 0 0)',
                          '&:hover': { 
                            bgcolor: 'oklch(0.97 0 0)',
                            borderColor: '#0b1957'
                          }
                        }}
                      />
                    )}
                    {selectedCompany.linkedinProfile && (
                      <Chip
                        icon={<LinkedInIcon />}
                        label="LinkedIn"
                        component="a"
                        href={selectedCompany.linkedinProfile}
                        target="_blank"
                        clickable
                        sx={{ 
                          bgcolor: 'oklch(0.97 0 0)',
                          color: '#0077b5',
                          border: '1px solid oklch(0.922 0 0)',
                          '&:hover': { 
                            bgcolor: 'oklch(0.97 0 0)',
                            borderColor: '#0077b5'
                          }
                        }}
                      />
                    )}
                    {selectedCompany.facebookUrl && (
                      <Chip
                        icon={<Facebook />}
                        label="Facebook"
                        component="a"
                        href={selectedCompany.facebookUrl}
                        target="_blank"
                        clickable
                        sx={{ 
                          bgcolor: 'oklch(0.97 0 0)',
                          color: '#1877F2',
                          border: '1px solid oklch(0.922 0 0)',
                          '&:hover': { 
                            bgcolor: 'oklch(0.97 0 0)',
                            borderColor: '#1877F2'
                          }
                        }}
                      />
                    )}
                    {selectedCompany.twitterUrl && (
                      <Chip
                        icon={<Box sx={{ fontSize: 16, fontWeight: 900, fontFamily: 'Arial, sans-serif' }}>𝕏</Box>}
                        label="X (Twitter)"
                        component="a"
                        href={selectedCompany.twitterUrl}
                        target="_blank"
                        clickable
                        sx={{ 
                          bgcolor: 'oklch(0.97 0 0)',
                          color: '#0b1957',
                          border: '1px solid oklch(0.922 0 0)',
                          '&:hover': { 
                            bgcolor: 'oklch(0.97 0 0)',
                            borderColor: '#0b1957'
                          }
                        }}
                      />
                    )}
                    {selectedCompany.blogUrl && (
                      <Chip
                        icon={<Article />}
                        label="Blog"
                        component="a"
                        href={selectedCompany.blogUrl}
                        target="_blank"
                        clickable
                        sx={{ 
                          bgcolor: 'oklch(0.97 0 0)',
                          color: '#0b1957',
                          border: '1px solid oklch(0.922 0 0)',
                          '&:hover': { 
                            bgcolor: 'oklch(0.97 0 0)',
                            borderColor: '#0b1957'
                          }
                        }}
                      />
                    )}
                  </Box>
                </Box>
              )}

              {/* Full Address */}
              {selectedCompany.rawAddress && (
                <Box sx={{ mb: 4, p: 2, bgcolor: 'oklch(0.97 0 0)', borderRadius: 2, borderLeft: '4px solid #0b1957', border: '1px solid oklch(0.922 0 0)' }}>
                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom sx={{ color: '#0b1957', display: 'flex', alignItems: 'center', gap: 1 }}>
                    <LocationOn sx={{ color: '#0b1957' }} /> Full Address
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'oklch(0.145 0 0)', textTransform: 'capitalize' }}>
                    {selectedCompany.rawAddress}
                  </Typography>
                </Box>
              )}

              {/* Company Details - Founded Year & Industry Codes */}
              {(selectedCompany.foundingYear || (selectedCompany.naicsCodes && selectedCompany.naicsCodes.length > 0) || (selectedCompany.sicCodes && selectedCompany.sicCodes.length > 0)) && (
                <Box sx={{ mb: 4 }}>
                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom sx={{ mb: 2, color: '#0b1957' }}>
                    Company Details
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    {selectedCompany.foundingYear && (
                      <Box sx={{ 
                        flex: '0 0 auto',
                        minWidth: 150,
                        p: 2, 
                        bgcolor: 'oklch(0.97 0 0)', 
                        borderRadius: 2,
                        border: '2px solid #0b1957',
                        textAlign: 'center'
                      }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 0.5 }}>
                          <CalendarToday sx={{ fontSize: 20, color: '#0b1957', mr: 0.5 }} />
                          <Typography variant="caption" fontWeight="600" sx={{ color: '#0b1957' }}>Founded</Typography>
                        </Box>
                        <Typography variant="h6" fontWeight="bold" sx={{ color: '#0b1957' }}>
                          {selectedCompany.foundingYear}
                        </Typography>
                      </Box>
                    )}
                    {selectedCompany.naicsCodes && selectedCompany.naicsCodes.length > 0 && (
                      <Box sx={{ 
                        flex: '1 1 auto',
                        minWidth: 200,
                        p: 2, 
                        bgcolor: 'oklch(0.97 0 0)', 
                        borderRadius: 2,
                        border: '2px solid #0b1957'
                      }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                          <Code sx={{ fontSize: 20, color: '#0b1957', mr: 0.5 }} />
                          <Typography variant="caption" fontWeight="600" sx={{ color: '#0b1957' }}>NAICS Codes</Typography>
                        </Box>
                        <Typography variant="body2" fontWeight="600" sx={{ color: '#0b1957' }}>
                          {selectedCompany.naicsCodes.join(', ')}
                        </Typography>
                      </Box>
                    )}
                    {selectedCompany.sicCodes && selectedCompany.sicCodes.length > 0 && (
                      <Box sx={{ 
                        flex: '1 1 auto',
                        minWidth: 200,
                        p: 2, 
                        bgcolor: 'oklch(0.97 0 0)', 
                        borderRadius: 2,
                        border: '2px solid #0b1957'
                      }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                          <Tag sx={{ fontSize: 20, color: '#0b1957', mr: 0.5 }} />
                          <Typography variant="caption" fontWeight="600" sx={{ color: '#0b1957' }}>SIC Codes</Typography>
                        </Box>
                        <Typography variant="body2" fontWeight="600" sx={{ color: '#0b1957' }}>
                          {selectedCompany.sicCodes.join(', ')}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </Box>
              )}

              {/* Sales Summary (from topic filtering) */}
              {selectedCompany.summary && typeof selectedCompany.summary === 'string' && selectedCompany.summary.trim().length > 0 && (
                <Box sx={{ 
                  mb: 4, 
                  p: 3, 
                  background: '#ffffff',
                  borderRadius: '16px', 
                  borderLeft: '4px solid #0b1957', 
                  border: '2px solid #0b1957',
                  boxShadow: '0 2px 8px rgba(11, 25, 87, 0.15)',
                }}>
                  <Typography 
                    variant="subtitle1" 
                    fontWeight="bold" 
                    gutterBottom 
                    sx={{ 
                      color: '#0b1957', 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 1,
                      mb: 2
                    }}
                  >
                    <Article sx={{ fontSize: 20, color: '#0b1957' }} />
                    Sales Intelligence Summary
                  </Typography>
                  <Typography 
                    variant="body2" 
                    component="div"
                    sx={{ 
                      lineHeight: 1.8,
                      whiteSpace: 'pre-wrap',
                      color: '#212529',
                      fontSize: '0.95rem',
                      '& strong': {
                        fontWeight: 'bold',
                        color: '#0b1957',
                      }
                    }}
                  >
                    {selectedCompany.summary.split('\n').map((line, idx) => {
                      // Format markdown-style headers
                      if (line.startsWith('##')) {
                        return (
                          <Typography key={idx} variant="h6" sx={{ 
                            mt: 2, 
                            mb: 1, 
                            color: '#0b1957', 
                            fontWeight: 'bold',
                          }}>
                            {line.replace(/^##+\s*/, '')}
                          </Typography>
                        );
                      } else if (line.startsWith('#')) {
                        return (
                          <Typography key={idx} variant="h5" sx={{ 
                            mt: 2, 
                            mb: 1, 
                            color: '#0b1957', 
                            fontWeight: 'bold',
                          }}>
                            {line.replace(/^#+\s*/, '')}
                          </Typography>
                        );
                      } else if (line.trim() === '') {
                        return <br key={idx} />;
                      } else {
                        // Format bold text
                        const parts = line.split(/(\*\*.*?\*\*)/g);
                        return (
                          <Typography key={idx} component="p" sx={{ mb: 1, color: '#212529', fontSize: '0.95rem' }}>
                            {parts.map((part, partIdx) => {
                              if (part.startsWith('**') && part.endsWith('**')) {
                                return <strong key={partIdx}>{part.slice(2, -2)}</strong>;
                              }
                              return <span key={partIdx}>{part}</span>;
                            })}
                          </Typography>
                        );
                      }
                    })}
                  </Typography>
                </Box>
              )}
              
              {/* Company Description */}
              {selectedCompany.companyDescription && (
                <Box sx={{ mb: 4, p: 2, bgcolor: 'oklch(0.97 0 0)', borderRadius: 2, borderLeft: '4px solid #0b1957', border: '1px solid oklch(0.922 0 0)' }}>
                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom sx={{ color: '#0b1957' }}>
                    About Company
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'oklch(0.145 0 0)', lineHeight: 1.8 }}>
                    {selectedCompany.companyDescription}
                  </Typography>
                </Box>
              )}

              {/* Growth Metrics - Circular Progress */}
              {(selectedCompany.growth6M || selectedCompany.growth12M || selectedCompany.growth24M) && (
                <Box sx={{ mb: 4 }}>
                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom sx={{ mb: 2, color: '#0b1957' }}>
                    Growth Analytics
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 3, justifyContent: 'space-around', flexWrap: 'wrap' }}>
                    {selectedCompany.growth6M && (
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 120 }}>
                        <Box sx={{ position: 'relative', display: 'inline-flex', mb: 1 }}>
                          <Box
                            sx={{
                              width: 100,
                              height: 100,
                              borderRadius: '50%',
                              background: `conic-gradient(#0b1957 ${Math.min(parseFloat(selectedCompany.growth6M) * 100, 100) * 3.6}deg, #e0e0e0 0deg)`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            <Box
                              sx={{
                                width: 80,
                                height: 80,
                                borderRadius: '50%',
                                bgcolor: '#ffffff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexDirection: 'column'
                              }}
                            >
                              <Typography variant="h6" fontWeight="bold" sx={{ color: '#0b1957' }}>
                                {(parseFloat(selectedCompany.growth6M) * 100).toFixed(1)}%
                              </Typography>
                            </Box>
                          </Box>
                        </Box>
                        <Typography variant="caption" sx={{ color: 'oklch(0.556 0 0)' }} fontWeight="600">
                          6 Month Growth
                        </Typography>
                      </Box>
                    )}
                    {selectedCompany.growth12M && (
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 120 }}>
                        <Box sx={{ position: 'relative', display: 'inline-flex', mb: 1 }}>
                          <Box
                            sx={{
                              width: 100,
                              height: 100,
                              borderRadius: '50%',
                              background: `conic-gradient(#0b1957 ${Math.min(parseFloat(selectedCompany.growth12M) * 100, 100) * 3.6}deg, #e0e0e0 0deg)`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            <Box
                              sx={{
                                width: 80,
                                height: 80,
                                borderRadius: '50%',
                                bgcolor: '#ffffff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexDirection: 'column'
                              }}
                            >
                              <Typography variant="h6" fontWeight="bold" sx={{ color: '#0b1957' }}>
                                {(parseFloat(selectedCompany.growth12M) * 100).toFixed(1)}%
                              </Typography>
                            </Box>
                          </Box>
                        </Box>
                        <Typography variant="caption" sx={{ color: 'oklch(0.556 0 0)' }} fontWeight="600">
                          12 Month Growth
                        </Typography>
                      </Box>
                    )}
                    {selectedCompany.growth24M && (
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 120 }}>
                        <Box sx={{ position: 'relative', display: 'inline-flex', mb: 1 }}>
                          <Box
                            sx={{
                              width: 100,
                              height: 100,
                              borderRadius: '50%',
                              background: `conic-gradient(#0b1957 ${Math.min(parseFloat(selectedCompany.growth24M) * 100, 100) * 3.6}deg, #e0e0e0 0deg)`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            <Box
                              sx={{
                                width: 80,
                                height: 80,
                                borderRadius: '50%',
                                bgcolor: '#ffffff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexDirection: 'column'
                              }}
                            >
                              <Typography variant="h6" fontWeight="bold" sx={{ color: '#0b1957' }}>
                                {(parseFloat(selectedCompany.growth24M) * 100).toFixed(1)}%
                              </Typography>
                            </Box>
                          </Box>
                        </Box>
                        <Typography variant="caption" sx={{ color: 'oklch(0.556 0 0)' }} fontWeight="600">
                          24 Month Growth
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </Box>
              )}

              {/* Revenue & Financial Metrics */}
              {(selectedCompany.revenue || selectedCompany.stockInfo || selectedCompany.foundingYear) && (
                <Box sx={{ mb: 4 }}>
                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom sx={{ mb: 2, color: '#0b1957' }}>
                    Financial Overview
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    {selectedCompany.revenue && (
                      <Box sx={{ 
                        flex: 1, 
                        minWidth: 200, 
                        p: 2, 
                        bgcolor: 'oklch(0.97 0 0)', 
                        borderRadius: 2,
                        border: '2px solid #0b1957'
                      }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          <AttachMoney sx={{ color: '#0b1957', fontSize: 28 }} />
                          <Typography variant="caption" sx={{ color: '#0b1957' }} fontWeight="600" textTransform="uppercase">
                            Annual Revenue
                          </Typography>
                        </Box>
                        <Typography variant="h5" fontWeight="bold" sx={{ color: '#0b1957' }}>
                          {selectedCompany.revenue}
                        </Typography>
                      </Box>
                    )}
                    {selectedCompany.stockInfo && (
                      <Box sx={{ 
                        flex: 1, 
                        minWidth: 200, 
                        p: 2, 
                        bgcolor: 'oklch(0.97 0 0)', 
                        borderRadius: 2,
                        border: '2px solid #0b1957'
                      }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          <ShowChart sx={{ color: '#0b1957', fontSize: 28 }} />
                          <Typography variant="caption" sx={{ color: '#0b1957' }} fontWeight="600" textTransform="uppercase">
                            Stock Info
                          </Typography>
                        </Box>
                        <Typography variant="h5" fontWeight="bold" sx={{ color: '#0b1957' }}>
                          {selectedCompany.stockInfo}
                        </Typography>
                      </Box>
                    )}
                    {selectedCompany.foundingYear && (
                      <Box sx={{ 
                        flex: 1, 
                        minWidth: 200, 
                        p: 2, 
                        bgcolor: 'rgba(186, 104, 200, 0.1)', 
                        borderRadius: 2,
                        border: '2px solid #ba68c8'
                      }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          <CalendarToday sx={{ color: '#ba68c8', fontSize: 28 }} />
                          <Typography variant="caption" color="text.secondary" fontWeight="600" textTransform="uppercase">
                            Founded
                          </Typography>
                        </Box>
                        <Typography variant="h5" fontWeight="bold" sx={{ color: '#9c27b0' }}>
                          {selectedCompany.foundingYear}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {new Date().getFullYear() - parseInt(selectedCompany.foundingYear)} years in business
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </Box>
              )}

              {/* NAICS & SIC Codes */}
              {(selectedCompany.naicsCodes?.length > 0 || selectedCompany.sicCodes?.length > 0) && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                    Industry Codes:
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {selectedCompany.naicsCodes?.length > 0 && (
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Typography variant="body2" fontWeight="600">NAICS:</Typography>
                        <Typography variant="body2" color="text.secondary">{selectedCompany.naicsCodes.join(', ')}</Typography>
                      </Box>
                    )}
                    {selectedCompany.sicCodes?.length > 0 && (
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Typography variant="body2" fontWeight="600">SIC:</Typography>
                        <Typography variant="body2" color="text.secondary">{selectedCompany.sicCodes.join(', ')}</Typography>
                      </Box>
                    )}
                  </Box>
                </Box>
              )}

              {/* Top Employees / Executive Team */}
              {selectedCompany.cLevelExecutives && selectedCompany.cLevelExecutives.length > 0 && (
                <Box sx={{ mb: 4 }}>
                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <People sx={{ color: '#1976d2' }} /> Top Employees & Decision Makers
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {selectedCompany.cLevelExecutives.slice(0, 10).map((employee, index) => (
                      <Box 
                        key={index}
                        sx={{ 
                          p: 2, 
                          bgcolor: '#f8f9fa', 
                          borderRadius: 2,
                          border: '1px solid #e9ecef',
                          '&:hover': {
                            bgcolor: '#e9ecef',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                          }
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                          {/* Employee Avatar */}
                          <Avatar 
                            src={employee.photo_url} 
                            alt={employee.name}
                            sx={{ 
                              width: 48, 
                              height: 48,
                              bgcolor: '#1976d2',
                              fontSize: '1.2rem',
                              fontWeight: 'bold'
                            }}
                          >
                            {employee.name ? employee.name.charAt(0).toUpperCase() : '👤'}
                          </Avatar>

                          {/* Employee Details */}
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="subtitle2" fontWeight="bold" sx={{ color: '#ffffff', mb: 0.5, fontSize: '1rem' }}>
                              {employee.name || 'Unknown Name'}
                            </Typography>
                            {employee.title && (
                              <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)', mb: 1 }}>
                                {employee.title}
                              </Typography>
                            )}
                            
                            {/* Contact Info */}
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 1 }}>
                              {employee.email && (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                  <Email sx={{ fontSize: 16, color: '#ba68c8', filter: 'drop-shadow(0 0 6px rgba(186, 104, 200, 0.4))' }} />
                                  <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                                    {employee.email}
                  </Typography>
                                </Box>
                              )}
                              {employee.phone && (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                  <Phone sx={{ fontSize: 16, color: '#ba68c8', filter: 'drop-shadow(0 0 6px rgba(186, 104, 200, 0.4))' }} />
                                  <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                                    {employee.phone}
                                  </Typography>
                                </Box>
                              )}
                              {employee.city && (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                  <LocationOn sx={{ fontSize: 16, color: '#ba68c8', filter: 'drop-shadow(0 0 6px rgba(186, 104, 200, 0.4))' }} />
                                  <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                                    {employee.city}{employee.country ? `, ${employee.country}` : ''}
                                  </Typography>
                                </Box>
                              )}
                            </Box>

                            {/* LinkedIn Link */}
                            {employee.linkedin_url && (
                              <Box sx={{ mt: 1 }}>
                                <Chip
                                  icon={<LinkedInIcon />}
                                  label="View LinkedIn Profile"
                                  component="a"
                                  href={employee.linkedin_url}
                                  target="_blank"
                                  clickable
                                  size="small"
                                  sx={{ 
                                    bgcolor: '#e3f2fd',
                                    color: '#0077b5',
                                    fontSize: '0.7rem',
                                    height: '24px',
                                    '&:hover': { bgcolor: '#bbdefb' }
                                  }}
                                />
                              </Box>
                            )}
                          </Box>
                        </Box>
                      </Box>
                    ))}
                  </Box>
                  
                  {/* Show count if more than 10 employees */}
                  {selectedCompany.cLevelExecutives.length > 10 && (
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block', textAlign: 'center' }}>
                      Showing top 10 of {selectedCompany.cLevelExecutives.length} employees
                    </Typography>
                  )}
                </Box>
              )}

              {/* Services Offered */}
              {selectedCompany.servicesOffered && selectedCompany.servicesOffered.length > 0 && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                    Services Offered:
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {selectedCompany.servicesOffered.map((service, index) => (
                      <Chip key={index} label={service} size="small" variant="outlined" />
                    ))}
                  </Box>
                </Box>
              )}

            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3, gap: 2 }}>
          <Button 
            onClick={handleCloseDialog} 
            variant="contained"
            sx={{
              background: '#0b1957',
              color: '#ffffff',
              borderRadius: '20px',
              '&:hover': {
                background: '#0d1f6f',
              }
            }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Employee List Dialog */}
      <Dialog 
        open={employeeDialogOpen} 
        onClose={() => {
          setEmployeeDialogOpen(false);
          setEmployeeRoleFilter('all'); // Reset filter when closing
          setSelectedDialogEmployees(new Set()); // Reset selection when closing
        }}
        maxWidth={false}
        PaperProps={{
          sx: {
            bgcolor: '#ffffff',
            borderRadius: '20px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
            maxWidth: '1100px',
            width: '90%',
            maxHeight: '90vh'
          }
        }}
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, justifyContent: 'space-between', flexWrap: 'wrap' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar 
                sx={{ width: 40, height: 40, bgcolor: '#0b1957' }}
                src={selectedEmployeeCompany?.logoUrl || selectedEmployeeCompany?.logo}
                alt={`${selectedEmployeeCompany?.companyName || 'Company'} logo`}
              >
                {!(selectedEmployeeCompany?.logoUrl || selectedEmployeeCompany?.logo) && (
                  <Business />
                )}
              </Avatar>
              <Box>
                <Typography variant="h6" sx={{ color: '#0b1957' }}>
                  {selectedEmployeeCompany?.companyName || selectedEmployeeCompany?.username || 'Company'} - Team
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="caption" sx={{ color: 'oklch(0.556 0 0)' }}>
                    {filterEmployeesByRole(fetchedEmployeeData[selectedEmployeeCompany?.id || selectedEmployeeCompany?.domain], employeeRoleFilter)?.length || 0} 
                    {employeeRoleFilter !== 'all' && ` of ${fetchedEmployeeData[selectedEmployeeCompany?.id || selectedEmployeeCompany?.domain]?.length || 0}`} Employees
                  </Typography>
                  {employeeCacheInfo[selectedEmployeeCompany?.id || selectedEmployeeCompany?.domain]?.from_cache && (
                    <Chip 
                      label={`📦 Cached (${employeeCacheInfo[selectedEmployeeCompany?.id || selectedEmployeeCompany?.domain]?.cache_age_days}d old)`}
                      size="small"
                      sx={{ 
                        height: 20,
                        fontSize: '0.7rem',
                        bgcolor: 'oklch(0.97 0 0)',
                        color: '#0b1957',
                        fontWeight: 600,
                        border: '1px solid oklch(0.922 0 0)'
                      }}
                    />
                    )}
                  </Box>
                </Box>
            </Box>

            {/* Select All on left, Filter/Button/View Toggle on right */}
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', width: '100%' }}>
              {/* Select All Checkbox - Left side */}
              {(() => {
                const companyId = selectedEmployeeCompany?.id || selectedEmployeeCompany?.domain;
                const employees = fetchedEmployeeData[companyId] || [];
                const filteredEmployees = filterEmployeesByRole(employees, employeeRoleFilter);
                const allSelected = filteredEmployees.length > 0 && selectedDialogEmployees.size === filteredEmployees.length;
                const someSelected = selectedDialogEmployees.size > 0 && selectedDialogEmployees.size < filteredEmployees.length;
                
                return (
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={allSelected}
                        indeterminate={someSelected}
                        onChange={(e) => {
                          if (e.target.checked) {
                            // Select all filtered employees
                            const allIndices = new Set(filteredEmployees.map((_, idx) => idx));
                            setSelectedDialogEmployees(allIndices);
                          } else {
                            // Deselect all
                            setSelectedDialogEmployees(new Set());
                          }
                        }}
                        sx={{
                          color: '#0b1957',
                          '&.Mui-checked': {
                            color: '#0b1957',
                          }
                        }}
                      />
                    }
                    label="Select All"
                    sx={{ color: '#0b1957', mr: 1 }}
                  />
                );
              })()}
              
              {/* Right side: Filter, Send Connection Button, and View Toggle */}
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                {/* Role Filter Dropdown */}
                <FormControl size="small" sx={{ minWidth: 180 }}>
                  <InputLabel id="employee-role-filter-label">Filter by Role</InputLabel>
                  <Select
                    labelId="employee-role-filter-label"
                    value={employeeRoleFilter}
                    label="Filter by Role"
                    onChange={(e) => setEmployeeRoleFilter(e.target.value)}
                    MenuProps={{
                      PaperProps: {
                        sx: {
                          bgcolor: '#ffffff',
                          border: '1px solid oklch(0.922 0 0)',
                          borderRadius: '8px',
                          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
                          mt: 1,
                          '& .MuiMenuItem-root': {
                            color: '#0b1957',
                            '&:hover': {
                              bgcolor: 'oklch(0.97 0 0)'
                            },
                            '&.Mui-selected': {
                              bgcolor: '#0b1957',
                              color: '#ffffff',
                              '&:hover': {
                                bgcolor: '#0d1f6f'
                              }
                            }
                          }
                        }
                      }
                    }}
                    sx={{ 
                      background: '#ffffff',
                      border: '1px solid oklch(0.922 0 0)',
                      borderRadius: '8px',
                      color: '#0b1957',
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'oklch(0.922 0 0)'
                      },
                      '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: '#0b1957'
                      },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                        borderColor: '#0b1957'
                      },
                      '& .MuiSelect-select': {
                        color: '#0b1957'
                      },
                      '& .MuiInputLabel-root': {
                        color: 'oklch(0.556 0 0)',
                        '&.Mui-focused': {
                          color: '#0b1957'
                        }
                      }
                    }}
                >
                  <MenuItem value="all">All Employees</MenuItem>
                  <MenuItem value="executive">Executive (CEO, CTO, CFO)</MenuItem>
                  <MenuItem value="director">Directors</MenuItem>
                  <MenuItem value="manager">Managers</MenuItem>
                  <MenuItem value="hr">HR & Recruitment</MenuItem>
                  <MenuItem value="sales">Sales & Business Dev</MenuItem>
                  <MenuItem value="marketing">Marketing</MenuItem>
                  <MenuItem value="engineering">Engineering & Tech</MenuItem>
                  <MenuItem value="operations">Operations</MenuItem>
                  <MenuItem value="finance">Finance & Accounting</MenuItem>
                </Select>
                </FormControl>
                
                {/* Send Connection Button - Always visible */}
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<LinkedInIcon />}
                  onClick={handleSendLinkedInConnectionsFromDialog}
                  disabled={selectedDialogEmployees.size === 0}
                  sx={{
                    background: selectedDialogEmployees.size > 0 ? '#0077b5' : '#cccccc',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                    color: '#ffffff',
                    fontWeight: 600,
                    borderRadius: '20px',
                    whiteSpace: 'nowrap',
                    px: 2,
                    '&:hover': {
                      background: selectedDialogEmployees.size > 0 ? '#005885' : '#cccccc',
                      boxShadow: selectedDialogEmployees.size > 0 ? '0 2px 6px rgba(0, 119, 181, 0.3)' : 'none',
                      transform: selectedDialogEmployees.size > 0 ? 'translateY(-1px)' : 'none',
                    },
                    '&:disabled': {
                      background: '#cccccc',
                      color: '#666666',
                      cursor: 'not-allowed',
                      opacity: 0.6
                    },
                    transition: 'all 0.3s ease-in-out',
                  }}
                >
                  Send Connection {selectedDialogEmployees.size > 0 ? `(${selectedDialogEmployees.size})` : ''}
                </Button>
              
                {/* View Toggle Button */}
                <Box sx={{ display: 'flex', gap: 0.5, bgcolor: 'oklch(0.97 0 0)', borderRadius: '8px', p: 0.5, border: '1px solid oklch(0.922 0 0)' }}>
                <Tooltip title="Grid View" arrow>
                  <IconButton
                    size="small"
                    onClick={() => setEmployeeViewMode('grid')}
                    sx={{
                      bgcolor: employeeViewMode === 'grid' ? '#0b1957' : 'transparent',
                      color: employeeViewMode === 'grid' ? 'white' : '#0b1957',
                      '&:hover': {
                        bgcolor: employeeViewMode === 'grid' ? '#0d1f6f' : 'oklch(0.97 0 0)',
                      },
                    }}
                  >
                    <ViewModule fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="List View" arrow>
                  <IconButton
                    size="small"
                    onClick={() => setEmployeeViewMode('list')}
                    sx={{
                      bgcolor: employeeViewMode === 'list' ? '#0b1957' : 'transparent',
                      color: employeeViewMode === 'list' ? 'white' : '#0b1957',
                      '&:hover': {
                        bgcolor: employeeViewMode === 'list' ? '#0d1f6f' : 'oklch(0.97 0 0)',
                      },
                    }}
                  >
                    <ViewList fontSize="small" />
                  </IconButton>
                </Tooltip>
                </Box>
              </Box>
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent dividers sx={{ minHeight: '400px', p: 3, width: '100%', maxWidth: '100%', overflowY: 'auto', overflowX: 'hidden' }}>
          <Box sx={{ 
            display: 'grid',
            gridTemplateColumns: {
              xs: 'repeat(1, 1fr)',
              sm: employeeViewMode === 'grid' ? 'repeat(2, 1fr)' : 'repeat(1, 1fr)',
              md: employeeViewMode === 'grid' ? 'repeat(3, 1fr)' : 'repeat(1, 1fr)',
              lg: employeeViewMode === 'grid' ? 'repeat(3, 1fr)' : 'repeat(1, 1fr)'
            },
            gap: 1.5,
            alignItems: 'stretch',
            width: '100%',
            boxSizing: 'border-box'
          }}>
            {selectedEmployeeCompany && filterEmployeesByRole(fetchedEmployeeData[selectedEmployeeCompany?.id || selectedEmployeeCompany.domain], employeeRoleFilter)?.map((employee, index) => (
              <Box key={index} sx={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', minWidth: 0, maxWidth: '100%' }}>
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
                  sx={{ 
                    width: '100%',
                    maxWidth: '100%',
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    background: selectedDialogEmployees.has(index) ? 'oklch(0.98 0.01 250)' : '#ffffff',
                    borderRadius: '12px',
                    border: selectedDialogEmployees.has(index) ? '2px solid #0077b5' : '1px solid oklch(0.922 0 0)',
                    boxShadow: selectedDialogEmployees.has(index) ? '0 4px 12px rgba(0, 119, 181, 0.3)' : '0 1px 3px rgba(0, 0, 0, 0.1)',
                    transition: 'all 0.3s ease',
                    position: 'relative',
                    overflow: 'hidden',
                    minWidth: 0,
                    cursor: 'pointer',
                    '&:hover': {
                      transform: employeeViewMode === 'grid' ? 'translateY(-4px)' : 'translateY(-2px)',
                      boxShadow: selectedDialogEmployees.has(index) ? '0 6px 16px rgba(0, 119, 181, 0.4)' : '0 4px 12px rgba(11, 25, 87, 0.15)',
                      borderColor: selectedDialogEmployees.has(index) ? '#005885' : '#0b1957',
                    }
                  }}
                >
                  <CardContent sx={{ 
                    p: employeeViewMode === 'grid' ? 2 : 2.5,
                    display: 'flex',
                    flexDirection: 'column',
                    flex: 1,
                    width: '100%',
                    maxWidth: '100%',
                    minHeight: 0,
                    boxSizing: 'border-box',
                    minWidth: 0,
                    overflow: 'hidden',
                    position: 'relative'
                  }}>
                    {/* Selection Indicator - Top Right */}
                    {selectedDialogEmployees.has(index) && (
                      <Box sx={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        zIndex: 10,
                        bgcolor: '#0077b5',
                        borderRadius: '50%',
                        width: 24,
                        height: 24,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 2px 4px rgba(0, 119, 181, 0.3)'
                      }}>
                        <Check sx={{ fontSize: 16, color: 'white' }} />
                      </Box>
                    )}
                    {employeeViewMode === 'grid' ? (
                      <>
                        {/* Avatar - Top */}
                        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2, flexShrink: 0 }}>
                          <Avatar 
                            src={employee.photo_url}
                            alt={employee.name}
                            sx={{ 
                              width: 90,
                              height: 90,
                              border: '4px solid',
                              borderColor: '#0b1957',
                              boxShadow: 2,
                            }}
                          >
                            <Person sx={{ fontSize: 50 }} />
                          </Avatar>
                        </Box>
                        
                        {/* Employee Details Wrapper - Fills remaining space */}
                        <Box sx={{ 
                          display: 'flex',
                          flexDirection: 'column', 
                          alignItems: 'center',
                          width: '100%',
                          maxWidth: '100%',
                          flex: 1,
                          minHeight: 0,
                          minWidth: 0,
                          alignSelf: 'stretch',
                          justifyContent: 'space-between'
                        }}>
                          {/* Top Section: Name, Title, Company */}
                          <Box sx={{ 
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: 1.5,
                            width: '100%',
                            minWidth: 0,
                            flexShrink: 0
                          }}>
                            {/* Employee Name */}
                            <Typography variant="h6" sx={{ 
                              fontWeight: 'bold', 
                              fontSize: '1.1rem',
                              color: '#0b1957',
                              width: '100%',
                              textAlign: 'center',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              px: 1
                            }}>
                              {employee.name || 'Unknown'}
                            </Typography>
                            
                            {/* Employee Title/Role */}
                            <Chip 
                              label={employee.title || 'No Title'} 
                              size="medium"
                              sx={{ 
                                fontWeight: 'bold',
                                fontSize: '0.85rem',
                                bgcolor: '#0b1957',
                                color: '#ffffff',
                                maxWidth: '100%',
                                '& .MuiChip-label': {
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  maxWidth: '100%',
                                  px: 1
                                }
                              }}
                            />

                            {/* Company Name */}
                            {employee.company_name && (
                              <Box sx={{ 
                                bgcolor: 'oklch(0.97 0 0)', 
                                px: 1.5, 
                                py: 0.5, 
                                borderRadius: 1,
                                width: '100%',
                                maxWidth: '100%',
                                textAlign: 'center',
                                border: '1px solid oklch(0.922 0 0)',
                                minWidth: 0,
                                overflow: 'hidden',
                                boxSizing: 'border-box'
                              }}>
                                <Typography 
                                  variant="caption" 
                                  sx={{ 
                                    fontWeight: 600, 
                                    color: '#0b1957',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    display: 'block',
                                    width: '100%',
                                    maxWidth: '100%',
                                    boxSizing: 'border-box'
                                  }}
                                  title={`@ ${employee.company_name}`}
                                >
                                  @ {employee.company_name}
                                </Typography>
                              </Box>
                            )}

                            {/* Divider */}
                            <Box sx={{ width: '100%', height: '1px', bgcolor: '#e0e0e0', my: 1.5 }} />
                          </Box>
                          
                          {/* Contact Details List - Bottom */}
                          <Box sx={{ 
                            width: '100%', 
                            display: 'flex', 
                            flexDirection: 'column', 
                            gap: 1.5,
                            alignItems: 'stretch',
                            flexShrink: 0
                          }}>
                        {/* Location */}
                        {(employee.city || employee.country) && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%', minWidth: 0, maxWidth: '100%' }}>
                            <LocationOn sx={{ fontSize: 18, color: '#0b1957', flexShrink: 0 }} />
                            <Typography 
                              variant="caption" 
                              sx={{ 
                                color: 'oklch(0.145 0 0)',
                                fontSize: '0.8rem',
                                flex: 1,
                                minWidth: 0,
                                maxWidth: '100%',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                display: 'block'
                              }}
                              title={[employee.city, employee.state, employee.country].filter(Boolean).join(', ')}
                            >
                              {[employee.city, employee.state, employee.country].filter(Boolean).join(', ')}
                            </Typography>
                          </Box>
                        )}
                        
                        {/* LinkedIn */}
                        {employee.linkedin_url && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                            <LinkedInIcon sx={{ fontSize: 18, color: '#0077b5' }} />
                            <Link
                              href={employee.linkedin_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              sx={{ 
                                color: '#0077b5',
                                fontSize: '0.8rem',
                                textDecoration: 'none',
                                '&:hover': { textDecoration: 'underline' },
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                flex: 1
                              }}
                            >
                              View LinkedIn Profile
                            </Link>
                          </Box>
                        )}
                        
                        {/* Phone Number (Blurred) */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                          <Box sx={{ 
                            bgcolor: '#0b1957', 
                            borderRadius: '50%', 
                            p: 0.5,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            <Phone sx={{ fontSize: 16, color: 'white' }} />
                          </Box>
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
                                <Typography variant="caption" sx={{ 
                                  color: hasPhone ? '#0b1957' : (phoneNotFound ? '#d32f2f' : 'oklch(0.556 0 0)'),
                                  fontSize: '0.8rem',
                                  letterSpacing: hasPhone ? 'normal' : '1px',
                                  filter: hasPhone || phoneNotFound ? 'none' : 'blur(4px)',
                                  userSelect: hasPhone ? 'text' : 'none',
                                  flex: 1,
                                  fontWeight: hasPhone || phoneNotFound ? 600 : 400,
                                  fontStyle: phoneNotFound ? 'italic' : 'normal'
                                }}>
                                  {displayPhone}
                                </Typography>
                                <Tooltip title={hasPhone ? "Phone number revealed" : phoneNotFound ? "Phone number not available" : "Click to reveal phone number"} arrow>
                                  <IconButton
                                    size="small"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRevealPhone(employee);
                                    }}
                                    disabled={empRevealing?.phone || hasPhone}
                                    sx={{ 
                                      bgcolor: 'oklch(0.97 0 0)',
                                      border: '1px solid oklch(0.922 0 0)',
                                      '&:hover': { bgcolor: 'oklch(0.97 0 0)', borderColor: '#0b1957' },
                                      p: 0.5
                                    }}
                                  >
                                    {empRevealing?.phone ? (
                                        <CircularProgress size={20} sx={{ color: '#0b1957' }} />
                                    ) : hasPhone ? (
                                        <CheckCircle sx={{ fontSize: 20, color: '#0b1957' }} />
                                    ) : (
                                        <Lock sx={{ fontSize: 20, color: '#0b1957' }} />
                                    )}
                                  </IconButton>
                                </Tooltip>
                              </>
                            );
                          })()}
                        </Box>
                        
                        {/* Email (Blurred) */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                          <Box sx={{ 
                            bgcolor: '#0b1957', 
                            borderRadius: '50%', 
                            p: 0.5,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            <Email sx={{ fontSize: 16, color: 'white' }} />
                          </Box>
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
                                <Typography variant="caption" sx={{ 
                                  color: hasEmail ? '#0b1957' : (emailNotFound ? '#d32f2f' : 'oklch(0.556 0 0)'),
                                  fontSize: '0.8rem',
                                  letterSpacing: hasEmail ? 'normal' : '1px',
                                  filter: hasEmail || emailNotFound ? 'none' : 'blur(4px)',
                                  userSelect: hasEmail ? 'text' : 'none',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  flex: 1,
                                  fontWeight: hasEmail || emailNotFound ? 600 : 400,
                                  fontStyle: emailNotFound ? 'italic' : 'normal'
                                }}>
                                  {displayEmail}
                                </Typography>
                                <Tooltip title={hasEmail ? "Email address revealed" : emailNotFound ? "Email address not available" : "Click to reveal email address"} arrow>
                                  <IconButton
                                    size="small"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRevealEmail(employee);
                                    }}
                                    disabled={empRevealing?.email || hasEmail}
                                    sx={{ 
                                      bgcolor: 'oklch(0.97 0 0)',
                                      border: '1px solid oklch(0.922 0 0)',
                                      '&:hover': { bgcolor: 'oklch(0.97 0 0)', borderColor: '#0b1957' },
                                      p: 0.5
                                    }}
                                  >
                                    {empRevealing?.email ? (
                                        <CircularProgress size={20} sx={{ color: '#0b1957' }} />
                                    ) : hasEmail ? (
                                        <CheckCircle sx={{ fontSize: 20, color: '#0b1957' }} />
                                    ) : (
                                        <Lock sx={{ fontSize: 20, color: '#0b1957' }} />
                                    )}
                                  </IconButton>
                                </Tooltip>
                              </>
                            );
                          })()}
                        </Box>
                          </Box>
                        </Box>
                      </>
                    ) : (
                      <>
                        {/* List View Layout */}
                        <Box sx={{ 
                          display: 'flex', 
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 4,
                          justifyContent: 'space-between',
                          flex: 1,
                          width: '100%'
                        }}>
                          {/* Left Section: Photo + Basic Info */}
                          <Box sx={{ 
                            display: 'flex', 
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 3,
                            flex: '0 0 auto'
                          }}>
                            <Avatar 
                              src={employee.photo_url}
                              alt={employee.name}
                              sx={{ 
                                width: 80,
                                height: 80,
                                border: '3px solid',
                                borderColor: '#0b1957',
                                boxShadow: 3,
                                flexShrink: 0
                              }}
                            >
                              <Person sx={{ fontSize: 40 }} />
                            </Avatar>
                            
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.8, minWidth: 200, maxWidth: 300 }}>
                              <Typography variant="h6" sx={{ 
                                fontWeight: 700, 
                                fontSize: '1.05rem',
                                color: '#0b1957',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                lineHeight: 1.2
                              }}>
                                {employee.name || 'Unknown'}
                              </Typography>
                              <Chip 
                                label={employee.title || 'No Title'} 
                                size="small"
                                color="primary"
                                sx={{ 
                                  fontWeight: 600,
                                  fontSize: '0.8rem',
                                  maxWidth: 'fit-content',
                                  height: 26,
                                  '& .MuiChip-label': {
                                    px: 1.5
                                  }
                                }}
                              />
                              {employee.company_name && (
                                <Typography variant="caption" sx={{ 
                                  color: 'oklch(0.556 0 0)', 
                                  fontSize: '0.8rem',
                                  fontWeight: 500
                                }}>
                                  @ {employee.company_name}
                                </Typography>
                              )}
                            </Box>
                          </Box>
                          
                          {/* Middle Section: Contact Details (List View) */}
                          {employeeViewMode === 'list' && (
                        <Box sx={{ 
                          display: 'flex', 
                          alignItems: 'center',
                          gap: 5,
                          flex: 1,
                          minWidth: 0,
                          pl: 2
                        }}>
                          {/* Location */}
                          {(employee.city || employee.country) && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
                              <LocationOn sx={{ fontSize: 22, color: '#0b1957', flexShrink: 0 }} />
                              <Typography variant="body2" sx={{ 
                                color: 'oklch(0.145 0 0)',
                                fontSize: '0.875rem',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                fontWeight: 500
                              }}>
                                {employee.city || employee.country}
                              </Typography>
                            </Box>
                          )}
                          
                          {/* LinkedIn */}
                          {employee.linkedin_url && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
                              <LinkedInIcon sx={{ fontSize: 22, color: '#0077b5', flexShrink: 0 }} />
                              <Link
                                href={employee.linkedin_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                sx={{ 
                                  color: '#0077b5',
                                  fontSize: '0.875rem',
                                  textDecoration: 'none',
                                  fontWeight: 500,
                                  '&:hover': { 
                                    textDecoration: 'underline',
                                    color: '#005582'
                                  },
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis'
                                }}
                              >
                                LinkedIn
                              </Link>
                            </Box>
                          )}
                          
                          {/* Phone with Lock */}
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                            <Phone sx={{ fontSize: 22, color: '#0b1957' }} />
                            {(() => {
                                const empId = getEmployeeId(employee);
                                const empRevealed = empId ? (revealedContacts[empId] || {}) : {};
                                const empRevealing = empId ? (revealingContacts[empId] || {}) : {};
                                const phoneNotFound = empRevealed.phone === 'not_found';
                                const hasPhone = empRevealed.phone && empRevealed.phone !== 'not_found';
                                const displayPhone = hasPhone ? empRevealed.phone : (phoneNotFound ? 'Number not found' : '+971 50 123 4567');
                                
                                return (
                                  <>
                                    <Typography variant="caption" sx={{ 
                                      color: hasPhone ? '#0b1957' : (phoneNotFound ? '#d32f2f' : 'oklch(0.556 0 0)'),
                                      fontSize: '0.875rem',
                                      fontWeight: hasPhone || phoneNotFound ? 600 : 400,
                                      letterSpacing: hasPhone ? 'normal' : '1px',
                                      filter: hasPhone || phoneNotFound ? 'none' : 'blur(4px)',
                                      userSelect: hasPhone ? 'text' : 'none',
                                      flex: 1,
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      whiteSpace: 'nowrap',
                                      fontStyle: phoneNotFound ? 'italic' : 'normal'
                                    }}>
                                      {displayPhone}
                                    </Typography>
                                    <Tooltip title={hasPhone ? "Phone number revealed" : phoneNotFound ? "Phone number not available" : "Click to reveal phone number"} arrow>
                                      <IconButton 
                                        size="small"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleRevealPhone(employee);
                                        }}
                                        disabled={empRevealing?.phone || hasPhone}
                                        sx={{ 
                                          p: 0.5,
                                          bgcolor: hasPhone ? '#c8e6c9' : '#e3f2fd',
                                          '&:hover': { bgcolor: hasPhone ? '#c8e6c9' : '#bbdefb' }
                                        }}
                                      >
                                        {empRevealing?.phone ? (
                                          <CircularProgress size={16} sx={{ color: '#0b1957' }} />
                                        ) : hasPhone ? (
                                          <CheckCircle sx={{ fontSize: 16, color: '#0b1957' }} />
                                        ) : (
                                          <Lock sx={{ fontSize: 16, color: '#0b1957' }} />
                                        )}
                                      </IconButton>
                                    </Tooltip>
                                  </>
                                );
                              })()}
                          </Box>
                          
                          {/* Email with Lock */}
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                            <Email sx={{ fontSize: 22, color: '#0b1957' }} />
                            {(() => {
                              const empId = getEmployeeId(employee);
                              const empRevealed = empId ? (revealedContacts[empId] || {}) : {};
                              const empRevealing = empId ? (revealingContacts[empId] || {}) : {};
                              const emailNotFound = empRevealed.email === 'not_found';
                              const hasEmail = empRevealed.email && empRevealed.email !== 'not_found';
                              const displayEmail = hasEmail ? empRevealed.email : (emailNotFound ? 'Email not found' : 'name@company.com');
                              
                              return (
                                <>
                                  <Typography variant="caption" sx={{ 
                                    color: hasEmail ? '#0b1957' : (emailNotFound ? '#d32f2f' : 'oklch(0.556 0 0)'),
                                    fontSize: '0.875rem',
                                    fontWeight: hasEmail || emailNotFound ? 600 : 400,
                                    letterSpacing: hasEmail ? 'normal' : '1px',
                                    filter: hasEmail || emailNotFound ? 'none' : 'blur(4px)',
                                    userSelect: hasEmail ? 'text' : 'none',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    maxWidth: '200px',
                                    flex: 1,
                                    fontStyle: emailNotFound ? 'italic' : 'normal'
                                  }}>
                                    {displayEmail}
                                  </Typography>
                                  <Tooltip title={hasEmail ? "Email address revealed" : emailNotFound ? "Email address not available" : "Click to reveal email address"} arrow>
                                    <IconButton 
                                      size="small"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleRevealEmail(employee);
                                      }}
                                      disabled={empRevealing?.email || hasEmail}
                                      sx={{ 
                                        p: 0.5,
                                        bgcolor: hasEmail ? '#c8e6c9' : '#e8f5e9',
                                        '&:hover': { bgcolor: hasEmail ? '#c8e6c9' : '#c8e6c9' }
                                      }}
                                    >
                                      {empRevealing?.email ? (
                                        <CircularProgress size={16} sx={{ color: '#0b1957' }} />
                                      ) : hasEmail ? (
                                        <CheckCircle sx={{ fontSize: 16, color: '#0b1957' }} />
                                      ) : (
                                        <Lock sx={{ fontSize: 16, color: '#0b1957' }} />
                                      )}
                                    </IconButton>
                                  </Tooltip>
                                </>
                              );
                            })()}
                          </Box>
                        </Box>
                      )}
                        </Box>
                      </>
                    )}
                  </CardContent>
                </Card>
              </Box>
            ))}
          </Box>
          
          {/* Error Message (shows even when loading if it's an Apollo fetching message) */}
          {selectedEmployeeCompany && 
           employeeError[selectedEmployeeCompany.id || selectedEmployeeCompany.domain] && (
            <Box sx={{ textAlign: 'center', py: 6 }}>
              {(employeeError[selectedEmployeeCompany.id || selectedEmployeeCompany.domain]?.includes('fetching') || 
                employeeError[selectedEmployeeCompany.id || selectedEmployeeCompany.domain]?.includes('Apollo')) && (
                <CircularProgress size={60} sx={{ mb: 2 }} />
              )}
              <Typography variant="h6" color="text.secondary" fontWeight="600" gutterBottom>
                {employeeError[selectedEmployeeCompany.id || selectedEmployeeCompany.domain]?.includes('fetching') || 
                 employeeError[selectedEmployeeCompany.id || selectedEmployeeCompany.domain]?.includes('Apollo')
                  ? 'Fetching from Apollo API...'
                  : 'Error Loading Employees'}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1, maxWidth: '500px', mx: 'auto' }}>
                {employeeError[selectedEmployeeCompany.id || selectedEmployeeCompany.domain]}
              </Typography>
            </Box>
          )}
          
          {/* Loading State (only show if no error message or error is not Apollo fetching) */}
          {selectedEmployeeCompany && 
           employeeLoading[selectedEmployeeCompany.id || selectedEmployeeCompany.domain] &&
           !employeeError[selectedEmployeeCompany.id || selectedEmployeeCompany.domain] && (
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <CircularProgress size={60} sx={{ mb: 2 }} />
              <Typography variant="h6" color="text.secondary">
                Loading employees...
              </Typography>
            </Box>
          )}
          
          {/* No Employees Message */}
          {selectedEmployeeCompany && 
           !employeeLoading[selectedEmployeeCompany.id || selectedEmployeeCompany.domain] &&
           !employeeError[selectedEmployeeCompany.id || selectedEmployeeCompany.domain] &&
           (!fetchedEmployeeData[selectedEmployeeCompany.id || selectedEmployeeCompany.domain] || 
            filterEmployeesByRole(fetchedEmployeeData[selectedEmployeeCompany.id || selectedEmployeeCompany.domain], employeeRoleFilter)?.length === 0) && (
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <People sx={{ fontSize: 80, color: 'text.secondary', mb: 2, opacity: 0.5 }} />
              <Typography variant="h5" color="text.secondary" fontWeight="600" gutterBottom>
                {employeeRoleFilter !== 'all' 
                  ? `No ${employeeRoleFilter} employees found` 
                  : 'No employees found'}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                This company doesn't have any employees in the database.
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button 
            onClick={() => {
              setEmployeeDialogOpen(false);
              setEmployeeRoleFilter('all'); // Reset filter when closing
            }} 
            variant="contained"
            sx={{
              background: '#0b1957',
              color: '#ffffff',
              borderRadius: '20px',
              '&:hover': {
                background: '#0d1f6f',
              }
            }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Employee Detail Dialog */}
      <Dialog
        open={employeeDetailDialogOpen}
        onClose={() => {
          setEmployeeDetailDialogOpen(false);
          setSelectedEmployee(null);
        }}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: '#ffffff',
            borderRadius: '20px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)'
          }
        }}
      >
        <DialogContent sx={{ p: 0 }}>
          {selectedEmployee && (
            <Card 
              sx={{
                background: '#ffffff',
                borderRadius: '20px',
                border: '1px solid oklch(0.922 0 0)',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                overflow: 'hidden',
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ 
                  display: 'flex', 
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 1.5,
                  width: '100%'
                }}>
                  {/* Employee Photo */}
                  <Avatar 
                    src={selectedEmployee.photo_url}
                    alt={selectedEmployee.name}
                    sx={{ 
                      width: 90,
                      height: 90,
                      border: '4px solid',
                      borderColor: '#0b1957',
                      boxShadow: 2,
                      flexShrink: 0
                    }}
                  >
                    <Person sx={{ fontSize: 50 }} />
                  </Avatar>
                  
                  {/* Employee Name */}
                  <Typography variant="h6" align="center" sx={{ 
                    fontWeight: 'bold', 
                    fontSize: '1.1rem',
                    color: '#0b1957',
                    mt: 1
                  }}>
                    {selectedEmployee.name || 'Unknown'}
                  </Typography>
                  
                  {/* Employee Title/Role */}
                  <Chip 
                    label={selectedEmployee.title || 'No Title'} 
                    size="medium"
                    sx={{ 
                      maxWidth: '100%',
                      fontWeight: 'bold',
                      fontSize: '0.85rem',
                      bgcolor: '#0b1957',
                      color: '#ffffff'
                    }}
                  />

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
                      <Box 
                        onClick={(e) => {
                          e.stopPropagation();
                          if (empCompany) {
                            handleViewDetails(empCompany);
                            setEmployeeDetailDialogOpen(false);
                          }
                        }}
                        sx={{ 
                          bgcolor: 'oklch(0.97 0 0)', 
                          px: 2, 
                          py: 0.5, 
                          borderRadius: 1,
                          width: '100%',
                          textAlign: 'center',
                          cursor: empCompany ? 'pointer' : 'default',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 1,
                          transition: 'all 0.2s ease',
                          border: '1px solid oklch(0.922 0 0)',
                          '&:hover': {
                            bgcolor: empCompany ? 'oklch(0.97 0 0)' : 'oklch(0.97 0 0)',
                            borderColor: empCompany ? '#0b1957' : 'oklch(0.922 0 0)',
                            transform: empCompany ? 'scale(1.02)' : 'none'
                          }
                        }}
                      >
                        {empCompanyLogo && (
                          <Avatar 
                            src={empCompanyLogo}
                            sx={{ width: 20, height: 20, flexShrink: 0 }}
                          >
                            <Business sx={{ fontSize: 12 }} />
                          </Avatar>
                        )}
                        <Typography variant="caption" sx={{ fontWeight: 600, color: '#0b1957', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          @ {empCompanyName}
                        </Typography>
                      </Box>
                    );
                  })()}

                  {/* Divider */}
                  <Box sx={{ width: '100%', height: '1px', bgcolor: 'oklch(0.922 0 0)', my: 1.5 }} />
                  
                  {/* Contact Details List */}
                  <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    {/* Location */}
                    {(selectedEmployee.city || selectedEmployee.country) && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <LocationOn sx={{ fontSize: 18, color: '#0b1957' }} />
                        <Typography variant="caption" sx={{ 
                          color: 'oklch(0.145 0 0)',
                          fontSize: '0.8rem',
                          flex: 1,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {[selectedEmployee.city, selectedEmployee.state, selectedEmployee.country].filter(Boolean).join(', ')}
                        </Typography>
                      </Box>
                    )}
                    
                    {/* LinkedIn */}
                    {selectedEmployee.linkedin_url && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <LinkedInIcon sx={{ fontSize: 18, color: '#0077b5' }} />
                        <Link
                          href={selectedEmployee.linkedin_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          sx={{ 
                            color: '#0077b5',
                            fontSize: '0.8rem',
                            textDecoration: 'none',
                            '&:hover': { textDecoration: 'underline' },
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            flex: 1
                          }}
                        >
                          View LinkedIn Profile
                        </Link>
                      </Box>
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
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box sx={{ 
                            bgcolor: '#0b1957', 
                            borderRadius: '50%', 
                            p: 0.5,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            <Phone sx={{ fontSize: 16, color: 'white' }} />
                          </Box>
                          <Typography variant="caption" sx={{ 
                            color: hasPhone ? '#0b1957' : (phoneNotFound ? '#d32f2f' : 'oklch(0.556 0 0)'),
                            fontSize: '0.8rem',
                            letterSpacing: hasPhone ? 'normal' : '1px',
                            filter: hasPhone || phoneNotFound ? 'none' : 'blur(4px)',
                            userSelect: hasPhone ? 'text' : 'none',
                            flex: 1,
                            fontWeight: hasPhone || phoneNotFound ? 600 : 400,
                            fontStyle: phoneNotFound ? 'italic' : 'normal'
                          }}>
                            {displayPhone}
                          </Typography>
                          <Tooltip title={hasPhone ? "Phone number revealed" : phoneNotFound ? "Phone number not available" : "Click to reveal phone number"} arrow>
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRevealPhone(selectedEmployee);
                              }}
                              disabled={empRevealing?.phone || hasPhone}
                              sx={{ 
                                bgcolor: 'oklch(0.97 0 0)',
                                border: '1px solid oklch(0.922 0 0)',
                                '&:hover': { bgcolor: 'oklch(0.97 0 0)', borderColor: '#0b1957' },
                                p: 0.5
                              }}
                            >
                              {empRevealing?.phone ? (
                                <CircularProgress size={20} sx={{ color: '#0b1957' }} />
                              ) : hasPhone ? (
                                <CheckCircle sx={{ fontSize: 20, color: '#0b1957' }} />
                              ) : (
                                <Lock sx={{ fontSize: 20, color: '#0b1957' }} />
                              )}
                            </IconButton>
                          </Tooltip>
                        </Box>
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
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box sx={{ 
                            bgcolor: '#0b1957', 
                            borderRadius: '50%', 
                            p: 0.5,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            <Email sx={{ fontSize: 16, color: 'white' }} />
                          </Box>
                          <Typography variant="caption" sx={{ 
                            color: hasEmail ? '#0b1957' : (emailNotFound ? '#d32f2f' : 'oklch(0.556 0 0)'),
                            fontSize: '0.8rem',
                            letterSpacing: hasEmail ? 'normal' : '1px',
                            filter: hasEmail || emailNotFound ? 'none' : 'blur(4px)',
                            userSelect: hasEmail ? 'text' : 'none',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            flex: 1,
                            fontWeight: hasEmail || emailNotFound ? 600 : 400,
                            fontStyle: emailNotFound ? 'italic' : 'normal'
                          }}>
                            {displayEmail}
                          </Typography>
                          <Tooltip title={hasEmail ? "Email address revealed" : emailNotFound ? "Email address not available" : "Click to reveal email address"} arrow>
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRevealEmail(selectedEmployee);
                              }}
                              disabled={empRevealing?.email || hasEmail}
                              sx={{ 
                                bgcolor: 'oklch(0.97 0 0)',
                                border: '1px solid oklch(0.922 0 0)',
                                '&:hover': { bgcolor: 'oklch(0.97 0 0)', borderColor: '#0b1957' },
                                p: 0.5
                              }}
                            >
                              {empRevealing?.email ? (
                                <CircularProgress size={20} sx={{ color: '#0b1957' }} />
                              ) : hasEmail ? (
                                <CheckCircle sx={{ fontSize: 20, color: '#0b1957' }} />
                              ) : (
                                <Lock sx={{ fontSize: 20, color: '#0b1957' }} />
                              )}
                            </IconButton>
                          </Tooltip>
                        </Box>
                      );
                    })()}
                  </Box>
                </Box>
              </CardContent>
            </Card>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button 
            onClick={() => {
              setEmployeeDetailDialogOpen(false);
              setSelectedEmployee(null);
            }} 
            variant="contained"
            sx={{
              background: '#0b1957',
              color: '#ffffff',
              borderRadius: '20px',
              '&:hover': {
                background: '#0d1f6f',
              }
            }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
