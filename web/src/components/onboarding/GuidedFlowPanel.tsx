"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { useOnboardingStore } from '@/store/onboardingStore';
import { Box, Typography, Chip, TextField, Button, Stack, FormControl, InputLabel, Select, MenuItem, Checkbox, FormControlLabel, Autocomplete, Slider, Switch, Card, CardContent, CircularProgress, Alert, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { CheckCircle2, ArrowRight, Building2, Briefcase, MapPin, Users, Smartphone, MessageSquare, Phone, Linkedin, Mail, Zap, Calendar, TrendingUp, Shield, AlertTriangle, Loader2 } from 'lucide-react';
import { ICPQuestion, fetchICPQuestions } from '@/features/ai-icp-assistant/api';
import { StepType } from '@/types/campaign';
import StepLayout from './StepLayout';
import { apiPost } from '@/lib/api';
import { useRouter } from 'next/navigation';

// WhatsApp actions with recommended
const WHATSAPP_ACTIONS = [
  { value: 'send_broadcast', label: 'Send broadcast', recommended: true },
  { value: 'send_1to1', label: 'Send 1:1 message', recommended: true },
  { value: 'followup_message', label: 'Follow-up message', recommended: false },
  { value: 'template_message', label: 'Template message', recommended: true },
];

// Email actions with recommended
const EMAIL_ACTIONS = [
  { value: 'send_email', label: 'Send email', recommended: true },
  { value: 'followup_email', label: 'Follow-up email', recommended: true },
];

// Voice actions with recommended
const VOICE_ACTIONS = [
  { value: 'call', label: 'Call', recommended: true },
  { value: 'leave_voicemail', label: 'Leave voicemail', recommended: false },
];
// Helper to render actions with auto-select and badge
interface Action {
  value: string;
  label: string;
  recommended?: boolean;
}
interface RenderActionsProps {
  actions: Action[];
  answersKey: string;
  answers: Record<string, any>;
  setAnswers: (answers: Record<string, any>) => void;
  validationErrors: Record<string, boolean>;
  setValidationErrors: (errors: Record<string, boolean>) => void;
}
function RenderActions({ actions, answersKey, answers, setAnswers, validationErrors, setValidationErrors }: RenderActionsProps) {
  return (
    <Stack spacing={2}>
      {actions.map((action: Action) => (
        <FormControlLabel
          key={action.value}
          control={
            <Checkbox
              checked={answers[answersKey]?.includes(action.value) || false}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                const current = answers[answersKey] || [];
                let updated;
                if (e.target.checked) {
                  updated = [...current, action.value];
                } else {
                  updated = current.filter((a: string) => a !== action.value);
                }
                setAnswers({ ...answers, [answersKey]: updated });
                if (validationErrors[answersKey] && updated.length > 0) {
                  setValidationErrors({ ...validationErrors, [answersKey]: false });
                }
              }}
            />
          }
          label={
            <span>
              {action.label}
              {action.recommended && (
                <span style={{
                  marginLeft: 8,
                  background: '#E0F2FE',
                  color: '#0284C7',
                  borderRadius: 6,
                  fontSize: 12,
                  padding: '2px 8px',
                  fontWeight: 500,
                  verticalAlign: 'middle',
                }}>
                  Recommended
                </span>
              )}
            </span>
          }
        />
      ))}
    </Stack>
  );
}


type GuidedStep = 
  | 'icp_questions'
  | 'target_definition'
  | 'platform_selection'
  | 'conditions_delays'
  | 'voice_agent'
  | 'campaign_settings'
  | 'confirmation';

interface GuidedAnswers {
  // Step 1: ICP Questions - Section 1: Past Success
  bestCustomers?: string[]; // Top 2-3 best customers
  mostProfitable?: string; // Which brought most profit
  easiestToWorkWith?: string; // Which was easiest to work with
  
  // Step 1: ICP Questions - Section 2: Define Company
  companySize?: string; // What size was the company (10-50, 50-200, 200+)
  valueAlignment?: string; // Did they value service or need convincing (valued/convinced)
  
  // Step 1: ICP Questions - Section 3: Decision Maker
  problemFeeler?: string; // Who felt the problem
  decisionMakers?: string[]; // Decision maker titles/roles
  customTitle?: string; // Custom decision maker title
  
  // Step 1: ICP Questions - Section 4: Buying Trigger
  buyingTrigger?: string; // What situation made them buy (expansion/costs/compliance/manual)
  wouldClone?: boolean; // Would you clone this customer
  companyName?: string; // What's your company name
  
  // Step 2: Target Definition (moved from Step 1)
  industries?: string[];
  customIndustry?: string;
  location?: string; // Single location field instead of separate country/state/city
  roles?: string[];
  customRole?: string;
  
  // Step 3: Platform Selection
  platforms?: string[];
  
  // Step 3: Platform Logic (LinkedIn, WhatsApp, Email, etc.)
  
  // Step 4: Conditions & Delays
  linkedinActions?: string[];
  enableConnectionMessage?: boolean;
  linkedinConnectionMessage?: string;
  linkedinMessage?: string;
  whatsappMessage?: string;
  emailSubject?: string;
  emailMessage?: string;
  
  // Step 5: Voice Agent
  voiceEnabled?: boolean;
  voiceTiming?: 'immediate' | 'after_linkedin' | null;
  voiceAgentId?: string;
  voiceAgentName?: string;
  voiceContext?: string;
  
  // Delay and Condition Configuration (used when delay/condition steps are created)
  delayDays?: number;
  delayHours?: number;
  delayMinutes?: number;
  conditionType?: string; // 'connected', 'replied', 'opened', etc.
  
  // Step 6: Campaign Settings
  campaignDuration?: number; // days
  dailyLeadVolume?: number;
  workingDays?: string[]; // ['monday', 'tuesday', ...]
  smartThrottling?: boolean;
  
  // Step 7: Confirmation (summary)
}

// Industry chips with icons - Show only 4 initially
const INDUSTRY_CHIPS = [
  { label: 'Technology', icon: Zap, color: '#6366F1' },
  { label: 'SaaS', icon: Building2, color: '#8B5CF6' },
  { label: 'Healthcare', icon: Briefcase, color: '#EC4899' },
  { label: 'Finance', icon: Briefcase, color: '#10B981' },
];

// Additional industries for "+More" option
const ADDITIONAL_INDUSTRIES = [
  'Education', 'Retail', 'Manufacturing', 'Real Estate', 'Construction',
  'Legal', 'Marketing', 'Consulting', 'Food & Beverage', 'Transportation',
  'Energy', 'Media', 'Hospitality', 'Telecommunications', 'Automotive',
  'Pharmaceuticals', 'Insurance'
];

const ROLE_CHIPS = [
  'Founder', 'CEO', 'CTO', 'CMO', 'Head of Sales', 'HR Manager', 
  'VP of Marketing', 'VP of Engineering', 'Director of Operations'
];

// Company sizes for ICP questions
const COMPANY_SIZES = [
  { label: '10–50', value: '10-50' },
  { label: '50–200', value: '50-200' },
  { label: '200+', value: '200+' }
];

// Decision maker titles for ICP questions
const DECISION_MAKER_TITLES = [
  { label: 'Founder', value: 'founder' },
  { label: 'C-Level', value: 'c-level' },
  { label: 'VP / Director', value: 'vp-director' },
  { label: 'Manager', value: 'manager' }
];

// B2B buying triggers for ICP questions
const B2B_TRIGGERS = [
  { label: 'Expansion / growth', value: 'expansion' },
  { label: 'High costs / inefficiency', value: 'costs' },
  { label: 'Compliance / deadline', value: 'compliance' },
  { label: 'Manual work / slow process', value: 'manual' }
];

const PLATFORM_OPTIONS = [
  { value: 'linkedin', label: 'LinkedIn', disabled: false },
  { value: 'voice', label: 'Voice Call', disabled: false },
  { value: 'whatsapp', label: 'WhatsApp', disabled: false },
  { value: 'email', label: 'Mail', disabled: false },
  { value: 'instagram', label: 'Instagram', comingSoon: true, disabled: false },
];

// Add recommended property for actions
const LINKEDIN_ACTIONS = [
  { value: 'visit_profile', label: 'Visit profile', recommended: true },
  { value: 'follow_profile', label: 'Follow profile', recommended: false },
  { value: 'send_connection', label: 'Send connection request', recommended: true },
  { value: 'send_message', label: 'Send message (after accepted)', recommended: true },
];

export default function GuidedFlowPanel() {
  const {
    workflowNodes,
    addWorkflowNode,
    workflowEdges,
    addWorkflowEdge,
    setWorkflowPreview,
    setSelectedPlatforms,
    setChannelConnection,
    setHasSelectedOption,
    onboardingMode,
  } = useOnboardingStore();

  // Do not render form-based ICP questions when in CHAT mode
  if (onboardingMode === 'CHAT') {
    return null;
  }

  const [currentStep, setCurrentStep] = useState<GuidedStep>('icp_questions');
  const [answers, setAnswers] = useState<GuidedAnswers>({});
  const [bestCustomersRawText, setBestCustomersRawText] = useState<string>('');
  const [customIndustryInput, setCustomIndustryInput] = useState('');
  const [customRoleInput, setCustomRoleInput] = useState('');
  const [locationTokens, setLocationTokens] = useState<string[]>([]);
  const [locationInput, setLocationInput] = useState('');
  const [customTitleSearchTerm, setCustomTitleSearchTerm] = useState<string>('');
  const [showMoreIndustries, setShowMoreIndustries] = useState<boolean>(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, boolean>>({});
  
  // ICP Questions state (fetched from API)
  const [icpQuestions, setIcpQuestions] = useState<ICPQuestion[]>([]);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(true);
  
  // Campaign settings defaults
  const [campaignName, setCampaignName] = useState<string>('');
  const [campaignDuration, setCampaignDuration] = useState<number>(14);
  const [isCreatingCampaign, setIsCreatingCampaign] = useState<boolean>(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [startImmediately, setStartImmediately] = useState<boolean>(false);
  const router = useRouter();
  const [dailyLeadVolume, setDailyLeadVolume] = useState<number>(25);
  const [workingDays, setWorkingDays] = useState<string[]>(['monday', 'tuesday', 'wednesday', 'thursday', 'friday']);
  const [smartThrottling, setSmartThrottling] = useState<boolean>(true);
  const [customDuration, setCustomDuration] = useState<string>('');
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
  const [dailyMaxConnections, setDailyMaxConnections] = useState<number>(50);
  const [randomizedDelays, setRandomizedDelays] = useState<boolean>(true);
  const [autoPauseOnWarning, setAutoPauseOnWarning] = useState<boolean>(true);
  const [timeWindowStart, setTimeWindowStart] = useState<string>('09:00');
  const [timeWindowEnd, setTimeWindowEnd] = useState<string>('18:00');
  
  // Voice Agent configuration defaults
  const [voiceAgentId, setVoiceAgentId] = useState<string>('24');
  const [voiceAgentName, setVoiceAgentName] = useState<string>('VAPI Agent');
  const [voiceContext, setVoiceContext] = useState<string>('');
  
  // LinkedIn message configuration defaults
  const [enableConnectionMessage, setEnableConnectionMessage] = useState<boolean>(true);
  const [linkedinConnectionMessage, setLinkedinConnectionMessage] = useState<string>('Hi {{first_name}}, I\'d like to connect with you.');
  const [linkedinMessage, setLinkedinMessage] = useState<string>('Hi {{first_name}}, I noticed your work in {{company}} and thought you might be interested in...');
  
  // Delay and Condition configuration defaults
  const [delayDays, setDelayDays] = useState<number>(1);
  const [delayHours, setDelayHours] = useState<number>(0);
  const [delayMinutes, setDelayMinutes] = useState<number>(0);
  const [conditionType, setConditionType] = useState<string>('connected');

  // Step configuration
  const stepConfig = {
    icp_questions: { number: 1, title: 'ICP Questions' },
    target_definition: { number: 2, title: 'Target Definition' },
    platform_selection: { number: 3, title: 'Platform Selection' },
    conditions_delays: { number: 4, title: 'Conditions & Delays' },
    voice_agent: { number: 5, title: 'Voice Agent' },
    campaign_settings: { number: 6, title: 'Campaign Settings' },
    confirmation: { number: 7, title: 'Confirmation' },
  };

  const totalSteps = 7;
  const currentStepNumber = (stepConfig as Record<GuidedStep, { number: number; title: string }>)[currentStep].number;
  const currentStepTitle = (stepConfig as Record<GuidedStep, { number: number; title: string }>)[currentStep].title;

  // Fetch ICP questions from API on mount
  useEffect(() => {
    const loadQuestions = async () => {
      try {
        setIsLoadingQuestions(true);
        const response = await fetchICPQuestions('lead_generation');
        if (response.success) {
          setIcpQuestions(response.questions);
        }
      } catch (error) {
        console.error('[GuidedFlowPanel] Error loading ICP questions:', error);
      } finally {
        setIsLoadingQuestions(false);
      }
    };

    loadQuestions();
  }, []);

  // Clear workflow preview on component mount (page refresh)
  useEffect(() => {
    console.log('[GuidedFlowPanel] Component mounted - clearing workflow preview');
    setWorkflowPreview([]);
    useOnboardingStore.setState({ workflowNodes: [], workflowEdges: [] });
  }, []); // Empty dependency array = runs once on mount

  // Helper function to get question by intent key
  const getQuestionByIntent = (intentKey: string): ICPQuestion | null => {
    return icpQuestions.find(q => q.intentKey === intentKey) || null;
  };

  // Location suggestions for autocomplete
  const locationSuggestions = [
    'United States', 'United Kingdom', 'Canada', 'Australia', 'Germany', 'France', 'India',
    'California', 'New York', 'Texas', 'London', 'San Francisco', 'New York City', 'Los Angeles', 'Chicago',
  ];

  const buildLeadQuery = (): string => {
    const parts: string[] = [];
    if (answers.roles && answers.roles.length > 0) {
      parts.push(answers.roles.join(' OR '));
    }
    if (answers.industries && answers.industries.length > 0) {
      parts.push(answers.industries.join(' OR '));
    }
    return parts.join(' AND ') || 'Target leads';
  };

  const buildLeadFilters = (): Record<string, any> => {
    // Check if we have mapped ICP answers from chat onboarding
    const icpAnswers = useOnboardingStore.getState().icpAnswers;
    const sourceAnswers = icpAnswers || answers;
    
    const filters: Record<string, any> = {};
    
    // Map to Apollo API parameter names: person_titles, organization_industries, organization_locations
    if (sourceAnswers.roles && sourceAnswers.roles.length > 0) {
      filters.person_titles = sourceAnswers.roles; // Apollo expects 'person_titles'
    }
    if (sourceAnswers.industries && sourceAnswers.industries.length > 0) {
      // Filter out any incomplete/single-character industry entries
      // Keep only entries that are at least 2 characters and not just partial words
      const validIndustries = sourceAnswers.industries.filter((industry: string) => {
        const trimmed = String(industry).trim();
        return trimmed.length >= 2 && !trimmed.match(/^[a-z]$/i); // At least 2 chars and not just a single letter
      });
      if (validIndustries.length > 0) {
        filters.organization_industries = validIndustries; // Apollo expects 'organization_industries'
      }
    }
    if (sourceAnswers.location) {
      filters.organization_locations = Array.isArray(sourceAnswers.location) ? sourceAnswers.location : [sourceAnswers.location]; // Apollo expects 'organization_locations' as array
    }
    return filters;
  };

  const getChannelForStep = (stepType: string): 'linkedin' | 'email' | 'whatsapp' | 'voice' | 'instagram' | undefined => {
    if (stepType.startsWith('linkedin_')) return 'linkedin';
    if (stepType.startsWith('email_')) return 'email';
    if (stepType.startsWith('whatsapp_')) return 'whatsapp';
    if (stepType.startsWith('voice_')) return 'voice';
    if (stepType.startsWith('instagram_')) return 'instagram';
    return undefined;
  };

  const buildLinkedInSteps = (startNodeId: string, nodes: any[], edges: any[]): { lastNodeId: string } => {
    let currentNodeId = startNodeId;

    if (!answers.linkedinActions || answers.linkedinActions.length === 0) {
      return { lastNodeId: currentNodeId };
    }

    // Visit profile
    if (answers.linkedinActions.includes('visit_profile')) {
      const nodeId = `linkedin_visit_${Date.now()}`;
      nodes.push({
        id: nodeId,
        type: 'linkedin_visit',
        position: { x: 50, y: nodes.length * 120 + 150 },
        data: { title: 'Visit LinkedIn Profile' },
      });
      edges.push({
        id: `edge-${currentNodeId}-${nodeId}`,
        source: currentNodeId,
        target: nodeId,
      });
      currentNodeId = nodeId;
    }

    // Follow profile
    if (answers.linkedinActions.includes('follow_profile')) {
      const nodeId = `linkedin_follow_${Date.now()}`;
      nodes.push({
        id: nodeId,
        type: 'linkedin_follow',
        position: { x: 50, y: nodes.length * 120 + 150 },
        data: { title: 'Follow LinkedIn Profile' },
      });
      edges.push({
        id: `edge-${currentNodeId}-${nodeId}`,
        source: currentNodeId,
        target: nodeId,
      });
      currentNodeId = nodeId;
    }

    // Send connection
    if (answers.linkedinActions.includes('send_connection')) {
      // Use user-configured connection message (from Step 4) - only if enabled
      const userEnableConnectionMessage = answers.enableConnectionMessage !== undefined ? answers.enableConnectionMessage : enableConnectionMessage;
      const userConnectionMessage = userEnableConnectionMessage 
        ? (answers.linkedinConnectionMessage || linkedinConnectionMessage || 'Hi {{first_name}}, I\'d like to connect with you.')
        : '';
      
      const nodeId = `linkedin_connect_${Date.now()}`;
      nodes.push({
        id: nodeId,
        type: 'linkedin_connect',
        position: { x: 50, y: nodes.length * 120 + 150 },
        data: { 
          title: 'Send Connection Request',
          message: userConnectionMessage || undefined,
        },
      });
      edges.push({
        id: `edge-${currentNodeId}-${nodeId}`,
        source: currentNodeId,
        target: nodeId,
      });
      currentNodeId = nodeId;

      // Add delay before message if message is selected
      if (answers.linkedinActions.includes('send_message')) {
        // Use user-configured delay values (from Step 4)
        const userDelayDays = answers.delayDays !== undefined ? answers.delayDays : delayDays;
        const userDelayHours = answers.delayHours !== undefined ? answers.delayHours : delayHours;
        const userDelayMinutes = answers.delayMinutes !== undefined ? answers.delayMinutes : delayMinutes;
        
        const delayNodeId = `delay_linkedin_${Date.now()}`;
        nodes.push({
          id: delayNodeId,
          type: 'delay',
          position: { x: 50, y: nodes.length * 120 + 150 },
          data: {
            title: `Wait ${userDelayDays}d ${userDelayHours}h ${userDelayMinutes}m`,
            delayDays: userDelayDays,
            delayHours: userDelayHours,
            delayMinutes: userDelayMinutes,
          },
        });
        edges.push({
          id: `edge-${currentNodeId}-${delayNodeId}`,
          source: currentNodeId,
          target: delayNodeId,
        });

        // Add condition: use user-configured condition type (from Step 4)
        const userConditionType = answers.conditionType || conditionType;
        const conditionNodeId = `condition_linkedin_${Date.now()}`;
        const conditionLabels: Record<string, string> = {
          'connected': 'LinkedIn Connection Accepted',
          'linkedin_replied': 'LinkedIn Message Replied',
          'email_opened': 'Email Opened',
          'email_replied': 'Email Replied',
          'whatsapp_replied': 'WhatsApp Message Replied',
        };
        const conditionLabel = conditionLabels[userConditionType] || `If ${userConditionType}`;
        nodes.push({
          id: conditionNodeId,
          type: 'condition',
          position: { x: 50, y: nodes.length * 120 + 150 },
          data: {
            title: `Check: ${conditionLabel}`,
            conditionType: userConditionType,
          },
        });
        edges.push({
          id: `edge-${delayNodeId}-${conditionNodeId}`,
          source: delayNodeId,
          target: conditionNodeId,
        });

        // Use user-configured LinkedIn message (from Step 4)
        const userLinkedinMessage = answers.linkedinMessage || linkedinMessage || 'Hi {{first_name}}, I noticed your work in {{company}} and thought you might be interested in...';
        
        const messageNodeId = `linkedin_message_${Date.now()}`;
        nodes.push({
          id: messageNodeId,
          type: 'linkedin_message',
          position: { x: 50, y: nodes.length * 120 + 150 },
          data: {
            title: 'Send LinkedIn Message',
            message: userLinkedinMessage,
          },
        });
        
        // TRUE branch: condition met -> proceed to message
        edges.push({
          id: `edge-${conditionNodeId}-${messageNodeId}-true`,
          source: conditionNodeId,
          sourceHandle: 'true',
          target: messageNodeId,
          condition: userConditionType,
          label: '✓ YES',
          labelStyle: { fill: '#10B981', fontWeight: 600, fontSize: '12px' },
          labelBgStyle: { fill: '#D1FAE5', fillOpacity: 0.8 },
        });
        
        // FALSE branch: condition not met -> skip to end
        edges.push({
          id: `edge-${conditionNodeId}-end-false`,
          source: conditionNodeId,
          sourceHandle: 'false',
          target: 'end',
          condition: null,
          label: '✗ NO',
          labelStyle: { fill: '#EF4444', fontWeight: 600, fontSize: '12px' },
          labelBgStyle: { fill: '#FEE2E2', fillOpacity: 0.8 },
        });
        
        currentNodeId = messageNodeId;
      }
    } else if (answers.linkedinActions.includes('send_message')) {
      // Message without connection - not allowed, but handle gracefully
      // In real implementation, this should be prevented in UI
    }

    return { lastNodeId: currentNodeId };
  };

  const generateWorkflowFromAnswers = useCallback(() => {
    const nodes: any[] = [];
    const edges: any[] = [];
    let lastNodeId = 'start';

    // Check if we have mapped ICP answers from chat onboarding
    const icpAnswers = useOnboardingStore.getState().icpAnswers;
    const sourceAnswers = icpAnswers || answers;

    // Add lead generation step if we have target criteria
    // Check if industries array has items, location string is not empty, roles array has items, or customIndustry exists
    const hasIndustries = sourceAnswers.industries && Array.isArray(sourceAnswers.industries) && sourceAnswers.industries.length > 0;
    const hasLocation = sourceAnswers.location && String(sourceAnswers.location).trim().length > 0;
    const hasRoles = sourceAnswers.roles && Array.isArray(sourceAnswers.roles) && sourceAnswers.roles.length > 0;
    const hasCustomIndustry = sourceAnswers.customIndustry && String(sourceAnswers.customIndustry).trim().length > 0;
    
    if (hasIndustries || hasLocation || hasRoles || hasCustomIndustry) {
      // Use dailyLeadVolume from state (set in Step 6: Campaign Settings) or from answers, or default to 25
      const leadsPerDay = dailyLeadVolume || sourceAnswers.leads_per_day || answers.dailyLeadVolume || 25;
      
      nodes.push({
        id: 'lead_gen_1',
        type: 'lead_generation',
        position: { x: 50, y: 150 },
        data: {
          title: 'Generate Leads',
          leadGenerationQuery: buildLeadQuery(),
          leadGenerationFilters: JSON.stringify(buildLeadFilters()),
          leadGenerationLimit: leadsPerDay,
        },
      });
      edges.push({
        id: 'edge-start-lead_gen',
        source: 'start',
        target: 'lead_gen_1',
      });
      lastNodeId = 'lead_gen_1';
    }

    // Add LinkedIn steps if LinkedIn is selected (check both source answers and form answers)
    const platforms = sourceAnswers.platforms || answers.platforms || [];
    if (platforms.includes('linkedin') || platforms.some((p: string) => String(p).toLowerCase().includes('linkedin'))) {
      const linkedinSteps = buildLinkedInSteps(lastNodeId, nodes, edges);
      if (linkedinSteps.lastNodeId) {
        lastNodeId = linkedinSteps.lastNodeId;
      }
    }

    // Add Email step if email is selected
    if (platforms.includes('email') || platforms.some((p: string) => String(p).toLowerCase().includes('email'))) {
      const emailNodeId = `email_${Date.now()}`;
      nodes.push({
        id: emailNodeId,
        type: 'email_send',
        position: { x: 50, y: nodes.length * 120 + 150 },
        data: {
          title: 'Send Email',
          subject: 'Reaching out',
          body: 'Hi {{name}}, I noticed...',
        },
      });
      
      // Add delay before email if LinkedIn connection exists
      // Use user-configured delay values (from Step 4)
      if (answers.linkedinActions?.includes('send_connection')) {
        const userDelayDays = answers.delayDays !== undefined ? answers.delayDays : delayDays;
        const userDelayHours = answers.delayHours !== undefined ? answers.delayHours : delayHours;
        const userDelayMinutes = answers.delayMinutes !== undefined ? answers.delayMinutes : delayMinutes;
        
        const delayNodeId = `delay_${Date.now()}`;
        nodes.push({
          id: delayNodeId,
          type: 'delay',
          position: { x: 50, y: nodes.length * 120 + 150 },
          data: {
            title: `Wait ${userDelayDays}d ${userDelayHours}h ${userDelayMinutes}m`,
            delayDays: userDelayDays,
            delayHours: userDelayHours,
            delayMinutes: userDelayMinutes,
          },
        });
        edges.push({
          id: `edge-${lastNodeId}-${delayNodeId}`,
          source: lastNodeId,
          target: delayNodeId,
        });
        edges.push({
          id: `edge-${delayNodeId}-${emailNodeId}`,
          source: delayNodeId,
          target: emailNodeId,
        });
        lastNodeId = emailNodeId;
      } else {
        edges.push({
          id: `edge-${lastNodeId}-${emailNodeId}`,
          source: lastNodeId,
          target: emailNodeId,
        });
        lastNodeId = emailNodeId;
      }
    }

    // Add Voice Agent step if voice is selected (voiceEnabled defaults to true if voice platform is selected)
    if (answers.platforms?.includes('voice')) {
      // If voiceEnabled is not explicitly set but voice platform is selected, default to enabled
      const shouldEnableVoice = answers.voiceEnabled !== false;
      
      if (shouldEnableVoice) {
        // Use user-configured voice agent values (from Step 5)
        const userVoiceAgentId = answers.voiceAgentId || voiceAgentId || '24';
        const userVoiceAgentName = answers.voiceAgentName || voiceAgentName || 'VAPI Agent';
        const userVoiceContext = answers.voiceContext || voiceContext || '';
        
        if (!userVoiceContext || userVoiceContext.trim() === '') {
          console.warn('[Workflow Generation] Voice agent context is missing, using default');
        }
        
        const voiceNodeId = `voice_${Date.now()}`;
        nodes.push({
          id: voiceNodeId,
          type: 'voice_agent_call',
          position: { x: 50, y: nodes.length * 120 + 150 },
          data: {
            title: `AI Voice Call - ${userVoiceAgentName}`,
            voiceAgentId: userVoiceAgentId,
            voiceAgentName: userVoiceAgentName,
            voiceContext: userVoiceContext || 'General follow-up call', // Fallback if empty
          },
        });

        // Add delay or condition based on voice timing
        // Use user-configured condition type (from Step 4)
        if (answers.voiceTiming === 'after_linkedin' && answers.linkedinActions?.includes('send_connection')) {
          const userConditionType = answers.conditionType || conditionType;
          const conditionNodeId = `condition_${Date.now()}`;
          const conditionLabels: Record<string, string> = {
            'connected': 'LinkedIn Connection Accepted',
            'linkedin_replied': 'LinkedIn Message Replied',
            'email_opened': 'Email Opened',
            'email_replied': 'Email Replied',
            'whatsapp_replied': 'WhatsApp Message Replied',
          };
          const conditionLabel = conditionLabels[userConditionType] || `If ${userConditionType}`;
          nodes.push({
            id: conditionNodeId,
            type: 'condition',
            position: { x: 50, y: nodes.length * 120 + 150 },
            data: {
              title: `Check: ${conditionLabel}`,
              conditionType: userConditionType,
            },
          });
          edges.push({
            id: `edge-${lastNodeId}-${conditionNodeId}`,
            source: lastNodeId,
            target: conditionNodeId,
          });
          
          // TRUE branch: condition met -> proceed to voice call
          edges.push({
            id: `edge-${conditionNodeId}-${voiceNodeId}-true`,
            source: conditionNodeId,
            sourceHandle: 'true',
            target: voiceNodeId,
            condition: userConditionType,
            label: '✓ YES',
            labelStyle: { fill: '#10B981', fontWeight: 600, fontSize: '12px' },
            labelBgStyle: { fill: '#D1FAE5', fillOpacity: 0.8 },
          });
          
          // FALSE branch: condition not met -> skip to end
          edges.push({
            id: `edge-${conditionNodeId}-end-false`,
            source: conditionNodeId,
            sourceHandle: 'false',
            target: 'end',
            condition: null,
            label: '✗ NO',
            labelStyle: { fill: '#EF4444', fontWeight: 600, fontSize: '12px' },
            labelBgStyle: { fill: '#FEE2E2', fillOpacity: 0.8 },
          });
        } else {
          edges.push({
            id: `edge-${lastNodeId}-${voiceNodeId}`,
            source: lastNodeId,
            target: voiceNodeId,
          });
        }
        lastNodeId = voiceNodeId;
      }
    }

    // Add end node
    nodes.push({
      id: 'end',
      type: 'end',
      position: { x: 50, y: nodes.length * 120 + 150 },
      data: { title: 'End' },
    });
    edges.push({
      id: `edge-${lastNodeId}-end`,
      source: lastNodeId,
      target: 'end',
    });

    // Update workflow preview
    const previewSteps = nodes
      .filter(n => n.type !== 'start' && n.type !== 'end')
      .map(n => ({
        id: n.id,
        type: n.type as StepType,
        title: n.data.title,
        description: n.data.description || '',
        channel: getChannelForStep(n.type),
      }));

    console.log('[GuidedFlowPanel] Generated preview steps:', previewSteps);
    console.log('[GuidedFlowPanel] Calling setWorkflowPreview with', previewSteps.length, 'steps');
    setWorkflowPreview(previewSteps);
    
    // Verify it was set
    setTimeout(() => {
      const currentPreview = useOnboardingStore.getState().workflowPreview;
      console.log('[GuidedFlowPanel] Workflow preview in store after set:', currentPreview);
    }, 100);

    // Update workflow nodes in store for WorkflowPreviewPanel
    // Clear existing nodes first
    useOnboardingStore.setState({ workflowNodes: [], workflowEdges: [] });
    
    // Add new nodes (excluding start/end as they're handled by preview)
    const nodesToAdd = nodes.filter(n => n.type !== 'start' && n.type !== 'end');
    
    // Add all nodes
    nodesToAdd.forEach(node => {
      addWorkflowNode(node);
    });

    // Add edges
    edges.forEach(edge => {
      addWorkflowEdge({
        id: edge.id,
        source: edge.source,
        sourceHandle: edge.sourceHandle || null,
        target: edge.target,
        condition: edge.condition || null,
        label: edge.label || null,
        labelStyle: edge.labelStyle || null,
        labelBgStyle: edge.labelBgStyle || null,
      });
    });
  }, [answers, dailyLeadVolume, setWorkflowPreview, addWorkflowNode, addWorkflowEdge, buildLeadQuery, buildLeadFilters, buildLinkedInSteps, getChannelForStep]);

  // Only generate workflow when reaching confirmation step
  useEffect(() => {
    if (currentStep === 'confirmation') {
      console.log('[GuidedFlowPanel] Confirmation step reached - generating workflow preview');
      console.log('[GuidedFlowPanel] Current answers:', answers);
      console.log('[GuidedFlowPanel] Campaign settings:', { campaignName, campaignDuration, dailyLeadVolume, workingDays });
      generateWorkflowFromAnswers();
    } else {
      // Clear workflow preview and nodes for other steps
      // Only clear if there's something to clear to avoid infinite loops
      const currentPreview = useOnboardingStore.getState().workflowPreview;
      if (currentPreview.length > 0) {
        setWorkflowPreview([]);
        useOnboardingStore.setState({ workflowNodes: [], workflowEdges: [] });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep]); // Only depend on currentStep to prevent infinite loops - generateWorkflowFromAnswers uses answers from closure

  const handleStepComplete = () => {
    // Validate current step before proceeding
    if (!validateStep(currentStep)) {
      return; // Don't proceed if validation fails
    }
    
    const steps: GuidedStep[] = [
      'icp_questions',
      'target_definition',
      'platform_selection',
      'conditions_delays',
      'voice_agent',
      'campaign_settings',
      'confirmation',
    ];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1]);
      setValidationErrors({}); // Clear errors when moving to next step
    }
  };

  const handleBack = () => {
    const steps: GuidedStep[] = [
      'icp_questions',
      'target_definition',
      'platform_selection',
      'conditions_delays',
      'voice_agent',
      'campaign_settings',
      'confirmation',
    ];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1]);
    } else {
      // Step 1 - go back to options
      setHasSelectedOption(false);
    }
  };

  // Validation function for each step
  const validateStep = (step: GuidedStep): boolean => {
    const errors: Record<string, boolean> = {};
    
    if (step === 'icp_questions') {
      // Validate ICP questions - all fields are required
      if (!answers.bestCustomers || answers.bestCustomers.length < 2) errors.bestCustomers = true;
      if (!answers.mostProfitable || answers.mostProfitable.trim().length === 0) errors.mostProfitable = true;
      if (!answers.easiestToWorkWith || answers.easiestToWorkWith.trim().length === 0) errors.easiestToWorkWith = true;
      if (!answers.companySize) errors.companySize = true;
      if (!answers.valueAlignment) errors.valueAlignment = true;
      if (!answers.problemFeeler || answers.problemFeeler.trim().length === 0) errors.problemFeeler = true;
      if (!answers.decisionMakers || answers.decisionMakers.length === 0) errors.decisionMakers = true;
      if (!answers.buyingTrigger) errors.buyingTrigger = true;
      if (answers.wouldClone === undefined) errors.wouldClone = true;
      if (!answers.companyName || answers.companyName.trim().length === 0) errors.companyName = true;
    } else if (step === 'target_definition') {
      // Validate target definition
      if (!answers.industries || answers.industries.length === 0) errors.industries = true;
      if (!answers.roles || answers.roles.length === 0) errors.roles = true;
      if (!answers.location || answers.location.trim().length === 0) errors.location = true;
    } else if (step === 'platform_selection') {
      // At least one platform must be selected
      if (!answers.platforms || answers.platforms.length === 0) errors.platforms = true;
      // LinkedIn actions are required if LinkedIn is selected
      if (answers.platforms?.includes('linkedin') && (!answers.linkedinActions || answers.linkedinActions.length === 0)) {
        errors.linkedinActions = true;
      }
      // WhatsApp message required if WhatsApp is selected
      if (answers.platforms?.includes('whatsapp') && (!answers.whatsappMessage || answers.whatsappMessage.trim().length === 0)) {
        errors.whatsappMessage = true;
      }
      // Email subject and message required if Email is selected
      if (answers.platforms?.includes('email')) {
        if (!answers.emailSubject || answers.emailSubject.trim().length === 0) errors.emailSubject = true;
        if (!answers.emailMessage || answers.emailMessage.trim().length === 0) errors.emailMessage = true;
      }
      // Voice agent config required if voice is selected
      if (answers.platforms?.includes('voice') && answers.voiceEnabled !== false) {
        if (!answers.voiceAgentId) errors.voiceAgentId = true;
        if (!answers.voiceContext || answers.voiceContext.trim().length === 0) errors.voiceContext = true;
      }
    } else if (step === 'voice_agent') {
      // Voice agent config required if voice is selected
      if (answers.platforms?.includes('voice') && answers.voiceEnabled !== false) {
        if (!answers.voiceAgentId) errors.voiceAgentId = true;
        if (!answers.voiceContext || answers.voiceContext.trim().length === 0) errors.voiceContext = true;
      }
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // New Step 1: ICP Questions
  const renderStep1 = () => {
    return (
      <StepLayout
        currentStep={currentStepNumber}
        totalSteps={totalSteps}
        stepTitle={currentStepTitle}
        onBack={handleBack}
        onStepClick={(step) => {
          const steps: GuidedStep[] = [
            'icp_questions',
            'target_definition',
            'platform_selection',
            'conditions_delays',
            'voice_agent',
            'campaign_settings',
            'confirmation',
          ];
          if (step <= steps.length) {
            setCurrentStep(steps[step - 1]);
          }
        }}
      >
        <Box sx={{ maxWidth: '800px', mx: 'auto' }}>
          {/* Best Customers Question */}
          <Box
            sx={{
              mb: 4,
              p: 3,
              bgcolor: '#FAFBFC',
              borderRadius: '12px',
              border: validationErrors.bestCustomers ? '2px solid #EF4444' : '1px solid #E2E8F0',
            }}
          >
            <Typography
              variant="subtitle1"
              sx={{
                mb: 1,
                fontWeight: 600,
                color: '#1E293B',
                fontSize: '15px',
              }}
            >
              {isLoadingQuestions ? 'Loading question...' : (getQuestionByIntent('ideal_customer')?.question || '1. Who are your top 2–3 best customers?')}
            </Typography>
            {getQuestionByIntent('ideal_customer')?.helperText && (
              <Typography
                variant="caption"
                sx={{
                  mb: 2,
                  color: '#64748B',
                  display: 'block',
                  fontSize: '13px',
                  fontStyle: 'italic',
                }}
              >
                {getQuestionByIntent('ideal_customer')?.helperText}
              </Typography>
            )}
            
            <TextField
              fullWidth
              multiline
              rows={3}
              placeholder="Example: Logistics company, Real estate developer, SME retail chain"
              value={bestCustomersRawText || answers.bestCustomers?.join(', ') || ''}
              onChange={(e) => {
                const rawText = e.target.value;
                setBestCustomersRawText(rawText);
                // Parse comma-separated values
                const values = rawText.split(',').map(v => v.trim()).filter(v => v.length > 0);
                setAnswers({ ...answers, bestCustomers: values.length > 0 ? values : undefined });
                // Clear validation error when user starts typing
                if (validationErrors.bestCustomers && values.length >= 2) {
                  setValidationErrors({ ...validationErrors, bestCustomers: false });
                }
              }}
              error={validationErrors.bestCustomers}
              sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: '#FFFFFF',
                  borderRadius: '8px',
                },
              }}
            />
          </Box>

          {/* Most Profitable Question */}
          <Box
            sx={{
              mb: 4,
              p: 3,
              bgcolor: '#FAFBFC',
              borderRadius: '12px',
              border: validationErrors.mostProfitable ? '2px solid #EF4444' : '1px solid #E2E8F0',
            }}
          >
            <Typography
              variant="subtitle1"
              sx={{
                mb: 1,
                fontWeight: 600,
                color: '#1E293B',
                fontSize: '15px',
              }}
            >
              {isLoadingQuestions ? 'Loading question...' : (getQuestionByIntent('profitability')?.question || '2. Which of them brought you the most profit overall?')}
            </Typography>
            {getQuestionByIntent('profitability')?.helperText && (
              <Typography
                variant="caption"
                sx={{
                  mb: 2,
                  color: '#64748B',
                  display: 'block',
                  fontSize: '13px',
                  fontStyle: 'italic',
                }}
              >
                {getQuestionByIntent('profitability')?.helperText}
              </Typography>
            )}
            <Typography
              variant="caption"
              sx={{
                mb: 2,
                color: '#64748B',
                display: 'block',
                fontSize: '13px',
                fontStyle: 'italic',
              }}
            >
              Example: The client with repeat projects, not one-off work
            </Typography>
            
            <TextField
              fullWidth
              placeholder="Enter the most profitable customer"
              value={answers.mostProfitable || ''}
              onChange={(e) => {
                setAnswers({ ...answers, mostProfitable: e.target.value });
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: '#FFFFFF',
                  borderRadius: '8px',
                },
              }}
            />
          </Box>

          {/* Easiest to Work With Question */}
          <Box
            sx={{
              mb: 4,
              p: 3,
              bgcolor: '#FAFBFC',
              borderRadius: '12px',
              border: validationErrors.easiestToWorkWith ? '2px solid #EF4444' : '1px solid #E2E8F0',
            }}
          >
            <Typography
              variant="subtitle1"
              sx={{
                mb: 1,
                fontWeight: 600,
                color: '#1E293B',
                fontSize: '15px',
              }}
            >
              {isLoadingQuestions ? 'Loading question...' : (getQuestionByIntent('work_compatibility')?.question || '3. Which one was the easiest to work with?')}
            </Typography>
            <Typography
              variant="caption"
              sx={{
                mb: 2,
                color: '#64748B',
                display: 'block',
                fontSize: '13px',
                fontStyle: 'italic',
              }}
            >
              Example: Clear decision-maker, paid on time, respected your process
            </Typography>
            
            <TextField
              fullWidth
              placeholder="Enter the easiest customer to work with"
              value={answers.easiestToWorkWith || ''}
              onChange={(e) => {
                setAnswers({ ...answers, easiestToWorkWith: e.target.value });
                // Clear validation error when user starts typing
                if (validationErrors.easiestToWorkWith && e.target.value.trim().length > 0) {
                  setValidationErrors({ ...validationErrors, easiestToWorkWith: false });
                }
              }}
              error={validationErrors.easiestToWorkWith}
              sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: '#FFFFFF',
                  borderRadius: '8px',
                },
              }}
            />
          </Box>

          {/* Section 2: Define Company */}
          
          {/* Question 5: Company Size */}
          <Box
            sx={{
              mb: 4,
              p: 3,
              bgcolor: '#FAFBFC',
              borderRadius: '12px',
              border: validationErrors.companySize ? '2px solid #EF4444' : '1px solid #E2E8F0',
            }}
          >
            <Typography
              variant="subtitle1"
              sx={{
                mb: 1,
                fontWeight: 600,
                color: '#1E293B',
                fontSize: '15px',
              }}
            >
              5. What size was the company?
            </Typography>
            <Typography
              variant="caption"
              sx={{
                mb: 3,
                color: '#64748B',
                display: 'block',
                fontSize: '13px',
                fontStyle: 'italic',
              }}
            >
              Example: 10–50 employees, 50–200 employees
            </Typography>
            
            <Stack direction="row" spacing={2}>
              {COMPANY_SIZES.map((size) => (
                <Button
                  key={size.value}
                  variant={answers.companySize === size.value ? 'contained' : 'outlined'}
                  onClick={() => {
                    setAnswers({ ...answers, companySize: size.value });
                    if (validationErrors.companySize) {
                      setValidationErrors({ ...validationErrors, companySize: false });
                    }
                  }}
                  sx={{
                    flex: 1,
                    bgcolor: answers.companySize === size.value ? '#6366F1' : '#FFFFFF',
                    color: answers.companySize === size.value ? '#FFFFFF' : '#1E293B',
                    borderColor: '#E2E8F0',
                    '&:hover': {
                      bgcolor: answers.companySize === size.value ? '#4F46E5' : '#F1F5F9',
                      borderColor: answers.companySize === size.value ? '#4F46E5' : '#CBD5E1',
                    },
                  }}
                >
                  {size.label}
                </Button>
              ))}
            </Stack>
          </Box>

          {/* Question 6: Value Alignment */}
          <Box
            sx={{
              mb: 4,
              p: 3,
              bgcolor: '#FAFBFC',
              borderRadius: '12px',
              border: validationErrors.valueAlignment ? '2px solid #EF4444' : '1px solid #E2E8F0',
            }}
          >
            <Typography
              variant="subtitle1"
              sx={{
                mb: 1,
                fontWeight: 600,
                color: '#1E293B',
                fontSize: '15px',
              }}
            >
              6. Did they already value your service, or did you have to convince them?
            </Typography>
            <Typography
              variant="caption"
              sx={{
                mb: 3,
                color: '#64748B',
                display: 'block',
                fontSize: '13px',
                fontStyle: 'italic',
              }}
            >
              Example: They understood the value vs they only compared prices
            </Typography>
            
            <Stack spacing={2}>
              <Button
                variant={answers.valueAlignment === 'valued' ? 'contained' : 'outlined'}
                onClick={() => {
                  setAnswers({ ...answers, valueAlignment: 'valued' });
                  if (validationErrors.valueAlignment) {
                    setValidationErrors({ ...validationErrors, valueAlignment: false });
                  }
                }}
                sx={{
                  width: '100%',
                  textAlign: 'left',
                  bgcolor: answers.valueAlignment === 'valued' ? '#6366F1' : '#FFFFFF',
                  color: answers.valueAlignment === 'valued' ? '#FFFFFF' : '#1E293B',
                  borderColor: '#E2E8F0',
                  justifyContent: 'flex-start',
                  '&:hover': {
                    bgcolor: answers.valueAlignment === 'valued' ? '#4F46E5' : '#F1F5F9',
                    borderColor: answers.valueAlignment === 'valued' ? '#4F46E5' : '#CBD5E1',
                  },
                }}
              >
                They already valued our service
              </Button>
              <Button
                variant={answers.valueAlignment === 'convinced' ? 'contained' : 'outlined'}
                onClick={() => {
                  setAnswers({ ...answers, valueAlignment: 'convinced' });
                  if (validationErrors.valueAlignment) {
                    setValidationErrors({ ...validationErrors, valueAlignment: false });
                  }
                }}
                sx={{
                  width: '100%',
                  textAlign: 'left',
                  bgcolor: answers.valueAlignment === 'convinced' ? '#6366F1' : '#FFFFFF',
                  color: answers.valueAlignment === 'convinced' ? '#FFFFFF' : '#1E293B',
                  borderColor: '#E2E8F0',
                  justifyContent: 'flex-start',
                  '&:hover': {
                    bgcolor: answers.valueAlignment === 'convinced' ? '#4F46E5' : '#F1F5F9',
                    borderColor: answers.valueAlignment === 'convinced' ? '#4F46E5' : '#CBD5E1',
                  },
                }}
              >
                We had to convince them
              </Button>
            </Stack>
          </Box>

          {/* Section 3: Decision Maker */}
          
          {/* Question 8: Problem Feeler */}
          <Box
            sx={{
              mb: 4,
              p: 3,
              bgcolor: '#FAFBFC',
              borderRadius: '12px',
              border: validationErrors.problemFeeler ? '2px solid #EF4444' : '1px solid #E2E8F0',
            }}
          >
            <Typography
              variant="subtitle1"
              sx={{
                mb: 1,
                fontWeight: 600,
                color: '#1E293B',
                fontSize: '15px',
              }}
            >
              8. Who actually felt the problem you solved?
            </Typography>
            <Typography
              variant="caption"
              sx={{
                mb: 2,
                color: '#64748B',
                display: 'block',
                fontSize: '13px',
                fontStyle: 'italic',
              }}
            >
              Example: Operations team struggling with delays
            </Typography>
            
            <TextField
              fullWidth
              placeholder="Enter who felt the problem"
              value={answers.problemFeeler || ''}
              onChange={(e) => {
                setAnswers({ ...answers, problemFeeler: e.target.value });
                if (validationErrors.problemFeeler && e.target.value.trim().length > 0) {
                  setValidationErrors({ ...validationErrors, problemFeeler: false });
                }
              }}
              error={validationErrors.problemFeeler}
              sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: '#FFFFFF',
                  borderRadius: '8px',
                },
              }}
            />
          </Box>

          {/* Question 9: Role/Title */}
          <Box
            sx={{
              mb: 4,
              p: 3,
              bgcolor: '#FAFBFC',
              borderRadius: '12px',
              border: validationErrors.decisionMakers ? '2px solid #EF4444' : '1px solid #E2E8F0',
            }}
          >
            <Typography
              variant="subtitle1"
              sx={{
                mb: 1,
                fontWeight: 600,
                color: '#1E293B',
                fontSize: '15px',
              }}
            >
              9. What was that person's role or title?
            </Typography>
            <Typography
              variant="caption"
              sx={{
                mb: 3,
                color: '#64748B',
                display: 'block',
                fontSize: '13px',
                fontStyle: 'italic',
              }}
            >
              Example: Operations Manager, Founder, Finance Head
            </Typography>
            
            <Stack spacing={2} sx={{ mb: 2 }}>
              {DECISION_MAKER_TITLES.map((title) => {
                const isSelected = answers.decisionMakers?.includes(title.value) || false;
                return (
                  <Button
                    key={title.value}
                    variant={isSelected ? 'contained' : 'outlined'}
                    onClick={() => {
                      const current = answers.decisionMakers || [];
                      const updated = current.includes(title.value)
                        ? current.filter(t => t !== title.value)
                        : [...current, title.value];
                      setAnswers({ ...answers, decisionMakers: updated });
                    }}
                    startIcon={isSelected ? <CheckCircle2 size={18} /> : null}
                    sx={{
                      width: '100%',
                      textAlign: 'left',
                      justifyContent: 'flex-start',
                      bgcolor: isSelected ? '#6366F1' : '#FFFFFF',
                      color: isSelected ? '#FFFFFF' : '#1E293B',
                      borderColor: '#E2E8F0',
                      '&:hover': {
                        bgcolor: isSelected ? '#4F46E5' : '#F1F5F9',
                        borderColor: isSelected ? '#4F46E5' : '#CBD5E1',
                      },
                    }}
                  >
                    {title.label}
                  </Button>
                );
              })}
            </Stack>
            
            <TextField
              fullWidth
              size="small"
              placeholder="Or type a custom title..."
              value={customTitleSearchTerm}
              onChange={(e) => {
                setCustomTitleSearchTerm(e.target.value);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && customTitleSearchTerm.trim()) {
                  e.preventDefault();
                  const customTitle = customTitleSearchTerm.trim();
                  const current = answers.decisionMakers || [];
                  if (!current.includes(customTitle)) {
                    setAnswers({ ...answers, decisionMakers: [...current, customTitle], customTitle: customTitle });
                  }
                  setCustomTitleSearchTerm('');
                }
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: '#FFFFFF',
                  borderRadius: '8px',
                },
              }}
            />
          </Box>

          {/* Section 4: Buying Trigger */}
          
          {/* Question 10: Buying Trigger */}
          <Box
            sx={{
              mb: 4,
              p: 3,
              bgcolor: '#FAFBFC',
              borderRadius: '12px',
              border: validationErrors.buyingTrigger ? '2px solid #EF4444' : '1px solid #E2E8F0',
            }}
          >
            <Typography
              variant="subtitle1"
              sx={{
                mb: 1,
                fontWeight: 600,
                color: '#1E293B',
                fontSize: '15px',
              }}
            >
              10. What situation made them buy?
            </Typography>
            <Typography
              variant="caption"
              sx={{
                mb: 3,
                color: '#64748B',
                display: 'block',
                fontSize: '13px',
                fontStyle: 'italic',
              }}
            >
              Example: Expansion, compliance issue, cost overruns
            </Typography>
            
            <Stack spacing={2}>
              {B2B_TRIGGERS.map((trigger) => {
                const isSelected = answers.buyingTrigger === trigger.value;
                return (
                  <Button
                    key={trigger.value}
                    variant={isSelected ? 'contained' : 'outlined'}
                    onClick={() => {
                      setAnswers({ ...answers, buyingTrigger: trigger.value });
                      if (validationErrors.buyingTrigger) {
                        setValidationErrors({ ...validationErrors, buyingTrigger: false });
                      }
                    }}
                    startIcon={isSelected ? <CheckCircle2 size={18} /> : null}
                    sx={{
                      width: '100%',
                      textAlign: 'left',
                      justifyContent: 'flex-start',
                      bgcolor: isSelected ? '#6366F1' : '#FFFFFF',
                      color: isSelected ? '#FFFFFF' : '#1E293B',
                      borderColor: '#E2E8F0',
                      '&:hover': {
                        bgcolor: isSelected ? '#4F46E5' : '#F1F5F9',
                        borderColor: isSelected ? '#4F46E5' : '#CBD5E1',
                      },
                    }}
                  >
                    {trigger.label}
                  </Button>
                );
              })}
            </Stack>
          </Box>

          {/* Question: Would Clone */}
          <Box
            sx={{
              mb: 4,
              p: 3,
              bgcolor: '#FAFBFC',
              borderRadius: '12px',
              border: validationErrors.wouldClone ? '2px solid #EF4444' : '1px solid #E2E8F0',
            }}
          >
            <Typography
              variant="subtitle1"
              sx={{
                mb: 1,
                fontWeight: 600,
                color: '#1E293B',
                fontSize: '15px',
              }}
            >
              If you could clone this customer, would you?
            </Typography>
            <Typography
              variant="caption"
              sx={{
                mb: 3,
                color: '#64748B',
                display: 'block',
                fontSize: '13px',
                fontStyle: 'italic',
              }}
            >
              If yes — this is your ICP
            </Typography>
            
            <Stack direction="row" spacing={2}>
              <Button
                variant={answers.wouldClone === true ? 'contained' : 'outlined'}
                onClick={() => {
                  setAnswers({ ...answers, wouldClone: true });
                  if (validationErrors.wouldClone) {
                    setValidationErrors({ ...validationErrors, wouldClone: false });
                  }
                }}
                sx={{
                  flex: 1,
                  bgcolor: answers.wouldClone === true ? '#10B981' : '#FFFFFF',
                  color: answers.wouldClone === true ? '#FFFFFF' : '#1E293B',
                  borderColor: '#E2E8F0',
                  '&:hover': {
                    bgcolor: answers.wouldClone === true ? '#059669' : '#F1F5F9',
                    borderColor: answers.wouldClone === true ? '#059669' : '#CBD5E1',
                  },
                }}
              >
                Yes
              </Button>
              <Button
                variant={answers.wouldClone === false ? 'contained' : 'outlined'}
                onClick={() => {
                  setAnswers({ ...answers, wouldClone: false });
                  if (validationErrors.wouldClone) {
                    setValidationErrors({ ...validationErrors, wouldClone: false });
                  }
                }}
                sx={{
                  flex: 1,
                  bgcolor: answers.wouldClone === false ? '#EF4444' : '#FFFFFF',
                  color: answers.wouldClone === false ? '#FFFFFF' : '#1E293B',
                  borderColor: '#E2E8F0',
                  '&:hover': {
                    bgcolor: answers.wouldClone === false ? '#DC2626' : '#F1F5F9',
                    borderColor: answers.wouldClone === false ? '#DC2626' : '#CBD5E1',
                  },
                }}
              >
                No
              </Button>
            </Stack>
          </Box>

          {/* Question 11: Company Name */}
          <Box
            sx={{
              mb: 4,
              p: 3,
              bgcolor: '#FAFBFC',
              borderRadius: '12px',
              border: validationErrors.companyName ? '2px solid #EF4444' : '1px solid #E2E8F0',
            }}
          >
            <Typography
              variant="subtitle1"
              sx={{
                mb: 1,
                fontWeight: 600,
                color: '#1E293B',
                fontSize: '15px',
              }}
            >
              11. What's your company name?
            </Typography>
            
            <TextField
              fullWidth
              placeholder="Enter your company name"
              value={answers.companyName || ''}
              onChange={(e) => {
                setAnswers({ ...answers, companyName: e.target.value });
                if (validationErrors.companyName && e.target.value.trim().length > 0) {
                  setValidationErrors({ ...validationErrors, companyName: false });
                }
              }}
              error={validationErrors.companyName}
              sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: '#FFFFFF',
                  borderRadius: '8px',
                },
              }}
            />
          </Box>

          {/* Action Buttons */}
          <Stack direction="row" spacing={2} justifyContent="flex-end" sx={{ mt: 4 }}>
            <Button
              endIcon={<ArrowRight size={18} />}
              onClick={handleStepComplete}
              variant="contained"
              sx={{
                px: 4,
                py: 1.5,
                bgcolor: '#6366F1',
                background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '14px',
                textTransform: 'none',
                boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
                  boxShadow: '0 6px 16px rgba(99, 102, 241, 0.4)',
                  transform: 'translateY(-1px)',
                },
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            >
              Next
            </Button>
          </Stack>
        </Box>
      </StepLayout>
    );
  };

  // Step 2: Target Definition (moved from Step 1)
  const renderStep2 = () => {
    const selectedIndustries = answers.industries || [];

    return (
      <StepLayout
        currentStep={currentStepNumber}
        totalSteps={totalSteps}
        stepTitle={currentStepTitle}
        onBack={handleBack}
        onStepClick={(step) => {
          const steps: GuidedStep[] = [
            'icp_questions',
            'target_definition',
            'platform_selection',
            'conditions_delays',
            'voice_agent',
            'campaign_settings',
            'confirmation',
          ];
          if (step <= steps.length) {
            setCurrentStep(steps[step - 1]);
          }
        }}
      >
        <Box sx={{ maxWidth: '800px', mx: 'auto' }}>
          {/* Industries Card */}
          <Box
            sx={{
              mb: 4,
              p: 3,
              bgcolor: '#FAFBFC',
              borderRadius: '12px',
              border: validationErrors.industries ? '2px solid #EF4444' : '1px solid #E2E8F0',
              transition: 'all 0.2s',
            }}
          >
            <Typography
              variant="subtitle1"
              sx={{
                mb: 1,
                fontWeight: 600,
                color: '#1E293B',
                fontSize: '15px',
              }}
            >
              Which industries or company types are you targeting?
            </Typography>
            <Typography
              variant="caption"
              sx={{
                mb: 3,
                color: '#64748B',
                display: 'block',
                fontSize: '13px',
              }}
            >
              Select one or more industries to target
            </Typography>
            
            <Stack direction="row" spacing={1.5} flexWrap="wrap" gap={1.5} sx={{ mb: 3 }}>
              {INDUSTRY_CHIPS.map(({ label, icon: Icon, color }) => {
                const isSelected = selectedIndustries.includes(label);
                const IconComponent = Icon;
                
                return (
                  <Chip
                    key={label}
                    icon={<IconComponent size={16} />}
                    label={label}
                    onClick={() => {
                      const current = answers.industries || [];
                      const updated = current.includes(label)
                        ? current.filter(i => i !== label)
                        : [...current, label];
                      setAnswers({ ...answers, industries: updated });
                      if (validationErrors.industries && updated.length > 0) {
                        setValidationErrors({ ...validationErrors, industries: false });
                      }
                    }}
                    sx={{
                      cursor: 'pointer',
                      height: '40px',
                      px: 2,
                      fontSize: '14px',
                      fontWeight: 500,
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      transform: isSelected ? 'scale(1.05)' : 'scale(1)',
                      bgcolor: isSelected ? '#FFFFFF' : '#FFFFFF',
                      color: isSelected ? color : '#64748B',
                      border: isSelected 
                        ? `2px solid ${color}` 
                        : '2px solid #E2E8F0',
                      boxShadow: isSelected
                        ? `0 0 0 4px ${color}15, 0 2px 8px ${color}20`
                        : 'none',
                      '&:hover': {
                        borderColor: color,
                        transform: 'scale(1.02)',
                        boxShadow: `0 0 0 2px ${color}20`,
                      },
                      '& .MuiChip-icon': {
                        color: isSelected ? color : '#94A3B8',
                      },
                    }}
                  />
                );
              })}
              {/* +More Button */}
              <Chip
                label="+More"
                onClick={() => setShowMoreIndustries(true)}
                sx={{
                  cursor: 'pointer',
                  height: '40px',
                  px: 2,
                  fontSize: '14px',
                  fontWeight: 500,
                  bgcolor: '#FFFFFF',
                  color: '#6366F1',
                  border: '2px solid #6366F1',
                  '&:hover': {
                    bgcolor: '#6366F120',
                    transform: 'scale(1.02)',
                  },
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
              />
            </Stack>
            
            {/* More Industries Dialog */}
            <Dialog
              open={showMoreIndustries}
              onClose={() => setShowMoreIndustries(false)}
              maxWidth="sm"
              fullWidth
            >
              <DialogTitle>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Select Industries
                </Typography>
              </DialogTitle>
              <DialogContent>
                <Stack spacing={2} sx={{ mt: 1 }}>
                  <Typography variant="body2" sx={{ color: '#64748B', mb: 2 }}>
                    Select one or more industries from the list below
                  </Typography>
                  <Stack direction="row" spacing={1.5} flexWrap="wrap" gap={1.5}>
                    {ADDITIONAL_INDUSTRIES.map((industry) => {
                      const isSelected = selectedIndustries.includes(industry);
                      return (
                        <Chip
                          key={industry}
                          label={industry}
                          onClick={() => {
                            const current = answers.industries || [];
                            const updated = current.includes(industry)
                              ? current.filter(i => i !== industry)
                              : [...current, industry];
                            setAnswers({ ...answers, industries: updated });
                          }}
                          sx={{
                            cursor: 'pointer',
                            height: '40px',
                            px: 2,
                            fontSize: '14px',
                            fontWeight: 500,
                            bgcolor: isSelected ? '#6366F1' : '#FFFFFF',
                            color: isSelected ? '#FFFFFF' : '#64748B',
                            border: isSelected ? '2px solid #6366F1' : '2px solid #E2E8F0',
                            '&:hover': {
                              bgcolor: isSelected ? '#4F46E5' : '#F1F5F9',
                              borderColor: isSelected ? '#4F46E5' : '#CBD5E1',
                            },
                            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                          }}
                        />
                      );
                    })}
                  </Stack>
                </Stack>
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setShowMoreIndustries(false)} variant="contained">
                  Done
                </Button>
              </DialogActions>
            </Dialog>
            
            <TextField
              fullWidth
              size="small"
              placeholder="Or type a custom industry..."
              value={customIndustryInput}
              onChange={(e) => {
                // Only update the input value, don't add to industries array yet
                setCustomIndustryInput(e.target.value);
              }}
              onBlur={(e) => {
                // Only add to industries array when field loses focus (user finished typing)
                const customIndustry = e.target.value.trim();
                const currentIndustries = answers.industries || [];
                
                if (customIndustry) {
                  // Remove the old customIndustry value from array if it exists
                  const filtered = currentIndustries.filter(i => i !== answers.customIndustry);
                  
                  // Add the new custom industry if it's not already in the array
                  if (!filtered.includes(customIndustry)) {
                    setAnswers({ 
                      ...answers, 
                      customIndustry: customIndustry,
                      industries: [...filtered, customIndustry]
                    });
                  } else {
                    // Just update customIndustry if it's already in the array
                    setAnswers({ ...answers, customIndustry: customIndustry });
                  }
                } else {
                  // If cleared, remove the old customIndustry from array
                  const filtered = currentIndustries.filter(i => i !== answers.customIndustry);
                  setAnswers({ ...answers, customIndustry: '', industries: filtered });
                }
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: '#FFFFFF',
                  borderRadius: '8px',
                },
              }}
            />
          </Box>

          {/* Roles/Decision Maker Card */}
          <Box
            sx={{
              mb: 4,
              p: 3,
              bgcolor: '#FAFBFC',
              borderRadius: '12px',
              border: validationErrors.roles ? '2px solid #EF4444' : '1px solid #E2E8F0',
            }}
          >
            <Typography
              variant="subtitle1"
              sx={{
                mb: 1,
                fontWeight: 600,
                color: '#1E293B',
                fontSize: '15px',
              }}
            >
              Which roles or job titles are you targeting?
            </Typography>
            <Typography
              variant="caption"
              sx={{
                mb: 3,
                color: '#64748B',
                display: 'block',
                fontSize: '13px',
              }}
            >
              Select one or more roles to target
            </Typography>
            
            <Stack direction="row" spacing={1} flexWrap="wrap" gap={1} sx={{ mb: 2 }}>
              {ROLE_CHIPS.map((role) => {
                const isSelected = answers.roles?.includes(role) || false;
                return (
                  <Chip
                    key={role}
                    label={role}
                    onClick={() => {
                      const current = answers.roles || [];
                      const updated = current.includes(role)
                        ? current.filter(r => r !== role)
                        : [...current, role];
                      setAnswers({ ...answers, roles: updated });
                      if (validationErrors.roles && updated.length > 0) {
                        setValidationErrors({ ...validationErrors, roles: false });
                      }
                    }}
                    sx={{
                      cursor: 'pointer',
                      bgcolor: isSelected ? '#6366F1' : '#FFFFFF',
                      color: isSelected ? '#FFFFFF' : '#1E293B',
                      border: `1px solid ${isSelected ? '#6366F1' : '#E2E8F0'}`,
                      fontWeight: isSelected ? 600 : 400,
                      '&:hover': {
                        bgcolor: isSelected ? '#4F46E5' : '#F1F5F9',
                        borderColor: isSelected ? '#4F46E5' : '#CBD5E1',
                      },
                    }}
                  />
                );
              })}
            </Stack>
            
            <TextField
              fullWidth
              size="small"
              placeholder="Or type a custom role..."
              value={customRoleInput}
              onChange={(e) => {
                setCustomRoleInput(e.target.value);
                const customRole = e.target.value.trim();
                const currentRoles = answers.roles || [];
                
                if (customRole) {
                  // Remove the old customRole value from array if it exists
                  const filtered = currentRoles.filter(r => r !== answers.customRole);
                  
                  // Add the new custom role if it's not already in the array
                  if (!filtered.includes(customRole)) {
                    setAnswers({ 
                      ...answers, 
                      customRole: customRole,
                      roles: [...filtered, customRole]
                    });
                  } else {
                    // Just update customRole if it's already in the array
                    setAnswers({ ...answers, customRole: customRole });
                  }
                } else {
                  // If cleared, remove the old customRole from array
                  const filtered = currentRoles.filter(r => r !== answers.customRole);
                  setAnswers({ ...answers, customRole: '', roles: filtered });
                }
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: '#FFFFFF',
                  borderRadius: '8px',
                },
              }}
            />
          </Box>

          {/* Location Card */}
          <Box
            sx={{
              mb: 4,
              p: 3,
              bgcolor: '#FAFBFC',
              borderRadius: '12px',
              border: validationErrors.location ? '2px solid #EF4444' : '1px solid #E2E8F0',
            }}
          >
            <Typography
              variant="subtitle1"
              sx={{
                mb: 1,
                fontWeight: 600,
                color: '#1E293B',
                fontSize: '15px',
              }}
            >
              Target location?
            </Typography>
            <Typography
              variant="caption"
              sx={{
                mb: 3,
                color: '#64748B',
                display: 'block',
                fontSize: '13px',
              }}
            >
              Enter country, state, city, or any location
            </Typography>
            
            <Autocomplete
              multiple
              freeSolo
              options={locationSuggestions}
              value={locationTokens}
              onChange={(event, newValue) => {
                setLocationTokens(newValue);
                setAnswers({ ...answers, location: newValue.join(', ') });
                if (validationErrors.location && newValue.length > 0) {
                  setValidationErrors({ ...validationErrors, location: false });
                }
              }}
              inputValue={locationInput}
              onInputChange={(event, newInputValue) => {
                setLocationInput(newInputValue);
              }}
              onBlur={(event) => {
                // If user typed something but didn't press Enter, add it to location
                const trimmedInput = locationInput.trim();
                if (trimmedInput && !locationTokens.includes(trimmedInput)) {
                  const newTokens = [...locationTokens, trimmedInput];
                  setLocationTokens(newTokens);
                  setAnswers({ ...answers, location: newTokens.join(', ') });
                  setLocationInput('');
                }
              }}
              onKeyDown={(event) => {
                // Allow Enter key to add the current input as a location
                if (event.key === 'Enter' && locationInput.trim() && !locationTokens.includes(locationInput.trim())) {
                  event.preventDefault();
                  const newTokens = [...locationTokens, locationInput.trim()];
                  setLocationTokens(newTokens);
                  setAnswers({ ...answers, location: newTokens.join(', ') });
                  setLocationInput('');
                }
              }}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip
                    {...getTagProps({ index })}
                    key={index}
                    label={option}
                    icon={<MapPin size={14} />}
                    sx={{
                      bgcolor: '#FFFFFF',
                      border: '1px solid #E2E8F0',
                      borderRadius: '6px',
                      height: '32px',
                      '& .MuiChip-deleteIcon': {
                        fontSize: '16px',
                      },
                    }}
                  />
                ))
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder="e.g., United States, California, San Francisco"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      bgcolor: '#FFFFFF',
                      borderRadius: '8px',
                    },
                  }}
                />
              )}
            />
          </Box>

          {/* Action Buttons */}
          <Stack direction="row" spacing={2} justifyContent="flex-end" sx={{ mt: 4 }}>
            <Button
              endIcon={<ArrowRight size={18} />}
              onClick={handleStepComplete}
              variant="contained"
              sx={{
                px: 4,
                py: 1.5,
                bgcolor: '#6366F1',
                background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '14px',
                textTransform: 'none',
                boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
                  boxShadow: '0 6px 16px rgba(99, 102, 241, 0.4)',
                  transform: 'translateY(-1px)',
                },
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            >
              Continue
            </Button>
          </Stack>
        </Box>
      </StepLayout>
    );
  };

  const renderStep3Platform = () => {
    const selectedPlatforms = answers.platforms || [];
    
    return (
      <StepLayout
        currentStep={currentStepNumber}
        totalSteps={totalSteps}
        stepTitle={currentStepTitle}
        onBack={handleBack}
        onStepClick={(step) => {
          const steps: GuidedStep[] = [
            'icp_questions',
            'target_definition',
            'platform_selection',
            'conditions_delays',
            'voice_agent',
            'campaign_settings',
            'confirmation',
          ];
          if (step <= steps.length) {
            setCurrentStep(steps[step - 1]);
          }
        }}
      >
        <Box sx={{ maxWidth: '800px', mx: 'auto' }}>
          {/* Platform Selection */}
          <Box 
            sx={{ 
              mb: 4,
              p: 3,
              bgcolor: '#FAFBFC',
              borderRadius: '12px',
              border: validationErrors.platforms ? '2px solid #EF4444' : '1px solid #E2E8F0',
            }}
          >
            <Typography variant="body2" sx={{ mb: 2, color: '#64748B' }}>
              Which platforms do you want to use for outreach?
            </Typography>
            <Stack spacing={2}>
              {PLATFORM_OPTIONS.map((platform) => (
                <FormControlLabel
                  key={platform.value}
                  control={
                    <Checkbox
                      checked={selectedPlatforms.includes(platform.value)}
                      disabled={(platform as any).disabled || (platform as any).comingSoon}
                      onChange={(e) => {
                        const current = answers.platforms || [];
                        const updated = e.target.checked
                          ? [...current, platform.value]
                          : current.filter(p => p !== platform.value);
                        setAnswers({ ...answers, platforms: updated });
                        // Clear validation error when user selects a platform
                        if (validationErrors.platforms && updated.length > 0) {
                          setValidationErrors({ ...validationErrors, platforms: false });
                        }
                        
                        // Update channel connections
                        if (platform.value === 'linkedin') {
                          setChannelConnection('linkedin', e.target.checked);
                        } else if (platform.value === 'email') {
                          setChannelConnection('email', e.target.checked);
                        } else if (platform.value === 'whatsapp') {
                          setChannelConnection('whatsapp', e.target.checked);
                        } else if (platform.value === 'voice') {
                          setChannelConnection('voiceAgent', e.target.checked);
                        }
                      }}
                    />
                  }
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <span>{platform.label}</span>
                      {platform.comingSoon && (
                        <Chip
                          label="Coming Soon"
                          size="small"
                          sx={{
                            height: '20px',
                            fontSize: '10px',
                            fontWeight: 600,
                            bgcolor: '#F59E0B',
                            color: '#FFFFFF',
                          }}
                        />
                      )}
                    </Box>
                  }
                  sx={{
                opacity: (platform as any).disabled || (platform as any).comingSoon ? 0.6 : 1,
                cursor: (platform as any).disabled || (platform as any).comingSoon ? 'not-allowed' : 'pointer',
                  }}
                />
              ))}
            </Stack>
          </Box>

          {/* LinkedIn Logic Section */}
          {selectedPlatforms.includes('linkedin') && (
            <>
              <Box 
                sx={{ 
                  mb: 4,
                  p: 3,
                  bgcolor: '#FAFBFC',
                  borderRadius: '12px',
                  border: validationErrors.linkedinActions ? '2px solid #EF4444' : '1px solid #E2E8F0',
                }}
              >
                <Typography variant="body2" sx={{ mb: 2, color: '#64748B' }}>
                  What should we do on LinkedIn?
                </Typography>
                <Stack spacing={2}>
                  {/* LinkedIn Actions */}
                  <RenderActions actions={LINKEDIN_ACTIONS} answersKey="linkedinActions" answers={answers} setAnswers={setAnswers} validationErrors={validationErrors} setValidationErrors={setValidationErrors} />
                  {/* WhatsApp Actions */}
                  <RenderActions actions={WHATSAPP_ACTIONS} answersKey="whatsappActions" answers={answers} setAnswers={setAnswers} validationErrors={validationErrors} setValidationErrors={setValidationErrors} />
                  {/* Email Actions */}
                  <RenderActions actions={EMAIL_ACTIONS} answersKey="emailActions" answers={answers} setAnswers={setAnswers} validationErrors={validationErrors} setValidationErrors={setValidationErrors} />
                  {/* Voice Actions */}
                  <RenderActions actions={VOICE_ACTIONS} answersKey="voiceActions" answers={answers} setAnswers={setAnswers} validationErrors={validationErrors} setValidationErrors={setValidationErrors} />
                </Stack>
              </Box>

              {/* LinkedIn Connection Message */}
              {answers.linkedinActions?.includes('send_connection') && (
                <Box
                  sx={{
                    mb: 4,
                    p: 3,
                    bgcolor: '#FAFBFC',
                    borderRadius: '12px',
                    border: '1px solid #E2E8F0',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                    <Box>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#1E293B', fontSize: '15px', display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Linkedin size={18} color="#0077B5" />
                        Connection Request Message
                      </Typography>
                      <Typography variant="caption" sx={{ mt: 0.5, color: '#64748B', display: 'block', fontSize: '13px' }}>
                        LinkedIn limits connection messages to 4-5 per month for normal accounts
                      </Typography>
                    </Box>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={enableConnectionMessage}
                          onChange={(e) => setEnableConnectionMessage(e.target.checked)}
                          sx={{
                            '& .MuiSwitch-switchBase.Mui-checked': { color: '#0077B5' },
                            '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: '#0077B5' },
                          }}
                        />
                      }
                      label={enableConnectionMessage ? 'Enabled' : 'Disabled'}
                      sx={{ m: 0 }}
                    />
                  </Box>
                  
                  {enableConnectionMessage && (
                    <TextField
                      fullWidth
                      multiline
                      rows={4}
                      label="Connection Request Message"
                      value={linkedinConnectionMessage}
                      onChange={(e) => setLinkedinConnectionMessage(e.target.value)}
                      placeholder="Hi {{first_name}}, I'd like to connect with you..."
                      helperText="Use {{first_name}}, {{last_name}}, {{company}}, {{job_title}} for personalization"
                    />
                  )}
                </Box>
              )}

              {/* LinkedIn Message Content */}
              {answers.linkedinActions?.includes('send_message') && (
                <Box
                  sx={{
                    mb: 4,
                    p: 3,
                    bgcolor: '#FAFBFC',
                    borderRadius: '12px',
                    border: validationErrors.linkedinMessage ? '2px solid #EF4444' : '1px solid #E2E8F0',
                  }}
                >
                  <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600, color: '#1E293B', fontSize: '15px', display: 'flex', alignItems: 'center', gap: 1 }}>
                    <MessageSquare size={18} color="#0077B5" />
                    LinkedIn Message Content
                  </Typography>
                  <TextField
                    fullWidth
                    multiline
                    rows={5}
                    label="LinkedIn Message *"
                    value={linkedinMessage}
                    onChange={(e) => {
                      setLinkedinMessage(e.target.value);
                      if (validationErrors.linkedinMessage && e.target.value.trim().length > 0) {
                        setValidationErrors({ ...validationErrors, linkedinMessage: false });
                      }
                    }}
                    error={validationErrors.linkedinMessage}
                    placeholder="Hi {{first_name}}, I noticed your work in {{company}} and thought you might be interested in..."
                    helperText="Use {{first_name}}, {{last_name}}, {{company}}, {{job_title}} for personalization"
                  />
                </Box>
              )}
            </>
          )}

          {/* WhatsApp Logic Section */}
          {selectedPlatforms.includes('whatsapp') && (
            <Box
              sx={{
                mb: 4,
                p: 3,
                bgcolor: '#FAFBFC',
                borderRadius: '12px',
                border: validationErrors.whatsappMessage ? '2px solid #EF4444' : '1px solid #E2E8F0',
              }}
            >
              <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600, color: '#1E293B', fontSize: '15px', display: 'flex', alignItems: 'center', gap: 1 }}>
                <MessageSquare size={18} color="#25D366" />
                WhatsApp Message
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={5}
                label="WhatsApp Message *"
                value={answers.whatsappMessage || ''}
                onChange={(e) => {
                  setAnswers({ ...answers, whatsappMessage: e.target.value });
                  if (validationErrors.whatsappMessage && e.target.value.trim().length > 0) {
                    setValidationErrors({ ...validationErrors, whatsappMessage: false });
                  }
                }}
                error={validationErrors.whatsappMessage}
                placeholder="Hi {{first_name}}, I wanted to reach out about..."
                helperText="Use {{first_name}}, {{last_name}}, {{company}}, {{job_title}} for personalization"
              />
            </Box>
          )}

          {/* Email Logic Section */}
          {selectedPlatforms.includes('email') && (
            <>
              <Box
                sx={{
                  mb: 4,
                  p: 3,
                  bgcolor: '#FAFBFC',
                  borderRadius: '12px',
                  border: validationErrors.emailSubject ? '2px solid #EF4444' : '1px solid #E2E8F0',
                }}
              >
                <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600, color: '#1E293B', fontSize: '15px', display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Mail size={18} color="#6366F1" />
                  Email Subject
                </Typography>
                <TextField
                  fullWidth
                  label="Email Subject *"
                  value={answers.emailSubject || ''}
                  onChange={(e) => {
                    setAnswers({ ...answers, emailSubject: e.target.value });
                    if (validationErrors.emailSubject && e.target.value.trim().length > 0) {
                      setValidationErrors({ ...validationErrors, emailSubject: false });
                    }
                  }}
                  error={validationErrors.emailSubject}
                  placeholder="Quick question about {{company}}"
                  helperText="Use {{first_name}}, {{last_name}}, {{company}}, {{job_title}} for personalization"
                />
              </Box>
              <Box
                sx={{
                  mb: 4,
                  p: 3,
                  bgcolor: '#FAFBFC',
                  borderRadius: '12px',
                  border: validationErrors.emailMessage ? '2px solid #EF4444' : '1px solid #E2E8F0',
                }}
              >
                <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600, color: '#1E293B', fontSize: '15px', display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Mail size={18} color="#6366F1" />
                  Email Message
                </Typography>
                <TextField
                  fullWidth
                  multiline
                  rows={5}
                  label="Email Message *"
                  value={answers.emailMessage || ''}
                  onChange={(e) => {
                    setAnswers({ ...answers, emailMessage: e.target.value });
                    if (validationErrors.emailMessage && e.target.value.trim().length > 0) {
                      setValidationErrors({ ...validationErrors, emailMessage: false });
                    }
                  }}
                  error={validationErrors.emailMessage}
                  placeholder="Hi {{first_name}}, I noticed your work in {{company}} and thought you might be interested in..."
                  helperText="Use {{first_name}}, {{last_name}}, {{company}}, {{job_title}} for personalization"
                />
              </Box>
            </>
          )}

          {/* Voice Logic Section */}
          {selectedPlatforms.includes('voice') && (
            <>
              <Box sx={{ mb: 4 }}>
                <Typography variant="body2" sx={{ mb: 2, color: '#64748B' }}>
                  Do you want to enable AI voice calls?
                </Typography>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={answers.voiceEnabled !== false}
                      onChange={(e) => setAnswers({ ...answers, voiceEnabled: e.target.checked })}
                    />
                  }
                  label="Enable AI voice calls"
                  sx={{ mb: 3 }}
                />
              </Box>
              
              {answers.voiceEnabled !== false && (
                <>
                  {/* Voice Agent Selection */}
                  <Box
                    sx={{
                      mb: 4,
                      p: 3,
                      bgcolor: '#FAFBFC',
                      borderRadius: '12px',
                      border: validationErrors.voiceAgentId ? '2px solid #EF4444' : '1px solid #E2E8F0',
                    }}
                  >
                    <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600, color: '#1E293B', fontSize: '15px', display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Phone size={18} color="#8B5CF6" />
                      Voice Agent Configuration
                    </Typography>
                    <Typography variant="caption" sx={{ mb: 3, color: '#64748B', display: 'block', fontSize: '13px' }}>
                      Select the voice agent to use for calls
                    </Typography>
                    
                    <FormControl fullWidth required sx={{ mb: 3 }}>
                      <InputLabel>Voice Agent *</InputLabel>
                      <Select
                        value={answers.voiceAgentId || voiceAgentId || '24'}
                        onChange={(e) => {
                          const agentId = e.target.value;
                          setVoiceAgentId(agentId);
                          const agentNames: Record<string, string> = {
                            '24': 'VAPI Agent',
                            '1': 'Agent 1',
                            '2': 'Agent 2',
                            '3': 'Agent 3',
                          };
                          const agentName = agentNames[agentId] || 'Custom Agent';
                          setVoiceAgentName(agentName);
                          setAnswers({ ...answers, voiceAgentId: agentId, voiceAgentName: agentName });
                          if (validationErrors.voiceAgentId) {
                            setValidationErrors({ ...validationErrors, voiceAgentId: false });
                          }
                        }}
                        label="Voice Agent *"
                      >
                        <MenuItem value="24">VAPI Agent</MenuItem>
                        <MenuItem value="1">Agent 1</MenuItem>
                        <MenuItem value="2">Agent 2</MenuItem>
                        <MenuItem value="3">Agent 3</MenuItem>
                      </Select>
                      <Typography variant="caption" sx={{ mt: 1, color: '#64748B', fontSize: '12px' }}>
                        Each agent has its own pre-configured template and settings
                      </Typography>
                    </FormControl>

                    <TextField
                      fullWidth
                      multiline
                      rows={4}
                      required
                      label="Call Context *"
                      value={answers.voiceContext || voiceContext || ''}
                      onChange={(e) => {
                        const value = e.target.value;
                        setVoiceContext(value);
                        setAnswers({ ...answers, voiceContext: value });
                        if (validationErrors.voiceContext && value.trim().length > 0) {
                          setValidationErrors({ ...validationErrors, voiceContext: false });
                        }
                      }}
                      error={validationErrors.voiceContext}
                      placeholder="Provide context about the lead, company, or what to discuss in the call. Example: 'This is a follow-up call about our corporate travel services. The lead is interested in travel management for their company.'"
                      helperText="Required: This context will be provided to the voice agent to personalize the conversation"
                    />
                  </Box>

                  {/* Call Timing */}
                  <Box
                    sx={{
                      mb: 4,
                      p: 3,
                      bgcolor: '#FAFBFC',
                      borderRadius: '12px',
                      border: '1px solid #E2E8F0',
                    }}
                  >
                    <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600, color: '#1E293B', fontSize: '15px', display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Calendar size={18} color="#8B5CF6" />
                      Call Timing
                    </Typography>
                    <Typography variant="caption" sx={{ mb: 3, color: '#64748B', display: 'block', fontSize: '13px' }}>
                      When should the voice calls be made?
                    </Typography>
                    
                    <FormControl fullWidth>
                      <InputLabel>When should calls be made?</InputLabel>
                      <Select
                        value={answers.voiceTiming || 'immediate'}
                        onChange={(e) => setAnswers({ ...answers, voiceTiming: e.target.value as any })}
                        label="When should calls be made?"
                      >
                        <MenuItem value="immediate">Immediate call</MenuItem>
                        <MenuItem value="after_linkedin">Call after LinkedIn connection accepted</MenuItem>
                      </Select>
                    </FormControl>
                    
                    {answers.voiceTiming === 'after_linkedin' && (
                      <Box sx={{ mt: 2, p: 1.5, bgcolor: '#EFF6FF', borderRadius: '8px', border: '1px solid #BFDBFE' }}>
                        <Typography variant="caption" sx={{ color: '#1E40AF', fontSize: '12px' }}>
                          <strong>Note:</strong> The voice call will only be made after the LinkedIn connection request is accepted. 
                          A condition step will be added to check this before making the call.
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </>
              )}
            </>
          )}

          <Stack direction="row" spacing={2} justifyContent="flex-end" sx={{ mt: 4 }}>
            <Button
              endIcon={<ArrowRight size={16} />}
              onClick={handleStepComplete}
              variant="contained"
              disabled={!answers.platforms || answers.platforms.length === 0}
            >
              Continue
            </Button>
          </Stack>
        </Box>
      </StepLayout>
    );
  };

  // Auto-skip Voice step if voice not selected
  useEffect(() => {
    if (currentStep === 'voice_agent' && !answers.platforms?.includes('voice')) {
      const timer = setTimeout(() => handleStepComplete(), 100);
      return () => clearTimeout(timer);
    }
  }, [currentStep, answers.platforms]);

  const renderStep4ConditionsAndDelays = () => {
    const selectedPlatforms = answers.platforms || [];
    const hasLinkedIn = selectedPlatforms.includes('linkedin');
    const hasEmail = selectedPlatforms.includes('email');
    const hasWhatsApp = selectedPlatforms.includes('whatsapp');
    const hasVoice = selectedPlatforms.includes('voice');
    
    // Condition options based on selected platforms
    const conditionOptions: Array<{ value: string; label: string; description: string }> = [];
    
    if (hasLinkedIn) {
      conditionOptions.push(
        { value: 'connected', label: 'LinkedIn Connection Accepted', description: 'Wait until the connection request is accepted' },
        { value: 'linkedin_replied', label: 'LinkedIn Message Replied', description: 'Wait until they reply to your LinkedIn message' }
      );
    }
    
    if (hasEmail) {
      conditionOptions.push(
        { value: 'email_opened', label: 'Email Opened', description: 'Wait until they open your email' },
        { value: 'email_replied', label: 'Email Replied', description: 'Wait until they reply to your email' }
      );
    }
    
    if (hasWhatsApp) {
      conditionOptions.push(
        { value: 'whatsapp_replied', label: 'WhatsApp Message Replied', description: 'Wait until they reply to your WhatsApp message' }
      );
    }

    return (
      <StepLayout
        currentStep={currentStepNumber}
        totalSteps={totalSteps}
        stepTitle={currentStepTitle}
        onBack={handleBack}
        onStepClick={(step) => {
          const steps: GuidedStep[] = [
            'icp_questions',
            'target_definition',
            'platform_selection',
            'conditions_delays',
            'voice_agent',
            'campaign_settings',
            'confirmation',
          ];
          if (step <= steps.length) {
            setCurrentStep(steps[step - 1]);
          }
        }}
      >
        <Box sx={{ maxWidth: '800px', mx: 'auto' }}>
          <Typography variant="body1" sx={{ mb: 3, color: '#64748B', fontSize: '14px' }}>
            Configure when and how your campaign actions should execute. Set delays between steps and conditions that must be met before proceeding.
          </Typography>

          {/* Delay Configuration */}
          <Box 
            sx={{ 
              mb: 4,
              p: 3,
              bgcolor: '#FAFBFC',
              borderRadius: '12px',
              border: '1px solid #E2E8F0',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
              <Calendar size={20} color="#6366F1" />
              <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#1E293B', fontSize: '16px' }}>
                Delay Between Actions
              </Typography>
            </Box>
            <Typography variant="body2" sx={{ mb: 3, color: '#64748B', fontSize: '13px' }}>
              How long should the system wait before executing the next action? This helps make your outreach feel more natural.
            </Typography>
            
            <Stack spacing={3} direction="row" sx={{ alignItems: 'flex-start' }}>
              <FormControl sx={{ flex: 1 }}>
                <InputLabel>Days</InputLabel>
                <Select
                  value={delayDays}
                  label="Days"
                  onChange={(e) => {
                    const newValue = Number(e.target.value);
                    setDelayDays(newValue);
                    setAnswers({ ...answers, delayDays: newValue });
                  }}
                >
                  {[0, 1, 2, 3, 4, 5, 6, 7, 14, 21, 30].map((day) => (
                    <MenuItem key={day} value={day}>
                      {day} {day === 1 ? 'day' : 'days'}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              <FormControl sx={{ flex: 1 }}>
                <InputLabel>Hours</InputLabel>
                <Select
                  value={delayHours}
                  label="Hours"
                  onChange={(e) => {
                    const newValue = Number(e.target.value);
                    setDelayHours(newValue);
                    setAnswers({ ...answers, delayHours: newValue });
                  }}
                >
                  {[0, 1, 2, 3, 4, 6, 8, 12, 18, 24].map((hour) => (
                    <MenuItem key={hour} value={hour}>
                      {hour} {hour === 1 ? 'hour' : 'hours'}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              <FormControl sx={{ flex: 1 }}>
                <InputLabel>Minutes</InputLabel>
                <Select
                  value={delayMinutes}
                  label="Minutes"
                  onChange={(e) => {
                    const newValue = Number(e.target.value);
                    setDelayMinutes(newValue);
                    setAnswers({ ...answers, delayMinutes: newValue });
                  }}
                >
                  {[0, 15, 30, 45, 60, 90, 120].map((min) => (
                    <MenuItem key={min} value={min}>
                      {min} {min === 1 ? 'minute' : 'minutes'}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>
            
            <Box sx={{ mt: 2, p: 2, bgcolor: '#EFF6FF', borderRadius: '8px', border: '1px solid #BFDBFE' }}>
              <Typography variant="caption" sx={{ color: '#1E40AF', fontSize: '12px', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <AlertTriangle size={14} />
                <strong>Example:</strong> If you set 1 day, 2 hours, and 30 minutes, the system will wait 1 day, 2 hours, and 30 minutes before executing the next action in your campaign.
              </Typography>
            </Box>
          </Box>

          {/* Condition Configuration */}
          {conditionOptions.length > 0 && (
            <Box 
              sx={{ 
                mb: 4,
                p: 3,
                bgcolor: '#FAFBFC',
                borderRadius: '12px',
                border: '1px solid #E2E8F0',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                <Shield size={20} color="#6366F1" />
                <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#1E293B', fontSize: '16px' }}>
                  Conditions to Wait For
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ mb: 3, color: '#64748B', fontSize: '13px' }}>
                Choose what must happen before proceeding to the next action. The system will wait until this condition is met.
              </Typography>
              
              <Stack spacing={2}>
                {conditionOptions.map((option) => (
                  <Card
                    key={option.value}
                    sx={{
                      p: 2,
                      cursor: 'pointer',
                      border: conditionType === option.value ? '2px solid #6366F1' : '1px solid #E2E8F0',
                      bgcolor: conditionType === option.value ? '#EEF2FF' : '#FFFFFF',
                      '&:hover': {
                        borderColor: '#6366F1',
                        bgcolor: conditionType === option.value ? '#EEF2FF' : '#F8FAFC',
                      },
                    }}
                    onClick={() => {
                      setConditionType(option.value);
                      setAnswers({ ...answers, conditionType: option.value });
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                      <Checkbox
                        checked={conditionType === option.value}
                        onChange={() => {
                          setConditionType(option.value);
                          setAnswers({ ...answers, conditionType: option.value });
                        }}
                        sx={{
                          color: '#6366F1',
                          '&.Mui-checked': {
                            color: '#6366F1',
                          },
                        }}
                      />
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#1E293B', mb: 0.5 }}>
                          {option.label}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#64748B', fontSize: '12px' }}>
                          {option.description}
                        </Typography>
                      </Box>
                    </Box>
                  </Card>
                ))}
              </Stack>
              
              <Box sx={{ mt: 2, p: 2, bgcolor: '#F0FDF4', borderRadius: '8px', border: '1px solid #BBF7D0' }}>
                <Typography variant="caption" sx={{ color: '#166534', fontSize: '12px', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <CheckCircle2 size={14} />
                  <strong>How it works:</strong> After the delay period, the system will check if this condition is met. If yes, it proceeds to the next action. If not, it continues waiting.
                </Typography>
              </Box>
            </Box>
          )}

          {/* Platform-specific information */}
          {selectedPlatforms.length > 0 && (
            <Box 
              sx={{ 
                mb: 4,
                p: 3,
                bgcolor: '#FFFBEB',
                borderRadius: '12px',
                border: '1px solid #FDE68A',
              }}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#92400E', mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                <TrendingUp size={16} />
                How This Applies to Your Campaign
              </Typography>
              <Stack spacing={1} sx={{ mt: 2 }}>
                {hasLinkedIn && answers.linkedinActions?.includes('send_message') && (
                  <Typography variant="body2" sx={{ color: '#78350F', fontSize: '13px' }}>
                    • <strong>LinkedIn:</strong> After sending a connection request, the system will wait for the configured delay, then check if the connection was accepted before sending a message.
                  </Typography>
                )}
                {hasEmail && hasLinkedIn && (
                  <Typography variant="body2" sx={{ color: '#78350F', fontSize: '13px' }}>
                    • <strong>Email:</strong> If you're also using LinkedIn, the email will be sent after the delay period following the LinkedIn connection.
                  </Typography>
                )}
                {hasVoice && (
                  <Typography variant="body2" sx={{ color: '#78350F', fontSize: '13px' }}>
                    • <strong>Voice Call:</strong> The call will be made after the configured condition is met (e.g., after LinkedIn connection is accepted).
                  </Typography>
                )}
                {hasWhatsApp && (
                  <Typography variant="body2" sx={{ color: '#78350F', fontSize: '13px' }}>
                    • <strong>WhatsApp:</strong> Messages will be sent after the configured delay period.
                  </Typography>
                )}
              </Stack>
            </Box>
          )}

          <Button
            variant="contained"
            fullWidth
            onClick={handleStepComplete}
            sx={{
              mt: 2,
              py: 1.5,
              bgcolor: '#6366F1',
              '&:hover': { bgcolor: '#4F46E5' },
              fontSize: '15px',
              fontWeight: 600,
            }}
          >
            Continue
            <ArrowRight size={18} style={{ marginLeft: '8px' }} />
          </Button>
        </Box>
      </StepLayout>
    );
  };

  const renderStep5 = () => {
    if (!answers.platforms?.includes('voice')) {
      return null;
    }

    // Agent name mapping
    const agentNames: Record<string, string> = {
      '24': 'VAPI Agent',
      '1': 'Agent 1',
      '2': 'Agent 2',
      '3': 'Agent 3',
    };

    return (
      <StepLayout
        currentStep={currentStepNumber}
        totalSteps={totalSteps}
        stepTitle={currentStepTitle}
        onBack={handleBack}
        onStepClick={(step) => {
          const steps: GuidedStep[] = [
            'icp_questions',
            'target_definition',
            'platform_selection',
            'conditions_delays',
            'voice_agent',
            'campaign_settings',
            'confirmation',
          ];
          if (step <= steps.length) {
            setCurrentStep(steps[step - 1]);
          }
        }}
      >
        <Box sx={{ maxWidth: '800px', mx: 'auto' }}>
        <Box sx={{ mb: 4 }}>
          <Typography variant="body2" sx={{ mb: 2, color: '#64748B' }}>
            Do you want to enable AI voice calls?
          </Typography>
          <FormControlLabel
            control={
              <Checkbox
                checked={answers.voiceEnabled !== false}
                onChange={(e) => setAnswers({ ...answers, voiceEnabled: e.target.checked })}
              />
            }
            label="Enable AI voice calls"
            sx={{ mb: 3 }}
          />
          
          {answers.voiceEnabled !== false && (
            <>
              {/* Voice Agent Selection - REQUIRED */}
              <Box
                sx={{
                  mb: 4,
                  p: 3,
                  bgcolor: '#FAFBFC',
                  borderRadius: '12px',
                  border: '1px solid #E2E8F0',
                }}
              >
                <Typography
                  variant="subtitle1"
                  sx={{
                    mb: 1,
                    fontWeight: 600,
                    color: '#1E293B',
                    fontSize: '15px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                  }}
                >
                  <Phone size={18} color="#8B5CF6" />
                  Voice Agent Configuration
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    mb: 3,
                    color: '#64748B',
                    display: 'block',
                    fontSize: '13px',
                  }}
                >
                  Select the voice agent to use for calls
                </Typography>
                
                <FormControl fullWidth required sx={{ mb: 3 }}>
                  <InputLabel>Voice Agent *</InputLabel>
                  <Select
                    value={voiceAgentId}
                    onChange={(e) => {
                      const agentId = e.target.value;
                      setVoiceAgentId(agentId);
                      setVoiceAgentName(agentNames[agentId] || 'Custom Agent');
                    }}
                    label="Voice Agent *"
                  >
                    <MenuItem value="24">VAPI Agent</MenuItem>
                    <MenuItem value="1">Agent 1</MenuItem>
                    <MenuItem value="2">Agent 2</MenuItem>
                    <MenuItem value="3">Agent 3</MenuItem>
                  </Select>
                  <Typography variant="caption" sx={{ mt: 1, color: '#64748B', fontSize: '12px' }}>
                    Each agent has its own pre-configured template and settings
                  </Typography>
                </FormControl>

                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  required
                  label="Call Context *"
                  value={voiceContext}
                  onChange={(e) => setVoiceContext(e.target.value)}
                  placeholder="Provide context about the lead, company, or what to discuss in the call. Example: 'This is a follow-up call about our corporate travel services. The lead is interested in travel management for their company.'"
                  helperText="Required: This context will be provided to the voice agent to personalize the conversation"
                  sx={{ mb: 2 }}
                  error={!voiceContext || voiceContext.trim() === ''}
                />
                
                {(!voiceContext || voiceContext.trim() === '') && (
                  <Typography variant="caption" color="error.main" sx={{ fontSize: '12px', mb: 2, display: 'block' }}>
                    ⚠️ Call context is required. The voice agent needs this information to conduct the conversation.
                  </Typography>
                )}
              </Box>

              {/* Timing Configuration */}
              <Box
                sx={{
                  mb: 4,
                  p: 3,
                  bgcolor: '#FAFBFC',
                  borderRadius: '12px',
                  border: '1px solid #E2E8F0',
                }}
              >
                <Typography
                  variant="subtitle1"
                  sx={{
                    mb: 1,
                    fontWeight: 600,
                    color: '#1E293B',
                    fontSize: '15px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                  }}
                >
                  <Calendar size={18} color="#8B5CF6" />
                  Call Timing
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    mb: 3,
                    color: '#64748B',
                    display: 'block',
                    fontSize: '13px',
                  }}
                >
                  When should the voice calls be made?
                </Typography>
                
                <FormControl fullWidth>
                  <InputLabel>When should calls be made?</InputLabel>
                  <Select
                    value={answers.voiceTiming || 'immediate'}
                    onChange={(e) => setAnswers({ ...answers, voiceTiming: e.target.value as any })}
                    label="When should calls be made?"
                  >
                    <MenuItem value="immediate">Immediate call</MenuItem>
                    <MenuItem value="after_linkedin">Call after LinkedIn connection accepted</MenuItem>
                  </Select>
                </FormControl>
                
                {answers.voiceTiming === 'after_linkedin' && (
                  <Box sx={{ mt: 2, p: 1.5, bgcolor: '#EFF6FF', borderRadius: '8px', border: '1px solid #BFDBFE' }}>
                    <Typography variant="caption" sx={{ color: '#1E40AF', fontSize: '12px' }}>
                      <strong>Note:</strong> The voice call will only be made after the LinkedIn connection request is accepted. 
                      A condition step will be added to check this before making the call.
                    </Typography>
                  </Box>
                )}
              </Box>
            </>
          )}
        </Box>

        <Stack direction="row" spacing={2} justifyContent="flex-end" sx={{ mt: 4 }}>
          <Button
            endIcon={<ArrowRight size={16} />}
            onClick={handleStepComplete}
            variant="contained"
            disabled={answers.voiceEnabled !== false && (!voiceAgentId || !voiceContext || voiceContext.trim() === '')}
          >
            Continue
          </Button>
        </Stack>
        </Box>
      </StepLayout>
    );
  };

  // Update delay, condition, and LinkedIn messages in answers when they change (Step 4)
  useEffect(() => {
    if (currentStep === 'voice_agent' || currentStep === 'campaign_settings' || currentStep === 'confirmation') {
      setAnswers({
        ...answers,
        delayDays,
        delayHours,
        delayMinutes,
        conditionType,
        enableConnectionMessage,
        linkedinConnectionMessage: enableConnectionMessage ? linkedinConnectionMessage : '',
        linkedinMessage,
      });
    }
  }, [delayDays, delayHours, delayMinutes, conditionType, enableConnectionMessage, linkedinConnectionMessage, linkedinMessage, currentStep]);

  // Update voice agent configuration in answers when they change (Step 5)
  useEffect(() => {
    if (currentStep === 'voice_agent' || currentStep === 'campaign_settings' || currentStep === 'confirmation') {
      setAnswers({
        ...answers,
        voiceAgentId,
        voiceAgentName,
        voiceContext,
      });
    }
  }, [voiceAgentId, voiceAgentName, voiceContext, currentStep]);

  // Update campaign settings in answers when they change
  useEffect(() => {
    if (currentStep === 'campaign_settings' || currentStep === 'confirmation') {
      setAnswers({
        ...answers,
        campaignDuration,
        dailyLeadVolume,
        workingDays,
        smartThrottling,
        delayDays,
        delayHours,
        delayMinutes,
        conditionType,
      });
    }
  }, [campaignDuration, dailyLeadVolume, workingDays, smartThrottling, currentStep]);

  const renderStep6 = () => {
    // Define working days options first
    const workingDaysOptions = [
      { value: 'monday', label: 'Mon' },
      { value: 'tuesday', label: 'Tue' },
      { value: 'wednesday', label: 'Wed' },
      { value: 'thursday', label: 'Thu' },
      { value: 'friday', label: 'Fri' },
      { value: 'saturday', label: 'Sat' },
      { value: 'sunday', label: 'Sun' },
    ];

    // Calculate campaign summary
    const workingDaysCount = workingDays.length;
    const totalLeads = campaignDuration * dailyLeadVolume * (workingDaysCount / 7);
    const riskLevel = dailyLeadVolume <= 10 ? 'Low' : dailyLeadVolume <= 25 ? 'Medium' : 'High';
    
    // Format schedule text
    const getScheduleText = () => {
      if (workingDays.length === 7) return 'All days';
      if (workingDays.length === 5 && workingDays.every(d => ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].includes(d))) {
        return 'Weekdays (Mon–Fri)';
      }
      const dayLabels = workingDays.map(d => {
        const day = workingDaysOptions.find(opt => opt.value === d);
        return day?.label || d;
      });
      return dayLabels.join(', ');
    };

    return (
      <StepLayout
        currentStep={currentStepNumber}
        totalSteps={totalSteps}
        stepTitle={currentStepTitle}
        onBack={handleBack}
        onStepClick={(step) => {
          const steps: GuidedStep[] = [
            'icp_questions',
            'target_definition',
            'platform_selection',
            'conditions_delays',
            'voice_agent',
            'campaign_settings',
            'confirmation',
          ];
          if (step <= steps.length) {
            setCurrentStep(steps[step - 1]);
          }
        }}
      >
        <Box sx={{ maxWidth: '900px', mx: 'auto', pb: 4, width: '100%' }}>
          {/* Campaign Name Card */}
          <Card
            sx={{
              mb: 3,
              borderRadius: '12px',
              border: '1px solid #E2E8F0',
              boxShadow: 'none',
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#1E293B' }}>
                  Campaign Name
                </Typography>
              </Box>
              <TextField
                fullWidth
                required
                label="Campaign Name *"
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                placeholder="e.g., Q1 LinkedIn Outreach Campaign"
                helperText="Give your campaign a memorable name"
                sx={{ mb: 1 }}
              />
            </CardContent>
          </Card>

          {/* Campaign Duration Card */}
          <Card
            sx={{
              mb: 3,
              borderRadius: '12px',
              border: '1px solid #E2E8F0',
              boxShadow: 'none',
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                <Calendar size={20} color="#6366F1" />
                <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#1E293B' }}>
                  Campaign Duration
                </Typography>
              </Box>
              <Typography variant="body1" sx={{ color: '#1E293B', mb: 1, fontWeight: 500 }}>
                How long should this campaign run?
              </Typography>
              
              <Box
                sx={{
                  mb: 2,
                  overflowX: 'auto',
                  overflowY: 'hidden',
                  '&::-webkit-scrollbar': {
                    height: '6px',
                  },
                  '&::-webkit-scrollbar-track': {
                    background: '#F1F5F9',
                    borderRadius: '3px',
                  },
                  '&::-webkit-scrollbar-thumb': {
                    background: '#CBD5E1',
                    borderRadius: '3px',
                    '&:hover': {
                      background: '#94A3B8',
                    },
                  },
                }}
              >
                <Stack 
                  direction="row" 
                  spacing={2} 
                  sx={{ 
                    minWidth: 'max-content',
                    pb: 1,
                  }}
                >
                  {[
                    { days: 7, label: '7 days', subtitle: 'Quick test' },
                    { days: 14, label: '14 days', subtitle: 'Recommended' },
                    { days: 30, label: '30 days', subtitle: 'Long-term' },
                  ].map((option) => (
                    <Box
                      key={option.days}
                      onClick={() => {
                        setCampaignDuration(option.days);
                        setCustomDuration('');
                      }}
                      sx={{
                        cursor: 'pointer',
                        minWidth: '140px',
                        flexShrink: 0,
                        p: 2,
                        borderRadius: '8px',
                        border: campaignDuration === option.days ? '2px solid #6366F1' : '2px solid #E2E8F0',
                        bgcolor: campaignDuration === option.days ? '#F8F9FF' : '#FFFFFF',
                        transition: 'all 0.2s',
                        '&:hover': {
                          borderColor: '#6366F1',
                          transform: 'translateY(-2px)',
                        },
                      }}
                    >
                      <Typography variant="body2" sx={{ fontWeight: 600, color: '#1E293B', mb: 0.5 }}>
                        {option.label}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#64748B', fontSize: '12px' }}>
                        {option.subtitle}
                      </Typography>
                    </Box>
                  ))}
                  <Box
                    onClick={() => setCustomDuration('')}
                    sx={{
                      cursor: 'pointer',
                      minWidth: '140px',
                      flexShrink: 0,
                      p: 2,
                      borderRadius: '8px',
                      border: customDuration !== '' || ![7, 14, 30].includes(campaignDuration) ? '2px solid #6366F1' : '2px solid #E2E8F0',
                      bgcolor: customDuration !== '' || ![7, 14, 30].includes(campaignDuration) ? '#F8F9FF' : '#FFFFFF',
                      transition: 'all 0.2s',
                      '&:hover': {
                        borderColor: '#6366F1',
                        transform: 'translateY(-2px)',
                      },
                    }}
                  >
                    <Typography variant="body2" sx={{ fontWeight: 600, color: '#1E293B' }}>
                      Custom
                    </Typography>
                  </Box>
                </Stack>
              </Box>
              
              {(customDuration !== '' || ![7, 14, 30].includes(campaignDuration)) && (
                <TextField
                  fullWidth
                  size="small"
                  type="number"
                  placeholder="Enter days (e.g., 21)"
                  value={customDuration || campaignDuration}
                  onChange={(e) => {
                    const value = parseInt(e.target.value) || 0;
                    setCustomDuration(e.target.value);
                    if (value > 0) {
                      setCampaignDuration(value);
                    }
                  }}
                  sx={{
                    mt: 2,
                    '& .MuiOutlinedInput-root': {
                      bgcolor: '#FFFFFF',
                      borderRadius: '8px',
                    },
                  }}
                />
              )}
              
              <Box sx={{ mt: 2, p: 1.5, bgcolor: '#F0F9FF', borderRadius: '6px', border: '1px solid #BAE6FD' }}>
                <Typography variant="caption" sx={{ color: '#0369A1', fontSize: '12px' }}>
                  💡 Most successful campaigns run for at least 14 days.
                </Typography>
              </Box>
            </CardContent>
          </Card>

          {/* Daily Lead Volume Card */}
          <Card
            sx={{
              mb: 3,
              borderRadius: '12px',
              border: '1px solid #E2E8F0',
              boxShadow: 'none',
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                <TrendingUp size={20} color="#6366F1" />
                <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#1E293B' }}>
                  Daily Lead Volume
                </Typography>
              </Box>
              <Typography variant="body1" sx={{ color: '#1E293B', mb: 1, fontWeight: 500 }}>
                How many new leads do you want to target per day?
              </Typography>
              
              <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
                {[
                  { value: 10, label: '10 / day', subtitle: 'Safe', color: '#10B981' },
                  { value: 25, label: '25 / day', subtitle: 'Balanced (Recommended)', color: '#6366F1' },
                  { value: 50, label: '50 / day', subtitle: 'Aggressive', color: '#EF4444' },
                ].map((preset) => (
                  <Box
                    key={preset.value}
                    onClick={() => setDailyLeadVolume(preset.value)}
                    sx={{
                      cursor: 'pointer',
                      flex: 1,
                      p: 2,
                      borderRadius: '8px',
                      border: dailyLeadVolume === preset.value ? `2px solid ${preset.color}` : '2px solid #E2E8F0',
                      bgcolor: dailyLeadVolume === preset.value ? `${preset.color}15` : '#FFFFFF',
                      transition: 'all 0.2s',
                      '&:hover': {
                        borderColor: preset.color,
                        transform: 'translateY(-2px)',
                      },
                    }}
                  >
                    <Typography variant="body2" sx={{ fontWeight: 600, color: '#1E293B', mb: 0.5 }}>
                      {preset.label}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#64748B', fontSize: '12px' }}>
                      {preset.subtitle}
                    </Typography>
                  </Box>
                ))}
              </Stack>
              
              <Box sx={{ px: 1 }}>
                <Slider
                  value={dailyLeadVolume}
                  onChange={(e, newValue) => setDailyLeadVolume(newValue as number)}
                  min={5}
                  max={100}
                  step={5}
                  marks={[
                    { value: 10, label: '10' },
                    { value: 25, label: '25' },
                    { value: 50, label: '50' },
                    { value: 75, label: '75' },
                    { value: 100, label: '100' },
                  ]}
                  sx={{
                    color: dailyLeadVolume <= 10 ? '#10B981' : dailyLeadVolume <= 25 ? '#6366F1' : '#EF4444',
                    '& .MuiSlider-thumb': {
                      width: 20,
                      height: 20,
                      boxShadow: '0 2px 8px rgba(99, 102, 241, 0.3)',
                    },
                  }}
                />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                  <Typography variant="caption" sx={{ color: '#64748B' }}>
                    Current: {dailyLeadVolume} leads/day
                  </Typography>
                  {dailyLeadVolume > 25 && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <AlertTriangle size={14} color="#EF4444" />
                      <Typography variant="caption" sx={{ color: '#EF4444', fontWeight: 500 }}>
                        Higher volumes may increase platform risk.
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Box>
            </CardContent>
          </Card>

          {/* Campaign Schedule Card */}
          <Card
            sx={{
              mb: 3,
              borderRadius: '12px',
              border: '1px solid #E2E8F0',
              boxShadow: 'none',
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Typography variant="body1" sx={{ color: '#1E293B', mb: 1, fontWeight: 500 }}>
                On which days should the campaign run?
              </Typography>
              
              <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
                <Box
                  onClick={() => {
                    setWorkingDays(['monday', 'tuesday', 'wednesday', 'thursday', 'friday']);
                  }}
                  sx={{
                    cursor: 'pointer',
                    flex: 1,
                    p: 2,
                    borderRadius: '8px',
                    border: workingDays.length === 5 && workingDays.every(d => ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].includes(d)) 
                      ? '2px solid #6366F1' : '2px solid #E2E8F0',
                    bgcolor: workingDays.length === 5 && workingDays.every(d => ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].includes(d))
                      ? '#F8F9FF' : '#FFFFFF',
                    transition: 'all 0.2s',
                    '&:hover': {
                      borderColor: '#6366F1',
                      transform: 'translateY(-2px)',
                    },
                  }}
                >
                  <Typography variant="body2" sx={{ fontWeight: 600, color: '#1E293B', mb: 0.5 }}>
                    Weekdays
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#64748B', fontSize: '12px' }}>
                    Mon–Fri (Recommended)
                  </Typography>
                </Box>
                <Box
                  onClick={() => {
                    setWorkingDays(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']);
                  }}
                  sx={{
                    cursor: 'pointer',
                    flex: 1,
                    p: 2,
                    borderRadius: '8px',
                    border: workingDays.length === 7 ? '2px solid #6366F1' : '2px solid #E2E8F0',
                    bgcolor: workingDays.length === 7 ? '#F8F9FF' : '#FFFFFF',
                    transition: 'all 0.2s',
                    '&:hover': {
                      borderColor: '#6366F1',
                      transform: 'translateY(-2px)',
                    },
                  }}
                >
                  <Typography variant="body2" sx={{ fontWeight: 600, color: '#1E293B', mb: 0.5 }}>
                    All days
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#64748B', fontSize: '12px' }}>
                    Every day
                  </Typography>
                </Box>
                <Box
                  onClick={() => {
                    // Keep current selection for custom
                  }}
                  sx={{
                    cursor: 'pointer',
                    flex: 1,
                    p: 2,
                    borderRadius: '8px',
                    border: workingDays.length !== 5 && workingDays.length !== 7 ? '2px solid #6366F1' : '2px solid #E2E8F0',
                    bgcolor: workingDays.length !== 5 && workingDays.length !== 7 ? '#F8F9FF' : '#FFFFFF',
                    transition: 'all 0.2s',
                    '&:hover': {
                      borderColor: '#6366F1',
                      transform: 'translateY(-2px)',
                    },
                  }}
                >
                  <Typography variant="body2" sx={{ fontWeight: 600, color: '#1E293B', mb: 0.5 }}>
                    Custom
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#64748B', fontSize: '12px' }}>
                    Select specific days
                  </Typography>
                </Box>
              </Stack>
              
              {(workingDays.length !== 5 || !workingDays.every(d => ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].includes(d))) && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="caption" sx={{ color: '#64748B', mb: 1.5, display: 'block' }}>
                    Select specific days:
                  </Typography>
                  <Stack direction="row" spacing={1.5} flexWrap="wrap" gap={1.5}>
                    {workingDaysOptions.map((day) => {
                      const isSelected = workingDays.includes(day.value);
                      return (
                        <Chip
                          key={day.value}
                          label={day.label}
                          onClick={() => {
                            if (isSelected) {
                              setWorkingDays(workingDays.filter(d => d !== day.value));
                            } else {
                              setWorkingDays([...workingDays, day.value]);
                            }
                          }}
                          sx={{
                            cursor: 'pointer',
                            height: '36px',
                            minWidth: '56px',
                            fontSize: '13px',
                            fontWeight: 500,
                            transition: 'all 0.2s',
                            bgcolor: isSelected ? '#6366F1' : '#FFFFFF',
                            color: isSelected ? '#FFFFFF' : '#64748B',
                            border: isSelected ? 'none' : '2px solid #E2E8F0',
                            '&:hover': {
                              borderColor: '#6366F1',
                              transform: 'scale(1.05)',
                            },
                          }}
                        />
                      );
                    })}
                  </Stack>
                </Box>
              )}
            </CardContent>
          </Card>

          {/* Smart Safety Controls Card */}
          <Card
            sx={{
              mb: 3,
              borderRadius: '12px',
              border: '1px solid #E2E8F0',
              boxShadow: 'none',
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Typography variant="body1" sx={{ color: '#1E293B', mb: 1, fontWeight: 500 }}>
                Enable smart throttling to protect your account?
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 2 }}>
                <Box sx={{ flex: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                    <Shield size={20} color="#6366F1" />
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" component="span" sx={{ fontWeight: 600, color: '#1E293B' }}>
                        {smartThrottling ? 'Enabled' : 'Disabled'}
                      </Typography>
                      {smartThrottling && (
                        <Chip
                          label="Recommended"
                          size="small"
                          sx={{
                            ml: 1,
                            height: '20px',
                            fontSize: '10px',
                            bgcolor: '#10B981',
                            color: '#FFFFFF',
                            fontWeight: 600,
                          }}
                        />
                      )}
                    </Box>
                  </Box>
                  <Typography variant="caption" sx={{ color: '#64748B', fontSize: '13px' }}>
                    Automatically adjusts activity to stay within safe platform limits.
                  </Typography>
                </Box>
                <Switch
                  checked={smartThrottling}
                  onChange={(e) => setSmartThrottling(e.target.checked)}
                  sx={{
                    '& .MuiSwitch-switchBase.Mui-checked': {
                      color: '#6366F1',
                    },
                    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                      bgcolor: '#6366F1',
                    },
                  }}
                />
              </Box>
            </CardContent>
          </Card>

          {/* Advanced Options Card */}
          <Card
            sx={{
              mb: 3,
              borderRadius: '12px',
              border: '1px solid #E2E8F0',
              boxShadow: 'none',
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Button
                fullWidth
                onClick={() => setShowAdvanced(!showAdvanced)}
                sx={{
                  justifyContent: 'space-between',
                  textTransform: 'none',
                  color: '#64748B',
                  fontWeight: 500,
                  '&:hover': {
                    bgcolor: '#F8F9FA',
                  },
                }}
              >
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  Advanced Options
                </Typography>
                <ArrowRight
                  size={16}
                  style={{
                    transform: showAdvanced ? 'rotate(90deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s',
                  }}
                />
              </Button>
              
              {showAdvanced && (
                <Box sx={{ mt: 3, pt: 3, borderTop: '1px solid #E2E8F0' }}>
                  <Stack spacing={3}>
                    {/* Daily Max Connections/Messages */}
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 500, color: '#1E293B', mb: 1 }}>
                        Daily max connections/messages
                      </Typography>
                      <TextField
                        fullWidth
                        size="small"
                        type="number"
                        value={dailyMaxConnections}
                        onChange={(e) => setDailyMaxConnections(parseInt(e.target.value) || 50)}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            bgcolor: '#FFFFFF',
                            borderRadius: '8px',
                          },
                        }}
                      />
                    </Box>
                    
                    {/* Randomized Delays */}
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 500, color: '#1E293B', mb: 0.5 }}>
                          Randomized delays between actions
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#64748B' }}>
                          Adds natural variation to prevent detection
                        </Typography>
                      </Box>
                      <Switch
                        checked={randomizedDelays}
                        onChange={(e) => setRandomizedDelays(e.target.checked)}
                        sx={{
                          '& .MuiSwitch-switchBase.Mui-checked': {
                            color: '#6366F1',
                          },
                          '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                            bgcolor: '#6366F1',
                          },
                        }}
                      />
                    </Box>
                    
                    {/* Auto-pause on Warning */}
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 500, color: '#1E293B', mb: 0.5 }}>
                          Auto-pause on warning signals
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#64748B' }}>
                          Automatically pause if platform warnings detected
                        </Typography>
                      </Box>
                      <Switch
                        checked={autoPauseOnWarning}
                        onChange={(e) => setAutoPauseOnWarning(e.target.checked)}
                        sx={{
                          '& .MuiSwitch-switchBase.Mui-checked': {
                            color: '#6366F1',
                          },
                          '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                            bgcolor: '#6366F1',
                          },
                        }}
                      />
                    </Box>
                    
                    {/* Time Window */}
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 500, color: '#1E293B', mb: 1 }}>
                        Time window for outreach
                      </Typography>
                      <Stack direction="row" spacing={2}>
                        <TextField
                          size="small"
                          type="time"
                          label="Start"
                          value={timeWindowStart}
                          onChange={(e) => setTimeWindowStart(e.target.value)}
                          sx={{
                            flex: 1,
                            '& .MuiOutlinedInput-root': {
                              bgcolor: '#FFFFFF',
                              borderRadius: '8px',
                            },
                          }}
                        />
                        <TextField
                          size="small"
                          type="time"
                          label="End"
                          value={timeWindowEnd}
                          onChange={(e) => setTimeWindowEnd(e.target.value)}
                          sx={{
                            flex: 1,
                            '& .MuiOutlinedInput-root': {
                              bgcolor: '#FFFFFF',
                              borderRadius: '8px',
                            },
                          }}
                        />
                      </Stack>
                    </Box>
                  </Stack>
                </Box>
              )}
            </CardContent>
          </Card>

          {/* Campaign Summary Card */}
          <Card
            sx={{
              mb: 3,
              borderRadius: '12px',
              border: '2px solid #6366F1',
              bgcolor: '#F8F9FF',
              boxShadow: '0 4px 12px rgba(99, 102, 241, 0.1)',
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#1E293B', mb: 2 }}>
                Your campaign will:
              </Typography>
              
              <Stack spacing={1.5} sx={{ mb: 2 }}>
                <Typography variant="body2" sx={{ color: '#1E293B' }}>
                  • Run for <strong>{campaignDuration} days</strong>
                </Typography>
                <Typography variant="body2" sx={{ color: '#1E293B' }}>
                  • Target <strong>{dailyLeadVolume} leads per day</strong>
                </Typography>
                <Typography variant="body2" sx={{ color: '#1E293B' }}>
                  • Operate on <strong>{getScheduleText()}</strong>
                </Typography>
                <Typography variant="body2" sx={{ color: '#1E293B' }}>
                  • Estimated total leads: <strong>~{Math.round(totalLeads)}</strong>
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2" sx={{ color: '#1E293B' }}>
                    • Risk level:
                  </Typography>
                  <Chip
                    label={riskLevel.toLowerCase()}
                    size="small"
                    sx={{
                      bgcolor: riskLevel === 'Low' ? '#10B981' : riskLevel === 'Medium' ? '#6366F1' : '#EF4444',
                      color: '#FFFFFF',
                      fontWeight: 600,
                      fontSize: '11px',
                      textTransform: 'capitalize',
                    }}
                  />
                </Box>
              </Stack>
              
              <Typography variant="caption" sx={{ color: '#64748B', fontSize: '12px', fontStyle: 'italic' }}>
                You can change these settings anytime.
              </Typography>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <Stack direction="row" spacing={2} justifyContent="flex-end" sx={{ mt: 4 }}>
            <Button
              endIcon={<ArrowRight size={18} />}
              onClick={handleStepComplete}
              variant="contained"
              sx={{
                px: 4,
                py: 1.5,
                bgcolor: '#6366F1',
                background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '14px',
                textTransform: 'none',
                boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
                  boxShadow: '0 6px 16px rgba(99, 102, 241, 0.4)',
                  transform: 'translateY(-1px)',
                },
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            >
              Continue
            </Button>
          </Stack>
        </Box>
      </StepLayout>
    );
  };

  // Convert workflow nodes to campaign steps format for API
  const convertWorkflowNodesToSteps = useCallback(() => {
    const nodes = useOnboardingStore.getState().workflowNodes;
    const edges = useOnboardingStore.getState().workflowEdges;
    
    // Create a map of node id to order based on edges (topological sort)
    const nodeOrder: Record<string, number> = {};
    const visited = new Set<string>();
    
    // Find start node (should be the one with no incoming edges, or first node)
    let currentOrder = 0;
    const findStartNode = () => {
      const sourceNodes = new Set(edges.map(e => e.source));
      const targetNodes = new Set(edges.map(e => e.target));
      // Start node is one that appears as source but not as target
      return nodes.find(n => sourceNodes.has(n.id) && !targetNodes.has(n.id)) || nodes[0];
    };
    
    const startNode = findStartNode();
    if (startNode) {
      const traverse = (nodeId: string) => {
        if (visited.has(nodeId)) return;
        visited.add(nodeId);
        nodeOrder[nodeId] = currentOrder++;
        
        // Find all nodes this node connects to
        const outgoingEdges = edges.filter(e => e.source === nodeId);
        outgoingEdges.forEach(edge => {
          traverse(edge.target);
        });
      };
      
      traverse(startNode.id);
    }
    
    // Convert nodes to steps
    const steps = nodes
      .filter(node => node.type !== 'start' && node.type !== 'end')
      .map(node => {
        const nodeData = node.data || {};
        const stepConfig: Record<string, any> = {};
        
        // Extract all config from node.data except title and description
        Object.keys(nodeData).forEach(key => {
          if (key !== 'title' && key !== 'description') {
            stepConfig[key] = nodeData[key];
          }
        });
        
        return {
          type: node.type,
          order: nodeOrder[node.id] ?? 0,
          title: nodeData.title || node.type || 'Step',
          description: nodeData.description || '',
          config: stepConfig,
        };
      })
      .sort((a, b) => a.order - b.order);
    
    return steps;
  }, []);

  // Create campaign API call
  const handleCreateCampaign = useCallback(async () => {
    if (!campaignName || campaignName.trim() === '') {
      setCreateError('Campaign name is required');
      return;
    }

    setIsCreatingCampaign(true);
    setCreateError(null);

    try {
      const steps = convertWorkflowNodesToSteps();
      
      // Validate that lead generation step exists
      const hasLeadGenStep = steps.some(step => step.type === 'lead_generation');
      if (!hasLeadGenStep) {
        setCreateError('Campaign must include a lead generation step. Please go back to Step 1 (Target Definition) and fill in at least one target criteria (Industries, Location, or Roles).');
        setIsCreatingCampaign(false);
        return;
      }
      
      // Prepare campaign config
      const campaignConfig = {
        leads_per_day: dailyLeadVolume,
        lead_gen_offset: 0,
        last_lead_gen_date: null,
      };

      const campaignData = {
        name: campaignName.trim(),
        status: 'draft',
        steps: steps,
        config: campaignConfig,
        leads_per_day: dailyLeadVolume, // Also include for backwards compatibility
      };

      console.log('[Campaign Creation] Creating campaign with data:', campaignData);
      const response = await apiPost<{ success: boolean; data: any }>('/api/campaigns', campaignData);
      
      if (response.success) {
        console.log('[Campaign Creation] Campaign created successfully:', response.data);
        const campaignId = response.data.id || response.data.data?.id;
        
        // Always start the campaign immediately
        if (campaignId) {
          try {
            console.log('[Campaign Creation] Starting campaign immediately...');
            await apiPost<{ success: boolean }>(`/api/campaigns/${campaignId}/start`, {});
            console.log('[Campaign Creation] Campaign started successfully - Apollo lead generation and LinkedIn actions will begin automatically');
          } catch (startError: any) {
            console.error('[Campaign Creation] Error starting campaign:', startError);
            // Don't fail the whole creation if start fails - campaign is still created
            setCreateError(`Campaign created but failed to start: ${startError.message || 'Unknown error'}. You can start it manually from the campaigns page.`);
            // Still navigate, but show the error briefly
            setTimeout(() => router.push('/campaigns'), 2000);
            return;
          }
        }
        
        // Navigate to campaigns page
        console.log('[Campaign Creation] Redirecting to campaigns page...');
        router.push('/campaigns');
      } else {
        throw new Error('Failed to create campaign');
      }
    } catch (error: any) {
      console.error('[Campaign Creation] Error creating campaign:', error);
      setCreateError(error.message || 'Failed to create campaign. Please try again.');
    } finally {
      setIsCreatingCampaign(false);
    }
  }, [campaignName, dailyLeadVolume, startImmediately, convertWorkflowNodesToSteps, router]);

  const renderStep7 = () => {
    const nodes = useOnboardingStore.getState().workflowNodes;
    const stepCount = nodes.filter(n => n.type !== 'start' && n.type !== 'end').length;

    return (
      <StepLayout
        currentStep={currentStepNumber}
        totalSteps={totalSteps}
        stepTitle={currentStepTitle}
        onBack={handleBack}
        onStepClick={(step) => {
          const steps: GuidedStep[] = [
            'icp_questions',
            'target_definition',
            'platform_selection',
            'conditions_delays',
            'voice_agent',
            'campaign_settings',
            'confirmation',
          ];
          if (step <= steps.length) {
            setCurrentStep(steps[step - 1]);
          }
        }}
      >
        <Box sx={{ maxWidth: '900px', mx: 'auto', pb: 4, width: '100%' }}>
          {/* Campaign Summary Card */}
          <Card
            sx={{
              mb: 3,
              borderRadius: '12px',
              border: '1px solid #E2E8F0',
              boxShadow: 'none',
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Typography variant="subtitle1" sx={{ mb: 3, fontWeight: 600, color: '#1E293B', fontSize: '18px' }}>
                🎯 Your Campaign Setup
              </Typography>
              
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" sx={{ color: '#64748B', mb: 1, fontWeight: 600 }}>
                  Campaign Name:
                </Typography>
                <Typography variant="body1" sx={{ color: '#1E293B', mb: 2 }}>
                  {campaignName || <span style={{ fontStyle: 'italic', color: '#94A3B8' }}>Not set</span>}
                </Typography>
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" sx={{ color: '#64748B', mb: 1, fontWeight: 600 }}>
                  Target Audience:
                </Typography>
                {answers.industries && answers.industries.length > 0 && (
                  <Typography variant="body2" sx={{ mb: 0.5, color: '#1E293B' }}>
                    Industries: {answers.industries.join(', ')}
                  </Typography>
                )}
                {answers.roles && answers.roles.length > 0 && (
                  <Typography variant="body2" sx={{ mb: 0.5, color: '#1E293B' }}>
                    Roles: {answers.roles.join(', ')}
                  </Typography>
                )}
                {answers.location && (
                  <Typography variant="body2" sx={{ mb: 0.5, color: '#1E293B' }}>
                    Location: {answers.location}
                  </Typography>
                )}
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" sx={{ color: '#64748B', mb: 1, fontWeight: 600 }}>
                  Platforms:
                </Typography>
                <Typography variant="body2" sx={{ color: '#1E293B' }}>
                  {answers.platforms?.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(', ') || 'None'}
                </Typography>
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" sx={{ color: '#64748B', mb: 1, fontWeight: 600 }}>
                  Campaign Settings:
                </Typography>
                <Typography variant="body2" sx={{ mb: 0.5, color: '#1E293B' }}>
                  Duration: {campaignDuration} days
                </Typography>
                <Typography variant="body2" sx={{ mb: 0.5, color: '#1E293B' }}>
                  Daily Leads: {dailyLeadVolume}
                </Typography>
              </Box>

              <Box>
                <Typography variant="body2" sx={{ color: '#64748B', mb: 1, fontWeight: 600 }}>
                  Workflow Steps:
                </Typography>
                <Typography variant="body2" sx={{ color: '#1E293B' }}>
                  {stepCount} step{stepCount !== 1 ? 's' : ''} configured
                </Typography>
                <Typography variant="caption" sx={{ color: '#64748B', display: 'block', mt: 1 }}>
                  Check the preview panel to see your complete workflow
                </Typography>
              </Box>
            </CardContent>
          </Card>

          {/* Campaign Creation Info */}
          <Card
            sx={{
              mb: 3,
              borderRadius: '12px',
              border: '1px solid #E2E8F0',
              boxShadow: 'none',
              bgcolor: '#F8FAFC',
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                <Box
                  sx={{
                    p: 1,
                    borderRadius: '8px',
                    bgcolor: '#6366F1',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Zap size={20} />
                </Box>
                <Box>
                  <Typography variant="body1" sx={{ fontWeight: 600, color: '#1E293B', mb: 0.5 }}>
                    Ready to Launch Your Campaign
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#64748B', fontSize: '13px' }}>
                    Your campaign will be created and started automatically. Apollo will generate leads based on your criteria, then LinkedIn actions will begin executing immediately.
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>

          {/* Error Alert */}
          {createError && (
            <Alert severity="error" sx={{ mb: 3 }} onClose={() => setCreateError(null)}>
              {createError}
            </Alert>
          )}

          {/* Action Buttons */}
          <Stack direction="row" spacing={2} justifyContent="flex-end">
            <Button
              onClick={() => setCurrentStep('campaign_settings')}
              variant="outlined"
              disabled={isCreatingCampaign}
              sx={{
                px: 3,
                py: 1.5,
              }}
            >
              Back to Edit
            </Button>
            <Button
              endIcon={isCreatingCampaign ? <CircularProgress size={16} color="inherit" /> : <CheckCircle2 size={18} />}
              onClick={handleCreateCampaign}
              variant="contained"
              disabled={isCreatingCampaign || !campaignName || campaignName.trim() === ''}
              sx={{
                px: 4,
                py: 1.5,
                bgcolor: '#6366F1',
                background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '14px',
                textTransform: 'none',
                boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
                  boxShadow: '0 6px 16px rgba(99, 102, 241, 0.4)',
                  transform: 'translateY(-1px)',
                },
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            >
              {isCreatingCampaign ? 'Creating & Starting Campaign...' : 'Create and Start Campaign'}
            </Button>
          </Stack>
        </Box>
      </StepLayout>
    );
  };

  return (
    <Box
      sx={{
        height: '100%',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {currentStep === 'icp_questions' && renderStep1()}
        {currentStep === 'target_definition' && renderStep2()}
        {currentStep === 'platform_selection' && renderStep3Platform()}
        {currentStep === 'conditions_delays' && renderStep4ConditionsAndDelays()}
        {currentStep === 'voice_agent' && renderStep5()}
        {currentStep === 'campaign_settings' && renderStep6()}
        {currentStep === 'confirmation' && renderStep7()}
      </Box>
    </Box>
  );
}

