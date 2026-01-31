"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { useOnboardingStore } from '@/store/onboardingStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, ArrowRight, Building2, Briefcase, MapPin, Users, Smartphone, MessageSquare, Phone, Linkedin, Mail, Zap, Calendar, TrendingUp, Shield, AlertTriangle, Loader2 } from 'lucide-react';
import { fetchICPQuestions } from '@/features/ai-icp-assistant/api';
import { StepType } from '@/types/campaign';
import StepLayout from './StepLayout';
import { apiPost } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { logger } from '@/lib/logger';
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
// ICP Question type
interface ICPQuestion {
  intentKey: string;
  question: string;
  helperText?: string;
}
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
    <div className="flex flex-col gap-4">
      {actions.map((action: Action) => (
        <div key={action.value} className="flex items-center gap-2">
          <Checkbox
            checked={answers[answersKey]?.includes(action.value) || false}
            onCheckedChange={(checked: boolean) => {
              const current = answers[answersKey] || [];
              let updated;
              if (checked) {
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
          <Label>
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
          </Label>
        </div>
      ))}
    </div>
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
  const [isClassifyingIndustry, setIsClassifyingIndustry] = useState(false);
  const [industryClassification, setIndustryClassification] = useState<any>(null);
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
        logger.error('Error loading ICP questions', error);
      } finally {
        setIsLoadingQuestions(false);
      }
    };
    loadQuestions();
  }, []);
  // Clear workflow preview on component mount (page refresh)
  useEffect(() => {
    logger.debug('Component mounted - clearing workflow preview');
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
      const leadsPerDay = dailyLeadVolume || (sourceAnswers as any).leads_per_day || answers.dailyLeadVolume || 25;
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
          logger.warn('Voice agent context is missing, using default');
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
    logger.debug('Generated preview steps', { previewSteps });
    logger.debug('Calling setWorkflowPreview', { stepCount: previewSteps.length });
    setWorkflowPreview(previewSteps);
    // Verify it was set
    setTimeout(() => {
      const currentPreview = useOnboardingStore.getState().workflowPreview;
      logger.debug('Workflow preview in store after set', { currentPreview });
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
      logger.debug('Confirmation step reached - generating workflow preview', { answers, campaignSettings: { campaignName, campaignDuration, dailyLeadVolume, workingDays } });
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
        <div className="max-w-[800px] mx-auto">
          {/* Best Customers Question */}
          <div
            className={`mb-8 p-6 bg-[#FAFBFC] rounded-xl ${
              validationErrors.bestCustomers ? 'border-2 border-[#EF4444]' : 'border border-[#E2E8F0]'
            }`}
          >
            <h3 className="mb-2 font-semibold text-[#1E293B] text-[15px]">
              {isLoadingQuestions ? 'Loading question...' : (getQuestionByIntent('ideal_customer')?.question || '1. Who are your top 2–3 best customers?')}
            </h3>
            {getQuestionByIntent('ideal_customer')?.helperText && (
              <p className="mb-4 text-[#64748B] block text-[13px] italic">
                {getQuestionByIntent('ideal_customer')?.helperText}
              </p>
            )}
            <Textarea
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
              className={`bg-white rounded-lg w-full ${validationErrors.bestCustomers ? 'border-2 border-red-500' : ''}`}
            />
          </div>
          {/* Most Profitable Question */}
          <div
            className={`mb-8 p-6 bg-[#FAFBFC] rounded-xl ${
              validationErrors.mostProfitable ? 'border-2 border-[#EF4444]' : 'border border-[#E2E8F0]'
            }`}
          >
            <h3 className="mb-2 font-semibold text-[#1E293B] text-[15px]">
              {isLoadingQuestions ? 'Loading question...' : (getQuestionByIntent('profitability')?.question || '2. Which of them brought you the most profit overall?')}
            </h3>
            {getQuestionByIntent('profitability')?.helperText && (
              <p className="mb-4 text-[#64748B] block text-[13px] italic">
                {getQuestionByIntent('profitability')?.helperText}
              </p>
            )}
            <p className="mb-4 text-[#64748B] block text-[13px] italic">
              Example: The client with repeat projects, not one-off work
            </p>
            <Input
              placeholder="Enter the most profitable customer"
              value={answers.mostProfitable || ''}
              onChange={(e) => {
                setAnswers({ ...answers, mostProfitable: e.target.value });
              }}
              className="bg-white rounded-lg w-full"
            />
          </div>
          {/* Easiest to Work With Question */}
          <div
            className={`mb-8 p-6 bg-[#FAFBFC] rounded-xl ${
              validationErrors.easiestToWorkWith ? 'border-2 border-[#EF4444]' : 'border border-[#E2E8F0]'
            }`}
          >
            <h3 className="mb-2 font-semibold text-[#1E293B] text-[15px]">
              {isLoadingQuestions ? 'Loading question...' : (getQuestionByIntent('work_compatibility')?.question || '3. Which one was the easiest to work with?')}
            </h3>
            <p className="mb-4 text-[#64748B] block text-[13px] italic">
              Example: Clear decision-maker, paid on time, respected your process
            </p>
            <Input
              placeholder="Enter the easiest customer to work with"
              value={answers.easiestToWorkWith || ''}
              onChange={(e) => {
                setAnswers({ ...answers, easiestToWorkWith: e.target.value });
                // Clear validation error when user starts typing
                if (validationErrors.easiestToWorkWith && e.target.value.trim().length > 0) {
                  setValidationErrors({ ...validationErrors, easiestToWorkWith: false });
                }
              }}
              className={`bg-white rounded-lg w-full ${validationErrors.easiestToWorkWith ? 'border-2 border-red-500' : ''}`}
            />
          </div>
          {/* Section 2: Define Company */}
          {/* Question 5: Company Size */}
          <div
            className={`mb-8 p-6 bg-[#FAFBFC] rounded-xl ${
              validationErrors.companySize ? 'border-2 border-[#EF4444]' : 'border border-[#E2E8F0]'
            }`}
          >
            <h3 className="mb-2 font-semibold text-[#1E293B] text-[15px]">
              5. What size was the company?
            </h3>
            <p className="mb-6 text-[#64748B] block text-[13px] italic">
              Example: 10–50 employees, 50–200 employees
            </p>
            <div className="flex flex-row gap-4">
              {COMPANY_SIZES.map((size) => {
                const isSelected = answers.companySize === size.value;
                return (
                  <Button
                    key={size.value}
                    className={`flex-1 ${
                      isSelected
                        ? 'bg-[#6366F1] text-white border-[#6366F1] hover:bg-[#4F46E5] hover:border-[#4F46E5]'
                        : 'bg-white text-[#1E293B] border-[#E2E8F0] hover:bg-[#F1F5F9] hover:border-[#CBD5E1]'
                    } border transition-all`}
                    onClick={() => {
                      setAnswers({ ...answers, companySize: size.value });
                      if (validationErrors.companySize) {
                        setValidationErrors({ ...validationErrors, companySize: false });
                      }
                    }}
                  >
                    {size.label}
                  </Button>
                );
              })}
            </div>
          </div>
          {/* Question 6: Value Alignment */}
          <div
            className={`mb-8 p-6 bg-[#FAFBFC] rounded-xl ${
              validationErrors.valueAlignment ? 'border-2 border-[#EF4444]' : 'border border-[#E2E8F0]'
            }`}
          >
            <h3 className="mb-2 font-semibold text-[#1E293B] text-[15px]">
              6. Did they already value your service, or did you have to convince them?
            </h3>
            <p className="mb-6 text-[#64748B] block text-[13px] italic">
              Example: They understood the value vs they only compared prices
            </p>
            <div className="flex flex-col gap-4">
              <Button
                className={`w-full text-left justify-start border transition-all ${
                  answers.valueAlignment === 'valued'
                    ? 'bg-[#6366F1] text-white border-[#6366F1] hover:bg-[#4F46E5] hover:border-[#4F46E5]'
                    : 'bg-white text-[#1E293B] border-[#E2E8F0] hover:bg-[#F1F5F9] hover:border-[#CBD5E1]'
                }`}
                onClick={() => {
                  setAnswers({ ...answers, valueAlignment: 'valued' });
                  if (validationErrors.valueAlignment) {
                    setValidationErrors({ ...validationErrors, valueAlignment: false });
                  }
                }}
              >
                They already valued our service
              </Button>
              <Button
                className={`w-full text-left justify-start border transition-all ${
                  answers.valueAlignment === 'convinced'
                    ? 'bg-[#6366F1] text-white border-[#6366F1] hover:bg-[#4F46E5] hover:border-[#4F46E5]'
                    : 'bg-white text-[#1E293B] border-[#E2E8F0] hover:bg-[#F1F5F9] hover:border-[#CBD5E1]'
                }`}
                onClick={() => {
                  setAnswers({ ...answers, valueAlignment: 'convinced' });
                  if (validationErrors.valueAlignment) {
                    setValidationErrors({ ...validationErrors, valueAlignment: false });
                  }
                }}
              >
                We had to convince them
              </Button>
            </div>
          </div>
          {/* Section 3: Decision Maker */}
          {/* Question 8: Problem Feeler */}
          <div
            className={`mb-8 p-6 bg-[#FAFBFC] rounded-xl ${
              validationErrors.problemFeeler ? 'border-2 border-[#EF4444]' : 'border border-[#E2E8F0]'
            }`}
          >
            <h3 className="mb-2 font-semibold text-[#1E293B] text-[15px]">
              8. Who actually felt the problem you solved?
            </h3>
            <p className="mb-4 text-[#64748B] block text-[13px] italic">
              Example: Operations team struggling with delays
            </p>
            <Input
              placeholder="Enter who felt the problem"
              value={answers.problemFeeler || ''}
              onChange={(e) => {
                setAnswers({ ...answers, problemFeeler: e.target.value });
                if (validationErrors.problemFeeler && e.target.value.trim().length > 0) {
                  setValidationErrors({ ...validationErrors, problemFeeler: false });
                }
              }}
              className={`bg-white rounded-lg w-full ${validationErrors.problemFeeler ? 'border-2 border-red-500' : ''}`}
            />
          </div>
          {/* Question 9: Role/Title */}
          <div
            className={`mb-8 p-6 bg-[#FAFBFC] rounded-xl ${
              validationErrors.decisionMakers ? 'border-2 border-[#EF4444]' : 'border border-[#E2E8F0]'
            }`}
          >
            <h3 className="mb-2 font-semibold text-[#1E293B] text-[15px]">
              9. What was that person's role or title?
            </h3>
            <p className="mb-6 text-[#64748B] block text-[13px] italic">
              Example: Operations Manager, Founder, Finance Head
            </p>
            <div className="flex flex-col gap-4 mb-4">
              {DECISION_MAKER_TITLES.map((title) => {
                const isSelected = answers.decisionMakers?.includes(title.value) || false;
                return (
                  <Button
                    key={title.value}
                    className={`w-full text-left justify-start border transition-all ${
                      isSelected
                        ? 'bg-[#6366F1] text-white border-[#6366F1] hover:bg-[#4F46E5] hover:border-[#4F46E5]'
                        : 'bg-white text-[#1E293B] border-[#E2E8F0] hover:bg-[#F1F5F9] hover:border-[#CBD5E1]'
                    }`}
                    onClick={() => {
                      const current = answers.decisionMakers || [];
                      const updated = current.includes(title.value)
                        ? current.filter(t => t !== title.value)
                        : [...current, title.value];
                      setAnswers({ ...answers, decisionMakers: updated });
                    }}
                  >
                    {isSelected && <CheckCircle2 size={18} className="mr-2" />}
                    {title.label}
                  </Button>
                );
              })}
            </div>
            <Input
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
              className="bg-white rounded-lg w-full"
            />
          </div>
          {/* Section 4: Buying Trigger */}
          {/* Question 10: Buying Trigger */}
          <div
            className={`mb-8 p-6 bg-[#FAFBFC] rounded-xl ${
              validationErrors.buyingTrigger ? 'border-2 border-[#EF4444]' : 'border border-[#E2E8F0]'
            }`}
          >
            <h3 className="mb-2 font-semibold text-[#1E293B] text-[15px]">
              10. What situation made them buy?
            </h3>
            <p className="mb-6 text-[#64748B] block text-[13px] italic">
              Example: Expansion, compliance issue, cost overruns
            </p>
            <div className="flex flex-col gap-4">
              {B2B_TRIGGERS.map((trigger) => {
                const isSelected = answers.buyingTrigger === trigger.value;
                return (
                  <Button
                    key={trigger.value}
                    className={`w-full text-left justify-start border transition-all ${
                      isSelected
                        ? 'bg-[#6366F1] text-white border-[#6366F1] hover:bg-[#4F46E5] hover:border-[#4F46E5]'
                        : 'bg-white text-[#1E293B] border-[#E2E8F0] hover:bg-[#F1F5F9] hover:border-[#CBD5E1]'
                    }`}
                    onClick={() => {
                      setAnswers({ ...answers, buyingTrigger: trigger.value });
                      if (validationErrors.buyingTrigger) {
                        setValidationErrors({ ...validationErrors, buyingTrigger: false });
                      }
                    }}
                  >
                    {isSelected && <CheckCircle2 size={18} className="mr-2" />}
                    {trigger.label}
                  </Button>
                );
              })}
            </div>
          </div>
          {/* Question: Would Clone */}
          <div
            className={`mb-8 p-6 bg-[#FAFBFC] rounded-xl ${
              validationErrors.wouldClone ? 'border-2 border-[#EF4444]' : 'border border-[#E2E8F0]'
            }`}
          >
            <h3 className="mb-2 font-semibold text-[#1E293B] text-[15px]">
              If you could clone this customer, would you?
            </h3>
            <p className="mb-6 text-[#64748B] block text-[13px] italic">
              If yes — this is your ICP
            </p>
            <div className="flex flex-row gap-4">
              <Button
                className={`flex-1 border transition-all ${
                  answers.wouldClone === true
                    ? 'bg-[#10B981] text-white border-[#10B981] hover:bg-[#059669] hover:border-[#059669]'
                    : 'bg-white text-[#1E293B] border-[#E2E8F0] hover:bg-[#F1F5F9] hover:border-[#CBD5E1]'
                }`}
                onClick={() => {
                  setAnswers({ ...answers, wouldClone: true });
                  if (validationErrors.wouldClone) {
                    setValidationErrors({ ...validationErrors, wouldClone: false });
                  }
                }}
              >
                Yes
              </Button>
              <Button
                className={`flex-1 border transition-all ${
                  answers.wouldClone === false
                    ? 'bg-[#EF4444] text-white border-[#EF4444] hover:bg-[#DC2626] hover:border-[#DC2626]'
                    : 'bg-white text-[#1E293B] border-[#E2E8F0] hover:bg-[#F1F5F9] hover:border-[#CBD5E1]'
                }`}
                onClick={() => {
                  setAnswers({ ...answers, wouldClone: false });
                  if (validationErrors.wouldClone) {
                    setValidationErrors({ ...validationErrors, wouldClone: false });
                  }
                }}
              >
                No
              </Button>
            </div>
          </div>
          {/* Question 11: Company Name */}
          <div
            className={`mb-8 p-6 bg-[#FAFBFC] rounded-xl ${
              validationErrors.companyName ? 'border-2 border-[#EF4444]' : 'border border-[#E2E8F0]'
            }`}
          >
            <h3 className="mb-2 font-semibold text-[#1E293B] text-[15px]">
              11. What's your company name?
            </h3>
            <Input
              placeholder="Enter your company name"
              value={answers.companyName || ''}
              onChange={(e) => {
                setAnswers({ ...answers, companyName: e.target.value });
                if (validationErrors.companyName && e.target.value.trim().length > 0) {
                  setValidationErrors({ ...validationErrors, companyName: false });
                }
              }}
              className={`bg-white rounded-lg w-full ${validationErrors.companyName ? 'border-2 border-red-500' : ''}`}
            />
          </div>
          {/* Action Buttons */}
          <div className="flex flex-row justify-end gap-4 mt-8">
            <Button
              onClick={handleStepComplete}
              className="px-6 py-3 bg-[#6366F1] hover:bg-[#4F46E5] text-white font-semibold text-sm rounded-lg shadow-md hover:shadow-lg transition-all"
            >
              Next
              <ArrowRight size={18} className="ml-2" />
            </Button>
          </div>
        </div>
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
        <div className="max-w-[800px] mx-auto">
          {/* Industries Card */}
          <div
            className={`mb-8 p-6 bg-[#FAFBFC] rounded-xl transition-all ${
              validationErrors.industries ? 'border-2 border-[#EF4444]' : 'border border-[#E2E8F0]'
            }`}
          >
            <h3 className="mb-2 font-semibold text-[#1E293B] text-[15px]">
              Which industries or company types are you targeting?
            </h3>
            <p className="mb-6 text-[#64748B] block text-[13px] italic">
              Select one or more industries to target
            </p>
            <div className="flex flex-row flex-wrap gap-3 mb-6">
              {INDUSTRY_CHIPS.map(({ label, icon: Icon, color }) => {
                const isSelected = selectedIndustries.includes(label);
                const IconComponent = Icon;
                return (
                  <Badge
                    key={label}
                    className={`cursor-pointer h-10 px-4 text-sm font-medium transition-all rounded-full flex items-center gap-2 ${
                      isSelected
                        ? `border-2 border-[${color}] text-[${color}] scale-105`
                        : 'border-2 border-[#E2E8F0] text-[#64748B]'
                    } hover:scale-105`}
                    style={{
                      borderColor: isSelected ? color : '#E2E8F0',
                      color: isSelected ? color : '#64748B',
                      boxShadow: isSelected ? `0 0 0 4px ${color}15, 0 2px 8px ${color}20` : 'none',
                    }}
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
                  >
                    <IconComponent size={16} />
                    {label}
                  </Badge>
                );
              })}
              {/* +More Button */}
              <Badge
                className="cursor-pointer h-10 px-4 text-sm font-medium bg-white text-[#6366F1] border-2 border-[#6366F1] hover:bg-[#6366F120] hover:scale-105 transition-all rounded-full"
                onClick={() => setShowMoreIndustries(true)}
              >
                +More
              </Badge>
            </div>
            {/* More Industries Dialog */}
            <Dialog
              open={showMoreIndustries}
              onOpenChange={(open) => setShowMoreIndustries(open)}
            >
              <DialogTitle>
                <h2 className="font-semibold text-lg">
                  Select Industries
                </h2>
              </DialogTitle>
              <DialogContent>
                <div className="flex flex-col gap-4 mt-2">
                  <p className="text-[#64748B] mb-4">
                    Select one or more industries from the list below
                  </p>
                  <div className="flex flex-row flex-wrap gap-3">
                    {ADDITIONAL_INDUSTRIES.map((industry) => {
                      const isSelected = selectedIndustries.includes(industry);
                      return (
                        <Badge
                          key={industry}
                          className={`cursor-pointer h-10 px-4 text-sm font-medium transition-all rounded-full ${
                            isSelected
                              ? 'bg-[#6366F1] text-white border-2 border-[#6366F1] hover:bg-[#4F46E5] hover:border-[#4F46E5]'
                              : 'bg-white text-[#64748B] border-2 border-[#E2E8F0] hover:bg-[#F1F5F9] hover:border-[#CBD5E1]'
                          }`}
                          onClick={() => {
                            const current = answers.industries || [];
                            const updated = current.includes(industry)
                              ? current.filter(i => i !== industry)
                              : [...current, industry];
                            setAnswers({ ...answers, industries: updated });
                          }}
                        >
                          {industry}
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              </DialogContent>
              <DialogFooter>
                <Button onClick={() => setShowMoreIndustries(false)}>
                  Done
                </Button>
              </DialogFooter>
            </Dialog>
            <div className="flex gap-2 items-start">
              <Input
                className="bg-white rounded-lg w-full"
                placeholder="Or type a custom industry (e.g., 'SaaS', 'fitness centers')..."
                value={customIndustryInput}
                onChange={(e) => {
                  setCustomIndustryInput(e.target.value);
                  setIndustryClassification(null); // Clear previous classification
                }}
              />
              <Button
                size="sm"
                disabled={!customIndustryInput.trim() || isClassifyingIndustry}
                onClick={async () => {
                  const input = customIndustryInput.trim();
                  if (!input) return;
                  setIsClassifyingIndustry(true);
                  setIndustryClassification(null);
                  try {
                    const response = await apiPost<{
                      success: boolean;
                      confidence?: string;
                      apollo_industry?: string;
                      reasoning?: string;
                      clarifying_question?: string;
                      alternative_industries?: string[];
                      error?: string;
                    }>('/api/ai-icp-assistant/classify-industry', {
                      industry_input: input
                    });
                    if (response.success) {
                      setIndustryClassification(response);
                      // Auto-add the classified industry if confidence is high
                      if (response.confidence === 'high' || response.confidence === 'medium') {
                        const currentIndustries = answers.industries || [];
                        const apolloIndustry = response.apollo_industry;
                        if (apolloIndustry && !currentIndustries.includes(apolloIndustry)) {
                          setAnswers({ 
                            ...answers, 
                            industries: [...currentIndustries, apolloIndustry]
                          });
                        }
                        // Clear input after successful classification
                        setCustomIndustryInput('');
                      }
                    }
                  } catch (error: any) {
                    logger.error('Error classifying industry', error);
                    setIndustryClassification({
                      success: false,
                      error: error.message || 'Failed to classify industry'
                    });
                  } finally {
                    setIsClassifyingIndustry(false);
                  }
                }}
                className="min-w-[120px] whitespace-nowrap"
              >
                {isClassifyingIndustry ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  '🤖 Find Industry'
                )}
              </Button>
            </div>
            {/* Industry Classification Result */}
            {industryClassification && industryClassification.success && (
              <div className="mt-4 p-4 bg-[#F0F9FF] rounded-lg border border-[#3B82F6]">
                <p className="font-semibold text-[#1E293B] mb-2 text-sm">
                  ✅ Matched Apollo Industry: <strong>{industryClassification.apollo_industry}</strong>
                </p>
                <p className="text-[#64748B] mb-2 text-sm">
                  Confidence: {industryClassification.confidence} • {industryClassification.reasoning}
                </p>
                {industryClassification.confidence === 'low' && industryClassification.clarifying_question && (
                  <Alert className="mt-2">
                    <AlertDescription>{industryClassification.clarifying_question}</AlertDescription>
                  </Alert>
                )}
                {industryClassification.alternative_industries && industryClassification.alternative_industries.length > 0 && (
                  <div className="mt-4">
                    <p className="font-semibold text-[#64748B] mb-2 text-sm">
                      Alternative Industries:
                    </p>
                    <div className="flex flex-row flex-wrap gap-2">
                      {industryClassification.alternative_industries.map((alt: string, idx: number) => (
                        <Badge
                          key={idx}
                          className="cursor-pointer hover:bg-[#E0F2FE]"
                          onClick={() => {
                            const currentIndustries = answers.industries || [];
                            if (!currentIndustries.includes(alt)) {
                              setAnswers({ 
                                ...answers, 
                                industries: [...currentIndustries, alt]
                              });
                            }
                          }}
                        >
                          {alt}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            {industryClassification && !industryClassification.success && (
              <Alert variant="destructive" className="mt-4">
                <AlertDescription>{industryClassification.error}</AlertDescription>
              </Alert>
            )}
          </div>
          {/* Roles/Decision Maker Card */}
          <div
            className={`mb-8 p-6 bg-[#FAFBFC] rounded-xl ${
              validationErrors.roles ? 'border-2 border-[#EF4444]' : 'border border-[#E2E8F0]'
            }`}
          >
            <h3 className="mb-2 font-semibold text-[#1E293B] text-[15px]">
              Which roles or job titles are you targeting?
            </h3>
            <p className="mb-6 text-[#64748B] block text-[13px] italic">
              Select one or more roles to target
            </p>
            <div className="flex flex-row flex-wrap gap-2 mb-4">
              {ROLE_CHIPS.map((role) => {
                const isSelected = answers.roles?.includes(role) || false;
                return (
                  <Badge
                    key={role}
                    className={`cursor-pointer px-3 py-1 rounded-full border transition-all ${
                      isSelected
                        ? 'bg-[#6366F1] text-white border-[#6366F1] font-semibold hover:bg-[#4F46E5] hover:border-[#4F46E5]'
                        : 'bg-white text-[#1E293B] border-[#E2E8F0] font-normal hover:bg-[#F1F5F9] hover:border-[#CBD5E1]'
                    }`}
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
                  >
                    {role}
                  </Badge>
                );
              })}
            </div>
            <Input
              className="bg-white rounded-lg w-full"
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
            />
          </div>
          {/* Location Card */}
          <div
            className={`mb-8 p-6 bg-[#FAFBFC] rounded-xl ${
              validationErrors.location ? 'border-2 border-[#EF4444]' : 'border border-[#E2E8F0]'
            }`}
          >
            <h3 className="mb-2 font-semibold text-[#1E293B] text-[15px]">
              Target location?
            </h3>
            <p className="mb-6 text-[#64748B] block text-[13px] italic">
              Enter country, state, city, or any location
            </p>
            <div className="space-y-2">
              {locationTokens.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {locationTokens.map((token, index) => (
                    <Badge
                      key={index}
                      className="bg-white border border-[#E2E8F0] rounded-md h-8 px-2 flex items-center gap-1"
                      onClick={() => {
                        const newTokens = locationTokens.filter((_, i) => i !== index);
                        setLocationTokens(newTokens);
                        setAnswers({ ...answers, location: newTokens.join(', ') });
                      }}
                    >
                      <MapPin size={14} />
                      {token}
                    </Badge>
                  ))}
                </div>
              )}
              <div className="relative">
                <Input
                  className="bg-white rounded-lg w-full pr-10"
                  placeholder="e.g., United States, California, San Francisco"
                  value={locationInput}
                  onChange={(e) => setLocationInput(e.target.value)}
                  onBlur={() => {
                    const trimmedInput = locationInput.trim();
                    if (trimmedInput && !locationTokens.includes(trimmedInput)) {
                      const newTokens = [...locationTokens, trimmedInput];
                      setLocationTokens(newTokens);
                      setAnswers({ ...answers, location: newTokens.join(', ') });
                      setLocationInput('');
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && locationInput.trim() && !locationTokens.includes(locationInput.trim())) {
                      e.preventDefault();
                      const newTokens = [...locationTokens, locationInput.trim()];
                      setLocationTokens(newTokens);
                      setAnswers({ ...answers, location: newTokens.join(', ') });
                      setLocationInput('');
                    }
                  }}
                />
                {locationInput && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#E2E8F0] rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                    {locationSuggestions
                      .filter(suggestion => 
                        suggestion.toLowerCase().includes(locationInput.toLowerCase()) &&
                        !locationTokens.includes(suggestion)
                      )
                      .map((suggestion, idx) => (
                        <div
                          key={idx}
                          className="px-3 py-2 hover:bg-[#F1F5F9] cursor-pointer"
                          onClick={() => {
                            if (!locationTokens.includes(suggestion)) {
                              const newTokens = [...locationTokens, suggestion];
                              setLocationTokens(newTokens);
                              setAnswers({ ...answers, location: newTokens.join(', ') });
                              setLocationInput('');
                            }
                          }}
                        >
                          {suggestion}
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          {/* Action Buttons */}
          <div className="flex flex-row justify-end gap-4 mt-8">
            <Button
              onClick={handleStepComplete}
              className="px-6 py-3 bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] hover:from-[#4F46E5] hover:to-[#7C3AED] text-white font-semibold text-sm rounded-lg shadow-md hover:shadow-lg transition-all"
            >
              Continue
              <ArrowRight size={18} className="ml-2" />
            </Button>
          </div>
        </div>
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
        <div className="max-w-[800px] mx-auto">
          {/* Platform Selection */}
          <div 
            className={`mb-8 p-6 bg-[#FAFBFC] rounded-xl ${
              validationErrors.platforms ? 'border-2 border-[#EF4444]' : 'border border-[#E2E8F0]'
            }`}
          >
            <p className="mb-4 text-[#64748B] text-sm">
              Which platforms do you want to use for outreach?
            </p>
            <div className="flex flex-col gap-4">
              {PLATFORM_OPTIONS.map((platform) => (
                <div
                  key={platform.value}
                  className={`flex items-center gap-2 ${
                    (platform as any).disabled || (platform as any).comingSoon ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
                  }`}
                >
                  <Checkbox
                    checked={selectedPlatforms.includes(platform.value)}
                    disabled={(platform as any).disabled || (platform as any).comingSoon}
                    onCheckedChange={(checked) => {
                      const current = answers.platforms || [];
                      const updated = checked
                        ? [...current, platform.value]
                        : current.filter(p => p !== platform.value);
                      setAnswers({ ...answers, platforms: updated });
                      // Clear validation error when user selects a platform
                      if (validationErrors.platforms && updated.length > 0) {
                        setValidationErrors({ ...validationErrors, platforms: false });
                      }
                      // Update channel connections
                      if (platform.value === 'linkedin') {
                        setChannelConnection('linkedin', checked as boolean);
                      } else if (platform.value === 'email') {
                        setChannelConnection('email', checked as boolean);
                      } else if (platform.value === 'whatsapp') {
                        setChannelConnection('whatsapp', checked as boolean);
                      } else if (platform.value === 'voice') {
                        setChannelConnection('voiceAgent', checked as boolean);
                      }
                    }}
                  />
                  <Label className="flex items-center gap-2">
                    <span>{platform.label}</span>
                    {platform.comingSoon && (
                      <Badge className="h-5 text-[10px] font-semibold bg-[#F59E0B] text-white">
                        Coming Soon
                      </Badge>
                    )}
                  </Label>
                </div>
              ))}
            </div>
          </div>
          {/* LinkedIn Logic Section */}
          {selectedPlatforms.includes('linkedin') && (
            <>
              <div 
                className={`mb-8 p-6 bg-[#FAFBFC] rounded-xl ${
                  validationErrors.linkedinActions ? 'border-2 border-[#EF4444]' : 'border border-[#E2E8F0]'
                }`}
              >
                <p className="mb-4 text-[#64748B] text-sm">
                  What should we do on LinkedIn?
                </p>
                <div className="flex flex-col gap-4">
                  {/* LinkedIn Actions */}
                  <RenderActions actions={LINKEDIN_ACTIONS} answersKey="linkedinActions" answers={answers} setAnswers={setAnswers} validationErrors={validationErrors} setValidationErrors={setValidationErrors} />
                  {/* WhatsApp Actions */}
                  <RenderActions actions={WHATSAPP_ACTIONS} answersKey="whatsappActions" answers={answers} setAnswers={setAnswers} validationErrors={validationErrors} setValidationErrors={setValidationErrors} />
                  {/* Email Actions */}
                  <RenderActions actions={EMAIL_ACTIONS} answersKey="emailActions" answers={answers} setAnswers={setAnswers} validationErrors={validationErrors} setValidationErrors={setValidationErrors} />
                  {/* Voice Actions */}
                  <RenderActions actions={VOICE_ACTIONS} answersKey="voiceActions" answers={answers} setAnswers={setAnswers} validationErrors={validationErrors} setValidationErrors={setValidationErrors} />
                </div>
              </div>
              {/* LinkedIn Connection Message */}
              {answers.linkedinActions?.includes('send_connection') && (
                <div className="mb-8 p-6 bg-[#FAFBFC] rounded-xl border border-[#E2E8F0]">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-[#1E293B] text-[15px] flex items-center gap-2">
                        <Linkedin size={18} color="#0077B5" />
                        Connection Request Message
                      </h3>
                      <p className="mt-1 text-[#64748B] block text-[13px]">
                        LinkedIn limits connection messages to 4-5 per month for normal accounts
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={enableConnectionMessage}
                        onCheckedChange={(checked) => setEnableConnectionMessage(checked as boolean)}
                      />
                      <Label>{enableConnectionMessage ? 'Enabled' : 'Disabled'}</Label>
                    </div>
                  </div>
                  {enableConnectionMessage && (
                    <div>
                      <Label>Connection Request Message</Label>
                      <Textarea
                        className="bg-white rounded-lg w-full mt-2"
                        rows={4}
                        value={linkedinConnectionMessage}
                        onChange={(e) => setLinkedinConnectionMessage(e.target.value)}
                        placeholder="Hi {{first_name}}, I'd like to connect with you..."
                      />
                      <p className="mt-1 text-xs text-[#64748B]">
                        Use {'{{'}first_name{'}}'}, {'{{'}last_name{'}}'}, {'{{'}company{'}}'}, {'{{'}job_title{'}}'} for personalization
                      </p>
                    </div>
                  )}
                </div>
              )}
              {/* LinkedIn Message Content */}
              {answers.linkedinActions?.includes('send_message') && (
                <div
                  className={`mb-8 p-6 bg-[#FAFBFC] rounded-xl ${
                    validationErrors.linkedinMessage ? 'border-2 border-[#EF4444]' : 'border border-[#E2E8F0]'
                  }`}
                >
                  <h3 className="mb-2 font-semibold text-[#1E293B] text-[15px] flex items-center gap-2">
                    <MessageSquare size={18} color="#0077B5" />
                    LinkedIn Message Content
                  </h3>
                  <div>
                    <Label>LinkedIn Message *</Label>
                    <Textarea
                      className={`bg-white rounded-lg w-full mt-2 ${validationErrors.linkedinMessage ? 'border-2 border-red-500' : ''}`}
                      rows={5}
                      value={linkedinMessage}
                      onChange={(e) => {
                        setLinkedinMessage(e.target.value);
                        if (validationErrors.linkedinMessage && e.target.value.trim().length > 0) {
                          setValidationErrors({ ...validationErrors, linkedinMessage: false });
                        }
                      }}
                      placeholder="Hi {{first_name}}, I noticed your work in {{company}} and thought you might be interested in..."
                    />
                    <p className="mt-1 text-xs text-[#64748B]">
                      Use {'{{'}first_name{'}}'}, {'{{'}last_name{'}}'}, {'{{'}company{'}}'}, {'{{'}job_title{'}}'} for personalization
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
          {/* WhatsApp Logic Section */}
          {selectedPlatforms.includes('whatsapp') && (
            <div
              className={`mb-8 p-6 bg-[#FAFBFC] rounded-xl ${
                validationErrors.whatsappMessage ? 'border-2 border-[#EF4444]' : 'border border-[#E2E8F0]'
              }`}
            >
              <h3 className="mb-2 font-semibold text-[#1E293B] text-[15px] flex items-center gap-2">
                <MessageSquare size={18} color="#25D366" />
                WhatsApp Message
              </h3>
              <div>
                <Label>WhatsApp Message *</Label>
                <Textarea
                  className={`bg-white rounded-lg w-full mt-2 ${validationErrors.whatsappMessage ? 'border-2 border-red-500' : ''}`}
                  rows={5}
                  value={answers.whatsappMessage || ''}
                  onChange={(e) => {
                    setAnswers({ ...answers, whatsappMessage: e.target.value });
                    if (validationErrors.whatsappMessage && e.target.value.trim().length > 0) {
                      setValidationErrors({ ...validationErrors, whatsappMessage: false });
                    }
                  }}
                  placeholder="Hi {{first_name}}, I wanted to reach out about..."
                />
                <p className="mt-1 text-xs text-[#64748B]">
                  Use {'{{'}first_name{'}}'}, {'{{'}last_name{'}}'}, {'{{'}company{'}}'}, {'{{'}job_title{'}}'} for personalization
                </p>
              </div>
            </div>
          )}
          {/* Email Logic Section */}
          {selectedPlatforms.includes('email') && (
            <>
              <div
                className={`mb-8 p-6 bg-[#FAFBFC] rounded-xl ${
                  validationErrors.emailSubject ? 'border-2 border-[#EF4444]' : 'border border-[#E2E8F0]'
                }`}
              >
                <h3 className="mb-2 font-semibold text-[#1E293B] text-[15px] flex items-center gap-2">
                  <Mail size={18} color="#6366F1" />
                  Email Subject
                </h3>
                <div>
                  <Label>Email Subject *</Label>
                  <Input
                    className={`bg-white rounded-lg w-full mt-2 ${validationErrors.emailSubject ? 'border-2 border-red-500' : ''}`}
                    value={answers.emailSubject || ''}
                    onChange={(e) => {
                      setAnswers({ ...answers, emailSubject: e.target.value });
                      if (validationErrors.emailSubject && e.target.value.trim().length > 0) {
                        setValidationErrors({ ...validationErrors, emailSubject: false });
                      }
                    }}
                    placeholder="Quick question about {{company}}"
                  />
                  <p className="mt-1 text-xs text-[#64748B]">
                    Use {'{{'}first_name{'}}'}, {'{{'}last_name{'}}'}, {'{{'}company{'}}'}, {'{{'}job_title{'}}'} for personalization
                  </p>
                </div>
              </div>
              <div
                className={`mb-8 p-6 bg-[#FAFBFC] rounded-xl ${
                  validationErrors.emailMessage ? 'border-2 border-[#EF4444]' : 'border border-[#E2E8F0]'
                }`}
              >
                <h3 className="mb-2 font-semibold text-[#1E293B] text-[15px] flex items-center gap-2">
                  <Mail size={18} color="#6366F1" />
                  Email Message
                </h3>
                <div>
                  <Label>Email Message *</Label>
                  <Textarea
                    className={`bg-white rounded-lg w-full mt-2 ${validationErrors.emailMessage ? 'border-2 border-red-500' : ''}`}
                    rows={5}
                    value={answers.emailMessage || ''}
                    onChange={(e) => {
                      setAnswers({ ...answers, emailMessage: e.target.value });
                      if (validationErrors.emailMessage && e.target.value.trim().length > 0) {
                        setValidationErrors({ ...validationErrors, emailMessage: false });
                      }
                    }}
                    placeholder="Hi {{first_name}}, I noticed your work in {{company}} and thought you might be interested in..."
                  />
                  <p className="mt-1 text-xs text-[#64748B]">
                    Use {'{{'}first_name{'}}'}, {'{{'}last_name{'}}'}, {'{{'}company{'}}'}, {'{{'}job_title{'}}'} for personalization
                  </p>
                </div>
              </div>
            </>
          )}
          {/* Voice Logic Section */}
          {selectedPlatforms.includes('voice') && (
            <>
              <div className="mb-8">
                <p className="mb-4 text-[#64748B] text-sm">
                  Do you want to enable AI voice calls?
                </p>
                <div className="flex items-center gap-2 mb-6">
                  <Checkbox
                    checked={answers.voiceEnabled !== false}
                    onCheckedChange={(checked) => setAnswers({ ...answers, voiceEnabled: checked as boolean })}
                  />
                  <Label>Enable AI voice calls</Label>
                </div>
              </div>
              {answers.voiceEnabled !== false && (
                <>
                  {/* Voice Agent Selection */}
                  <div
                    className={`mb-8 p-6 bg-[#FAFBFC] rounded-xl ${
                      validationErrors.voiceAgentId ? 'border-2 border-[#EF4444]' : 'border border-[#E2E8F0]'
                    }`}
                  >
                    <h3 className="mb-2 font-semibold text-[#1E293B] text-[15px] flex items-center gap-2">
                      <Phone size={18} color="#8B5CF6" />
                      Voice Agent Configuration
                    </h3>
                    <p className="mb-6 text-[#64748B] block text-[13px]">
                      Select the voice agent to use for calls
                    </p>
                    <div className="mb-6">
                      <Label>Voice Agent *</Label>
                      <Select
                        value={answers.voiceAgentId || voiceAgentId || '24'}
                        onValueChange={(agentId) => {
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
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select voice agent" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="24">VAPI Agent</SelectItem>
                          <SelectItem value="1">Agent 1</SelectItem>
                          <SelectItem value="2">Agent 2</SelectItem>
                          <SelectItem value="3">Agent 3</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="mt-2 text-[#64748B] text-[12px]">
                        Each agent has its own pre-configured template and settings
                      </p>
                    </div>
                    <div>
                      <Label>Call Context *</Label>
                      <Textarea
                        className={`bg-white rounded-lg w-full mt-2 ${validationErrors.voiceContext ? 'border-2 border-red-500' : ''}`}
                        rows={4}
                        value={answers.voiceContext || voiceContext || ''}
                        onChange={(e) => {
                          const value = e.target.value;
                          setVoiceContext(value);
                          setAnswers({ ...answers, voiceContext: value });
                          if (validationErrors.voiceContext && value.trim().length > 0) {
                            setValidationErrors({ ...validationErrors, voiceContext: false });
                          }
                        }}
                        placeholder="Provide context about the lead, company, or what to discuss in the call. Example: 'This is a follow-up call about our corporate travel services. The lead is interested in travel management for their company.'"
                      />
                      <p className="mt-1 text-xs text-[#64748B]">
                        Required: This context will be provided to the voice agent to personalize the conversation
                      </p>
                      
                    </div>
                  </div>
                  {/* Call Timing */}
                  <div className="mb-8 p-6 bg-[#FAFBFC] rounded-xl border border-[#E2E8F0]">
                    <h3 className="mb-2 font-semibold text-[#1E293B] text-[15px] flex items-center gap-2">
                      <Calendar size={18} color="#8B5CF6" />
                      Call Timing
                    </h3>
                    <p className="mb-6 text-[#64748B] block text-[13px]">
                      When should the voice calls be made?
                    </p>
                    <div>
                      <Label>When should calls be made?</Label>
                      <Select
                        value={answers.voiceTiming || 'immediate'}
                        onValueChange={(value) => setAnswers({ ...answers, voiceTiming: value as any })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select timing" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="immediate">Immediate call</SelectItem>
                          <SelectItem value="after_linkedin">Call after LinkedIn connection accepted</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {answers.voiceTiming === 'after_linkedin' && (
                      <div className="mt-4 p-3 bg-[#EFF6FF] rounded-lg border border-[#BFDBFE]">
                        <p className="text-[#1E40AF] text-[12px]">
                          <strong>Note:</strong> The voice call will only be made after the LinkedIn connection request is accepted. 
                          A condition step will be added to check this before making the call.
                        </p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </>
          )}
          <div className="flex flex-row justify-end gap-4 mt-8">
            <Button
              onClick={handleStepComplete}
              disabled={!answers.platforms || answers.platforms.length === 0}
              className="px-6 py-3 bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] hover:from-[#4F46E5] hover:to-[#7C3AED] text-white font-semibold text-sm rounded-lg shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continue
              <ArrowRight size={16} className="ml-2" />
            </Button>
          </div>
        </div>
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
        <div className="max-w-[800px] mx-auto">
          <p className="mb-6 text-[#64748B] text-sm">
            Configure when and how your campaign actions should execute. Set delays between steps and conditions that must be met before proceeding.
          </p>
          {/* Delay Configuration */}
          <div className="mb-8 p-6 bg-[#FAFBFC] rounded-xl border border-[#E2E8F0]">
            <div className="flex items-center gap-2 mb-6">
              <Calendar size={20} color="#6366F1" />
              <h3 className="font-semibold text-[#1E293B] text-base">
                Delay Between Actions
              </h3>
            </div>
            <p className="mb-6 text-[#64748B] text-[13px]">
              How long should the system wait before executing the next action? This helps make your outreach feel more natural.
            </p>
            <div className="flex gap-6 items-start">
              <div className="flex-1">
                <Label>Days</Label>
                <Select
                  value={String(delayDays)}
                  onValueChange={(value) => {
                    const newValue = Number(value);
                    setDelayDays(newValue);
                    setAnswers({ ...answers, delayDays: newValue });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Days" />
                  </SelectTrigger>
                  <SelectContent>
                    {[0, 1, 2, 3, 4, 5, 6, 7, 14, 21, 30].map((day) => (
                      <SelectItem key={day} value={String(day)}>
                        {day} {day === 1 ? 'day' : 'days'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <Label>Hours</Label>
                <Select
                  value={String(delayHours)}
                  onValueChange={(value) => {
                    const newValue = Number(value);
                    setDelayHours(newValue);
                    setAnswers({ ...answers, delayHours: newValue });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Hours" />
                  </SelectTrigger>
                  <SelectContent>
                    {[0, 1, 2, 3, 4, 6, 8, 12, 18, 24].map((hour) => (
                      <SelectItem key={hour} value={String(hour)}>
                        {hour} {hour === 1 ? 'hour' : 'hours'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <Label>Minutes</Label>
                <Select
                  value={String(delayMinutes)}
                  onValueChange={(value) => {
                    const newValue = Number(value);
                    setDelayMinutes(newValue);
                    setAnswers({ ...answers, delayMinutes: newValue });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Minutes" />
                  </SelectTrigger>
                  <SelectContent>
                    {[0, 15, 30, 45, 60, 90, 120].map((min) => (
                      <SelectItem key={min} value={String(min)}>
                        {min} {min === 1 ? 'minute' : 'minutes'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="mt-4 p-4 bg-[#EFF6FF] rounded-lg border border-[#BFDBFE]">
              <p className="text-[#1E40AF] text-[12px] flex items-center gap-1">
                <AlertTriangle size={14} />
                <strong>Example:</strong> If you set 1 day, 2 hours, and 30 minutes, the system will wait 1 day, 2 hours, and 30 minutes before executing the next action in your campaign.
              </p>
            </div>
          </div>
          {/* Condition Configuration */}
          {conditionOptions.length > 0 && (
            <div className="mb-8 p-6 bg-[#FAFBFC] rounded-xl border border-[#E2E8F0]">
              <div className="flex items-center gap-2 mb-6">
                <Shield size={20} color="#6366F1" />
                <h3 className="font-semibold text-[#1E293B] text-base">
                  Conditions to Wait For
                </h3>
              </div>
              <p className="mb-6 text-[#64748B] text-[13px]">
                Choose what must happen before proceeding to the next action. The system will wait until this condition is met.
              </p>
              <div className="flex flex-col gap-4">
                {conditionOptions.map((option) => (
                  <Card
                    key={option.value}
                    className={`p-4 cursor-pointer border transition-all ${
                      conditionType === option.value
                        ? 'border-2 border-[#6366F1] bg-[#EEF2FF] hover:border-[#6366F1] hover:bg-[#EEF2FF]'
                        : 'border border-[#E2E8F0] bg-white hover:border-[#6366F1] hover:bg-[#F8FAFC]'
                    }`}
                    onClick={() => {
                      setConditionType(option.value);
                      setAnswers({ ...answers, conditionType: option.value });
                    }}
                  >
                    <div className="flex items-start gap-4">
                      <Checkbox
                        checked={conditionType === option.value}
                        onCheckedChange={() => {
                          setConditionType(option.value);
                          setAnswers({ ...answers, conditionType: option.value });
                        }}
                        className="text-indigo-500"
                      />
                      <div className="flex-1">
                        <h4 className="font-semibold text-[#1E293B] mb-1 text-sm">
                          {option.label}
                        </h4>
                        <p className="text-[#64748B] text-[12px]">
                          {option.description}
                        </p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
              <div className="mt-4 p-4 bg-[#F0FDF4] rounded-lg border border-[#BBF7D0]">
                <p className="text-[#166534] text-[12px] flex items-center gap-1">
                  <CheckCircle2 size={14} />
                  <strong>How it works:</strong> After the delay period, the system will check if this condition is met. If yes, it proceeds to the next action. If not, it continues waiting.
                </p>
              </div>
            </div>
          )}
          {/* Platform-specific information */}
          {selectedPlatforms.length > 0 && (
            <div className="mb-8 p-6 bg-[#FFFBEB] rounded-xl border border-[#FDE68A]">
              <h4 className="font-semibold text-[#92400E] mb-2 flex items-center gap-2 text-sm">
                <TrendingUp size={16} />
                How This Applies to Your Campaign
              </h4>
              <div className="flex flex-col gap-2 mt-4">
                {hasLinkedIn && answers.linkedinActions?.includes('send_message') && (
                  <p className="text-[#78350F] text-[13px]">
                    • <strong>LinkedIn:</strong> After sending a connection request, the system will wait for the configured delay, then check if the connection was accepted before sending a message.
                  </p>
                )}
                {hasEmail && hasLinkedIn && (
                  <p className="text-[#78350F] text-[13px]">
                    • <strong>Email:</strong> If you're also using LinkedIn, the email will be sent after the delay period following the LinkedIn connection.
                  </p>
                )}
                {hasVoice && (
                  <p className="text-[#78350F] text-[13px]">
                    • <strong>Voice Call:</strong> The call will be made after the configured condition is met (e.g., after LinkedIn connection is accepted).
                  </p>
                )}
                {hasWhatsApp && (
                  <p className="text-[#78350F] text-[13px]">
                    • <strong>WhatsApp:</strong> Messages will be sent after the configured delay period.
                  </p>
                )}
              </div>
            </div>
          )}
          <Button
            className="mt-4 py-3 w-full text-[15px] font-semibold bg-[#6366F1] hover:bg-[#4F46E5]"
            onClick={handleStepComplete}
          >
            Continue
            <ArrowRight size={18} className="ml-2" />
          </Button>
        </div>
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
        <div className="max-w-[800px] mx-auto">
        <div className="mb-8">
          <p className="mb-4 text-[#64748B] text-sm">
            Do you want to enable AI voice calls?
          </p>
          <div className="flex items-center gap-2 mb-6">
            <Checkbox
              checked={answers.voiceEnabled !== false}
              onCheckedChange={(checked) => setAnswers({ ...answers, voiceEnabled: checked as boolean })}
            />
            <Label>Enable AI voice calls</Label>
          </div>
          {answers.voiceEnabled !== false && (
            <>
              {/* Voice Agent Selection - REQUIRED */}
              <div className="mb-8 p-6 bg-[#FAFBFC] rounded-xl border border-[#E2E8F0]">
                <h3 className="mb-2 font-semibold text-[#1E293B] text-[15px] flex items-center gap-2">
                  <Phone size={18} color="#8B5CF6" />
                  Voice Agent Configuration
                </h3>
                <p className="mb-6 text-[#64748B] block text-[13px]">
                  Select the voice agent to use for calls
                </p>
                <div className="mb-6">
                  <Label>Voice Agent *</Label>
                  <Select
                    value={voiceAgentId}
                    onValueChange={(agentId) => {
                      setVoiceAgentId(agentId);
                      setVoiceAgentName(agentNames[agentId] || 'Custom Agent');
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select voice agent" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="24">VAPI Agent</SelectItem>
                      <SelectItem value="1">Agent 1</SelectItem>
                      <SelectItem value="2">Agent 2</SelectItem>
                      <SelectItem value="3">Agent 3</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="mt-2 text-[#64748B] text-[12px]">
                    Each agent has its own pre-configured template and settings
                  </p>
                </div>
                <div>
                  <Label>Call Context *</Label>
                  <Textarea
                    className={`bg-white rounded-lg w-full mt-2 ${!voiceContext || voiceContext.trim() === '' ? 'border-2 border-red-500' : ''}`}
                    rows={4}
                    value={voiceContext}
                    onChange={(e) => setVoiceContext(e.target.value)}
                    placeholder="Provide context about the lead, company, or what to discuss in the call. Example: 'This is a follow-up call about our corporate travel services. The lead is interested in travel management for their company.'"
                  />
                  <p className="mt-1 text-xs text-[#64748B]">
                    Required: This context will be provided to the voice agent to personalize the conversation
                  </p>
                </div>
                {(!voiceContext || voiceContext.trim() === '') && (
                  <p className="mt-2 text-xs text-red-500 block">
                    ⚠️ Call context is required. The voice agent needs this information to conduct the conversation.
                  </p>
                )}
              </div>
              {/* Timing Configuration */}
              <div className="mb-8 p-6 bg-[#FAFBFC] rounded-xl border border-[#E2E8F0]">
                <h3 className="mb-2 font-semibold text-[#1E293B] text-[15px] flex items-center gap-2">
                  <Calendar size={18} color="#8B5CF6" />
                  Call Timing
                </h3>
                <p className="mb-6 text-[#64748B] block text-[13px]">
                  When should the voice calls be made?
                </p>
                <div>
                  <Label>When should calls be made?</Label>
                  <Select
                    value={answers.voiceTiming || 'immediate'}
                    onValueChange={(value) => setAnswers({ ...answers, voiceTiming: value as any })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select timing" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="immediate">Immediate call</SelectItem>
                      <SelectItem value="after_linkedin">Call after LinkedIn connection accepted</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {answers.voiceTiming === 'after_linkedin' && (
                  <div className="mt-4 p-3 bg-[#EFF6FF] rounded-lg border border-[#BFDBFE]">
                    <p className="text-[#1E40AF] text-[12px]">
                      <strong>Note:</strong> The voice call will only be made after the LinkedIn connection request is accepted. 
                      A condition step will be added to check this before making the call.
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
        <div className="flex flex-row justify-end gap-4 mt-8">
          <Button
            onClick={handleStepComplete}
            disabled={answers.voiceEnabled !== false && (!voiceAgentId || !voiceContext || voiceContext.trim() === '')}
            className="px-6 py-3 bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] hover:from-[#4F46E5] hover:to-[#7C3AED] text-white font-semibold text-sm rounded-lg shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Continue
            <ArrowRight size={16} className="ml-2" />
          </Button>
        </div>
        </div>
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
        <div className="max-w-[900px] mx-auto pb-8 w-full">
          {/* Campaign Name Card */}
          <Card className="mb-6 rounded-xl border border-[#E2E8F0] shadow-none">
            <CardContent className="p-6">
              <h3 className="font-semibold text-[#1E293B] mb-4">
                Campaign Name
              </h3>
              <div>
                <Label>Campaign Name *</Label>
                <Input
                  className="bg-white rounded-lg w-full mt-2"
                  required
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  placeholder="e.g., Q1 LinkedIn Outreach Campaign"
                />
                <p className="mt-1 text-xs text-[#64748B]">
                  Give your campaign a memorable name
                </p>
              </div>
            </CardContent>
          </Card>
          {/* Campaign Duration Card */}
          <Card className="mb-6 rounded-xl border border-[#E2E8F0] shadow-none">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <Calendar size={20} color="#6366F1" />
                <h3 className="font-semibold text-[#1E293B]">
                  Campaign Duration
                </h3>
              </div>
              <p className="text-[#1E293B] mb-4 font-medium">
                How long should this campaign run?
              </p>
              <div className="mb-4 overflow-x-auto overflow-y-hidden scrollbar-thin scrollbar-thumb-[#CBD5E1] scrollbar-track-[#F1F5F9]">
                <div className="flex flex-row gap-4 min-w-max pb-2">
                  {[
                    { days: 7, label: '7 days', subtitle: 'Quick test' },
                    { days: 14, label: '14 days', subtitle: 'Recommended' },
                    { days: 30, label: '30 days', subtitle: 'Long-term' },
                  ].map((option) => (
                    <div
                      key={option.days}
                      onClick={() => {
                        setCampaignDuration(option.days);
                        setCustomDuration('');
                      }}
                      className={`cursor-pointer min-w-[140px] flex-shrink-0 p-4 rounded-lg border transition-all ${
                        campaignDuration === option.days
                          ? 'border-2 border-[#6366F1] bg-[#F8F9FF]'
                          : 'border-2 border-[#E2E8F0] bg-white'
                      } hover:border-[#6366F1] hover:-translate-y-0.5`}
                    >
                      <p className="font-semibold text-[#1E293B] mb-1 text-sm">
                        {option.label}
                      </p>
                      <p className="text-[#64748B] text-[12px]">
                        {option.subtitle}
                      </p>
                    </div>
                  ))}
                  <div
                    onClick={() => setCustomDuration('')}
                    className={`cursor-pointer min-w-[140px] flex-shrink-0 p-4 rounded-lg border transition-all ${
                      customDuration !== '' || ![7, 14, 30].includes(campaignDuration)
                        ? 'border-2 border-[#6366F1] bg-[#F8F9FF]'
                        : 'border-2 border-[#E2E8F0] bg-white'
                    } hover:border-[#6366F1] hover:-translate-y-0.5`}
                  >
                    <p className="font-semibold text-[#1E293B] text-sm">
                      Custom
                    </p>
                  </div>
                </div>
              </div>
              {(customDuration !== '' || ![7, 14, 30].includes(campaignDuration)) && (
                <Input
                  type="number"
                  className="mt-2 bg-white rounded-lg w-full"
                  placeholder="Enter days (e.g., 21)"
                  value={customDuration || campaignDuration}
                  onChange={(e) => {
                    const value = parseInt(e.target.value) || 0;
                    setCustomDuration(e.target.value);
                    if (value > 0) {
                      setCampaignDuration(value);
                    }
                  }}
                />
              )}
              <div className="mt-4 p-3 bg-[#F0F9FF] rounded-md border border-[#BAE6FD]">
                <p className="text-[#0369A1] text-[12px]">
                  💡 Most successful campaigns run for at least 14 days.
                </p>
              </div>
            </CardContent>
          </Card>
          {/* Daily Lead Volume Card */}
          <Card className="mb-6 rounded-xl border border-[#E2E8F0] shadow-none">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <TrendingUp size={20} color="#6366F1" />
                <h3 className="font-semibold text-[#1E293B]">
                  Daily Lead Volume
                </h3>
              </div>
              <p className="text-[#1E293B] mb-4 font-medium">
                How many new leads do you want to target per day?
              </p>
              <div className="flex flex-row gap-4 mb-6">
                {[
                  { value: 10, label: '10 / day', subtitle: 'Safe', color: '#10B981' },
                  { value: 25, label: '25 / day', subtitle: 'Balanced (Recommended)', color: '#6366F1' },
                  { value: 50, label: '50 / day', subtitle: 'Aggressive', color: '#EF4444' },
                ].map((preset) => (
                  <div
                    key={preset.value}
                    onClick={() => setDailyLeadVolume(preset.value)}
                    className={`cursor-pointer flex-1 p-4 rounded-lg border transition-all ${
                      dailyLeadVolume === preset.value
                        ? `border-2 border-[${preset.color}] bg-[${preset.color}]15`
                        : 'border-2 border-[#E2E8F0] bg-white'
                    } hover:border-[${preset.color}] hover:-translate-y-0.5`}
                    style={{
                      borderColor: dailyLeadVolume === preset.value ? preset.color : '#E2E8F0',
                      backgroundColor: dailyLeadVolume === preset.value ? `${preset.color}15` : '#FFFFFF',
                    }}
                  >
                    <p className="font-semibold text-[#1E293B] mb-1 text-sm">
                      {preset.label}
                    </p>
                    <p className="text-[#64748B] text-[12px]">
                      {preset.subtitle}
                    </p>
                  </div>
                ))}
              </div>
              <div className="px-1">
                <Slider
                  value={dailyLeadVolume}
                  onValueChange={(value) => setDailyLeadVolume(value)}
                  min={5}
                  max={100}
                  step={5}
                  className={dailyLeadVolume <= 10 ? 'text-[#10B981]' : dailyLeadVolume <= 25 ? 'text-[#6366F1]' : 'text-[#EF4444]'}
                />
                <div className="flex justify-between mt-2">
                  <p className="text-xs text-[#64748B]">
                    Current: {dailyLeadVolume} leads/day
                  </p>
                  {dailyLeadVolume > 25 && (
                    <div className="flex items-center gap-1">
                      <AlertTriangle size={14} color="#EF4444" />
                      <p className="text-xs text-[#EF4444] font-medium">
                        Higher volumes may increase platform risk.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
          {/* Campaign Schedule Card */}
          <Card className="mb-6 rounded-xl border border-[#E2E8F0] shadow-none">
            <CardContent className="p-6">
              <p className="text-[#1E293B] mb-4 font-medium">
                On which days should the campaign run?
              </p>
              <div className="flex flex-row gap-4 mb-6">
                <div
                  onClick={() => {
                    setWorkingDays(['monday', 'tuesday', 'wednesday', 'thursday', 'friday']);
                  }}
                  className={`cursor-pointer flex-1 p-4 rounded-lg border transition-all ${
                    workingDays.length === 5 && workingDays.every(d => ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].includes(d))
                      ? 'border-2 border-[#6366F1] bg-[#F8F9FF]'
                      : 'border-2 border-[#E2E8F0] bg-white'
                  } hover:border-[#6366F1] hover:-translate-y-0.5`}
                >
                  <p className="font-semibold text-[#1E293B] mb-1 text-sm">
                    Weekdays
                  </p>
                  <p className="text-[#64748B] text-[12px]">
                    Mon–Fri (Recommended)
                  </p>
                </div>
                <div
                  onClick={() => {
                    setWorkingDays(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']);
                  }}
                  className={`cursor-pointer flex-1 p-4 rounded-lg border transition-all ${
                    workingDays.length === 7
                      ? 'border-2 border-[#6366F1] bg-[#F8F9FF]'
                      : 'border-2 border-[#E2E8F0] bg-white'
                  } hover:border-[#6366F1] hover:-translate-y-0.5`}
                >
                  <p className="font-semibold text-[#1E293B] mb-1 text-sm">
                    All days
                  </p>
                  <p className="text-[#64748B] text-[12px]">
                    Every day
                  </p>
                </div>
                <div
                  onClick={() => {
                    // Keep current selection for custom
                  }}
                  className={`cursor-pointer flex-1 p-4 rounded-lg border transition-all ${
                    workingDays.length !== 5 && workingDays.length !== 7
                      ? 'border-2 border-[#6366F1] bg-[#F8F9FF]'
                      : 'border-2 border-[#E2E8F0] bg-white'
                  } hover:border-[#6366F1] hover:-translate-y-0.5`}
                >
                  <p className="font-semibold text-[#1E293B] mb-1 text-sm">
                    Custom
                  </p>
                  <p className="text-[#64748B] text-[12px]">
                    Select specific days
                  </p>
                </div>
              </div>
              {(workingDays.length !== 5 || !workingDays.every(d => ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].includes(d))) && (
                <div className="mt-4">
                  <p className="text-[#64748B] mb-3 block text-xs">
                    Select specific days:
                  </p>
                  <div className="flex flex-row flex-wrap gap-3">
                    {workingDaysOptions.map((day) => {
                      const isSelected = workingDays.includes(day.value);
                      return (
                        <Badge
                          key={day.value}
                          className={`cursor-pointer h-9 min-w-[56px] text-[13px] font-medium transition-all rounded-full ${
                            isSelected
                              ? 'bg-[#6366F1] text-white'
                              : 'bg-white text-[#64748B] border-2 border-[#E2E8F0]'
                          } hover:border-[#6366F1] hover:scale-105`}
                          onClick={() => {
                            if (isSelected) {
                              setWorkingDays(workingDays.filter(d => d !== day.value));
                            } else {
                              setWorkingDays([...workingDays, day.value]);
                            }
                          }}
                        >
                          {day.label}
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          {/* Smart Safety Controls Card */}
          <Card className="mb-6 rounded-xl border border-[#E2E8F0] shadow-none">
            <CardContent className="p-6">
              <p className="text-[#1E293B] mb-4 font-medium">
                Enable smart throttling to protect your account?
              </p>
              <div className="flex items-center justify-between mt-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <Shield size={20} color="#6366F1" />
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[#1E293B] text-sm">
                        {smartThrottling ? 'Enabled' : 'Disabled'}
                      </span>
                      {smartThrottling && (
                        <Badge className="h-5 text-[10px] font-semibold bg-[#10B981] text-white">
                          Recommended
                        </Badge>
                      )}
                    </div>
                  </div>
                  <p className="text-[#64748B] text-[13px]">
                    Automatically adjusts activity to stay within safe platform limits.
                  </p>
                </div>
                <Switch
                  checked={smartThrottling}
                  onCheckedChange={(checked) => setSmartThrottling(checked as boolean)}
                />
              </div>
            </CardContent>
          </Card>
          {/* Advanced Options Card */}
          <Card className="mb-6 rounded-xl border border-[#E2E8F0] shadow-none">
            <CardContent className="p-6">
              <Button
                className="w-full justify-between text-[#64748B] font-medium hover:bg-[#F8F9FA]"
                onClick={() => setShowAdvanced(!showAdvanced)}
              >
                <span className="font-medium text-sm">
                  Advanced Options
                </span>
                <ArrowRight
                  size={16}
                  className="transition-transform"
                  style={{
                    transform: showAdvanced ? 'rotate(90deg)' : 'rotate(0deg)',
                  }}
                />
              </Button>
              {showAdvanced && (
                <div className="mt-6 pt-6 border-t border-[#E2E8F0]">
                  <div className="flex flex-col gap-6">
                    {/* Daily Max Connections/Messages */}
                    <div>
                      <Label className="text-sm font-medium text-[#1E293B] mb-2 block">
                        Daily max connections/messages
                      </Label>
                      <Input
                        type="number"
                        className="bg-white rounded-lg w-full"
                        value={dailyMaxConnections}
                        onChange={(e) => setDailyMaxConnections(parseInt(e.target.value) || 50)}
                      />
                    </div>
                    {/* Randomized Delays */}
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-sm font-medium text-[#1E293B] mb-1 block">
                          Randomized delays between actions
                        </Label>
                        <p className="text-xs text-[#64748B]">
                          Adds natural variation to prevent detection
                        </p>
                      </div>
                      <Switch
                        checked={randomizedDelays}
                        onCheckedChange={(checked) => setRandomizedDelays(checked as boolean)}
                      />
                    </div>
                    {/* Auto-pause on Warning */}
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-sm font-medium text-[#1E293B] mb-1 block">
                          Auto-pause on warning signals
                        </Label>
                        <p className="text-xs text-[#64748B]">
                          Automatically pause if platform warnings detected
                        </p>
                      </div>
                      <Switch
                        checked={autoPauseOnWarning}
                        onCheckedChange={(checked) => setAutoPauseOnWarning(checked as boolean)}
                      />
                    </div>
                    {/* Time Window */}
                    <div>
                      <Label className="text-sm font-medium text-[#1E293B] mb-2 block">
                        Time window for outreach
                      </Label>
                      <div className="flex flex-row gap-4">
                        <div className="flex-1">
                          <Label>Start</Label>
                          <Input
                            type="time"
                            className="bg-white rounded-lg w-full mt-2"
                            value={timeWindowStart}
                            onChange={(e) => setTimeWindowStart(e.target.value)}
                          />
                        </div>
                        <div className="flex-1">
                          <Label>End</Label>
                          <Input
                            type="time"
                            className="bg-white rounded-lg w-full mt-2"
                            value={timeWindowEnd}
                            onChange={(e) => setTimeWindowEnd(e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          {/* Campaign Summary Card */}
          <Card className="mb-6 rounded-xl border-2 border-[#6366F1] bg-[#F8F9FF] shadow-md">
            <CardContent className="p-6">
              <h3 className="font-semibold text-[#1E293B] mb-4">
                Your campaign will:
              </h3>
              <div className="flex flex-col gap-3 mb-4">
                <p className="text-[#1E293B] text-sm">
                  • Run for <strong>{campaignDuration} days</strong>
                </p>
                <p className="text-[#1E293B] text-sm">
                  • Target <strong>{dailyLeadVolume} leads per day</strong>
                </p>
                <p className="text-[#1E293B] text-sm">
                  • Operate on <strong>{getScheduleText()}</strong>
                </p>
                <p className="text-[#1E293B] text-sm">
                  • Estimated total leads: <strong>~{Math.round(totalLeads)}</strong>
                </p>
                <div className="flex items-center gap-2">
                  <p className="text-[#1E293B] text-sm">
                    • Risk level:
                  </p>
                  <Badge
                    className={`text-[11px] font-semibold capitalize ${
                      riskLevel === 'Low' ? 'bg-[#10B981]' : riskLevel === 'Medium' ? 'bg-[#6366F1]' : 'bg-[#EF4444]'
                    } text-white`}
                  >
                    {riskLevel.toLowerCase()}
                  </Badge>
                </div>
              </div>
              <p className="text-[#64748B] text-[12px] italic">
                You can change these settings anytime.
              </p>
            </CardContent>
          </Card>
          {/* Action Buttons */}
          <div className="flex flex-row justify-end gap-4 mt-8">
            <Button
              onClick={handleStepComplete}
              className="px-6 py-3 bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] hover:from-[#4F46E5] hover:to-[#7C3AED] text-white font-semibold text-sm rounded-lg shadow-md hover:shadow-lg transition-all"
            >
              Continue
              <ArrowRight size={18} className="ml-2" />
            </Button>
          </div>
        </div>
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
      logger.debug('Creating campaign with data', { campaignData });
      const response = await apiPost<{ success: boolean; data: any }>('/api/campaigns', campaignData);
      if (response.success) {
        logger.debug('Campaign created successfully', { data: response.data });
        const campaignId = response.data.id || response.data.data?.id;
        // Always start the campaign immediately
        if (campaignId) {
          try {
            logger.debug('Starting campaign immediately');
            await apiPost<{ success: boolean }>(`/api/campaigns/${campaignId}/start`, {});
            logger.debug('Campaign started successfully - Apollo lead generation and LinkedIn actions will begin automatically');
          } catch (startError: any) {
            logger.error('Error starting campaign', startError);
            // Don't fail the whole creation if start fails - campaign is still created
            setCreateError(`Campaign created but failed to start: ${startError.message || 'Unknown error'}. You can start it manually from the campaigns page.`);
            // Still navigate, but show the error briefly
            setTimeout(() => router.push('/campaigns'), 2000);
            return;
          }
        }
        // Navigate to campaigns page
        logger.debug('Redirecting to campaigns page');
        router.push('/campaigns');
      } else {
        throw new Error('Failed to create campaign');
      }
    } catch (error: any) {
      logger.error('Error creating campaign', error);
      setCreateError(error.message || 'Failed to create campaign. Please try again.');
    } finally {
      setIsCreatingCampaign(false);
    }
  }, [campaignName, dailyLeadVolume, startImmediately, convertWorkflowNodesToSteps, router]);
  const renderStep7 = () => {
    const nodes = useOnboardingStore.getState().workflowNodes;
    const workflowPreview = useOnboardingStore.getState().workflowPreview;
    const stepCount = nodes.filter(n => n.type !== 'start' && n.type !== 'end').length;
    // Get dailyLeadVolume from workflow steps (lead_generation step's leadLimit)
    const leadGenStep = workflowPreview.find(step => step.type === 'lead_generation');
    const currentDailyLeadVolume = leadGenStep?.leadLimit || dailyLeadVolume;
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
        <div className="max-w-[900px] mx-auto pb-8 w-full">
          {/* Campaign Summary Card */}
          <Card className="mb-6 rounded-xl border border-[#E2E8F0] shadow-none">
            <CardContent className="p-6">
              <h3 className="mb-6 font-semibold text-[#1E293B] text-lg">
                🎯 Your Campaign Setup
              </h3>
              <div className="mb-4">
                <p className="text-[#64748B] mb-2 font-semibold text-sm">
                  Campaign Name:
                </p>
                <p className="text-[#1E293B] mb-4">
                  {campaignName || <span className="italic text-[#94A3B8]">Not set</span>}
                </p>
              </div>
              <div className="mb-4">
                <p className="text-[#64748B] mb-2 font-semibold text-sm">
                  Target Audience:
                </p>
                {answers.industries && answers.industries.length > 0 && (
                  <p className="text-[#1E293B] mb-1 text-sm">
                    Industries: {answers.industries.join(', ')}
                  </p>
                )}
                {answers.roles && answers.roles.length > 0 && (
                  <p className="text-[#1E293B] mb-1 text-sm">
                    Roles: {answers.roles.join(', ')}
                  </p>
                )}
                {answers.location && (
                  <p className="text-[#1E293B] mb-1 text-sm">
                    Location: {answers.location}
                  </p>
                )}
              </div>
              <div className="mb-4">
                <p className="text-[#64748B] mb-2 font-semibold text-sm">
                  Platforms:
                </p>
                <p className="text-[#1E293B] text-sm">
                  {answers.platforms?.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(', ') || 'None'}
                </p>
              </div>
              <div className="mb-4">
                <p className="text-[#64748B] mb-2 font-semibold text-sm">
                  Campaign Settings:
                </p>
                <p className="text-[#1E293B] mb-1 text-sm">
                  Duration: {campaignDuration} days
                </p>
                <p className="text-[#1E293B] mb-1 text-sm">
                  Daily Leads: {currentDailyLeadVolume}
                </p>
              </div>
              <div>
                <p className="text-[#64748B] mb-2 font-semibold text-sm">
                  Workflow Steps:
                </p>
                <p className="text-[#1E293B] text-sm">
                  {stepCount} step{stepCount !== 1 ? 's' : ''} configured
                </p>
                <p className="text-[#64748B] block mt-2 text-xs">
                  Check the preview panel to see your complete workflow
                </p>
              </div>
            </CardContent>
          </Card>
          {/* Campaign Creation Info */}
          <Card className="mb-6 rounded-xl border border-[#E2E8F0] shadow-none bg-[#F8FAFC]">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="p-2 rounded-lg bg-[#6366F1] text-white flex items-center justify-center">
                  <Zap size={20} />
                </div>
                <div>
                  <p className="font-semibold text-[#1E293B] mb-1">
                    Ready to Launch Your Campaign
                  </p>
                  <p className="text-[#64748B] text-[13px]">
                    Your campaign will be created and started automatically. Apollo will generate leads based on your criteria, then LinkedIn actions will begin executing immediately.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          {/* Error Alert */}
          {createError && (
            <Alert variant="destructive" className="mb-6">
              <AlertDescription>{createError}</AlertDescription>
            </Alert>
          )}
          {/* Action Buttons */}
          <div className="flex flex-row gap-4 justify-end">
            <Button
              onClick={() => setCurrentStep('campaign_settings')}
              variant="outline"
              disabled={isCreatingCampaign}
              className="px-6 py-3"
            >
              Back to Edit
            </Button>
            <Button
              onClick={handleCreateCampaign}
              disabled={isCreatingCampaign || !campaignName || campaignName.trim() === ''}
              className="px-6 py-3 bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] hover:from-[#4F46E5] hover:to-[#7C3AED] text-white font-semibold text-sm rounded-lg shadow-md hover:shadow-lg transition-all"
            >
              {isCreatingCampaign ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating & Starting Campaign...
                </>
              ) : (
                <>
                  <CheckCircle2 size={18} className="mr-2" />
                  Create and Start Campaign
                </>
              )}
            </Button>
          </div>
        </div>
      </StepLayout>
    );
  };
  return (
    <div className="h-full w-full flex flex-col overflow-hidden">
      <div className="h-full w-full flex flex-col overflow-hidden">
        {currentStep === 'icp_questions' && renderStep1()}
        {currentStep === 'target_definition' && renderStep2()}
        {currentStep === 'platform_selection' && renderStep3Platform()}
        {currentStep === 'conditions_delays' && renderStep4ConditionsAndDelays()}
        {currentStep === 'voice_agent' && renderStep5()}
        {currentStep === 'campaign_settings' && renderStep6()}
        {currentStep === 'confirmation' && renderStep7()}
      </div>
    </div>
  );
}
