'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useOnboardingStore, ChannelConnection, WorkflowPreviewStep } from '@/store/onboardingStore';
import ChatInputClaude from '@/components/onboarding/ChatInputClaude';
import ChatMessageBubble from '@/components/onboarding/ChatMessageBubble';
import { parseMessageOptions } from '@/lib/parseMessageOptions';
import WorkflowLibrary from '@/components/onboarding/WorkflowLibrary';
import GuidedFlowPanel from '@/components/onboarding/GuidedFlowPanel';
import { useChatStepController } from '@/components/onboarding/ChatStepController';
import { Zap, Users, Loader2, Bot, ArrowLeft, Trash2 } from 'lucide-react';
import { sendGeminiPrompt, askPlatformFeatures, askFeatureUtilities, buildWorkflowNode } from '@/services/geminiFlashService';
import { mayaAI } from '@/features/ai-icp-assistant';
import { questionSequences, getPlatformFeaturesQuestion, getUtilityQuestions } from '@/lib/onboardingQuestions';
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
  | 'requirements_collection'; // For FastMode requirements

export default function ChatPanel() {
  const router = useRouter();
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
  } = useOnboardingStore();

  // Initialize workflow preview on mount to show just Start/End
  useEffect(() => {
    // Set initial empty workflow preview (will show just Start/End)
    logger.debug('Initializing with empty workflow - will show Start/End');
    setWorkflowPreview([]);
  }, [setWorkflowPreview]);

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

  // Chat step controller for ICP onboarding
  const chatStepController = useChatStepController(
    async (answers) => {
      // On completion, create and start campaign automatically
      logger.debug('ICP onboarding completed', { answers });

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
        const campaignData = {
          name: mappedAnswers.campaign_name || 'My Campaign',
          status: 'draft',
          steps: campaignSteps,
          config: {
            leads_per_day: mappedAnswers.leads_per_day || 10,
            lead_gen_offset: 0,
            last_lead_gen_date: null,
          },
          leads_per_day: mappedAnswers.leads_per_day || 10,
        };

        logger.debug('Creating campaign with data', { campaignData });
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
      } catch (error: any) {
        logger.error('Error creating/starting campaign', error);
        addAIMessage({
          role: 'ai',
          content: `❌ Error creating campaign: ${error.message || 'Unknown error'}. Please try again from the campaigns page.`,
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
    } catch (error: any) {
      logger.error('Error sending workflow command', error);
      addAIMessage({
        role: 'ai',
        content: error.response?.data?.text || error.message || 'I encountered an error. Please try again.',
        timestamp: new Date(),
        searchResults: error.response?.data?.searchResults || undefined,
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
    if (selectedPath === 'automation' && aiMessages.length === 0 && flowState === 'initial') {
      startAIConversation('automation');
    }
  }, [selectedPath]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-start ICP onboarding flow on page load if in CHAT mode with leads selected
  useEffect(() => {
    if (
      hasSelectedOption &&
      selectedPath === 'leads' &&
      onboardingMode === 'CHAT' &&
      !isICPOnboardingActive &&
      !isICPFlowStarted && // Check persisted flag to prevent restart on refresh
      !chatStepController.isComplete &&
      aiMessages.length === 0 // Only start if no messages exist
    ) {
      logger.debug('Auto-starting ICP onboarding flow on page load', {
        hasSelectedOption,
        selectedPath,
        onboardingMode,
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
  }, [hasSelectedOption, selectedPath, onboardingMode, aiMessages.length, isICPFlowStarted]); // eslint-disable-line react-hooks/exhaustive-deps

  const startAIConversation = async (path: 'automation' | 'leads') => {
    setIsProcessingAI(true);

    // Set state based on path
    if (path === 'leads') {
      setWorkflowState('STATE_2'); // Already have category, go to platform selection
      setFlowState('platform_selection');
    } else {
      setWorkflowState('STATE_1'); // Need to choose category first
      setFlowState('initial');
      addAIMessage({
        role: 'ai',
        content: 'Which category would you like to automate?\n\n1. LeadOps (Lead Generation + Outreach)\n2. SocialOps (Auto Posting + Comments + Replies)\n3. CRM Sync\n4. WhatsApp Automation\n5. Analytics',
        timestamp: new Date(),
      });
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

    // Map option to category and set state
    if (option === 'leads') {
      setSelectedCategory('leadops');
      setWorkflowState('STATE_2'); // Move to platform selection
      // Switch to CHAT mode and start ICP conversational onboarding
      logger.debug('Setting onboardingMode to CHAT and starting ICP flow');
      setOnboardingMode('CHAT');
      setIsICPOnboardingActive(true);
      // Use setTimeout to ensure state updates are applied before starting flow
      setTimeout(() => {
        chatStepController.startFlow();
      }, 0);
    } else if (option === 'automation') {
      // "automation" could be SocialOps - will be clarified, but start in STATE_1
      setWorkflowState('STATE_1');
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

  const askFeaturesForPlatform = async (platform: string) => {
    // RULE 1: Only proceed if platforms are confirmed
    if (!platformsConfirmed) {
      return;
    }

    setCurrentPlatform(platform);
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

    const featureOptions = filteredFeatures.map(f => ({
      label: `${f.label} - ${f.description}`,
      value: f.id,
    }));

    addAIMessage({
      role: 'ai',
      content: `Which ${platformLabels[platform] || platform} features do you want? (You can select multiple)\n\nAvailable features for your selected category:`,
      timestamp: new Date(),
    });

    setIsProcessingAI(false);
  };

  const processFeatureSelection = async (platform: string, features: string[]) => {
    setPlatformFeatures(platform, features);
    setCurrentFeatureIndex(platform, 0);
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
    const delay: { days?: number; hours?: number } | undefined = delayType === 'hours'
      ? { hours: currentUtilityAnswers.delayHours || 0 }
      : delayType === 'days'
        ? { days: currentUtilityAnswers.delayDays || 0 }
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
          askFeaturesForPlatform(selectedPlatforms[nextPlatformIndex]);
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
      if (!platformsConfirmed) {
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
                } catch (error: any) {
                  logger.error('Error sending message from initial screen', error);
                  logger.error('Error details', {
                    message: error.message,
                    response: error.response?.data,
                    status: error.response?.status,
                  });
                  addAIMessage({
                    role: 'ai',
                    content: error.response?.data?.text || error.message || 'I encountered an error. Please try again.',
                    timestamp: new Date(),
                    searchResults: error.response?.data?.searchResults || undefined,
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
                if (window.confirm('Are you sure you want to clear the chat? This will remove all messages.')) {
                  // Clear only chat messages, keep workflow state
                  useOnboardingStore.setState({
                    aiMessages: [],
                    isICPFlowStarted: false // Reset the flow started flag
                  });
                  setFlowState('initial');
                  setUserAnswers({});
                  setCurrentUtilityAnswers({});
                }
              }}
              className="flex items-center gap-2 px-3 py-1.5 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Clear chat messages"
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
                    !chatStepController.isComplete
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
              {message.role === 'ai' && message.options && message.options.length > 0 && index === aiMessages.length - 1 && (
                <div className="w-full max-w-3xl mx-auto px-4 py-4 space-y-2">
                  {message.options.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        handleAnswer(option.value,
                          flowState === 'platform_selection' ? 'platforms' :
                            flowState === 'platform_features' ? `features_${currentPlatform}` :
                              currentUtilityQuestion || 'unknown'
                        );
                      }}
                      className="w-full text-left px-6 py-3 bg-white border-2 border-gray-200 rounded-xl transition-all shadow-sm hover:shadow-md hover:border-blue-500 hover:bg-blue-50"
                    >
                      {option.label}
                    </button>
                  ))}
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

          {/* Option Buttons for current question (fallback - options from AI messages are shown above) */}
          {showOptions && !aiMessages[aiMessages.length - 1]?.options && (
            <div className="w-full max-w-3xl mx-auto px-4 py-4 space-y-2">
              {currentQuestionOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    // Handle platform_features multi-select
                    if (flowState === 'platform_features') {
                      const currentFeatures = platformFeatures[currentPlatform || ''] || [];
                      const isSelected = currentFeatures.includes(option.value);
                      const newFeatures = isSelected
                        ? currentFeatures.filter((f: string) => f !== option.value)
                        : [...currentFeatures, option.value];
                      setPlatformFeatures(currentPlatform || '', newFeatures);
                      return;
                    }

                    // Handle other flow states
                    let questionKey = 'unknown';
                    if (flowState === 'platform_selection') {
                      questionKey = 'platforms';
                    } else if (currentUtilityQuestion) {
                      questionKey = currentUtilityQuestion;
                    }
                    handleAnswer(option.value, questionKey);
                  }}
                  className={`w-full text-left px-6 py-3 bg-white border-2 rounded-xl transition-all shadow-sm hover:shadow-md ${flowState === 'platform_features' &&
                    (platformFeatures[currentPlatform || ''] || []).includes(option.value)
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-blue-500 hover:bg-blue-50'
                    }`}
                >
                  {option.label}
                </button>
              ))}

              {flowState === 'platform_features' && (
                <button
                  onClick={async () => {
                    const features = platformFeatures[currentPlatform || ''] || [];
                    if (features.length > 0) {
                      await processFeatureSelection(currentPlatform || '', features);
                    }
                  }}
                  className="w-full px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium mt-2"
                >
                  Continue with Selected Features
                </button>
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

            // PRIORITY 1: If in leads path with CHAT mode, always use ICP flow (not general AI)
            if (selectedPath === 'leads' && onboardingMode === 'CHAT') {
              // Start ICP flow if not already active
              if (!isICPOnboardingActive && !chatStepController.isComplete) {
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

              // If ICP flow is active, handle answer
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
              } else {
                logger.warn('ICP flow check failed - falling back to general AI', {
                  isICPOnboardingActive,
                  isComplete: chatStepController.isComplete,
                  currentStepIndex: chatStepController.currentStepIndex,
                  selectedPath,
                  onboardingMode
                });
                // Even if isICPOnboardingActive is false, if we're in leads/CHAT mode and have questions, use ICP flow
                if (selectedPath === 'leads' && onboardingMode === 'CHAT' && chatStepController.currentQuestion) {
                  logger.debug('Force-enabling ICP flow based on context');
                  setIsICPOnboardingActive(true);
                  addAIMessage({
                    role: 'user',
                    content: msg,
                    timestamp: new Date(),
                  });
                  await chatStepController.handleAnswer(msg);
                  return;
                }
              }
            }

            // PRIORITY 2: Check if message is EXPLICITLY about lead generation/outreach (if not already in leads flow)
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
            } catch (error: any) {
              logger.error('Error sending message', error);
              logger.error('Error details', {
                message: error.message,
                response: error.response?.data,
                status: error.response?.status,
              });
              addAIMessage({
                role: 'ai',
                content: error.response?.data?.text || error.message || 'I encountered an error. Please try again.',
                timestamp: new Date(),
                searchResults: error.response?.data?.searchResults || undefined,
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
