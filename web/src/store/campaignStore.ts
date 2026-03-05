import { create } from 'zustand';
import { FlowNode, FlowEdge, StepType, StepData } from '@/types/campaign';
interface CampaignState {
  name: string;
  nodes: FlowNode[];
  edges: FlowEdge[];
  selectedNodeId: string | null;
  // Actions
  setName: (name: string) => void;
  addStep: (type: StepType, position: { x: number; y: number }) => void;
  updateStep: (nodeId: string, data: Partial<StepData>) => void;
  deleteStep: (nodeId: string) => void;
  selectStep: (nodeId: string | null) => void;
  updateNodePosition: (nodeId: string, position: { x: number; y: number }) => void;
  addEdge: (source: string, target: string) => void;
  deleteEdge: (edgeId: string) => void;
  reorderSteps: () => void;
  serialize: () => any;
  loadCampaign: (campaign: any) => void;
  reset: () => void;
}
const defaultStepData: Record<StepType, Partial<StepData>> = {
  linkedin_visit: { title: 'LinkedIn Profile Visit' },
  linkedin_follow: { title: 'LinkedIn Follow' },
  linkedin_connect: { title: 'LinkedIn Connection Request', message: 'Hi {{first_name}}, I\'d like to connect with you.' },
  linkedin_message: { title: 'LinkedIn Message', message: 'Hi {{first_name}}, I noticed...' },
  linkedin_scrape_profile: { title: 'Scrape LinkedIn Profile', linkedinScrapeFields: ['name', 'title', 'company', 'location'] },
  linkedin_company_search: { title: 'LinkedIn Company Search', linkedinCompanyName: '{{company_name}}' },
  linkedin_employee_list: { title: 'Get Employee List', linkedinCompanyUrl: '' },
  linkedin_autopost: { title: 'LinkedIn Auto Post', linkedinPostContent: '', linkedinPostImageUrl: '' },
  linkedin_comment_reply: { title: 'Reply to LinkedIn Comment', linkedinCommentText: 'Thanks for your comment!' },
  email_send: { title: 'Send Email', subject: 'Re: {{company_name}}', body: 'Hi {{first_name}},...' },
  email_followup: { title: 'Email Follow-up', subject: 'Re: {{company_name}}', body: 'Hi {{first_name}},...' },
  whatsapp_send: { title: 'Send WhatsApp', whatsappMessage: 'Hi {{first_name}},...', whatsappTemplate: '' },
  voice_agent_call: { title: 'Voice Agent Call', voiceAgentId: '', voiceTemplate: '', voiceContext: '' },
  instagram_follow: { title: 'Instagram Follow', instagramUsername: '{{instagram_username}}' },
  instagram_like: { title: 'Instagram Like', instagramPostUrl: '' },
  instagram_dm: { title: 'Instagram DM', instagramDmMessage: 'Hi {{first_name}},...' },
  instagram_autopost: { title: 'Instagram Auto Post', instagramPostCaption: '', instagramPostImageUrl: '', instagramAutopostSchedule: 'daily' },
  instagram_comment_reply: { title: 'Reply to Instagram Comment', instagramCommentText: 'Thanks for your comment!' },
  instagram_story_view: { title: 'View Instagram Story', instagramUsername: '{{instagram_username}}' },
  lead_generation: { title: 'Lead Generation', leadGenerationQuery: '', leadGenerationLimit: 50 },
  delay: { title: 'Delay', delayDays: 1, delayHours: 0 },
  condition: { title: 'Condition', conditionType: 'connected' },
  start: { title: 'Start' },
  end: { title: 'End' },
};
export const useCampaignStore = create<CampaignState>((set, get) => ({
  name: '',
  nodes: [],
  edges: [],
  selectedNodeId: null,
  setName: (name) => set({ name }),
  addStep: (type, position) => {
    const id = `step_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const defaultData = defaultStepData[type] || { title: type };
    const newNode: FlowNode = {
      id,
      type,
      position,
      data: { ...defaultData } as StepData,
    };
    set((state) => ({
      nodes: [...state.nodes, newNode],
    }));
    // Auto-connect to previous node if exists
    const { nodes } = get();
    if (nodes.length > 1) {
      const previousNode = nodes[nodes.length - 2];
      if (previousNode && previousNode.type !== 'end') {
        get().addEdge(previousNode.id, id);
      }
    }
  },
  updateStep: (nodeId, data) => {
    set((state) => ({
      nodes: state.nodes.map((node) =>
        node.id === nodeId
          ? { ...node, data: { ...node.data, ...data } }
          : node
      ),
    }));
  },
  deleteStep: (nodeId) => {
    set((state) => {
      const nodeToDelete = state.nodes.find((n) => n.id === nodeId);
      if (!nodeToDelete) return state;
      // Delete connected edges
      const newEdges = state.edges.filter(
        (edge) => edge.source !== nodeId && edge.target !== nodeId
      );
      // Reconnect edges if needed
      const incomingEdges = state.edges.filter((e) => e.target === nodeId);
      const outgoingEdges = state.edges.filter((e) => e.source === nodeId);
      incomingEdges.forEach((inEdge) => {
        outgoingEdges.forEach((outEdge) => {
          if (inEdge.source !== outEdge.target) {
            newEdges.push({
              id: `edge_${inEdge.source}_${outEdge.target}`,
              source: inEdge.source,
              target: outEdge.target,
            });
          }
        });
      });
      return {
        nodes: state.nodes.filter((n) => n.id !== nodeId),
        edges: newEdges,
        selectedNodeId: state.selectedNodeId === nodeId ? null : state.selectedNodeId,
      };
    });
  },
  selectStep: (nodeId) => set({ selectedNodeId: nodeId }),
  updateNodePosition: (nodeId, position) => {
    set((state) => ({
      nodes: state.nodes.map((node) =>
        node.id === nodeId ? { ...node, position } : node
      ),
    }));
  },
  addEdge: (source, target) => {
    const edgeId = `edge_${source}_${target}`;
    const exists = get().edges.some(
      (e) => e.source === source && e.target === target
    );
    if (!exists) {
      set((state) => ({
        edges: [...state.edges, { id: edgeId, source, target }],
      }));
    }
  },
  deleteEdge: (edgeId) => {
    set((state) => ({
      edges: state.edges.filter((e) => e.id !== edgeId),
    }));
  },
  reorderSteps: () => {
    // Auto-arrange nodes vertically
    const { nodes } = get();
    const startNode = nodes.find((n) => n.type === 'start');
    const sortedNodes = [startNode, ...nodes.filter((n) => n.type !== 'start' && n.type !== 'end'), nodes.find((n) => n.type === 'end')].filter(Boolean);
    const newNodes = sortedNodes.map((node, index) => ({
      ...node!,
      position: { x: 400, y: 100 + index * 150 },
    }));
    set({ nodes: newNodes });
  },
  serialize: () => {
    const { name, nodes, edges } = get();
    // Convert to backend format
    const steps = nodes
      .filter((n) => n.type !== 'start' && n.type !== 'end')
      .map((node, index) => ({
        id: node.id,
        type: node.type,
        order: index,
        title: node.data.title || node.type,
        description: node.data.message || node.data.body || '',
        config: {
          message: node.data.message,
          subject: node.data.subject,
          body: node.data.body,
          delay_hours: node.data.delayHours,
          delay_days: node.data.delayDays,
          condition: node.data.conditionType,
          variables: node.data.variables,
          // WhatsApp
          whatsappMessage: node.data.whatsappMessage,
          whatsappTemplate: node.data.whatsappTemplate,
          // Voice Agent
          voiceAgentId: node.data.voiceAgentId,
          voiceAgentName: node.data.voiceAgentName,
          voiceTemplate: node.data.voiceTemplate,
          voiceContext: node.data.voiceContext,
          // LinkedIn additional
          linkedinCompanyName: node.data.linkedinCompanyName,
          linkedinCompanyUrl: node.data.linkedinCompanyUrl,
          linkedinScrapeFields: node.data.linkedinScrapeFields,
          linkedinPostContent: node.data.linkedinPostContent,
          linkedinPostImageUrl: node.data.linkedinPostImageUrl,
          linkedinCommentText: node.data.linkedinCommentText,
          // Instagram
          instagramUsername: node.data.instagramUsername,
          instagramPostUrl: node.data.instagramPostUrl,
          instagramPostCaption: node.data.instagramPostCaption,
          instagramPostImageUrl: node.data.instagramPostImageUrl,
          instagramStoryImageUrl: node.data.instagramStoryImageUrl,
          instagramDmMessage: node.data.instagramDmMessage,
          instagramCommentText: node.data.instagramCommentText,
          instagramAutopostSchedule: node.data.instagramAutopostSchedule,
          instagramAutopostTime: node.data.instagramAutopostTime,
          // Lead Generation
          leadGenerationQuery: node.data.leadGenerationQuery,
          leadGenerationFilters: node.data.leadGenerationFilters,
          leadGenerationLimit: node.data.leadGenerationLimit,
        },
      }));
    return {
      name,
      steps,
    };
  },
  loadCampaign: (campaign) => {
    const { steps = [] } = campaign;
    // Create start node
    const startNode: FlowNode = {
      id: 'start',
      type: 'start',
      position: { x: 400, y: 50 },
      data: { title: 'Start' },
    };
    // Create step nodes
    const stepNodes: FlowNode[] = steps.map((step: any, index: number) => ({
      id: step.id || `step_${index}`,
      type: step.type as StepType,
      position: { x: 400, y: 100 + index * 150 },
      data: {
        title: step.title || step.type,
        message: step.config?.message,
        subject: step.config?.subject,
        body: step.config?.body,
        delayHours: step.config?.delay_hours,
        delayDays: step.config?.delay_days,
        conditionType: step.config?.condition,
        variables: step.config?.variables,
        // WhatsApp
        whatsappMessage: step.config?.whatsappMessage,
        whatsappTemplate: step.config?.whatsappTemplate,
        // Voice Agent
        voiceAgentId: step.config?.voiceAgentId,
        voiceAgentName: step.config?.voiceAgentName,
        voiceTemplate: step.config?.voiceTemplate,
        voiceContext: step.config?.voiceContext,
        // LinkedIn additional
        linkedinCompanyName: step.config?.linkedinCompanyName,
        linkedinCompanyUrl: step.config?.linkedinCompanyUrl,
        linkedinScrapeFields: step.config?.linkedinScrapeFields,
        linkedinPostContent: step.config?.linkedinPostContent,
        linkedinPostImageUrl: step.config?.linkedinPostImageUrl,
        linkedinCommentText: step.config?.linkedinCommentText,
        // Instagram
        instagramUsername: step.config?.instagramUsername,
        instagramPostUrl: step.config?.instagramPostUrl,
        instagramPostCaption: step.config?.instagramPostCaption,
        instagramPostImageUrl: step.config?.instagramPostImageUrl,
        instagramStoryImageUrl: step.config?.instagramStoryImageUrl,
        instagramDmMessage: step.config?.instagramDmMessage,
        instagramCommentText: step.config?.instagramCommentText,
        instagramAutopostSchedule: step.config?.instagramAutopostSchedule,
        instagramAutopostTime: step.config?.instagramAutopostTime,
        // Lead Generation
        leadGenerationQuery: step.config?.leadGenerationQuery,
        leadGenerationFilters: step.config?.leadGenerationFilters,
        leadGenerationLimit: step.config?.leadGenerationLimit,
        type: step.type as StepType,
      } as StepData & { type: StepType },
    }));
    // Create end node
    const endNode: FlowNode = {
      id: 'end',
      type: 'end',
      position: { x: 400, y: 100 + steps.length * 150 },
      data: { title: 'End', type: 'end' } as StepData & { type: StepType },
    };
    // Create edges
    const allNodes = [startNode, ...stepNodes, endNode];
    const newEdges: FlowEdge[] = [];
    for (let i = 0; i < allNodes.length - 1; i++) {
      newEdges.push({
        id: `edge_${allNodes[i].id}_${allNodes[i + 1].id}`,
        source: allNodes[i].id,
        target: allNodes[i + 1].id,
      });
    }
    set({
      name: campaign.name || '',
      nodes: allNodes,
      edges: newEdges,
      selectedNodeId: null,
    });
  },
  reset: () => {
    const startNode: FlowNode = {
      id: 'start',
      type: 'start',
      position: { x: 400, y: 50 },
      data: { title: 'Start', type: 'start' } as StepData & { type: StepType },
    };
    const endNode: FlowNode = {
      id: 'end',
      type: 'end',
      position: { x: 400, y: 200 },
      data: { title: 'End', type: 'end' } as StepData & { type: StepType },
    };
    set({
      name: '',
      nodes: [startNode, endNode],
      edges: [{ id: 'edge_start_end', source: 'start', target: 'end' }],
      selectedNodeId: null,
    });
  },
}));