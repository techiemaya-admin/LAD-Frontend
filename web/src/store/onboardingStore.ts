import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { FlowNode, FlowEdge, StepType } from '@/types/campaign';

// New onboarding state structure
export type MainOption = 'automation' | 'leads' | null;
export type LeadType = 'inbound' | 'outbound' | null;

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
}

export interface AIMessage {
  role: 'ai' | 'user';
  content: string;
  timestamp: Date;
  options?: Array<{ label: string; value: string }>;
  status?: 'need_input' | 'ready';
  missing?: Record<string, boolean> | string[];
  workflow?: any[];
  searchResults?: any[]; // Search results from scraping/searching
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
  
  // Undo/Redo History
  history: {
    undoStack: OnboardingWorkflow[];
    redoStack: OnboardingWorkflow[];
    maxHistorySize: number;
  };
  
  // ICP Onboarding (from ChatStepController)
  icpAnswers: Record<string, any> | null; // Mapped ICP answers ready for campaign creation
  icpOnboardingComplete: boolean; // Whether ICP onboarding has been completed
  
  // Actions
  setCurrentScreen: (screen: 0 | 1 | 2 | 3) => void;
  setIsEditMode: (editMode: boolean) => void;
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
      pushToHistory: (workflow: OnboardingWorkflow) => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  completeOnboarding: () => void;
  reset: () => void;
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
  history: {
    undoStack: [],
    redoStack: [],
    maxHistorySize: 50,
  },
  icpAnswers: null,
  icpOnboardingComplete: false,
};

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set, get) => ({
      ...defaultState,
      
      setCurrentScreen: (screen) => set({ currentScreen: screen }),
      
      setIsEditMode: (editMode) => set({ isEditMode: editMode }),
      
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
        // aiMessages is NOT persisted - always starts fresh
      }),
    }
  )
);
