import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Agent, AgentFormData, AgentGender, DEFAULT_AGENT_FORM, Voice } from '@/types/agent';
import { useAgentForm } from '@/hooks/useAgentForm';
import { useToast } from '../../hooks/use-toast';
import { logger } from '@/lib/logger';
import { safeStorage } from '@lad/shared/storage';  
import { AgentSelector } from './AgentSelector';
import { AgentForm } from './AgentForm';
import { FormSkeleton } from './FormSkeleton';
import { SidebarSkeleton } from './SidebarSkeleton';

export function VoiceAgentSettings() {
  const { toast } = useToast();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [selectedAgentVoiceSampleUrl, setSelectedAgentVoiceSampleUrl] = useState<string | undefined>(undefined);
  const [isLoadingAgents, setIsLoadingAgents] = useState(true);
  const [voices, setVoices] = useState<Voice[]>([]);
  const [isLoadingVoices, setIsLoadingVoices] = useState(true);
  const [isLoadingAgent, setIsLoadingAgent] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const formRef = useRef<HTMLElement>(null);

  const {
    formData,
    errors,
    isDirty,
    isValid,
    updateField,
    resetForm,
    validateForm,
    getCharCount,
  } = useAgentForm();

  // Load agents from API
  useEffect(() => {
    const loadAgents = async () => {
      setIsLoadingAgents(true);
      try {
        // Get token using existing pattern from auth.ts
        const token = safeStorage.getItem("token") || safeStorage.getItem("token");
        
        logger.debug('[VoiceAgentSettings] Token presence check', { hasToken: !!token });

        // First check authentication using /api/auth/me endpoint
        logger.debug('[VoiceAgentSettings] Checking authentication');
        const authResponse = await fetch(`/api/auth/me`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { "Authorization": `Bearer ${token}` } : {}),
          },
          credentials: "include", // Include httpOnly cookies
        });

        logger.debug('[VoiceAgentSettings] Auth response received', { status: authResponse.status });

        if (!authResponse.ok) {
          const authError = await authResponse.text();
          logger.error('[VoiceAgentSettings] Auth error', { error: authError });
          throw new Error('Not authenticated. Please login again.');
        }

        const authData = await authResponse.json();
        logger.debug('[VoiceAgentSettings] User authenticated', { user: authData.user?.email || authData.user?.name });

        // Now fetch agents through proxy
        logger.debug('[VoiceAgentSettings] Fetching agents from proxy');
        const [agentsResponse, voicesResponse] = await Promise.all([
          fetch(`/api/voice-agent/settings/agents`, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              ...(token ? { "Authorization": `Bearer ${token}` } : {}),
            },
            credentials: "include",
          }),
          fetch(`/api/voice-agent/settings/voices`, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              ...(token ? { "Authorization": `Bearer ${token}` } : {}),
            },
            credentials: "include",
          })
        ]);

        logger.debug('[VoiceAgentSettings] Agents response received', { status: agentsResponse.status, statusText: agentsResponse.statusText });

        if (!agentsResponse.ok) {
          const errorText = await agentsResponse.text();
          logger.error('[VoiceAgentSettings] Agents fetch failed', { error: errorText, status: agentsResponse.status });
          throw new Error(`Failed to fetch agents: ${agentsResponse.status} ${agentsResponse.statusText}`);
        }

        const data = await agentsResponse.json();
        logger.debug('[VoiceAgentSettings] Agents fetched successfully', { count: Array.isArray(data) ? data.length : data.data?.length });
        
        // Fetch voices
        if (voicesResponse.ok) {
          const voicesData = await voicesResponse.json();
          const voicesArray = Array.isArray(voicesData) ? voicesData : (voicesData.data || []);
          setVoices(voicesArray.map((v: any) => ({
            id: v.id,
            description: v.description,
            gender: v.gender,
            accent: v.accent,
            provider: v.provider,
            voice_sample_url: v.voice_sample_url,
            provider_voice_id: v.provider_voice_id,
          })));
        }
        
        // Map API response to Agent interface
        const agentsArray = Array.isArray(data) ? data : (data.data ? data.data : []);
        const mappedAgents = agentsArray.map((agent: any) => ({
          id: agent.agent_id || agent.id,
          agent_id: agent.agent_id,
          name: agent.agent_name || agent.name,
          agent_name: agent.agent_name,
          gender: agent.voice_gender || agent.gender,
          voice_gender: agent.voice_gender,
          language: agent.agent_language || agent.language,
          agent_language: agent.agent_language,
          status: agent.status || 'active',
          description: agent.description,
          accent: agent.accent,
          provider: agent.provider,
          voice_id: agent.voice_id,
          voice_sample_url: agent.voice_sample_url,
          provider_voice_id: agent.provider_voice_id,
          agent_instructions: agent.agent_instructions || '',
          system_instructions: agent.system_instructions || '',
          outbound_starter_prompt: agent.outbound_starter_prompt || '',
        }));
        
        logger.debug('[VoiceAgentSettings] Agents mapped', { count: mappedAgents.length });
        setAgents(mappedAgents);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Failed to fetch agent list. Please try again.';
        logger.error('[VoiceAgentSettings] Error loading agents', { error: errorMsg });
        toast({
          title: 'Error loading agents',
          description: errorMsg,
          variant: 'destructive',
        });
        setAgents([]);
      } finally {
        setIsLoadingAgents(false);
        setIsLoadingVoices(false);
      }
    };

    loadAgents();
  }, [toast]);

  // Load selected agent data
  useEffect(() => {
    const loadAgent = async () => {
      if (!selectedAgentId) {
        resetForm(DEFAULT_AGENT_FORM);
        setSelectedAgentVoiceSampleUrl(undefined);
        return;
      }

      setIsLoadingAgent(true);
      try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 500));
        const agent = agents.find(a => (a.id || a.agent_id) === selectedAgentId);
        
        if (agent) {
          const formData: AgentFormData = {
            name: agent.name || agent.agent_name || '',
            gender: (agent.gender || agent.voice_gender || 'neutral') as AgentGender,
            language: agent.language || agent.agent_language || 'en-US',
            voice_id: agent.voice_id || '',
            agent_instructions: agent.agent_instructions || '',
            system_instructions: agent.system_instructions || '',
            outbound_starter_prompt: agent.outbound_starter_prompt || '',
          };
          resetForm(formData);
          setSelectedAgentVoiceSampleUrl(agent.voice_sample_url);
        }
      } catch (error) {
        toast({
          title: 'Error loading agent',
          description: 'Failed to fetch agent details. Please try again.',
          variant: 'destructive',
        });
      } finally {
        setIsLoadingAgent(false);
      }
    };

    loadAgent();
  }, [selectedAgentId, agents, resetForm, toast]);

  // Handle agent selection with unsaved changes warning
  const handleSelectAgent = useCallback((agentId: string | null) => {
    if (isDirty) {
      const confirmed = window.confirm(
        'You have unsaved changes. Are you sure you want to switch agents?'
      );
      if (!confirmed) return;
    }
    setSelectedAgentId(agentId);

    // Scroll to form on mobile when an agent is selected or "Create New" is clicked
    if (window.innerWidth < 1024) {
      setTimeout(() => {
        formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, [isDirty]);

  // Handle save
  const handleSave = useCallback(async () => {
    if (!validateForm()) {
      toast({
        title: 'Validation Error',
        description: 'Please fix the errors before saving.',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      const token = safeStorage.getItem("token");
      
      if (selectedAgentId) {
        // Update existing agent
        const response = await fetch(`/api/voice-agent/settings/agents/${selectedAgentId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { "Authorization": `Bearer ${token}` } : {}),
          },
          credentials: "include",
          body: JSON.stringify({
            agent_name: formData.name,
            voice_gender: formData.gender,
            agent_language: formData.language,
            voice_id: formData.voice_id,
            agent_instructions: formData.agent_instructions,
            system_instructions: formData.system_instructions,
            outbound_starter_prompt: formData.outbound_starter_prompt,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to update agent: ${response.status} ${errorText}`);
        }

        const updatedAgent = await response.json();
        setAgents(prev => prev.map(agent => 
          agent.id === selectedAgentId
            ? { 
                ...agent, 
                ...formData, 
                voice_id: formData.voice_id,
                voice_sample_url: voices.find(v => v.id === formData.voice_id)?.voice_sample_url || agent.voice_sample_url,
                updated_at: new Date().toISOString() 
              }
            : agent
        ));
        toast({
          title: 'Agent Updated',
          description: `"${formData.name}" has been updated successfully.`,
        });
      } else {
        // Create new agent
        const response = await fetch(`/api/voice-agent/settings/agents`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { "Authorization": `Bearer ${token}` } : {}),
          },
          credentials: "include",
          body: JSON.stringify({
            agent_name: formData.name,
            voice_gender: formData.gender,
            agent_language: formData.language,
            voice_id: formData.voice_id,
            agent_instructions: formData.agent_instructions,
            system_instructions: formData.system_instructions,
            outbound_starter_prompt: formData.outbound_starter_prompt,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to create agent: ${response.status} ${errorText}`);
        }

        const newAgent = await response.json();
        const mappedAgent: Agent = {
          id: newAgent.agent_id || newAgent.id,
          agent_id: newAgent.agent_id,
          agent_name: newAgent.agent_name,
          name: newAgent.agent_name,
          voice_gender: newAgent.voice_gender,
          gender: newAgent.voice_gender,
          agent_language: newAgent.agent_language,
          language: newAgent.agent_language,
          voice_id: newAgent.voice_id,
          voice_sample_url: voices.find(v => v.id === formData.voice_id)?.voice_sample_url,
          agent_instructions: newAgent.agent_instructions,
          system_instructions: newAgent.system_instructions,
          outbound_starter_prompt: newAgent.outbound_starter_prompt,
          status: newAgent.status || 'active',
          created_at: newAgent.created_at,
          updated_at: newAgent.updated_at,
        };
        
        setAgents(prev => [...prev, mappedAgent]);
        setSelectedAgentId(mappedAgent.id!);
        toast({
          title: 'Agent Created',
          description: `"${formData.name}" has been created successfully.`,
        });
      }

      // Clear draft from localStorage
      localStorage.removeItem('voice-agent-draft');
      resetForm(formData);
    } catch (error) {
      toast({
        title: 'Save Failed',
        description: 'Failed to save agent. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  }, [selectedAgentId, formData, validateForm, resetForm, toast]);

  const handleReset = useCallback(() => {
    if (selectedAgentId) {
      const agent = agents.find(a => (a.id || a.agent_id) === selectedAgentId);
      if (agent) {
        resetForm({
          name: agent.name || agent.agent_name || '',
          gender: (agent.gender || agent.voice_gender || 'neutral') as AgentGender,
          language: agent.language || agent.agent_language || 'en-US',
          voice_id: agent.voice_id || '',
          agent_instructions: agent.agent_instructions || '',
          system_instructions: agent.system_instructions || '',
          outbound_starter_prompt: agent.outbound_starter_prompt || '',
        });
      }
    } else {
      resetForm(DEFAULT_AGENT_FORM);
    }
    toast({ title: 'Form reset' });
  }, [selectedAgentId, agents, resetForm, toast]);

  // Warn before leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  return (
    <div className="min-h-screen p-2 md:p-2 lg:p-2">
      <div className="mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
          {/* Sidebar - Agent Selector */}
          <aside className="w-full min-w-0 max-w-none lg:w-[320px] lg:flex-none lg:sticky lg:top-6 lg:h-[calc(100vh-3rem)]">
            {isLoadingAgents ? (
              <SidebarSkeleton />
            ) : (
              <AgentSelector
                agents={agents}
                selectedAgentId={selectedAgentId}
                onSelectAgent={handleSelectAgent}
                isLoading={isLoadingAgents}
              />
            )}
          </aside>

          {/* Main Content - Agent Form */}
          <main ref={formRef}>
            {isLoadingAgent ? (
              <FormSkeleton />
            ) : (
              <AgentForm
                formData={formData}
                errors={errors}
                isDirty={isDirty}
                isValid={isValid}
                isSaving={isSaving}
                isEditMode={!!selectedAgentId}
                voiceSampleUrl={selectedAgentVoiceSampleUrl}
                voices={voices}
                isLoadingVoices={isLoadingVoices}
                onUpdateField={updateField}
                onSave={handleSave}
                onReset={handleReset}
                getCharCount={getCharCount}
              />
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
