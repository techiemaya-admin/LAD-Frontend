'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useOnboardingStore, ChannelConnection, WorkflowPreviewStep, InboundLeadData } from '@/store/onboardingStore';
import InboundDataForm from '@/components/onboarding/InboundDataForm';
import { analyzeInboundData, getNextInboundQuestion, hasPlatformData } from '@/services/inboundCampaignService';
import ChatInputClaude from '@/components/onboarding/ChatInputClaude';
import ChatMessageBubble from '@/components/onboarding/ChatMessageBubble';
import { parseMessageOptions } from '@/lib/parseMessageOptions';
import WorkflowLibrary from '@/components/onboarding/WorkflowLibrary';
import GuidedFlowPanel from '@/components/onboarding/GuidedFlowPanel';
import { useChatStepController } from '@/components/onboarding/ChatStepController';
import { Zap, Users, Loader2, Bot, ArrowLeft, Trash2, ArrowDownToLine, ArrowUpFromLine, CheckCircle2 } from 'lucide-react';
import { sendGeminiPrompt, askPlatformFeatures, askFeatureUtilities, buildWorkflowNode } from '@/services/geminiFlashService';
import { clearBufferedMessages, clearAllBufferedMessages } from '@lad/frontend-features/ai-icp-assistant';
import { questionSequences, getPlatformFeaturesQuestion, getUtilityQuestions } from '@/lib/onboardingQuestions';
import { saveInboundLeads, cancelLeadBookingsForReNurturing, getCampaign } from '@lad/frontend-features/campaigns';
import { PLATFORM_FEATURES } from '@/lib/platformFeatures';
import { filterFeaturesByCategory } from '@/lib/categoryFilters';
import { apiPost, apiPut } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { logger } from '@/lib/logger';
type FlowState =
  | 'initial'
  | 'platform_selection'
  | 'platform_confirmation' // New: Wait for user to confirm platforms
  | 'platform_features'
  | 'feature_utilities'
  | 'complete'
  | 'requirements_collection' // For FastMode requirements
  | 'inbound_campaign_name' // Inbound: Ask campaign name
  | 'inbound_campaign_days' // Inbound: Ask campaign days
  | 'inbound_leads_per_day' // Inbound: Ask leads per day
  | 'icp_discovery_mode'; // ICP: Conversational discovery mode
interface ChatPanelProps {
  campaignId?: string | null;
}
export default function ChatPanel({ campaignId }: ChatPanelProps = {}) {
  const router = useRouter();
  const [isLoadingCampaign, setIsLoadingCampaign] = useState(false);
  const campaignLoadedRef = useRef(false); // Track if campaign has been loaded
  const {
    selectedPath,
    aiMessages,
    currentQuestionIndex,
    isProcessingAI,
    addAIMessage,
    setCurrentQuestionIndex,
    setIsProcessingAI,
    workflowPreview,
    addWorkflowStep,
    setWorkflowPreview,
    setChannelConnection,
    setHasSelectedOption,
    setSelectedPath,
    setIsAIChatActive,
    setCurrentScreen,
    hasSelectedOption,
    selectedPlatforms,
    setSelectedPlatforms,
    platformsConfirmed,
    setPlatformsConfirmed,
    selectedCategory,
    setSelectedCategory,
    currentPlatformIndex,
    setCurrentPlatformIndex,
    platformFeatures,
    setPlatformFeatures,
    currentFeatureIndex,
    setCurrentFeatureIndex,
    featureUtilities,
    setFeatureUtilities,
    currentUtilityQuestion,
    setCurrentUtilityQuestion,
    workflowNodes,
    addWorkflowNode,
    workflowEdges,
    addWorkflowEdge,
    workflowState,
    setWorkflowState,
    onboardingMode,
    setOnboardingMode,
    isICPFlowStarted,
    // Campaign Data Type (Inbound/Outbound)
    campaignDataType,
    setCampaignDataType,
    inboundLeadData,
    setInboundLeadData,
    inboundAnalysis,
    setInboundAnalysis,
    isInboundFormVisible,
    setIsInboundFormVisible,
  } = useOnboardingStore();
  
  // State for duplicate lead detection
  const [duplicateLeadsInfo, setDuplicateLeadsInfo] = useState<any>(null);
  const [pendingLeadsData, setPendingLeadsData] = useState<any>(null);

  // Initialize workflow preview on mount ONLY if there's no existing workflow
  // This preserves workflow when navigating back
  useEffect(() => {
    // Skip initialization if campaignId is present (will be loaded separately)
    if (campaignId) return;
    // Only set empty workflow if there's no persisted workflow
    if (!workflowPreview || workflowPreview.length === 0) {
      setWorkflowPreview([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount, don't re-run when workflowPreview changes
  // Load existing campaign workflow when campaignId is provided
  useEffect(() => {
    if (!campaignId || campaignLoadedRef.current) return;
    const loadCampaignWorkflow = async () => {
      try {
        campaignLoadedRef.current = true; // Mark as loaded
        setIsLoadingCampaign(true);
        setIsProcessingAI(true);
        // Set state immediately to prevent normal flow from starting
        setHasSelectedOption(true);
        setSelectedPath('automation');
        setIsAIChatActive(true);
        const campaign = await getCampaign(campaignId);
        // Convert campaign steps to workflow preview format
        if (campaign.steps && campaign.steps.length > 0) {
          const workflowSteps: WorkflowPreviewStep[] = campaign.steps.map((step: any, index: number) => ({
            id: `step-${index + 1}`,
            type: step.type as any,
            title: step.title || `Step ${index + 1}`,
            description: step.description,
            channel: step.channel,
            message: step.message,
            subject: step.subject,
            template: step.template,
            script: step.script,
            delayDays: step.delayDays,
            delayHours: step.delayHours,
            leadLimit: step.leadLimit,
          }));
          setWorkflowPreview(workflowSteps);
          // Clear existing messages and add new campaign load message
          useOnboardingStore.setState({ aiMessages: [] });
          addAIMessage({
            role: 'ai',
            content: `I've loaded your campaign "${campaign.name}" with ${workflowSteps.length} steps. You can edit the workflow on the right, or ask me to make changes.`,
            timestamp: new Date(),
          });
        } else {
          // No steps in campaign, show empty workflow message
          useOnboardingStore.setState({ aiMessages: [] });
          addAIMessage({
            role: 'ai',
            content: `I've loaded your campaign "${campaign.name}". It doesn't have any workflow steps yet. Let me know what you'd like to add!`,
            timestamp: new Date(),
          });
        }
      } catch (error) {
        logger.error('Error loading campaign workflow', error);
        campaignLoadedRef.current = false; // Reset on error so retry is possible
        useOnboardingStore.setState({ aiMessages: [] });
        addAIMessage({
          role: 'ai',
          content: 'Sorry, I couldn\'t load the campaign workflow. Please try again.',
          timestamp: new Date(),
        });
      } finally {
        setIsProcessingAI(false);
        setIsLoadingCampaign(false);
      }
    };
    loadCampaignWorkflow();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId]); // Run when campaignId changes
  // Ensure onboardingMode is CHAT when leads path is selected
  useEffect(() => {
    if (selectedPath === 'leads' && onboardingMode === 'FORM') {
      logger.debug('Auto-correcting: leads path should use CHAT mode, switching from FORM to CHAT');
      setOnboardingMode('CHAT');
    }
  }, [selectedPath, onboardingMode, setOnboardingMode]);
  // Watch for workflow updates from global state
  useEffect(() => {
    const handleWorkflowUpdate = () => {
      const currentAnswers = (window as any).__icpAnswers || {};
      const currentStepIndex = (window as any).__currentStepIndex || 0;
      logger.debug('Workflow update triggered', { currentAnswers, currentStepIndex });
      if (Object.keys(currentAnswers).length > 0) {
        import('@/lib/workflowGenerator').then(({ generateProgressiveWorkflowPreview }) => {
          const workflowSteps = generateProgressiveWorkflowPreview(currentAnswers, currentStepIndex);
          logger.debug('Generated progressive workflow', { workflowSteps });
          setWorkflowPreview(workflowSteps);
        }).catch(err => {
          logger.error('Error generating progressive workflow', err);
        });
      }
    };
    // Listen for custom workflow update events
    window.addEventListener('workflowUpdate', handleWorkflowUpdate);
    return () => {
      window.removeEventListener('workflowUpdate', handleWorkflowUpdate);
    };
  }, [setWorkflowPreview]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [userAnswers, setUserAnswers] = useState<Record<string, any>>({});
  const [flowState, setFlowState] = useState<FlowState>('initial');
  const [currentPlatform, setCurrentPlatform] = useState<string | null>(null);
  const [currentFeature, setCurrentFeature] = useState<string | null>(null);
  const [currentUtilityAnswers, setCurrentUtilityAnswers] = useState<Record<string, any>>({});
  const [utilityQuestionIndex, setUtilityQuestionIndex] = useState(0);
  const [showWorkflowLibrary, setShowWorkflowLibrary] = useState(false);
  const [isICPOnboardingActive, setIsICPOnboardingActive] = useState(false);
  const [isSubmittingInbound, setIsSubmittingInbound] = useState(false);
  const [inboundCollectedAnswers, setInboundCollectedAnswers] = useState<Record<string, any>>({});
  const [currentInboundStepIndex, setCurrentInboundStepIndex] = useState(0);
  // Handle inbound answer processing (simplified flow: leads per day → campaign name → complete)
  const handleInboundAnswer = async (userAnswer: string) => {
    setIsProcessingAI(true);
    try {
      // Add user message
      addAIMessage({
        role: 'user',
        content: userAnswer,
        timestamp: new Date(),
      });
      // Handle based on current flow state
      if (flowState === 'inbound_leads_per_day') {
        // Store leads per day and ask for campaign name
        const leadsPerDay = parseInt(userAnswer.replace(/[^0-9]/g, '')) || 10;
        setInboundCollectedAnswers(prev => ({
          ...prev,
          leads_per_day: leadsPerDay,
        }));
        setFlowState('inbound_campaign_name');
        addAIMessage({
          role: 'ai',
          content: `Great! You'll connect with **${leadsPerDay} leads per day**.\n\nWhat would you like to name this campaign?`,
          timestamp: new Date(),
        });
      } else if (flowState === 'inbound_campaign_name') {
        // Store campaign name and complete the flow
        const leadsPerDay = (inboundCollectedAnswers as any).leads_per_day || 10;
        const totalLeads = inboundLeadData?.linkedinProfiles?.filter(Boolean).length || 
                          inboundLeadData?.emailIds?.filter(Boolean).length || 
                          inboundLeadData?.phoneNumbers?.filter(Boolean).length || 0;
        // Calculate campaign days based on leads and leads per day
        const campaignDays = Math.ceil(totalLeads / leadsPerDay);
        const finalAnswers = {
          ...inboundCollectedAnswers,
          campaign_name: userAnswer,
          campaign_days: campaignDays,
          leads_per_day: leadsPerDay,
          campaign_type: 'inbound',
          selected_platforms: selectedPlatforms.join(', '),
          company_name: inboundLeadData?.companyName || 'My Company',
          total_leads: totalLeads,
        };
        setInboundCollectedAnswers(finalAnswers);
        setFlowState('complete');
        // Show completion message with summary
        const platformLabels: Record<string, string> = {
          linkedin: 'LinkedIn',
          instagram: 'Instagram',
          whatsapp: 'WhatsApp',
          email: 'Email',
          voice: 'Voice Agent',
        };
        addAIMessage({
          role: 'ai',
          content: `🎉 **Campaign Ready!**\n\n**Summary:**\n- Campaign Name: ${userAnswer}\n- Leads per Day: ${leadsPerDay}\n- Total Leads: ${totalLeads}\n- Estimated Duration: ${campaignDays} days\n- Platforms: ${selectedPlatforms.map(p => platformLabels[p] || p).join(', ')}\n\nYour inbound campaign is ready! Click "Create Campaign" to finalize.`,
          timestamp: new Date(),
        });
        // Store answers and mark as complete
        useOnboardingStore.setState({
          icpAnswers: finalAnswers,
          icpOnboardingComplete: true,
        });
      } else {
        // Fallback: treat as leads per day answer
        const leadsPerDay = parseInt(userAnswer.replace(/[^0-9]/g, '')) || 10;
        setInboundCollectedAnswers(prev => ({
          ...prev,
          leads_per_day: leadsPerDay,
        }));
        setFlowState('inbound_campaign_name');
        addAIMessage({
          role: 'ai',
          content: `Great! You'll connect with **${leadsPerDay} leads per day**.\n\nWhat would you like to name this campaign?`,
          timestamp: new Date(),
        });
      }
    } catch (error) {
      logger.error('Error processing inbound answer', error);
      addAIMessage({
        role: 'ai',
        content: `Error processing your answer: ${(error as Error).message}. Please try again.`,
        timestamp: new Date(),
      });
    } finally {
      setIsProcessingAI(false);
    }
  };
  // Handle inbound data submission and Gemini analysis
  const handleInboundDataSubmit = async (data: InboundLeadData, skipDuplicates = false) => {
    setIsSubmittingInbound(true);
    setInboundLeadData(data);
    try {
      logger.debug('Submitting inbound data for analysis', { data });
      // First, save leads to the database
      try {
        const leadsToSave = [];
        // Extract individual leads from aggregated data
        const maxLeads = Math.max(
          data.firstNames?.length || 0,
          data.lastNames?.length || 0,
          data.linkedinProfiles?.length || 0,
          data.emailIds?.length || 0,
          data.whatsappNumbers?.length || 0,
          data.phoneNumbers?.length || 0
        );
        for (let i = 0; i < maxLeads; i++) {
          const lead = {
            firstName: data.firstNames?.[i] || '',
            lastName: data.lastNames?.[i] || '',
            companyName: data.companyName && data.companyName !== `${maxLeads} Companies` ? data.companyName : '',
            linkedinProfile: data.linkedinProfiles?.[i] || '',
            email: data.emailIds?.[i] || '',
            whatsapp: data.whatsappNumbers?.[i] || '',
            phone: data.phoneNumbers?.[i] || '',
            website: data.websiteUrl || '',
            notes: data.notes || ''
          };
          // Only add if lead has at least one contact method
          if (lead.linkedinProfile || lead.email || lead.whatsapp || lead.phone) {
            leadsToSave.push(lead);
          }
        }
        if (leadsToSave.length > 0) {
          try {
            const saveResult = await saveInboundLeads({ 
              leads: leadsToSave, 
              skipDuplicates 
            });
            
            if (!saveResult.success) {
              logger.warn('Failed to save leads to database, continuing with analysis', {
                error: saveResult.message
              });
            } else {
            
            // Check if duplicates were found
            if (saveResult.duplicatesFound && saveResult.data?.duplicates) {
              // Store duplicate info and pending data
              setDuplicateLeadsInfo(saveResult.data);
              setPendingLeadsData(data);
              setIsSubmittingInbound(false);
              
              // Show duplicate leads information to user
              const duplicates = saveResult.data.duplicates;
              let duplicateMessage = `⚠️ **Found ${duplicates.length} Existing Lead(s)**\n\n`;
              duplicateMessage += `I found the following leads already in your database:\n\n`;
              
              duplicates.forEach((dup: any, idx: number) => {
                const existing = dup.existingLead;
                const matched = dup.matchedOn.join(', ');
                duplicateMessage += `**${idx + 1}. ${existing.first_name || ''} ${existing.last_name || ''}** (${existing.company_name || 'No company'})\n`;
                duplicateMessage += `   • Matched on: ${matched}\n`;
                
                // Show booking information if available
                if (dup.bookings && dup.bookings.length > 0) {
                  const activeBookings = dup.bookings.filter((b: any) => b.status !== 'cancelled');
                  if (activeBookings.length > 0) {
                    duplicateMessage += `   • **Scheduled Follow-ups:** ${activeBookings.length}\n`;
                    activeBookings.slice(0, 2).forEach((booking: any) => {
                      const date = new Date(booking.scheduled_at).toLocaleString();
                      duplicateMessage += `     - ${booking.booking_type || 'Follow-up'} on ${date} (${booking.status})\n`;
                    });
                    if (activeBookings.length > 2) {
                      duplicateMessage += `     - ... and ${activeBookings.length - 2} more\n`;
                    }
                  }
                } else {
                  duplicateMessage += `   • No scheduled follow-ups\n`;
                }
                duplicateMessage += `\n`;
              });
              
              duplicateMessage += `**What would you like to do?**\n\n`;
              duplicateMessage += `• **Skip duplicates** - Only add the ${saveResult.data.newLeadsCount} new lead(s)\n`;
              duplicateMessage += `• **Override & include all** - Add all ${leadsToSave.length} leads (may create duplicates)\n`;
              duplicateMessage += `• **Trigger immediate follow-up** - Schedule follow-up actions for existing leads\n`;
              
              addAIMessage({
                role: 'ai',
                content: duplicateMessage,
                timestamp: new Date(),
                options: [
                  { label: 'Skip Duplicates (Recommended)', value: 'skip_duplicates' },
                  { label: 'Include All Leads', value: 'include_all' },
                  { label: 'Trigger Immediate Follow-up', value: 'trigger_followup' }
                ]
              });
              
              return; // Stop here and wait for user decision
            }
            
            logger.info('Leads saved to database successfully', {
              saved: saveResult.data?.saved,
              total: saveResult.data?.total,
              skipped: saveResult.data?.skippedDuplicates
            });
            // Store lead IDs in the inbound data for later use when creating campaign
            if (saveResult.data?.leadIds && saveResult.data.leadIds.length > 0) {
              data.leadIds = saveResult.data.leadIds;
              setInboundLeadData({ ...data, leadIds: saveResult.data.leadIds }); // Update store
              logger.info('✅ Stored lead IDs in inbound data', { count: saveResult.data.leadIds.length });
            } else {
              logger.warn('❌ No lead IDs returned from server', {
                hasData: !!saveResult.data,
                hasLeadIds: !!saveResult.data?.leadIds
              });
            }
            }
          } catch (innerError) {
            const err = innerError as any;
            logger.error('[ChatPanel] Error saving leads to database:', {
              errorType: typeof err,
              errorConstructor: err?.constructor?.name,
              errorMessage: err?.message || err?.toString() || 'Unknown error',
              errorStack: err?.stack,
              errorResponse: err?.response?.data,
              errorStatus: err?.response?.status,
              errorKeys: err ? Object.keys(err) : [],
              rawError: JSON.stringify(err, Object.getOwnPropertyNames(err))
            });
            // Continue with analysis even if save fails
          }
        }
      } catch (saveError) {
        const err = saveError as any;
        logger.error('[ChatPanel] Error in lead save process:', {
          errorType: typeof err,
          errorConstructor: err?.constructor?.name,
          errorMessage: err?.message || err?.toString() || 'Unknown error',
          errorStack: err?.stack,
          errorResponse: err?.response?.data,
          errorStatus: err?.response?.status,
          errorKeys: err ? Object.keys(err) : [],
          rawError: JSON.stringify(err, Object.getOwnPropertyNames(err))
        });
        // Continue with analysis even if save fails
      }
      // Analyze inbound data with Gemini
      const analysisResult = await analyzeInboundData(data);
      if (analysisResult.success) {
        setInboundAnalysis(analysisResult.analysis);
        setIsInboundFormVisible(false);
        // Get available platforms from analysis
        const availablePlatforms = analysisResult.analysis.availablePlatforms;
        const leadCount = data.linkedinProfiles?.filter(Boolean).length || 
                         data.emailIds?.filter(Boolean).length || 
                         data.phoneNumbers?.filter(Boolean).length || 1;
        // Show brief summary message (3-4 lines only)
        let summaryMessage = `✅ **Lead Data Imported Successfully!**\n\n`;
        summaryMessage += `I've analyzed your data and found **${leadCount} lead(s)** with contact information for **${availablePlatforms.length} platform(s)**.\n\n`;
        summaryMessage += `Now let's select which platforms you'd like to use for outreach:`;
        addAIMessage({
          role: 'ai',
          content: summaryMessage,
          timestamp: new Date(),
        });
        if (availablePlatforms.length > 0) {
          // Set the available platforms in state for the platform selection UI
          setSelectedPlatforms([]); // Reset - user will select from available
          // Transition to platform selection flow (like outbound)
          setIsICPOnboardingActive(true);
          setFlowState('platform_selection');
          setWorkflowState('STATE_2');
          // Show platform selection message with options
          setTimeout(() => {
            addAIMessage({
              role: 'ai',
              content: `**Select the platforms you want to use:**\n\n_Only platforms with your lead data are available. Others are disabled._`,
              timestamp: new Date(),
              options: [
                { label: 'LinkedIn', value: 'linkedin', disabled: !availablePlatforms.includes('linkedin') },
                { label: 'Email', value: 'email', disabled: !availablePlatforms.includes('email') },
                { label: 'WhatsApp', value: 'whatsapp', disabled: !availablePlatforms.includes('whatsapp') },
                { label: 'Voice/Phone', value: 'voice', disabled: !availablePlatforms.includes('voice') && !availablePlatforms.includes('phone') },
              ],
              isInboundPlatformSelection: true, // Flag for special handling
              availablePlatforms: availablePlatforms, // Pass available platforms
            });
          }, 500);
        } else {
          addAIMessage({
            role: 'ai',
            content: `❌ It seems like no contact data was provided in your upload. Please add at least one contact method (LinkedIn, Email, WhatsApp, or Phone) to proceed.`,
            timestamp: new Date(),
          });
        }
      } else {
        addAIMessage({
          role: 'ai',
          content: `❌ Error analyzing inbound data: ${analysisResult.error || 'Unknown error'}. Please try again.`,
          timestamp: new Date(),
        });
      }
    } catch (error) {
      logger.error('Error processing inbound data', error);
      addAIMessage({
        role: 'ai',
        content: `❌ Error processing inbound data: ${(error as Error).message || 'Unknown error'}. Please try again.`,
        timestamp: new Date(),
      });
    } finally {
      setIsSubmittingInbound(false);
    }
  };
  // Handle campaign data type selection (Inbound vs Outbound)
  const handleCampaignDataTypeSelect = (type: 'inbound' | 'outbound') => {
    logger.debug('Campaign data type selected', { type });
    setCampaignDataType(type);
    if (type === 'inbound') {
      // Show the inbound data entry form
      setIsInboundFormVisible(true);
      addAIMessage({
        role: 'ai',
        content: `Great! You've selected **Inbound** lead management.\n\nPlease fill out the form below with your inbound lead data. I'll analyze what platforms are available and ask only the relevant questions based on your data.`,
        timestamp: new Date(),
      });
    } else {
      // Outbound: Show options for ICP discovery
      addAIMessage({
        role: 'ai',
        content: `Excellent! You've selected **Outbound** lead generation.\n\nI'll help you define your Ideal Customer Profile (ICP) and set up a targeted outreach campaign. Let's start by understanding your target audience.\n\nHow would you like to proceed?`,
        timestamp: new Date(),
        options: [
          { label: 'Yes, let\'s start', value: 'start_icp_discovery' },
          { label: 'Skip to Specific Ask', value: 'skip_to_specific' }
        ]
      });
    }
  };
  // Chat step controller for ICP onboarding
  const chatStepController = useChatStepController(
    async (answers, conversationId) => {
      // On completion, create and start campaign automatically
      logger.info('🎯 [ICP COMPLETION] ICP onboarding completed', { answers, conversationId });
      logger.info('🎯 [ICP COMPLETION] inboundLeadData status:', { 
        exists: !!inboundLeadData,
        leadIds: inboundLeadData?.leadIds,
        leadIdsLength: inboundLeadData?.leadIds?.length
      });
      // Import mapper dynamically to avoid circular dependencies
      const { mapICPAnswersToCampaign } = await import('@/lib/icpToCampaignMapper');
      const mappedAnswers = mapICPAnswersToCampaign(answers);
      logger.debug('Mapped ICP answers to campaign format', { mappedAnswers });
      // Store mapped answers in onboarding store
      useOnboardingStore.setState({
        icpAnswers: mappedAnswers,
        icpOnboardingComplete: true,
      });
      // Generate workflow preview for UI
      logger.debug('Generating workflow preview from completed answers');
      const { generateWorkflowPreview } = await import('@/lib/workflowGenerator');
      const workflowSteps = generateWorkflowPreview(mappedAnswers);
      logger.debug('Generated workflow steps', { workflowSteps });
      setWorkflowPreview(workflowSteps);
      setIsICPOnboardingActive(false);
      // Show creating campaign message
      addAIMessage({
        role: 'ai',
        content: "Perfect! Creating and starting your campaign now...",
        timestamp: new Date(),
      });
      // Create and start campaign automatically
      try {
        // Import function to generate full campaign steps with configs
        const { generateCampaignSteps } = await import('@/lib/workflowGenerator');
        const campaignSteps = generateCampaignSteps(mappedAnswers);
        logger.debug('Generated campaign steps with configs', { campaignSteps });
        // Prepare campaign data
        const campaignData: any = {
          name: mappedAnswers.campaign_name || 'My Campaign',
          status: 'draft',
          steps: campaignSteps,
          config: {
            leads_per_day: mappedAnswers.leads_per_day || 10,
            lead_gen_offset: 0,
            last_lead_gen_date: null,
            // Get connection message from any of these sources (linkedin_template is from ICP flow)
            connectionMessage: mappedAnswers.linkedinConnectionMessage || 
                              mappedAnswers.linkedin_connection_message || 
                              mappedAnswers.linkedin_template || 
                              null,
          },
          leads_per_day: mappedAnswers.leads_per_day || 10,
        };
        // If inbound lead data exists, include the uploaded lead IDs
        if (inboundLeadData) {
          const leadIds = inboundLeadData.leadIds || [];
          
          // Check if we have lead IDs
          if (leadIds.length > 0) {
            campaignData.inbound_lead_ids = leadIds;
            campaignData.config.campaign_type = 'inbound'; // Store in config, not top-level
            logger.info('🔧 [Campaign Creation] ✅ Adding inbound lead IDs to campaign', { 
              leadIdsCount: leadIds.length
            });
          } else {
            // No lead IDs found - this happens when leads are uploaded but IDs aren't returned from backend
            const leadCount = 
              (inboundLeadData.linkedinProfiles?.filter(Boolean).length || 0) +
              (inboundLeadData.emailIds?.filter(Boolean).length || 0) +
              (inboundLeadData.phoneNumbers?.filter(Boolean).length || 0);
            
            if (leadCount > 0) {
              // We have lead data but no IDs - this means backend didn't save them properly
              logger.warn('🔧 [Campaign Creation] ⚠️ Lead data exists but no IDs were returned', { 
                leadCount,
                companyName: inboundLeadData.companyName
              });
              // Create a temporary warning message but allow proceeding
              addAIMessage({
                role: 'ai',
                content: "⚠️ Note: Your lead data is ready, but the system couldn't assign unique IDs to them. The campaign will proceed with your uploaded data.",
                timestamp: new Date(),
              });
              // For now, we'll proceed without explicit IDs - the backend can handle this
            } else {
              // No lead data and no IDs - genuinely missing data
              logger.error('🔧 [Campaign Creation] ❌ No lead data or IDs found in inbound data!', { 
                campaignName: campaignData.name,
                note: 'Please upload your leads again before creating the campaign.'
              });
              // Show error message to user with option to upload again
              addAIMessage({
                role: 'ai',
                content: "⚠️ I notice you haven't uploaded any leads yet. Please upload your lead data before creating the campaign. Would you like to upload your leads now?",
                timestamp: new Date(),
              });
              // Show the inbound form again
              setIsInboundFormVisible(true);
              return; // Stop campaign creation
            }
          }
        } else {
          logger.info('🔧 [Campaign Creation] No inbound lead data - this is an outbound campaign');
        }
        logger.info('🚀 [Campaign Creation] Final campaign payload', { 
          name: campaignData.name,
          hasInboundLeadIds: !!campaignData.inbound_lead_ids,
          inboundLeadIdsCount: campaignData.inbound_lead_ids?.length,
          campaignType: campaignData.config?.campaign_type
        });
        
        // Use conversationId passed from the ICP flow completion
        // This conversationId was captured when messages were saved on the last ICP step
        if (conversationId) {
          campaignData.conversationId = conversationId;
          logger.info('✅ [Campaign Creation] Using conversationId from ICP flow', { conversationId });
        } else {
          logger.warn('⚠️ [Campaign Creation] No conversationId available - messages may not be linked to campaign');
        }
        
        logger.debug('[Campaign Creation] Sending campaign creation request', { 
          campaignData,
          hasConversationId: !!conversationId
        });
        const createResponse = await apiPost<{ success: boolean; data: any }>('/api/campaigns', campaignData);
        if (createResponse.success) {
          const campaignId = createResponse.data.id || createResponse.data.data?.id;
          logger.debug('Campaign created successfully', { campaignId });
          // Start the campaign
          if (campaignId) {
            logger.debug('Starting campaign');
            await apiPost<{ success: boolean }>(`/api/campaigns/${campaignId}/start`, {});
            logger.debug('Campaign started successfully');
            // Show success message
            addAIMessage({
              role: 'ai',
              content: "✅ Campaign created and started successfully! Redirecting to campaigns page...",
              timestamp: new Date(),
            });
            // Redirect after short delay
            setTimeout(() => {
              router.push('/campaigns');
            }, 1500);
          }
        }
      } catch (error) {
        logger.error('Error creating/starting campaign', error);
        addAIMessage({
          role: 'ai',
          content: `❌ Error creating campaign: ${(error as Error).message || 'Unknown error'}. Please try again from the campaigns page.`,
          timestamp: new Date(),
        });
      }
    },
    (stepIndex, answer) => {
      // Update workflow preview as steps are answered
      logger.debug('Step answered', { stepIndex, answer });
      // Special case: stepIndex = -1 means "generate workflow now"
      if (stepIndex === -1 && typeof answer === 'object') {
        logger.debug('Generating workflow from answers', { answer });
        // Import mapper and generator dynamically
        import('@/lib/icpToCampaignMapper').then(({ mapICPAnswersToCampaign }) => {
          const mappedAnswers = mapICPAnswersToCampaign(answer);
          logger.debug('Mapped answers for workflow', { mappedAnswers });
          // Generate workflow preview
          import('@/lib/workflowGenerator').then(({ generateWorkflowPreview }) => {
            const workflowSteps = generateWorkflowPreview(mappedAnswers);
            logger.debug('Generated workflow steps', { workflowSteps });
            setWorkflowPreview(workflowSteps);
          }).catch(err => {
            logger.error('Error generating workflow', err);
          });
        }).catch(err => {
          logger.error('Error mapping answers', err);
        });
      } else {
        // Progressive workflow update for individual answers
        logger.debug('Updating progressive workflow for step', { stepIndex, answer });
        // Get current answers from chat controller and update workflow
        import('@/lib/workflowGenerator').then(({ generateProgressiveWorkflowPreview }) => {
          // Get current answers by merging existing answers with new answer from the controller
          const currentAnswers = (window as any).__icpAnswers || {};
          // Pass the stepIndex to make workflow truly progressive
          const workflowSteps = generateProgressiveWorkflowPreview(currentAnswers, stepIndex);
          logger.debug('Updated progressive workflow', { workflowSteps });
          setWorkflowPreview(workflowSteps);
        }).catch(err => {
          logger.error('Error updating progressive workflow', err);
        });
      }
    }
  );
  // Handle workflow selection from library
  const handleWorkflowSelect = async (workflow: { naturalLanguage: string }) => {
    logger.debug('Workflow selected', { naturalLanguage: workflow.naturalLanguage });
    setShowWorkflowLibrary(false);
    // If on initial screen, transition to chat interface
    if (!hasSelectedOption) {
      setHasSelectedOption(true);
      setIsAIChatActive(true);
      setCurrentScreen(1);
      // Set a default path if none selected
      if (!selectedPath) {
        setSelectedPath('automation');
      }
    }
    // Send the natural language command as if user typed it
    const msg = workflow.naturalLanguage;
    // Add user message
    addAIMessage({
      role: 'user',
      content: msg,
      timestamp: new Date(),
    });
    setIsProcessingAI(true);
    try {
      const history = aiMessages.map(msg => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp,
      }));
      const context = {
        selectedPath: selectedPath || null,
        selectedCategory: selectedCategory || null,
        selectedPlatforms,
        platformsConfirmed: platformsConfirmed || false,
        platformFeatures,
        currentPlatform: currentPlatform || undefined,
        currentFeature: currentFeature || undefined,
        workflowNodes: workflowNodes,
        currentState: workflowState,
        fastMode: true, // Enable FastMode for workflow library
      };
      logger.debug('Sending workflow command', { msg, context });
      const response = await sendGeminiPrompt(
        msg,
        history,
        null,
        selectedPath,
        {},
        context
      );
      logger.debug('Received response', {
        hasText: !!response.text,
        hasSearchResults: !!response.searchResults,
        searchResultsCount: response.searchResults?.length || 0,
        status: response.status,
      });
      // Add AI response with requirements data
      addAIMessage({
        role: 'ai',
        content: response.text,
        timestamp: new Date(),
        options: response.options || undefined,
        status: response.status,
        missing: response.missing,
        workflow: response.workflow,
        searchResults: response.searchResults,
      });
      // Update state if AI indicates state change
      if (response.currentState) {
        setWorkflowState(response.currentState);
      }
      // Process workflow updates if present
      if (response.workflowUpdates && Array.isArray(response.workflowUpdates)) {
        processWorkflowUpdates(response.workflowUpdates);
      }
    } catch (error) {
      logger.error('Error sending workflow command', error);
      const err = error as any;
      addAIMessage({
        role: 'ai',
        content: err.response?.data?.text || err.message || 'I encountered an error. Please try again.',
        timestamp: new Date(),
        searchResults: err.response?.data?.searchResults || undefined,
      });
    } finally {
      setIsProcessingAI(false);
    }
  };
  // Scroll to bottom when messages update
  useEffect(() => {
    if (aiMessages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [aiMessages]);
  // Start AI conversation when option is selected
  useEffect(() => {
    if (!campaignId && hasSelectedOption && selectedPath === 'automation' && aiMessages.length === 0 && flowState === 'initial') {
      startAIConversation('automation');
    }
  }, [selectedPath, hasSelectedOption]); // eslint-disable-line react-hooks/exhaustive-deps
  // Auto-start ICP onboarding flow on page load if in CHAT mode with leads selected
  // IMPORTANT: Only start if campaignDataType is 'outbound' (inbound has its own form flow)
  useEffect(() => {
    // Check if the last AI message has ICP mode selection options
    const lastAIMessage = aiMessages.filter(m => m.role === 'ai').slice(-1)[0];
    const hasICPChoiceOptions = lastAIMessage?.options?.some(
      opt => opt.value === 'start_icp_discovery' || opt.value === 'skip_to_specific'
    );
    
    if (
      !campaignId && // Don't start if editing existing campaign
      hasSelectedOption &&
      selectedPath === 'leads' &&
      onboardingMode === 'CHAT' &&
      campaignDataType === 'outbound' && // Only auto-start for outbound flow
      flowState !== 'icp_discovery_mode' && // Don't auto-start if in discovery mode
      !hasICPChoiceOptions && // Don't auto-start if waiting for user to choose ICP mode
      !isICPOnboardingActive &&
      !isICPFlowStarted && // Check persisted flag to prevent restart on refresh
      !chatStepController.isComplete &&
      aiMessages.length > 1 // At least have the type selection message
    ) {
      logger.debug('Auto-starting ICP onboarding flow for outbound', {
        hasSelectedOption,
        selectedPath,
        onboardingMode,
        campaignDataType,
        flowState,
        isICPOnboardingActive,
        isICPFlowStarted,
        isComplete: chatStepController.isComplete,
        existingMessages: aiMessages.length
      });
      setIsICPOnboardingActive(true);
      // Use setTimeout to ensure state is set before starting flow
      setTimeout(() => {
        chatStepController.startFlow();
      }, 100);
    }
  }, [hasSelectedOption, selectedPath, onboardingMode, aiMessages.length, isICPFlowStarted, campaignDataType, flowState]); // eslint-disable-line react-hooks/exhaustive-deps
  const startAIConversation = async (path: 'automation' | 'leads') => {
    setIsProcessingAI(true);
    // Set state based on path
    if (path === 'leads') {
      setWorkflowState('STATE_2'); // Already have category, go to platform selection
      setFlowState('platform_selection');
    } else {
      setWorkflowState('STATE_1'); // Need to choose category first
      setFlowState('initial');
      // Get initial greeting from backend AI instead of hardcoded message
      try {
        const response = await sendGeminiPrompt(
          'START', // Special message to trigger initial greeting
          [],
          null,
          path,
          {},
          {
            selectedPath: path,
            selectedPlatforms: [],
            platformsConfirmed: false,
            selectedCategory: null,
            platformFeatures: {},
            workflowNodes: [],
            currentState: 'STATE_1'
          }
        );
        addAIMessage({
          role: 'ai',
          content: response.text || 'Hello! How can I help you set up your campaign?',
          timestamp: new Date(),
        });
      } catch (error) {
        logger.error('Error starting AI conversation', error);
        addAIMessage({
          role: 'ai',
          content: 'Hello! How can I help you set up your campaign?',
          timestamp: new Date(),
        });
      }
      setIsProcessingAI(false);
      return;
    }
    const firstQuestion = questionSequences[path]?.[0];
    if (firstQuestion) {
      addAIMessage({
        role: 'ai',
        content: firstQuestion.question,
        timestamp: new Date(),
      });
    }
    setIsProcessingAI(false);
  };
  const handleOptionSelect = (option: 'automation' | 'leads') => {
    logger.debug('handleOptionSelect called', { option });
    setSelectedPath(option);
    setHasSelectedOption(true);
    setIsAIChatActive(true);
    setCurrentScreen(1);
    setFlowState('initial');
    setOnboardingMode('CHAT'); // Use CHAT mode for both options
    if (option === 'leads') {
      setSelectedCategory('leadops');
      setWorkflowState('STATE_1');
      // NEW FIRST STEP: Ask campaign data type (Inbound vs Outbound)
      // Don't start ICP flow yet - wait for user to select inbound/outbound
      addAIMessage({
        role: 'ai',
        content: `Great choice! Let's set up your lead campaign.\n\n**First, what type of lead data will you be working with?**\n\n• **Inbound** - You have leads that came to you (via website, referrals, etc.)\n• **Outbound** - You want to find and reach out to new prospects\n\nPlease select below:`,
        timestamp: new Date(),
      });
      // Don't start AI conversation yet - wait for inbound/outbound selection
      return;
    } else if (option === 'automation') {
      setWorkflowState('STATE_1'); // Start from beginning
      // Start AI conversation for automation
      startAIConversation(option);
    }
  };
  const processPlatformSelection = async (platforms: string[]) => {
    // Handle "all" option
    let newPlatforms = platforms.includes('all')
      ? ['linkedin', 'instagram', 'whatsapp', 'email', 'voice']
      : platforms;
    // Filter out duplicates - only add platforms not already selected
    const uniqueNewPlatforms = newPlatforms.filter(p => !selectedPlatforms.includes(p));
    if (uniqueNewPlatforms.length === 0 && newPlatforms.length > 0) {
      // All platforms already selected
      addAIMessage({
        role: 'ai',
        content: `You've already selected all those platforms. Your current platforms: ${selectedPlatforms.join(', ')}.\n\nWould you like to add another platform, or continue with workflow building? (say "continue", "done", or "no more")`,
        timestamp: new Date(),
      });
      setIsProcessingAI(false);
      return;
    }
    // Merge with existing platforms
    const selected = [...selectedPlatforms, ...uniqueNewPlatforms];
    setSelectedPlatforms(selected);
    setCurrentPlatformIndex(0);
    setFlowState('platform_confirmation');
    setWorkflowState('STATE_2'); // Still in platform selection state
    // Connect channels for new platforms only
    uniqueNewPlatforms.forEach(platform => {
      const channelMap: Record<string, keyof ChannelConnection> = {
        linkedin: 'linkedin',
        instagram: 'instagram',
        whatsapp: 'whatsapp',
        email: 'email',
        voice: 'voiceAgent',
      };
      const channel = channelMap[platform];
      if (channel) {
        setChannelConnection(channel, true);
      }
    });
    // STRICT WAITING RULE: Ask for confirmation before proceeding
    const addedText = uniqueNewPlatforms.length > 0
      ? `Great! I've added ${uniqueNewPlatforms.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(', ')}. `
      : '';
    addAIMessage({
      role: 'ai',
      content: `${addedText}Your selected platforms: ${selected.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(', ')}.\n\n**Current State: STATE_2 (Choose Platforms)**\n\nWould you like to add another platform, or continue with workflow building? (say "continue", "done", "no more", or just "no")`,
      timestamp: new Date(),
    });
    setIsProcessingAI(false);
  };
  const askFeaturesForPlatform = async (platform: string, skipConfirmationCheck: boolean = false) => {
    // RULE 1: Only proceed if platforms are confirmed (skip for inbound flow where we pass the flag)
    if (!platformsConfirmed && !skipConfirmationCheck) {
      return;
    }
    setCurrentPlatform(platform);
    setFlowState('platform_features'); // Set flow state for feature selection
    setIsProcessingAI(true);
    const platformLabels: Record<string, string> = {
      linkedin: 'LinkedIn',
      instagram: 'Instagram',
      whatsapp: 'WhatsApp',
      email: 'Email',
      voice: 'Voice Agent',
    };
    // Get all features for platform
    const allFeatures = PLATFORM_FEATURES[platform as keyof typeof PLATFORM_FEATURES] || [];
    // RULE 2, RULE 3, RULE 6: Filter features based on category and platform restrictions
    const filteredFeatures = filterFeaturesByCategory(
      allFeatures,
      selectedCategory as any,
      platform
    );
    if (filteredFeatures.length === 0) {
      addAIMessage({
        role: 'ai',
        content: `No features available for ${platformLabels[platform] || platform} in the selected category. Moving to next platform...`,
        timestamp: new Date(),
      });
      setIsProcessingAI(false);
      // Move to next platform
      const nextIndex = currentPlatformIndex + 1;
      if (nextIndex < selectedPlatforms.length) {
        setCurrentPlatformIndex(nextIndex);
        setTimeout(() => askFeaturesForPlatform(selectedPlatforms[nextIndex]), 500);
      }
      return;
    }
    // Build feature options for display
    const featureOptions = filteredFeatures.map(f => ({
      label: f.label,
      value: f.id,
      description: f.description,
    }));
    // For inbound flow, show which platform we're configuring (e.g., "1 of 2")
    const platformProgress = campaignDataType === 'inbound' 
      ? ` (${currentPlatformIndex + 1} of ${selectedPlatforms.length})`
      : '';
    addAIMessage({
      role: 'ai',
      content: `**${platformLabels[platform] || platform}${platformProgress}**\n\nWhich features do you want to enable? (Select all that apply)`,
      timestamp: new Date(),
      // Don't include options here - let getCurrentQuestionOptions provide them
      // This allows the multi-select UI to work properly
    });
    setIsProcessingAI(false);
  };
  const processFeatureSelection = async (platform: string, features: string[]) => {
    setPlatformFeatures(platform, features);
    setCurrentFeatureIndex(platform, 0);
    // Both INBOUND and OUTBOUND flow: Continue with utility questions for the first feature
    // This ensures templates, schedules, etc. are collected
    setFlowState('feature_utilities');
    if (features.length > 0) {
      await askUtilitiesForFeature(platform, features[0]);
    }
  };
  const askUtilitiesForFeature = async (platform: string, feature: string) => {
    setCurrentFeature(feature);
    setUtilityQuestionIndex(0);
    setCurrentUtilityAnswers({});
    setIsProcessingAI(true);
    const utilityQuestions = getUtilityQuestions();
    const firstQuestion = utilityQuestions[0];
    addAIMessage({
      role: 'ai',
      content: `Let's configure ${PLATFORM_FEATURES[platform as keyof typeof PLATFORM_FEATURES]?.find(f => f.id === feature)?.label || feature}. ${firstQuestion.question}`,
      timestamp: new Date(),
    });
    setCurrentUtilityQuestion(firstQuestion.key);
    setIsProcessingAI(false);
  };
  const processUtilityAnswer = async (questionKey: string, answer: string | string[]) => {
    setCurrentUtilityAnswers(prev => ({ ...prev, [questionKey]: answer }));
    const utilityQuestions = getUtilityQuestions();
    const currentIndex = utilityQuestions.findIndex(q => q.key === questionKey);
    if (currentIndex < utilityQuestions.length - 1) {
      // Ask next utility question
      const nextQuestion = utilityQuestions[currentIndex + 1];
      setIsProcessingAI(true);
      setTimeout(() => {
        addAIMessage({
          role: 'ai',
          content: nextQuestion.question,
          timestamp: new Date(),
        });
        setCurrentUtilityQuestion(nextQuestion.key);
        setUtilityQuestionIndex(currentIndex + 1);
        setIsProcessingAI(false);
      }, 500);
    } else {
      // All utility questions answered, build node
      await buildAndAddNode();
    }
  };
  const buildAndAddNode = async () => {
    if (!currentPlatform || !currentFeature) return;
    setIsProcessingAI(true);
    // Convert utility answers to node settings
    const schedule = currentUtilityAnswers.schedule || 'immediate';
    const delayType = currentUtilityAnswers.delay || 'none';
    const delay: { type: string; value?: number } | undefined = delayType === 'hours'
      ? { type: 'hours', value: currentUtilityAnswers.delayHours || 0 }
      : delayType === 'days'
        ? { type: 'days', value: currentUtilityAnswers.delayDays || 0 }
        : undefined;
    const condition = currentUtilityAnswers.condition === 'none' ? null : currentUtilityAnswers.condition;
    const variables = Array.isArray(currentUtilityAnswers.variables)
      ? currentUtilityAnswers.variables.filter((v: string) => v !== 'none')
      : [];
    const node = buildWorkflowNode(currentPlatform, currentFeature, {
      schedule,
      delay,
      condition,
      variables,
    });
    // Add node to workflow
    addWorkflowNode(node);
    // Add to preview
    const previewStep: WorkflowPreviewStep = {
      id: node.id,
      type: node.type as any,
      title: node.title,
      description: `${currentPlatform} - ${node.title}`,
      channel: (node.channel as 'linkedin' | 'email' | 'whatsapp' | 'voice' | 'instagram') || undefined,
    };
    addWorkflowStep(previewStep);
    // Create edge from last node (get current state)
    const currentNodes = useOnboardingStore.getState().workflowNodes;
    if (currentNodes.length > 0) {
      const lastNode = currentNodes[currentNodes.length - 1];
      addWorkflowEdge({
        id: `edge-${lastNode.id}-${node.id}`,
        from: lastNode.id,
        to: node.id,
        condition: condition,
      });
    } else {
      // First node, connect from start
      addWorkflowEdge({
        id: `edge-start-${node.id}`,
        from: 'start',
        to: node.id,
        condition: null,
      });
    }
    // Check if more features for this platform
    const platformFeaturesList = platformFeatures[currentPlatform] || [];
    const currentFeatureIdx = currentFeatureIndex[currentPlatform] || 0;
    if (currentFeatureIdx < platformFeaturesList.length - 1) {
      // More features for this platform
      const nextFeature = platformFeaturesList[currentFeatureIdx + 1];
      setCurrentFeatureIndex(currentPlatform, currentFeatureIdx + 1);
      setTimeout(() => {
        askUtilitiesForFeature(currentPlatform, nextFeature);
      }, 500);
    } else {
      // Check if more platforms
      const nextPlatformIndex = currentPlatformIndex + 1;
      if (nextPlatformIndex < selectedPlatforms.length) {
        // Move to next platform
        setCurrentPlatformIndex(nextPlatformIndex);
        setFlowState('platform_features');
        setTimeout(() => {
          // Pass skipConfirmationCheck for inbound flow
          askFeaturesForPlatform(selectedPlatforms[nextPlatformIndex], campaignDataType === 'inbound');
        }, 500);
      } else {
        // All done! Add end node edge
        const currentNodes = useOnboardingStore.getState().workflowNodes;
        if (currentNodes.length > 0) {
          const lastNode = currentNodes[currentNodes.length - 1];
          addWorkflowEdge({
            id: `edge-${lastNode.id}-end`,
            from: lastNode.id,
            to: 'end',
            condition: null,
          });
        }
        setFlowState('complete');
        addAIMessage({
          role: 'ai',
          content: 'Perfect! Your workflow is complete. You can review it in the preview panel and make any edits if needed.',
          timestamp: new Date(),
        });
      }
    }
    setIsProcessingAI(false);
  };
  // Process workflow updates from AI response
  const processWorkflowUpdates = (updates: any[]) => {
    if (!updates || !Array.isArray(updates)) return;
    updates.forEach((update) => {
      if (update.action === 'add' && update.node) {
        const node = update.node;
        // Create workflow node
        const workflowNode = {
          id: node.id || `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: node.type,
          title: node.title || node.type,
          description: node.description || '',
          channel: node.platform || null,
          position: { x: 100, y: 150 + workflowNodes.length * 120 },
          data: {
            ...node.config,
            inputs: node.inputs || [],
            outputs: node.outputs || [],
            conditions: node.conditions || null,
            rateLimit: node.rateLimit || null,
            filters: node.filters || null,
          },
        };
        // Add node to workflow
        addWorkflowNode(workflowNode);
        // Add to preview
        const previewStep = {
          id: workflowNode.id,
          type: node.type as any,
          title: node.title,
          description: node.description || `${node.platform || ''} - ${node.title}`,
          channel: node.platform || null,
        };
        addWorkflowStep(previewStep);
        // Create edge from last node
        const currentNodes = useOnboardingStore.getState().workflowNodes;
        if (currentNodes.length > 1) {
          const lastNode = currentNodes[currentNodes.length - 2];
          addWorkflowEdge({
            id: `edge-${lastNode.id}-${workflowNode.id}`,
            from: lastNode.id,
            to: workflowNode.id,
            condition: node.conditions || null,
          });
        } else {
          // First node, connect from start
          addWorkflowEdge({
            id: `edge-start-${workflowNode.id}`,
            from: 'start',
            to: workflowNode.id,
            condition: null,
          });
        }
      } else if (update.action === 'update' && update.node) {
        // Update existing node
        const nodeId = update.node.id;
        const currentNodes = useOnboardingStore.getState().workflowNodes;
        const nodeIndex = currentNodes.findIndex((n: any) => n.id === nodeId);
        if (nodeIndex >= 0) {
          const updatedNode = {
            ...currentNodes[nodeIndex],
            ...update.node,
            data: {
              ...currentNodes[nodeIndex].data,
              ...update.node.config,
            },
          };
          // Update in store (would need updateWorkflowNode action)
          // For now, we'll remove and re-add
          const newNodes = [...currentNodes];
          newNodes[nodeIndex] = updatedNode;
          // This would require a setWorkflowNodes action
        }
      } else if (update.action === 'remove' && update.nodeId) {
        // Remove node
        const nodeId = update.nodeId;
        const currentNodes = useOnboardingStore.getState().workflowNodes;
        const filteredNodes = currentNodes.filter((n: any) => n.id !== nodeId);
        // Would need setWorkflowNodes action to update
      }
    });
  };
  const handleAnswer = async (answer: string | string[], questionKey: string) => {
    setIsProcessingAI(true);
    const answerText = Array.isArray(answer) ? answer.join(', ') : answer;
    addAIMessage({
      role: 'user',
      content: answerText,
      timestamp: new Date(),
    });
    setUserAnswers((prev) => ({ ...prev, [questionKey]: answer }));
    try {
      // Handle ICP discovery flow selection
      if (answerText === 'start_icp_discovery') {
        logger.info('[ICP Discovery] User selected "Yes, let\'s start" - activating discovery mode');
        setIsProcessingAI(false);
        addAIMessage({
          role: 'ai',
          content: `Great! Let's dive deep into understanding your ideal customer.\n\n**First, tell me about your company** - What do you do and what problems do you solve for your customers?\n\n_This helps me understand your business so I can identify who would be the best fit to buy from you._\n\n_Example: "We're a SaaS platform that helps e-commerce brands automate their customer support. We reduce response time from hours to minutes and help teams handle 3x more tickets with the same staff."_`,
          timestamp: new Date(),
        });
        // Start ICP discovery mode
        setFlowState('icp_discovery_mode');
        logger.info('[ICP Discovery] Flow state set to icp_discovery_mode');
        return;
      } else if (answerText === 'skip_to_specific') {
        logger.info('[ICP Discovery] User selected "Skip to Specific Ask" - starting structured discovery mode');
        setIsProcessingAI(false);
        
        // Use ICP discovery mode but with a more structured approach
        addAIMessage({
          role: 'ai',
          content: `Perfect! I'll ask you specific questions to build your ideal customer profile quickly.\n\n**What industry or type of business are you targeting?**\n\n_Examples: E-commerce, SaaS, Healthcare, Manufacturing, Retail, etc._`,
          timestamp: new Date(),
        });
        // Start ICP discovery mode (same as conversational but with more direct questions)
        setFlowState('icp_discovery_mode');
        logger.info('[ICP Discovery] Flow state set to icp_discovery_mode (structured path)');
        return;
      }
      
      // Handle duplicate lead options
      if (duplicateLeadsInfo && pendingLeadsData) {
        if (answerText === 'skip_duplicates') {
          // Re-submit with skipDuplicates flag
          setDuplicateLeadsInfo(null);
          setPendingLeadsData(null);
          addAIMessage({
            role: 'ai',
            content: `✅ Skipping ${duplicateLeadsInfo.duplicateCount} duplicate lead(s). Processing ${duplicateLeadsInfo.newLeadsCount} new lead(s)...`,
            timestamp: new Date(),
          });
          setIsProcessingAI(false);
          setIsSubmittingInbound(true); // Set loading state
          await handleInboundDataSubmit(pendingLeadsData, true); // skipDuplicates = true
          return;
        } else if (answerText === 'include_all') {
          // Force include all leads by bypassing duplicate check
          setDuplicateLeadsInfo(null);
          setPendingLeadsData(null);
          addAIMessage({
            role: 'ai',
            content: `⚠️ Including all leads. Note: This may create duplicate entries in your database.`,
            timestamp: new Date(),
          });
          // Re-submit without duplicate checking (would need backend endpoint modification)
          // For now, just proceed with skip_duplicates to avoid actual duplicates
          setIsProcessingAI(false);
          setIsSubmittingInbound(true); // Set loading state
          await handleInboundDataSubmit(pendingLeadsData, true);
          return;
        } else if (answerText === 'trigger_followup') {
          // Show follow-up action options
          setDuplicateLeadsInfo(null);
          setPendingLeadsData(null);
          const duplicates = duplicateLeadsInfo.duplicates;
          addAIMessage({
            role: 'ai',
            content: `📅 **Immediate Follow-up Actions**\n\nI'll schedule follow-up actions for the ${duplicates.length} existing lead(s).\n\nWhat type of follow-up would you like?\n\n• **Call** - Schedule a phone call\n• **Email** - Send a follow-up email\n• **LinkedIn Message** - Send a LinkedIn message\n• **Meeting** - Schedule a meeting\n• **Skip Follow-up** - Cancel existing bookings and re-nurture as new leads\n\n_Note: The new ${duplicateLeadsInfo.newLeadsCount} lead(s) will be added to your campaign as well._`,
            timestamp: new Date(),
            options: [
              { label: 'Schedule Call', value: 'followup_call' },
              { label: 'Send Email', value: 'followup_email' },
              { label: 'LinkedIn Message', value: 'followup_linkedin' },
              { label: 'Schedule Meeting', value: 'followup_meeting' },
              { label: 'Skip Follow-up (Cancel & Re-nurture)', value: 'skip_followup' }
            ]
          });
          setIsProcessingAI(false);
          return;
        } else if (answerText.startsWith('followup_')) {
          // Handle follow-up action scheduling
          const actionType = answerText.replace('followup_', '');
          
          if (actionType === 'skip_followup') {
            // Show confirmation before cancelling bookings
            const duplicateLeadIds = duplicateLeadsInfo?.duplicates?.map((dup: any) => dup.existingLead.id).filter(Boolean) || [];
            const totalBookings = duplicateLeadsInfo?.duplicates?.reduce((sum: number, dup: any) => {
              return sum + (dup.bookings?.filter((b: any) => b.status !== 'cancelled').length || 0);
            }, 0) || 0;
            
            if (totalBookings > 0) {
              addAIMessage({
                role: 'ai',
                content: `⚠️ **Confirmation Required**\n\n**Are you sure you want to skip follow-ups?**\n\nThis action will:\n• Cancel **${totalBookings} scheduled follow-up(s)** for ${duplicateLeadIds.length} existing lead(s)\n• Remove these leads from their current nurture sequences\n• Re-add them to your new campaign as fresh leads\n\n**This action cannot be undone.**\n\nDo you want to proceed?`,
                timestamp: new Date(),
                options: [
                  { label: 'Yes, Cancel & Re-nurture', value: 'confirm_skip_followup' },
                  { label: 'No, Keep Existing Follow-ups', value: 'cancel_skip_followup' }
                ]
              });
              setIsProcessingAI(false);
              return;
            } else {
              // No active bookings, proceed without confirmation
              addAIMessage({
                role: 'ai',
                content: `No active follow-ups found. Proceeding with ${duplicateLeadsInfo?.newLeadsCount || 0} new lead(s)...`,
                timestamp: new Date(),
              });
            }
          } else {
            // TODO: Implement actual booking creation for other types
            addAIMessage({
              role: 'ai',
              content: `✅ Follow-up ${actionType} scheduled for existing leads. Processing ${duplicateLeadsInfo?.newLeadsCount || 0} new lead(s)...`,
              timestamp: new Date(),
            });
          }
          
          setIsProcessingAI(false);
          setIsSubmittingInbound(true); // Set loading state
          if (pendingLeadsData) {
            await handleInboundDataSubmit(pendingLeadsData, true);
          }
          return;
        } else if (answerText === 'confirm_skip_followup') {
          // User confirmed - proceed with cancellation
          const duplicateLeadIds = duplicateLeadsInfo?.duplicates?.map((dup: any) => dup.existingLead.id).filter(Boolean) || [];
          
          if (duplicateLeadIds.length > 0) {
            try {
              addAIMessage({
                role: 'ai',
                content: `🔄 Cancelling existing follow-ups and re-nurturing ${duplicateLeadIds.length} lead(s)...`,
                timestamp: new Date(),
              });
              
              // Cancel bookings via API
              const cancelResult = await cancelLeadBookingsForReNurturing(duplicateLeadIds);
              
              addAIMessage({
                role: 'ai',
                content: `✅ Cancelled ${cancelResult.data.cancelledBookings} scheduled follow-up(s). These leads will now be treated as new leads in your campaign.\n\nProcessing ${duplicateLeadsInfo?.newLeadsCount || 0} new lead(s)...`,
                timestamp: new Date(),
              });
            } catch (error) {
              logger.error('[ChatPanel] Failed to cancel bookings:', {
                error: (error as Error).message
              });
              addAIMessage({
                role: 'ai',
                content: `⚠️ Failed to cancel existing bookings: ${(error as Error).message}. Proceeding with ${duplicateLeadsInfo?.newLeadsCount || 0} new lead(s)...`,
                timestamp: new Date(),
              });
            }
          }
          
          setIsProcessingAI(false);
          setIsSubmittingInbound(true); // Set loading state
          if (pendingLeadsData) {
            await handleInboundDataSubmit(pendingLeadsData, true);
          }
          return;
        } else if (answerText === 'cancel_skip_followup') {
          // User cancelled - go back to duplicate options
          addAIMessage({
            role: 'ai',
            content: `Keeping existing follow-ups intact. Please choose another option:`,
            timestamp: new Date(),
            options: [
              { label: 'Skip Duplicates (Recommended)', value: 'skip_duplicates' },
              { label: 'Include All Leads', value: 'include_all' },
              { label: 'Trigger Immediate Follow-up', value: 'trigger_followup' }
            ]
          });
          setIsProcessingAI(false);
          return;
        }
      }
      
      // Handle ICP discovery mode - conversational ICP profiling
      if (flowState === 'icp_discovery_mode') {
        const historyWithTimestamp = aiMessages.map(msg => ({
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp,
        }));
        
        // Prepend ICP discovery context to the message
        const icpContextPrefix = `[ICP Discovery Mode - You are an expert business consultant helping identify the user's IDEAL CUSTOMER PROFILE (who they want to SELL TO).

CRITICAL INSTRUCTIONS:
- When the user describes their company/business, you are learning about what THEY do and what they SELL
- DO NOT confuse the user's own industry with their TARGET customer's industry
- Example: If user says "We're a SaaS platform", their OWN industry is Software/SaaS, but their TARGET industry is the industry of companies they want to sell TO (e.g., E-commerce, Healthcare, Manufacturing, etc.)
- Example: If user says "We manufacture glass and aluminum", their OWN industry is Manufacturing, but their TARGET should be who they sell to (e.g., Commercial Buildings, Construction Companies, etc.)

YOUR GOAL: Understand the CUSTOMER they want to target, not categorize their own business.

Conversation Flow:
1. First, understand what the user's company does and what problems they solve
2. Then ask about their BEST EXISTING CUSTOMERS - what industries/types of companies have bought from them
3. Ask about patterns in these successful customers (size, industry, pain points, decision makers)
4. Build a profile of their IDEAL CUSTOMER (not their own company)

## Your Output:
After gathering sufficient information (typically 8-12 questions), synthesize your findings into a structured ICP profile that includes:
- **Profile Name**: A memorable name for this segment
- **Company Profile**: Industry, size, growth stage, location
- **Key Pain Points**: Top 3-4 problems they face
- **Decision Criteria**: What matters most in their buying decision
- **Success Metrics**: How they measure ROI/success
- **Buying Process**: Typical sales cycle and decision-makers
- **Recommended Go-to-Market**: Channels and messaging for reaching them

## Conversation Guidelines:
- Start with understanding their business (what they do, what they sell)
- Then explore their current customer success stories (who are your best customers?)
- Move toward defining market characteristics (industries, company sizes, locations)
- End by identifying decision-making patterns (who decides, what matters, how long is sales cycle)
- Stay conversational - avoid feeling like an interrogation
- Ask questions naturally and conversationally, one or two at a time
- Clarify any ambiguous answers
- Make educated guesses and validate them with follow-up questions
- Provide brief, relatable examples for each question to help users understand what you're looking for
- Use the example answers as a reference for the depth and specificity you're looking for

When complete, present the comprehensive ICP profile focused on the TARGET CUSTOMER and ask for confirmation before proceeding.]\n\nUser response: `;
        
        // Send to AI with ICP discovery context
        const response = await sendGeminiPrompt(
          icpContextPrefix + answer,
          historyWithTimestamp,
          questionKey,
          selectedPath || 'automation',
          {},
          {
            selectedPath: selectedPath || 'automation',
            selectedCategory: selectedCategory || null,
            selectedPlatforms,
            platformsConfirmed: false,
            platformFeatures: {},
            workflowNodes: [],
            currentState: 'STATE_1'
          }
        );
        
        // Check if ICP discovery is complete (AI signals readiness to move forward)
        const completionKeywords = ['icp profile complete', 'ready to proceed', 'start setting up', 'begin campaign', 'icp_complete'];
        const isComplete = completionKeywords.some(keyword => 
          response.text.toLowerCase().includes(keyword)
        );
        
        if (isComplete) {
          // Show final ICP summary and transition to campaign setup
          addAIMessage({
            role: 'ai',
            content: response.text + '\n\n✅ **Great! Now let\'s set up your targeted outreach campaign.**',
            timestamp: new Date(),
          });
          
          // Switch to regular ICP flow
          setFlowState('initial');
          setIsICPOnboardingActive(true);
          setTimeout(() => {
            if (!chatStepController.isComplete && chatStepController.currentStepIndex === 0) {
              chatStepController.startFlow();
            }
          }, 500);
        } else {
          // Continue discovery conversation
          addAIMessage({
            role: 'ai',
            content: response.text,
            timestamp: new Date(),
          });
        }
        
        setIsProcessingAI(false);
        return;
      }
      
      // STRICT WAITING RULE: Check for platform confirmation
      if (flowState === 'platform_confirmation' || workflowState === 'STATE_2') {
        const confirmationKeywords = ['continue', 'done', 'no more', 'that\'s all', 'finish', 'proceed', 'that\'s it', 'no'];
        const addMoreKeywords = ['add', 'another', 'more', 'yes'];
        // Check if user is trying to select a platform (not confirming)
        const platformKeywords = ['linkedin', 'email', 'whatsapp', 'instagram', 'voice', 'voice agent', 'all'];
        const isPlatformSelection = platformKeywords.some(keyword =>
          answerText.toLowerCase().includes(keyword)
        );
        // Check if it's a duplicate platform
        if (isPlatformSelection) {
          const selectedLower = answerText.toLowerCase();
          let platformToAdd = null;
          if (selectedLower.includes('linkedin')) platformToAdd = 'linkedin';
          else if (selectedLower.includes('email')) platformToAdd = 'email';
          else if (selectedLower.includes('whatsapp')) platformToAdd = 'whatsapp';
          else if (selectedLower.includes('instagram')) platformToAdd = 'instagram';
          else if (selectedLower.includes('voice')) platformToAdd = 'voice';
          else if (selectedLower.includes('all')) {
            // Add all platforms
            const allPlatforms = ['linkedin', 'instagram', 'whatsapp', 'email', 'voice'];
            const newPlatforms = allPlatforms.filter(p => !selectedPlatforms.includes(p));
            if (newPlatforms.length > 0) {
              setSelectedPlatforms([...selectedPlatforms, ...newPlatforms]);
              addAIMessage({
                role: 'ai',
                content: `Great! I've added all platforms. Your selected platforms: ${[...selectedPlatforms, ...newPlatforms].join(', ')}.\n\nWould you like to add another platform, or continue with workflow building? (say "continue", "done", or "no more")`,
                timestamp: new Date(),
              });
              setIsProcessingAI(false);
              return;
            } else {
              addAIMessage({
                role: 'ai',
                content: `You've already selected all platforms. Would you like to continue with workflow building? (say "continue", "done", or "no more")`,
                timestamp: new Date(),
              });
              setIsProcessingAI(false);
              return;
            }
          }
          if (platformToAdd) {
            // Check if already selected
            if (selectedPlatforms.includes(platformToAdd)) {
              addAIMessage({
                role: 'ai',
                content: `${platformToAdd.charAt(0).toUpperCase() + platformToAdd.slice(1)} is already selected. Your current platforms: ${selectedPlatforms.join(', ')}.\n\nWould you like to add another platform, or continue? (say "continue", "done", or "no more")`,
                timestamp: new Date(),
              });
              setIsProcessingAI(false);
              return;
            } else {
              // Add new platform
              setSelectedPlatforms([...selectedPlatforms, platformToAdd]);
              addAIMessage({
                role: 'ai',
                content: `Great! I've added ${platformToAdd}. Your selected platforms: ${[...selectedPlatforms, platformToAdd].join(', ')}.\n\nWould you like to add another platform, or continue with workflow building? (say "continue", "done", or "no more")`,
                timestamp: new Date(),
              });
              setIsProcessingAI(false);
              return;
            }
          }
        }
        const isConfirmed = confirmationKeywords.some(keyword =>
          answerText.toLowerCase().trim() === keyword || answerText.toLowerCase().includes(keyword)
        );
        const wantsMore = addMoreKeywords.some(keyword =>
          answerText.toLowerCase().includes(keyword)
        );
        if (isConfirmed) {
          setPlatformsConfirmed(true);
          setWorkflowState('STATE_3'); // Move to Collect Requirements
          setFlowState('platform_features');
          // Now proceed with asking requirements (STATE 3)
          addAIMessage({
            role: 'ai',
            content: `Perfect! Moving to requirements collection.\n\n**Current State: STATE_3 (Collect Requirements)**\n\nLet me ask you a few questions to build your workflow. What specific requirements do you have? (e.g., daily limits, targeting criteria, message content, etc.)`,
            timestamp: new Date(),
          });
          setIsProcessingAI(false);
          return;
        } else if (wantsMore) {
          // User wants to add more platforms - stay in STATE_2
          setFlowState('platform_selection');
          addAIMessage({
            role: 'ai',
            content: '**Current State: STATE_2 (Choose Platforms)**\n\nWhich additional platform would you like to add?',
            timestamp: new Date(),
          });
          setIsProcessingAI(false);
          return;
        } else {
          // Unclear response, but if we have at least one platform, offer to continue
          if (selectedPlatforms.length > 0) {
            addAIMessage({
              role: 'ai',
              content: `I understand you've selected: ${selectedPlatforms.join(', ')}.\n\nWould you like to:\n- Add another platform? (say "add" or name the platform)\n- Continue with workflow building? (say "continue", "done", "no more", or just "no")`,
              timestamp: new Date(),
            });
          } else {
            addAIMessage({
              role: 'ai',
              content: '**Current State: STATE_2 (Choose Platforms)**\n\nI need clarification. Would you like to:\n- Add another platform? (say "add" or name the platform)\n- Continue with workflow building? (say "continue", "done", or "no more")',
              timestamp: new Date(),
            });
          }
          setIsProcessingAI(false);
          return;
        }
      }
      // For free-form text answers, send to AI and process workflow updates
      if (typeof answer === 'string' && !questionKey.startsWith('features_') && questionKey !== 'platforms') {
        const history = aiMessages.map(msg => ({
          role: msg.role,
          content: msg.content,
        }));
        const context = {
          selectedPath: selectedPath || null,
          selectedCategory: selectedCategory || null,
          selectedPlatforms,
          platformsConfirmed: platformsConfirmed || false,
          platformFeatures,
          currentPlatform: currentPlatform || undefined,
          currentFeature: currentFeature || undefined,
          workflowNodes: workflowNodes,
          currentState: workflowState, // Pass current state to AI
        };
        // CRITICAL RULE: If in STATE_3, interpret input as requirements, not categories
        if (workflowState === 'STATE_3') {
          // Requirements keywords that should NOT be misinterpreted as categories
          const requirementKeywords = ['daily', 'weekly', 'schedule', 'scrape', 'send', 'visit', 'filter', 'target', 'limit', 'per day', 'every'];
          const isRequirement = requirementKeywords.some(keyword =>
            answerText.toLowerCase().includes(keyword)
          );
          if (isRequirement) {
            // This is a requirement, stay in STATE_3
            const historyWithTimestamp = aiMessages.map(msg => ({
              role: msg.role,
              content: msg.content,
              timestamp: msg.timestamp,
            }));
            const response = await sendGeminiPrompt(
              `User requirement: ${answerText}. This is a REQUIREMENT, NOT a category. Stay in STATE_3. Ask follow-up questions about requirements only.`,
              historyWithTimestamp,
              questionKey,
              selectedPath,
              {},
              context
            );
            addAIMessage({
              role: 'ai',
              content: response.text,
              timestamp: new Date(),
            });
            if (response.workflowUpdates && Array.isArray(response.workflowUpdates)) {
              processWorkflowUpdates(response.workflowUpdates);
            }
            setIsProcessingAI(false);
            return;
          }
        }
        const historyWithTimestamp = aiMessages.map(msg => ({
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp,
        }));
        const response = await sendGeminiPrompt(
          answer,
          historyWithTimestamp,
          questionKey,
          selectedPath,
          {},
          context
        );
        // Add AI response with options and requirements data
        // Don't show RequirementsCollection during ICP onboarding
        const shouldShowRequirements = !isICPOnboardingActive && response.status === 'need_input' && response.missing;
        addAIMessage({
          role: 'ai',
          content: response.text,
          timestamp: new Date(),
          options: response.options || undefined, // Store options from AI response
          status: shouldShowRequirements ? response.status : undefined, // Only set status if not in ICP flow
          searchResults: response.searchResults, // Search results from scraping
          missing: shouldShowRequirements ? response.missing : undefined, // Only set missing if not in ICP flow
          workflow: response.workflow, // Generated workflow steps
        });
        // Update state if AI indicates state change
        if (response.currentState) {
          setWorkflowState(response.currentState);
        }
        // Process workflow updates if present
        if (response.workflowUpdates && Array.isArray(response.workflowUpdates)) {
          processWorkflowUpdates(response.workflowUpdates);
          // If workflow nodes are added, we might be moving to STATE_4
          if (response.workflowUpdates.length > 0 && response.workflowUpdates.some((u: any) => u.action === 'add')) {
            if (!response.currentState) {
              setWorkflowState('STATE_4'); // Generate Workflow
            }
          }
        }
      } else if (questionKey === 'platforms') {
        // Platform selection
        const platforms = Array.isArray(answer) ? answer : [answer];
        await processPlatformSelection(platforms);
      } else if (questionKey.startsWith('features_')) {
        // Feature selection for a platform
        const platform = questionKey.replace('features_', '');
        const features = Array.isArray(answer) ? answer : [answer];
        await processFeatureSelection(platform, features);
      } else if (currentUtilityQuestion) {
        // Utility question answer
        await processUtilityAnswer(currentUtilityQuestion, answer);
      }
    } catch (error) {
      logger.error('Error handling answer', error);
      addAIMessage({
        role: 'ai',
        content: 'I encountered an error processing your answer. Please try again.',
        timestamp: new Date(),
      });
    } finally {
      setIsProcessingAI(false);
    }
  };
  const handleBackToOptions = () => {
    // Reset to FORM mode when going back to options
    setOnboardingMode('FORM');
    setIsICPOnboardingActive(false);
    useOnboardingStore.getState().reset();
    setHasSelectedOption(false);
    setSelectedPath(null);
    setIsAIChatActive(false);
    setFlowState('initial');
  };
  // Get options from last AI message (priority) or fallback to flow state options
  const getCurrentQuestionOptions = () => {
    // PRIORITY: Check if last AI message has options from AI response
    const lastAIMessage = aiMessages.filter(m => m.role === 'ai').slice(-1)[0];
    if (lastAIMessage && lastAIMessage.options && lastAIMessage.options.length > 0) {
      return lastAIMessage.options;
    }
    // FALLBACK: Use flow state options
    if (flowState === 'platform_selection' && currentQuestionIndex === 0) {
      return questionSequences[selectedPath!]?.[0]?.options || [];
    }
    // RULE 7: Platform confirmation - show continue/done options
    if (flowState === 'platform_confirmation') {
      return [
        { label: 'Continue / Done', value: 'continue' },
        { label: 'Add Another Platform', value: 'add_platform' },
      ];
    }
    if (flowState === 'platform_features' && currentPlatform) {
      // RULE 1, RULE 2, RULE 6: Only show features if platforms confirmed AND filter by category
      // For inbound flow, skip the confirmation check since we handle it differently
      if (!platformsConfirmed && campaignDataType !== 'inbound') {
        return [];
      }
      const allFeatures = PLATFORM_FEATURES[currentPlatform as keyof typeof PLATFORM_FEATURES] || [];
      // Filter features based on category (RULE 2, RULE 3, RULE 6)
      const filteredFeatures = filterFeaturesByCategory(
        allFeatures,
        selectedCategory as any,
        currentPlatform
      );
      return filteredFeatures.map(f => ({
        label: `${f.label} - ${f.description}`,
        value: f.id,
      }));
    }
    if (flowState === 'feature_utilities' && currentUtilityQuestion) {
      const utilityQuestions = getUtilityQuestions();
      const question = utilityQuestions.find(q => q.key === currentUtilityQuestion);
      return question?.options || [];
    }
    return [];
  };
  const currentQuestionOptions = getCurrentQuestionOptions();
  const showOptions = currentQuestionOptions.length > 0 && !isProcessingAI;
  // Show option cards if no selection made
  if (!hasSelectedOption) {
    return (
      <div className="flex flex-col w-full h-full bg-white items-center justify-center overflow-hidden">
        <div className="w-full max-w-6xl px-8 space-y-6">
          {/* Option Cards - Side by side, reduced size */}
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => handleOptionSelect('automation')}
              className="w-64 text-left p-4 bg-white border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all group shadow-sm hover:shadow-md"
            >
              <div className="flex flex-col items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <div className="text-center">
                  <h3 className="text-lg font-bold text-gray-900 mb-1">Automation Suite</h3>
                  <p className="text-gray-600 text-xs">
                    Automate LinkedIn, Instagram, messaging, and voice interactions
                  </p>
                </div>
              </div>
            </button>
            <button
              onClick={() => handleOptionSelect('leads')}
              className="w-64 text-left p-4 bg-white border-2 border-gray-200 rounded-xl hover:border-green-500 hover:bg-green-50 transition-all group shadow-sm hover:shadow-md"
            >
              <div className="flex flex-col items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-teal-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <div className="text-center">
                  <h3 className="text-lg font-bold text-gray-900 mb-1">Lead Generation & Outreach</h3>
                  <p className="text-gray-600 text-xs">
                    Find and engage with your ideal customers
                  </p>
                </div>
              </div>
            </button>
          </div>
          {/* Chat Input Bar - Below options, wider */}
          <div className="w-full max-w-4xl mx-auto">
            <ChatInputClaude
              onShowWorkflowLibrary={() => setShowWorkflowLibrary(true)}
              onSend={async (msg) => {
                logger.debug('User sent message from initial screen', { msg });
                // AUTO-REDIRECT: When user types and sends a message, automatically switch to chat interface
                if (!hasSelectedOption) {
                  setHasSelectedOption(true);
                  setIsAIChatActive(true);
                  setCurrentScreen(1);
                  setOnboardingMode('CHAT'); // IMPORTANT: Set to CHAT mode to show chat interface, not form
                  // Add user message to chat (even if it's just "hello")
                  addAIMessage({
                    role: 'user',
                    content: msg,
                    timestamp: new Date(),
                  });
                  // Set default path if none selected
                  if (!selectedPath) {
                    setSelectedPath('leads'); // Default to leads for general chat
                    setSelectedCategory('leadops');
                    setWorkflowState('STATE_2');
                    // Start ICP onboarding flow for leads path
                    setIsICPOnboardingActive(true);
                    // Use a small delay to ensure state is set before starting flow
                    setTimeout(() => {
                      if (!chatStepController.isComplete && chatStepController.currentStepIndex === 0) {
                        chatStepController.startFlow();
                      }
                    }, 100);
                    // Don't process "hello" as an answer, just start the flow
                    return;
                  }
                }
                // PRIORITY: If in leads path with CHAT mode, use ICP flow (not general AI)
                if (selectedPath === 'leads' && onboardingMode === 'CHAT') {
                  // Start ICP flow if not already active and not already started
                  if (!isICPOnboardingActive && !chatStepController.isComplete && chatStepController.currentStepIndex === 0) {
                    setIsICPOnboardingActive(true);
                    setTimeout(() => {
                      chatStepController.startFlow();
                    }, 100);
                    return;
                  }
                  // Handle ICP onboarding flow
                  if (isICPOnboardingActive && !chatStepController.isComplete) {
                    // Check for back command
                    if (msg.toLowerCase().trim() === 'back') {
                      chatStepController.handleBack();
                      return;
                    }
                    // Handle answer
                    addAIMessage({
                      role: 'user',
                      content: msg,
                      timestamp: new Date(),
                    });
                    chatStepController.handleAnswer(msg);
                    return;
                  }
                }
                // Add user message
                addAIMessage({
                  role: 'user',
                  content: msg,
                  timestamp: new Date(),
                });
                setIsProcessingAI(true);
                try {
                  const history = aiMessages.map(msg => ({
                    role: msg.role,
                    content: msg.content,
                    timestamp: msg.timestamp,
                  }));
                  const context = {
                    selectedPath: selectedPath || null,
                    selectedCategory: selectedCategory || null,
                    selectedPlatforms,
                    platformsConfirmed: platformsConfirmed || false,
                    platformFeatures,
                    currentPlatform: currentPlatform || undefined,
                    currentFeature: currentFeature || undefined,
                    workflowNodes: workflowNodes,
                    currentState: workflowState,
                    fastMode: true, // Enable FastMode for direct user input
                  };
                  logger.debug('Sending to backend from initial screen', { msg, context });
                  const response = await sendGeminiPrompt(
                    msg,
                    history,
                    null,
                    selectedPath,
                    {},
                    context
                  );
                  logger.debug('Received response from initial screen', {
                    hasText: !!response.text,
                    hasSearchResults: !!response.searchResults,
                    searchResultsCount: response.searchResults?.length || 0,
                    status: response.status,
                  });
                  // Add AI response with requirements data
                  addAIMessage({
                    role: 'ai',
                    content: response.text,
                    timestamp: new Date(),
                    options: response.options || undefined,
                    status: response.status,
                    missing: response.missing,
                    workflow: response.workflow,
                    searchResults: response.searchResults,
                  });
                  // Update state if AI indicates state change
                  if (response.currentState) {
                    setWorkflowState(response.currentState);
                  }
                  // Process workflow updates if present
                  if (response.workflowUpdates && Array.isArray(response.workflowUpdates)) {
                    processWorkflowUpdates(response.workflowUpdates);
                  }
                } catch (error) {
                  const err = error as any;
                  logger.error('Error sending message from initial screen', err);
                  logger.error('Error details', {
                    message: err.message,
                    response: err.response?.data,
                    status: err.response?.status,
                  });
                  addAIMessage({
                    role: 'ai',
                    content: err.response?.data?.text || err.message || 'I encountered an error. Please try again.',
                    timestamp: new Date(),
                    searchResults: err.response?.data?.searchResults || undefined,
                  });
                } finally {
                  setIsProcessingAI(false);
                }
              }}
              disabled={isProcessingAI}
              placeholder={
                isICPOnboardingActive && !chatStepController.isComplete
                  ? chatStepController.currentQuestion?.type === 'boolean'
                    ? 'Type "yes" or "no"...'
                    : chatStepController.currentQuestion?.type === 'select'
                      ? 'Type your answer or select from options...'
                      : 'Type your answer...'
                  : 'How can I help you today?'
              }
            />
          </div>
        </div>
        {/* Workflow Library Modal - Initial Screen */}
        {showWorkflowLibrary && (
          <WorkflowLibrary
            onSelectWorkflow={handleWorkflowSelect}
            onClose={() => setShowWorkflowLibrary(false)}
          />
        )}
      </div>
    );
  }
  // Show GuidedFlowPanel for Lead Generation & Outreach (only if in FORM mode)
  // When onboardingMode === 'CHAT', the chat interface handles everything
  // Also check that ICP onboarding is not active to avoid showing form during chat flow
  if (hasSelectedOption && selectedPath === 'leads' && onboardingMode === 'FORM' && !isICPOnboardingActive) {
    return (
      <div className="flex flex-col h-full bg-white overflow-hidden max-h-full">
        {/* Header with Back Button */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
          <button
            onClick={handleBackToOptions}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Back to options</span>
          </button>
        </div>
        <div className="flex-1 overflow-hidden min-h-0" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column' }}>
            <GuidedFlowPanel />
          </div>
        </div>
      </div>
    );
  }
  // Show chat interface after selection (for automation)
  return (
    <div className="flex flex-col h-full bg-white overflow-hidden">
      {/* Header with Back Button and Clear */}
      {hasSelectedOption && (
        <div className="p-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-4">
            {isICPOnboardingActive && chatStepController.currentStepIndex > 0 && (
              <button
                onClick={() => {
                  chatStepController.handleBack();
                  // Remove last user message and system question
                  const newMessages = [...aiMessages];
                  // Remove last 2 messages (user answer + system question)
                  if (newMessages.length >= 2) {
                    newMessages.pop(); // Remove system question
                    newMessages.pop(); // Remove user answer
                    useOnboardingStore.setState({ aiMessages: newMessages });
                  }
                }}
                className="flex items-center gap-2 px-3 py-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="text-sm font-medium">Back</span>
              </button>
            )}
          </div>
          {aiMessages.length > 0 && (
            <button
              onClick={() => {
                if (window.confirm('Are you sure you want to start over? This will remove all messages and workflow.')) {
                  useOnboardingStore.persist.clearStorage();
                  clearBufferedMessages('default_session');
                  clearAllBufferedMessages();
                  (window as any).__icpAnswers = undefined;
                  (window as any).__currentStepIndex = undefined;
                  chatStepController.reset();
                  useOnboardingStore.getState().reset();
                  setFlowState('initial');
                  setUserAnswers({});
                  setCurrentUtilityAnswers({});
                  setIsICPOnboardingActive(false);
                }
              }}
              className="flex items-center gap-2 px-3 py-1.5 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Start over"
            >
              <Trash2 className="w-4 h-4" />
              <span className="text-sm font-medium">Clear</span>
            </button>
          )}
        </div>
      )}
      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto min-h-0 bg-gray-50">
        <div className="py-4">
          {aiMessages.map((message, index) => (
            <React.Fragment key={index}>
              <ChatMessageBubble
                role={message.role}
                content={message.content}
                timestamp={message.timestamp}
                status={message.status}
                missing={message.missing}
                searchResults={message.searchResults}
                workflow={message.workflow}
                isLastMessage={index === aiMessages.length - 1}
                onOptionSubmit={
                  index === aiMessages.length - 1 &&
                    selectedPath === 'leads' &&
                    onboardingMode === 'CHAT' &&
                    isICPOnboardingActive &&
                    !chatStepController.isComplete &&
                    !message.isInboundPlatformSelection // Don't use for platform selection (has custom handling)
                    ? chatStepController.handleOptionSubmit
                    : undefined
                }
                onRequirementsComplete={async (data) => {
                  // Send completed requirements back to API
                  try {
                    const history = aiMessages.map(msg => ({
                      role: msg.role,
                      content: msg.content,
                      timestamp: msg.timestamp,
                      workflow: msg.workflow, // Include workflow in history
                    }));
                    const context = {
                      selectedPath: selectedPath || null,
                      selectedCategory: selectedCategory || null,
                      selectedPlatforms,
                      platformsConfirmed: platformsConfirmed || false,
                      platformFeatures,
                      currentPlatform: currentPlatform || undefined,
                      currentFeature: currentFeature || undefined,
                      workflowNodes: workflowNodes,
                      currentState: workflowState,
                      fastMode: true,
                      pendingWorkflow: message.workflow, // Include the workflow that needs requirements
                    };
                    const response = await sendGeminiPrompt(
                      JSON.stringify(data),
                      history,
                      'requirements_complete',
                      selectedPath,
                      {},
                      context
                    );
                    // Add AI response
                    addAIMessage({
                      role: 'ai',
                      content: response.text || 'Workflow completed successfully!',
                      timestamp: new Date(),
                      status: response.status,
                      workflow: response.workflow,
                    });
                    // Process workflow updates if present
                    if (response.workflowUpdates && Array.isArray(response.workflowUpdates)) {
                      processWorkflowUpdates(response.workflowUpdates);
                    }
                  } catch (error) {
                    logger.error('Error submitting requirements', error);
                    addAIMessage({
                      role: 'ai',
                      content: 'I encountered an error processing your requirements. Please try again.',
                      timestamp: new Date(),
                    });
                  }
                }}
              />
              {/* Show options from AI message if available */}
              {/* Custom options rendering - Only for inbound platform selection or non-ICP flows */}
              {message.role === 'ai' && message.options && message.options.length > 0 && index === aiMessages.length - 1 && (
                // Only render custom options if NOT using ICP flow's built-in option handling
                !(isICPOnboardingActive && !chatStepController.isComplete && !message.isInboundPlatformSelection)
              ) && (
                <div className="w-full max-w-3xl mx-auto px-4 py-4 space-y-2">
                  {/* Inbound Platform Selection - Toggle style */}
                  {message.isInboundPlatformSelection ? (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        {message.options.map((option, index) => {
                          const isSelected = selectedPlatforms.includes(option.value);
                          const platformValue = option.value === 'voice' ? 'voice' : option.value;
                          return (
                            <button
                              key={option.value || `option-${index}`}
                              onClick={() => {
                                // Handle disabled platform click - show notification
                                if (option.disabled) {
                                  // Quick toast-style notification - just add briefly then continue
                                  const toast = document.createElement('div');
                                  toast.className = 'fixed top-4 right-4 z-50 bg-amber-100 border border-amber-300 text-amber-800 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-in slide-in-from-top';
                                  toast.innerHTML = `<span>⚠️</span><span><strong>${option.label}</strong> has no data in your upload</span>`;
                                  document.body.appendChild(toast);
                                  setTimeout(() => toast.remove(), 3000);
                                  return;
                                }
                                // Toggle platform selection
                                if (isSelected) {
                                  setSelectedPlatforms(selectedPlatforms.filter(p => p !== platformValue));
                                } else {
                                  setSelectedPlatforms([...selectedPlatforms, platformValue]);
                                }
                              }}
                              disabled={option.disabled}
                              className={`relative p-4 border-2 rounded-xl transition-all ${
                                option.disabled 
                                  ? 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed' 
                                  : isSelected
                                    ? 'bg-green-50 border-green-500 text-green-700 shadow-md'
                                    : 'bg-white border-gray-200 hover:border-blue-400 hover:bg-blue-50'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-medium">{option.label}</span>
                                {option.disabled ? (
                                  <span className="text-xs bg-gray-200 text-gray-500 px-2 py-0.5 rounded">No data</span>
                                ) : isSelected ? (
                                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                                ) : (
                                  <div className="w-5 h-5 border-2 border-gray-300 rounded-full" />
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                      {/* Continue button */}
                      {selectedPlatforms.length > 0 && (
                        <button
                          onClick={async () => {
                            // Continue with selected platforms - use same ICP flow as outbound
                            setPlatformsConfirmed(true);
                            // Clear old inbound flow state to prevent conflicts
                            setFlowState('initial');
                            // Switch to ICP flow mode (keep inboundLeadData for reference)
                            setIsICPOnboardingActive(true);
                            // Start ICP flow with pre-selected platforms
                            // This will show same questions as outbound: LinkedIn actions → daily leads → campaign name → etc.
                            await chatStepController.startFlowWithPlatforms(selectedPlatforms, inboundLeadData);
                          }}
                          className="w-full mt-4 px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all font-medium shadow-lg"
                        >
                          Continue with {selectedPlatforms.length} Platform{selectedPlatforms.length > 1 ? 's' : ''}
                        </button>
                      )}
                    </>
                  ) : (
                    /* Regular options - Use ICP flow if active, otherwise old handlers */
                    message.options.map((option, index) => (
                      <button
                        key={option.value || `option-${index}`}
                        onClick={() => {
                          // If ICP flow is active and we have the controller, use it
                          if (isICPOnboardingActive && chatStepController.handleOptionSubmit) {
                            chatStepController.handleOptionSubmit([option.value]);
                          }
                          // For old inbound flow state (before platform selection), use handleInboundAnswer
                          else if (flowState === 'inbound_leads_per_day' || flowState === 'inbound_campaign_name' || flowState === 'inbound_campaign_days') {
                            handleInboundAnswer(option.value);
                          } else {
                            handleAnswer(
                              option.value,
                              flowState === 'platform_selection' ? 'platforms' :
                                flowState === 'platform_features' ? `features_${currentPlatform}` :
                                  flowState === 'initial' ? 'icp_choice' :
                                    currentUtilityQuestion || 'unknown'
                            );
                          }
                        }}
                        className="w-full text-left px-6 py-3 bg-white border-2 border-gray-200 rounded-xl transition-all shadow-sm hover:shadow-md hover:border-blue-500 hover:bg-blue-50"
                      >
                        {option.label}
                      </button>
                    ))
                  )}
                </div>
              )}
            </React.Fragment>
          ))}
          {isProcessingAI && (
            <div className="flex gap-3 w-full max-w-4xl mx-auto px-4 py-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center flex-shrink-0 shadow-sm">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3 shadow-sm">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                  <span className="text-gray-500 text-sm">Thinking...</span>
                </div>
              </div>
            </div>
          )}
          {/* STEP 1: Campaign Data Type Selection (Inbound vs Outbound) */}
          {selectedPath === 'leads' && !campaignDataType && !isProcessingAI && aiMessages.length > 0 && (
            <div className="w-full max-w-3xl mx-auto px-4 py-4 space-y-3">
              <button
                onClick={() => handleCampaignDataTypeSelect('inbound')}
                className="w-full text-left p-4 bg-white border-2 border-gray-200 rounded-xl hover:border-green-500 hover:bg-green-50 transition-all shadow-sm hover:shadow-md flex items-center gap-4"
              >
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-green-500 to-teal-600 flex items-center justify-center flex-shrink-0">
                  <ArrowDownToLine className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-gray-900">Inbound</h3>
                  <p className="text-gray-600 text-sm">Leads that came to you (via website, referrals, etc.)</p>
                </div>
              </button>
              <button
                onClick={() => handleCampaignDataTypeSelect('outbound')}
                className="w-full text-left p-4 bg-white border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all shadow-sm hover:shadow-md flex items-center gap-4"
              >
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                  <ArrowUpFromLine className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-gray-900">Outbound</h3>
                  <p className="text-gray-600 text-sm">Find and reach out to new prospects</p>
                </div>
              </button>
            </div>
          )}
          {/* Inbound Data Entry Form - Modal Overlay */}
          {selectedPath === 'leads' && campaignDataType === 'inbound' && isInboundFormVisible && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
              <InboundDataForm
                onSubmit={handleInboundDataSubmit}
                onCancel={() => {
                  setIsInboundFormVisible(false);
                  setCampaignDataType(null);
                  // Remove the last AI message about filling the form
                  const newMessages = aiMessages.slice(0, -1);
                  useOnboardingStore.setState({ aiMessages: newMessages });
                }}
                isSubmitting={isSubmittingInbound}
              />
            </div>
          )}
          {/* Option Buttons for current question (fallback - options from AI messages are shown above) */}
          {showOptions && !aiMessages[aiMessages.length - 1]?.options && (
            <div className="w-full max-w-3xl mx-auto px-4 py-4 space-y-2">
              {/* Platform Features Multi-Select with Checkboxes */}
              {flowState === 'platform_features' ? (
                <>
                  <div className="space-y-2">
                    {currentQuestionOptions.map((option, index) => {
                      const isSelected = (platformFeatures[currentPlatform || ''] || []).includes(option.value);
                      return (
                        <button
                          key={option.value || `option-${index}`}
                          onClick={() => {
                            const currentFeatures = platformFeatures[currentPlatform || ''] || [];
                            const newFeatures = isSelected
                              ? currentFeatures.filter((f: string) => f !== option.value)
                              : [...currentFeatures, option.value];
                            setPlatformFeatures(currentPlatform || '', newFeatures);
                          }}
                          className={`w-full text-left px-5 py-3 border-2 rounded-xl transition-all flex items-center gap-3 ${
                            isSelected
                              ? 'border-green-500 bg-green-50'
                              : 'bg-white border-gray-200 hover:border-blue-400 hover:bg-blue-50'
                          }`}
                        >
                          {/* Checkbox */}
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                            isSelected ? 'bg-green-500 border-green-500' : 'border-gray-300'
                          }`}>
                            {isSelected && (
                              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                          <span className={isSelected ? 'text-green-800 font-medium' : 'text-gray-700'}>
                            {option.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  {/* Continue button - only show if at least one feature selected */}
                  {(platformFeatures[currentPlatform || ''] || []).length > 0 && (
                    <button
                      onClick={async () => {
                        const features = platformFeatures[currentPlatform || ''] || [];
                        if (features.length > 0) {
                          await processFeatureSelection(currentPlatform || '', features);
                        }
                      }}
                      className="w-full px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors font-medium mt-3 shadow-lg"
                    >
                      Continue with {(platformFeatures[currentPlatform || ''] || []).length} Feature{(platformFeatures[currentPlatform || ''] || []).length > 1 ? 's' : ''}
                    </button>
                  )}
                </>
              ) : (
                /* Regular single-select options */
                currentQuestionOptions.map((option, index) => (
                  <button
                    key={option.value || `option-${index}`}
                    onClick={() => {
                      let questionKey = 'unknown';
                      if (flowState === 'platform_selection') {
                        questionKey = 'platforms';
                      } else if (currentUtilityQuestion) {
                        questionKey = currentUtilityQuestion;
                      }
                      handleAnswer(option.value, questionKey);
                    }}
                    className="w-full text-left px-6 py-3 bg-white border-2 border-gray-200 rounded-xl transition-all shadow-sm hover:shadow-md hover:border-blue-500 hover:bg-blue-50"
                  >
                    {option.label}
                  </button>
                ))
              )}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>
      {/* Bottom Input */}
      <div className="border-t border-gray-200 bg-white py-4 px-4 flex-shrink-0">
        <ChatInputClaude
          onShowWorkflowLibrary={() => setShowWorkflowLibrary(true)}
          disabled={
            // Disable input if last AI message has selectable options OR template input
            (() => {
              if (aiMessages.length === 0) return false;
              const lastMessage = aiMessages[aiMessages.length - 1];
              if (lastMessage.role === 'ai') {
                const parsedOptions = parseMessageOptions(lastMessage.content);
                const hasSelectableOptions = parsedOptions !== null &&
                  selectedPath === 'leads' &&
                  onboardingMode === 'CHAT' &&
                  isICPOnboardingActive &&
                  !chatStepController.isComplete;
                // Also check for template input request
                const isTemplateRequest = selectedPath === 'leads' &&
                  onboardingMode === 'CHAT' &&
                  isICPOnboardingActive &&
                  !chatStepController.isComplete &&
                  (lastMessage.content.toLowerCase().includes('template') ||
                    lastMessage.content.toLowerCase().includes('message template') ||
                    lastMessage.content.toLowerCase().includes('script') ||
                    lastMessage.content.toLowerCase().includes('paste your')) &&
                  !parsedOptions; // Not a selectable options message
                return hasSelectableOptions || isTemplateRequest;
              }
              return false;
            })() || isProcessingAI
          }
          onSend={async (msg) => {
            logger.debug('User sent message', { msg });
            logger.debug('Current state', {
              selectedPath,
              onboardingMode,
              isICPOnboardingActive,
              isComplete: chatStepController.isComplete,
              currentStepIndex: chatStepController.currentStepIndex
            });
            // PRIORITY 0: Handle inbound flow answers ONLY if not in ICP flow
            if (selectedPath === 'leads' && campaignDataType === 'inbound' && inboundAnalysis && !isInboundFormVisible && !isICPOnboardingActive) {
              logger.debug('Handling answer in inbound flow');
              await handleInboundAnswer(msg);
              return;
            }
            // PRIORITY 1: If ICP flow is active, use ICP flow handler regardless of campaignDataType
            if (isICPOnboardingActive && !chatStepController.isComplete) {
              logger.debug('Handling answer in ICP flow');
              // Check for back command
              if (msg.toLowerCase().trim() === 'back' || msg.toLowerCase().trim() === 'go back') {
                chatStepController.handleBack();
                return;
              }
              // Handle answer
              addAIMessage({
                role: 'user',
                content: msg,
                timestamp: new Date(),
              });
              await chatStepController.handleAnswer(msg);
              return;
            }
            // PRIORITY 2: If in leads path with CHAT mode and OUTBOUND, start ICP flow if not started
            if (selectedPath === 'leads' && onboardingMode === 'CHAT' && campaignDataType === 'outbound' && !isICPOnboardingActive && !chatStepController.isComplete) {
              logger.debug('Starting ICP flow for leads path');
              setIsICPOnboardingActive(true);
              await chatStepController.startFlow();
              // After flow starts, process the user message as an answer
              if (msg.toLowerCase().trim() !== 'hello' && msg.toLowerCase().trim() !== 'hi') {
                addAIMessage({
                  role: 'user',
                  content: msg,
                  timestamp: new Date(),
                });
                await chatStepController.handleAnswer(msg);
              }
              return;
            }
            // PRIORITY 3: Check if message is EXPLICITLY about lead generation/outreach (if not already in leads flow)
            // Only redirect for explicit requests, not general chat
            if (selectedPath !== 'leads') {
              const explicitLeadPhrases = [
                'i want to find leads',
                'help me find customers',
                'i need to generate leads',
                'start lead generation',
                'set up lead outreach',
                'create lead campaign',
                'find prospects',
                'target customers'
              ];
              const msgLower = msg.toLowerCase().trim();
              const isExplicitLeadRequest = explicitLeadPhrases.some(phrase =>
                msgLower.includes(phrase)
              );
              if (isExplicitLeadRequest) {
                // Switch to CHAT mode and redirect to Lead Generation & Outreach conversational flow
                setOnboardingMode('CHAT');
                handleOptionSelect('leads');
                return;
              }
            }
            // PRIORITY 3: General AI chat (only if not in leads path)
            // Add user message
            addAIMessage({
              role: 'user',
              content: msg,
              timestamp: new Date(),
            });
            setIsProcessingAI(true);
            try {
              const history = aiMessages.map(msg => ({
                role: msg.role,
                content: msg.content,
                timestamp: msg.timestamp,
              }));
              const context = {
                selectedPath: selectedPath || null,
                selectedCategory: selectedCategory || null,
                selectedPlatforms,
                platformsConfirmed: platformsConfirmed || false,
                platformFeatures,
                currentPlatform: currentPlatform || undefined,
                currentFeature: currentFeature || undefined,
                workflowNodes: workflowNodes,
                currentState: workflowState,
                fastMode: true, // Enable FastMode for direct user input
              };
              logger.debug('Sending to backend', { msg, context });
              const response = await sendGeminiPrompt(
                msg,
                history,
                null,
                selectedPath,
                {},
                context
              );
              logger.debug('Received response', {
                hasText: !!response.text,
                hasSearchResults: !!response.searchResults,
                searchResultsCount: response.searchResults?.length || 0,
                status: response.status,
              });
              // Add AI response with requirements data
              // Don't show RequirementsCollection during ICP onboarding
              const shouldShowRequirements = !isICPOnboardingActive && response.status === 'need_input' && response.missing;
              addAIMessage({
                role: 'ai',
                content: response.text,
                timestamp: new Date(),
                options: response.options || undefined,
                status: shouldShowRequirements ? response.status : undefined, // Only set status if not in ICP flow
                missing: shouldShowRequirements ? response.missing : undefined, // Only set missing if not in ICP flow
                workflow: response.workflow, // Generated workflow
                searchResults: response.searchResults, // Search results from scraping
              });
              // Update state if AI indicates state change
              if (response.currentState) {
                setWorkflowState(response.currentState);
              }
              // Process workflow updates if present
              if (response.workflowUpdates && Array.isArray(response.workflowUpdates)) {
                processWorkflowUpdates(response.workflowUpdates);
              }
            } catch (error) {
              const err = error as any;
              logger.error('Error sending message', err);
              logger.error('Error details', {
                message: err.message,
                response: err.response?.data,
                status: err.response?.status,
              });
              addAIMessage({
                role: 'ai',
                content: err.response?.data?.text || err.message || 'I encountered an error. Please try again.',
                timestamp: new Date(),
                searchResults: err.response?.data?.searchResults || undefined,
              });
            } finally {
              setIsProcessingAI(false);
            }
          }}
          placeholder={
            (showOptions || (aiMessages.length > 0 && aiMessages[aiMessages.length - 1]?.role === 'ai' && aiMessages[aiMessages.length - 1]?.options && aiMessages[aiMessages.length - 1]?.options!.length > 0))
              ? 'Select an option above or type your message...'
              : 'How can I help you today?'
          }
        />
      </div>
      {/* Workflow Library Modal */}
      {showWorkflowLibrary && (
        <WorkflowLibrary
          onSelectWorkflow={handleWorkflowSelect}
          onClose={() => setShowWorkflowLibrary(false)}
        />
      )}
    </div>
  );
}
