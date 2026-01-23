import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { FlowNode, FlowEdge, StepType } from '@/types/campaign';
// New onboarding state structure
export type MainOption = 'automation' | 'leads' | null;
export type LeadType = 'inbound' | 'outbound' | null;
export type CampaignDataType = 'inbound' | 'outbound' | null;
// Inbound data structure for user submission
export interface InboundLeadData {
  companyName: string;
  platforms: {
    linkedin: boolean;
    email: boolean;
    whatsapp: boolean;
    website: boolean;
    phone: boolean;
  };
  firstNames: string[];
  lastNames: string[];
  linkedinProfiles: string[];
  emailIds: string[];
  whatsappNumbers: string[];
  websiteUrl?: string;
  phoneNumbers: string[];
  notes?: string;
}
// Inbound analysis result from Gemini
export interface InboundAnalysisResult {
  availablePlatforms: string[];
  missingPlatforms: string[];
  platformDetails: {
    platform: string;
    hasData: boolean;
    dataCount: number;
    sampleData?: string[];
  }[];
  suggestedQuestions: {
    platform: string;
    question: string;
    intentKey: string;
  }[];
  validationSummary: string;
}
export interface InboundFile {
  file: File | null;
  fileName: string;
  fileSize: number;
  fileType: string;
  mappedFields: {
    name?: string;
    email?: string;
    linkedin?: string;
    company?: string;
    phone?: string;
    title?: string;
    [key: string]: string | undefined;
  };
  preview?: any[];
}
export interface OutboundRequirements {
  industry?: string;
  jobTitles?: string[];
  locations?: string[];
  companySize?: {
    min?: number;
    max?: number;
  };
  needLinkedInUrl?: boolean;
  needEmails?: boolean;
  needPhones?: boolean;
  volume?: number;
  [key: string]: any;
}
export interface ChannelConnection {
  linkedin: boolean;
  email: boolean;
  whatsapp: boolean;
  voiceAgent: boolean;
  instagram?: boolean;
}
export interface OnboardingWorkflow {
  nodes: FlowNode[];
  edges: FlowEdge[];
  name?: string;
  description?: string;
}
export interface WorkflowPreviewStep {
  id: string;
  type: StepType;
  title: string;
  description?: string;
  icon?: string;
  channel?: 'linkedin' | 'email' | 'whatsapp' | 'voice' | 'instagram';
  // Additional fields for step configuration
  message?: string;
  subject?: string;
  template?: string;
  script?: string;
  delayDays?: number;
  delayHours?: number;
  leadLimit?: number; // Number of leads to generate per day
}
export interface AIMessage {
  role: 'ai' | 'user';
  content: string;
  timestamp: Date;
  options?: Array<{ label: string; value: string; disabled?: boolean }>;
  status?: 'need_input' | 'ready';
  missing?: Record<string, boolean> | string[];
  workflow?: any[];
  searchResults?: any[]; // Search results from scraping/searching
  isInboundPlatformSelection?: boolean; // Flag for inbound platform selection
  availablePlatforms?: string[]; // Available platforms from inbound data
}
interface OnboardingState {
  // Flow state
  hasSelectedOption: boolean;
  selectedPath: MainOption;
  isAIChatActive: boolean;
  currentScreen: 0 | 1 | 2 | 3; // 0=Options, 1=AI Chat, 2=Preview, 3=Manual Editor
  isEditMode: boolean; // When true, show split view with all 3 screens
  workflowState: 'STATE_1' | 'STATE_2' | 'STATE_3' | 'STATE_4' | 'STATE_5'; // Strict state machine
  onboardingMode: 'FORM' | 'CHAT'; // Onboarding mode: FORM (step-based) or CHAT (conversational)
  // AI Chat
  aiMessages: AIMessage[];
  currentQuestionIndex: number;
  isProcessingAI: boolean;
  // Workflow Preview
  workflowPreview: WorkflowPreviewStep[];
  // AI Flow State
  selectedPlatforms: string[];
  platformsConfirmed: boolean; // User confirmed platform selection is complete
  currentPlatformIndex: number;
  platformFeatures: Record<string, string[]>; // platform -> [featureIds]
  currentFeatureIndex: Record<string, number>; // platform -> current feature index
  featureUtilities: Record<string, any>; // featureId -> utilities
  currentUtilityQuestion: string | null;
  workflowNodes: any[];
  workflowEdges: any[];
  selectedCategory: string | null; // LeadOps, SocialOps, CRM Sync, WhatsApp Automation, Analytics
  // Configuration
  automationConfig: {
    platforms?: string[];
    automationTypes?: string[];
    frequency?: string;
    conditionalActions?: boolean;
    connectAccounts?: boolean;
  };
  leadConfig: {
    leadType?: LeadType;
    inboundFile?: InboundFile | null;
    outboundRequirements?: OutboundRequirements | null;
    outreachChannels?: string[];
    autoGenerateWorkflow?: boolean;
  };
  channels: ChannelConnection;
  workflow: OnboardingWorkflow | null;
  manualFlow: OnboardingWorkflow | null;
  selectedNodeId: string | null;
  // Editor Panel State
  isEditorPanelCollapsed: boolean;
  hasRequestedEditor: boolean; // Track if user has clicked Edit button
  // Mobile View State
  mobileView: 'chat' | 'workflow';
  // Undo/Redo History
  history: {
    undoStack: OnboardingWorkflow[];
    redoStack: OnboardingWorkflow[];
    maxHistorySize: number;
  };
  // ICP Onboarding (from ChatStepController)
  icpAnswers: Record<string, any> | null; // Mapped ICP answers ready for campaign creation
  icpOnboardingComplete: boolean; // Whether ICP onboarding has been completed
  isICPFlowStarted: boolean; // Track if ICP flow has been started
  // Campaign Data Type (Inbound vs Outbound)
  campaignDataType: CampaignDataType; // First step: inbound or outbound selection
  inboundLeadData: InboundLeadData | null; // User-submitted inbound lead data
  inboundAnalysis: InboundAnalysisResult | null; // Gemini analysis of inbound data
  isInboundFormVisible: boolean; // Show the inbound data entry form
  // Actions
  setCurrentScreen: (screen: 0 | 1 | 2 | 3) => void;
  setIsEditMode: (editMode: boolean) => void;
  setMobileView: (view: 'chat' | 'workflow') => void;
  setSelectedPath: (path: MainOption) => void;
  setHasSelectedOption: (hasSelected: boolean) => void;
  setIsAIChatActive: (active: boolean) => void;
  setWorkflowState: (state: 'STATE_1' | 'STATE_2' | 'STATE_3' | 'STATE_4' | 'STATE_5') => void;
  setOnboardingMode: (mode: 'FORM' | 'CHAT') => void;
  addAIMessage: (message: AIMessage) => void;
  setCurrentQuestionIndex: (index: number) => void;
  setIsProcessingAI: (processing: boolean) => void;
  setWorkflowPreview: (steps: WorkflowPreviewStep[]) => void;
  addWorkflowStep: (step: WorkflowPreviewStep) => void;
  removeWorkflowStep: (stepId: string) => void;
  updateWorkflowStep: (stepId: string, updates: Partial<WorkflowPreviewStep>) => void;
  moveWorkflowStep: (stepId: string, direction: 'up' | 'down') => void;
  reorderPlatforms: (platformOrder: string[]) => void;
  updateAutomationConfig: (config: Partial<OnboardingState['automationConfig']>) => void;
  updateLeadConfig: (config: Partial<OnboardingState['leadConfig']>) => void;
  setChannelConnection: (channel: keyof ChannelConnection, connected: boolean) => void;
  setWorkflow: (workflow: OnboardingWorkflow | null) => void;
  setManualFlow: (flow: OnboardingWorkflow | null) => void;
  setSelectedNodeId: (nodeId: string | null) => void;
  setSelectedPlatforms: (platforms: string[]) => void;
  setPlatformsConfirmed: (confirmed: boolean) => void;
  setSelectedCategory: (category: string | null) => void;
  setCurrentPlatformIndex: (index: number) => void;
  setPlatformFeatures: (platform: string, features: string[]) => void;
  setCurrentFeatureIndex: (platform: string, index: number) => void;
  setFeatureUtilities: (featureId: string, utilities: any) => void;
  setCurrentUtilityQuestion: (question: string | null) => void;
  addWorkflowNode: (node: any) => void;
  addWorkflowEdge: (edge: any) => void;
  setIsEditorPanelCollapsed: (collapsed: boolean) => void;
  setHasRequestedEditor: (requested: boolean) => void;
  pushToHistory: (workflow: OnboardingWorkflow) => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  completeOnboarding: () => void;
  reset: () => void;
  setIsICPFlowStarted: (started: boolean) => void;
  setCampaignDataType: (type: CampaignDataType) => void;
  setInboundLeadData: (data: InboundLeadData | null) => void;
  setInboundAnalysis: (analysis: InboundAnalysisResult | null) => void;
  setIsInboundFormVisible: (visible: boolean) => void;
}
const defaultState: Omit<OnboardingState, 'setCurrentScreen' | 'setIsEditMode' | 'setSelectedPath' | 'setHasSelectedOption' | 'setIsAIChatActive' | 'addAIMessage' | 'setCurrentQuestionIndex' | 'setIsProcessingAI' | 'setWorkflowPreview' | 'addWorkflowStep' | 'updateAutomationConfig' | 'updateLeadConfig' | 'setChannelConnection' | 'setWorkflow' | 'setManualFlow' | 'setSelectedNodeId' | 'setSelectedPlatforms' | 'setCurrentPlatformIndex' | 'setPlatformFeatures' | 'setCurrentFeatureIndex' | 'setFeatureUtilities' | 'setCurrentUtilityQuestion' | 'addWorkflowNode' | 'addWorkflowEdge' | 'setOnboardingMode' | 'completeOnboarding' | 'reset'> = {
  currentScreen: 0,
  hasSelectedOption: false,
  selectedPath: null,
  isAIChatActive: false,
  isEditMode: false,
  workflowState: 'STATE_1',
  onboardingMode: 'FORM', // Default to form-based onboarding
  aiMessages: [],
  currentQuestionIndex: 0,
  isProcessingAI: false,
  workflowPreview: [],
  selectedPlatforms: [],
  currentPlatformIndex: 0,
  platformFeatures: {},
  currentFeatureIndex: {},
  featureUtilities: {},
  currentUtilityQuestion: null,
  workflowNodes: [],
  workflowEdges: [],
  platformsConfirmed: false,
  selectedCategory: null,
  automationConfig: {},
  leadConfig: {},
  channels: {
    linkedin: false,
    email: false,
    whatsapp: false,
    voiceAgent: false,
    instagram: false,
  },
  workflow: null,
  manualFlow: null,
  selectedNodeId: null,
  isEditorPanelCollapsed: true, // Start collapsed (hidden) by default
  hasRequestedEditor: false, // User hasn't clicked Edit yet
  mobileView: 'chat', // Default to chat view on mobile
  history: {
    undoStack: [],
    redoStack: [],
    maxHistorySize: 50,
  },
  icpAnswers: null,
  icpOnboardingComplete: false,
  isICPFlowStarted: false,
  campaignDataType: null,
  inboundLeadData: null,
  inboundAnalysis: null,
  isInboundFormVisible: false,
};
export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set, get) => ({
      ...defaultState,
      setCurrentScreen: (screen) => set({ currentScreen: screen }),
      setIsEditMode: (editMode) => set({ isEditMode: editMode }),
      setMobileView: (view) => set({ mobileView: view }),
      setSelectedPath: (path) => set({ selectedPath: path }),
      setHasSelectedOption: (hasSelected) => set({ hasSelectedOption: hasSelected }),
      setIsAIChatActive: (active) => set({ isAIChatActive: active }),
      setWorkflowState: (state) => set({ workflowState: state }),
      setOnboardingMode: (mode) => set({ onboardingMode: mode }),
      addAIMessage: (message) =>
        set((state) => ({
          aiMessages: [...state.aiMessages, message],
        })),
      setCurrentQuestionIndex: (index) => set({ currentQuestionIndex: index }),
      setIsProcessingAI: (processing) => set({ isProcessingAI: processing }),
      setWorkflowPreview: (steps) => set({ workflowPreview: steps }),
      addWorkflowStep: (step) =>
        set((state) => ({
          workflowPreview: [...state.workflowPreview, step],
        })),
      removeWorkflowStep: (stepId) =>
        set((state) => ({
          workflowPreview: state.workflowPreview.filter((step) => step.id !== stepId),
        })),
      updateWorkflowStep: (stepId, updates) =>
        set((state) => ({
          workflowPreview: state.workflowPreview.map((step) =>
            step.id === stepId ? { ...step, ...updates } : step
          ),
        })),
      moveWorkflowStep: (stepId, direction) =>
        set((state) => {
          const steps = [...state.workflowPreview];
          const currentIndex = steps.findIndex((step) => step.id === stepId);
          if (currentIndex === -1) return state; // Step not found
          const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
          // Check bounds and don't move start/end steps
          if (newIndex < 0 || newIndex >= steps.length) return state;
          if (steps[currentIndex].type === 'start' || steps[currentIndex].type === 'end') return state;
          if (steps[newIndex].type === 'start' || steps[newIndex].type === 'end') return state;
          // Swap the steps
          [steps[currentIndex], steps[newIndex]] = [steps[newIndex], steps[currentIndex]];
          return { workflowPreview: steps };
        }),
      reorderPlatforms: (platformOrder) =>
        set((state) => {
          const steps = [...state.workflowPreview];
          // Separate fixed steps (start, end, lead_generation, delay_between_platforms) and platform steps
          const startStep = steps.find(s => s.type === 'start');
          const endStep = steps.find(s => s.type === 'end');
          const leadStep = steps.find(s => s.type === 'lead_generation');
          const delaySteps = steps.filter(s => s.type === 'delay_between_platforms');
          // Group steps by platform
          const platformSteps: Record<string, typeof steps> = {
            linkedin: steps.filter(s => s.type.startsWith('linkedin_')),
            whatsapp: steps.filter(s => s.type.startsWith('whatsapp_')),
            email: steps.filter(s => s.type.startsWith('email_')),
            voice: steps.filter(s => s.type.startsWith('voice_')),
          };
          // Rebuild workflow in new order
          const newSteps: typeof steps = [];
          // Add start
          if (startStep) newSteps.push(startStep);
          // Add lead generation
          if (leadStep) newSteps.push(leadStep);
          // Add platforms in new order with delays between them
          let delayIndex = 0;
          platformOrder.forEach((platform, index) => {
            const stepsForPlatform = platformSteps[platform] || [];
            if (stepsForPlatform.length > 0) {
              // Add delay before platform (except first one)
              if (index > 0 && delaySteps[delayIndex]) {
                newSteps.push(delaySteps[delayIndex]);
                delayIndex++;
              }
              newSteps.push(...stepsForPlatform);
            }
          });
          // Add end
          if (endStep) newSteps.push(endStep);
          return { workflowPreview: newSteps };
        }),
      updateAutomationConfig: (config) =>
        set((state) => ({
          automationConfig: { ...state.automationConfig, ...config },
        })),
      updateLeadConfig: (config) =>
        set((state) => ({
          leadConfig: { ...state.leadConfig, ...config },
        })),
      setChannelConnection: (channel, connected) =>
        set((state) => ({
          channels: { ...state.channels, [channel]: connected },
        })),
      setWorkflow: (workflow) => set({ workflow }),
      setManualFlow: (flow) => set({ manualFlow: flow }),
      setSelectedNodeId: (nodeId) => set({ selectedNodeId: nodeId }),
      setSelectedPlatforms: (platforms) => {
        set({ selectedPlatforms: platforms, platformsConfirmed: false });
      },
      setPlatformsConfirmed: (confirmed) => set({ platformsConfirmed: confirmed }),
      setSelectedCategory: (category) => set({ selectedCategory: category }),
      setCurrentPlatformIndex: (index) => set({ currentPlatformIndex: index }),
      setPlatformFeatures: (platform, features) =>
        set((state) => ({
          platformFeatures: { ...state.platformFeatures, [platform]: features },
        })),
      setCurrentFeatureIndex: (platform, index) =>
        set((state) => ({
          currentFeatureIndex: { ...state.currentFeatureIndex, [platform]: index },
        })),
      setFeatureUtilities: (featureId, utilities) =>
        set((state) => ({
          featureUtilities: { ...state.featureUtilities, [featureId]: utilities },
        })),
      setCurrentUtilityQuestion: (question) => set({ currentUtilityQuestion: question }),
      addWorkflowNode: (node) =>
        set((state) => ({
          workflowNodes: [...state.workflowNodes, node],
        })),
      addWorkflowEdge: (edge) =>
        set((state) => ({
          workflowEdges: [...state.workflowEdges, edge],
        })),
      setIsEditorPanelCollapsed: (collapsed) => set({ isEditorPanelCollapsed: collapsed }),
      setHasRequestedEditor: (requested) => set({ hasRequestedEditor: requested }),
      setOnboardingMode: (mode) => set({ onboardingMode: mode }),
      pushToHistory: (workflow) =>
        set((state) => {
          const newUndoStack = [...state.history.undoStack, workflow];
          // Limit history size
          if (newUndoStack.length > state.history.maxHistorySize) {
            newUndoStack.shift();
          }
          return {
            history: {
              ...state.history,
              undoStack: newUndoStack,
              redoStack: [], // Clear redo stack when new action is performed
            },
          };
        }),
      undo: () =>
        set((state) => {
          if (state.history.undoStack.length === 0) return state;
          const currentWorkflow = state.manualFlow;
          const previousWorkflow = state.history.undoStack[state.history.undoStack.length - 1];
          const newUndoStack = state.history.undoStack.slice(0, -1);
          const newRedoStack = currentWorkflow
            ? [...state.history.redoStack, currentWorkflow]
            : state.history.redoStack;
          return {
            manualFlow: previousWorkflow,
            history: {
              ...state.history,
              undoStack: newUndoStack,
              redoStack: newRedoStack,
            },
          };
        }),
      redo: () =>
        set((state) => {
          if (state.history.redoStack.length === 0) return state;
          const currentWorkflow = state.manualFlow;
          const nextWorkflow = state.history.redoStack[state.history.redoStack.length - 1];
          const newRedoStack = state.history.redoStack.slice(0, -1);
          const newUndoStack = currentWorkflow
            ? [...state.history.undoStack, currentWorkflow]
            : state.history.undoStack;
          return {
            manualFlow: nextWorkflow,
            history: {
              ...state.history,
              undoStack: newUndoStack,
              redoStack: newRedoStack,
            },
          };
        }),
      canUndo: () => {
        const state = get();
        return state.history.undoStack.length > 0;
      },
      canRedo: () => {
        const state = get();
        return state.history.redoStack.length > 0;
      },
      completeOnboarding: () => {
        if (typeof window !== 'undefined') {
          localStorage.setItem('onboarding_completed', 'true');
        }
        set({ currentScreen: 0 });
      },
      reset: () => set(defaultState),
      setIsICPFlowStarted: (started) => set({ isICPFlowStarted: started }),
      setCampaignDataType: (type) => set({ campaignDataType: type }),
      setInboundLeadData: (data) => set({ inboundLeadData: data }),
      setInboundAnalysis: (analysis) => set({ inboundAnalysis: analysis }),
      setIsInboundFormVisible: (visible) => set({ isInboundFormVisible: visible }),
    }),
    {
      name: 'onboarding-storage',
      partialize: (state) => ({
        hasSelectedOption: state.hasSelectedOption,
        selectedPath: state.selectedPath,
        isAIChatActive: state.isAIChatActive,
        workflowPreview: state.workflowPreview,
        automationConfig: state.automationConfig,
        leadConfig: state.leadConfig,
        channels: state.channels,
        workflow: state.workflow,
        manualFlow: state.manualFlow,
        currentScreen: state.currentScreen,
        selectedPlatforms: state.selectedPlatforms,
        platformFeatures: state.platformFeatures,
        workflowNodes: state.workflowNodes,
        workflowEdges: state.workflowEdges,
        onboardingMode: state.onboardingMode, // Persist onboarding mode across refreshes
        isICPFlowStarted: state.isICPFlowStarted, // Persist to prevent duplicate questions on refresh
        aiMessages: state.aiMessages, // Persist messages so conversation is restored on refresh
        campaignDataType: state.campaignDataType, // Persist campaign data type selection
        inboundLeadData: state.inboundLeadData, // Persist inbound lead data
        inboundAnalysis: state.inboundAnalysis, // Persist inbound analysis
      }),
    }
  )
);