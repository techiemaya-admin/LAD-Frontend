'use client';
import React from 'react';
import { useCampaignStore } from '@/store/campaignStore';
import { useOnboardingStore } from '@/store/onboardingStore';
import { StepType } from '@/types/campaign';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { Info, CheckCircle, AlertCircle } from 'lucide-react';
// Helper function to get required fields for each step type
const getRequiredFields = (stepType: StepType): string[] => {
  const required: Record<StepType, string[]> = {
    linkedin_connect: [], // Message is optional due to LinkedIn's 4-5 connection messages/month limit
    linkedin_message: ['message'],
    email_send: ['subject', 'body'],
    email_followup: ['subject', 'body'],
    whatsapp_send: ['whatsappMessage'],
    voice_agent_call: ['voiceAgentId'],
    instagram_dm: ['instagramUsername', 'instagramDmMessage'],
    delay: [], // At least one time unit must be > 0 (validated separately with isDelayValid)
    condition: ['conditionType'],
    linkedin_scrape_profile: ['linkedinScrapeFields'],
    linkedin_company_search: ['linkedinCompanyName'],
    linkedin_employee_list: ['linkedinCompanyUrl'],
    linkedin_autopost: ['linkedinPostContent'],
    linkedin_comment_reply: ['linkedinCommentText'],
    instagram_follow: ['instagramUsername'],
    instagram_like: ['instagramPostUrl'],
    instagram_autopost: ['instagramPostCaption', 'instagramPostImageUrl'],
    instagram_comment_reply: ['instagramCommentText'],
    instagram_story_view: ['instagramUsername'],
    lead_generation: ['leadGenerationQuery', 'leadGenerationLimit'],
    linkedin_visit: [],
    linkedin_follow: [],
    start: [],
    end: [],
  };
  return required[stepType] || [];
};
// Special validation for delay step - at least one time unit must be > 0
const isDelayValid = (data: any): boolean => {
  const days = parseInt(data.delayDays) || 0;
  const hours = parseInt(data.delayHours) || 0;
  const minutes = parseInt(data.delayMinutes) || 0;
  return days > 0 || hours > 0 || minutes > 0;
};
// Helper to check if field is valid
const isFieldValid = (field: string, value: any): boolean => {
  if (value === undefined || value === null) return false;
  if (typeof value === 'string' && value.trim() === '') return false;
  if (Array.isArray(value) && value.length === 0) return false;
  if (typeof value === 'number' && isNaN(value)) return false;
  return true;
};
export default function StepSettings({
  stepType,
  stepData,
  onUpdate,
  onDelete
}: {
  stepType?: string;
  stepData?: any;
  onUpdate?: (data: any) => void;
  onDelete?: () => void;
} = {}) {
  // Try onboarding store first (for workflow builder)
  const onboardingStore = useOnboardingStore();
  const onboardingNodes = onboardingStore.workflowNodes;
  const onboardingEdges = onboardingStore.workflowEdges || (onboardingStore.manualFlow?.edges) || [];
  const onboardingSelectedNodeId = onboardingStore.selectedNodeId;
  // Fallback to campaign store (for campaign editor)
  const campaignStore = useCampaignStore();
  const campaignNodes = campaignStore.nodes;
  const campaignSelectedNodeId = campaignStore.selectedNodeId;
  // Determine which store to use based on which has selected node
  const useOnboarding = onboardingSelectedNodeId !== null && onboardingSelectedNodeId !== undefined;
  const selectedNodeId = useOnboarding ? onboardingSelectedNodeId : campaignSelectedNodeId;
  // Get nodes from appropriate store
  const nodes = useOnboarding ? onboardingNodes : campaignNodes;
  // Find selected node - need to check both workflowNodes structure and regular nodes
  let selectedNode: any = null;
  if (useOnboarding && onboardingNodes.length > 0) {
    selectedNode = onboardingNodes.find((n: any) => n.id === selectedNodeId);
  } else if (!useOnboarding && campaignNodes.length > 0) {
    selectedNode = campaignNodes.find((n: any) => n.id === selectedNodeId);
  }
  if (!selectedNode || selectedNode.type === 'start' || selectedNode.type === 'end') {
    return (
      <div className="w-full bg-slate-50 flex items-center justify-center p-6">
        <p className="text-sm text-slate-500 text-center">
          {selectedNodeId ? 'This step cannot be edited' : 'Select a step to configure'}
        </p>
      </div>
    );
  }
  // Use prop stepType if provided, otherwise use selectedNode.type
  const resolvedStepType = (stepType || selectedNode.type) as StepType;
  // Handle both data structure (campaign store) and direct properties (onboarding store)
  // For onboarding store, data might be nested in node.data or be direct properties
  const nodeData = selectedNode.data || {};
  const data = {
    ...selectedNode, // Direct properties (onboarding store format)
    ...nodeData,     // Nested data (campaign store format)
    // Ensure we have the latest values by prioritizing nested data over direct
    ...(stepData || {}), // Use prop stepData if provided
  };
  const requiredFields = getRequiredFields(resolvedStepType);
  // Special validation for delay step
  const isValid = resolvedStepType === 'delay' 
    ? isDelayValid(data)
    : requiredFields.every(field => isFieldValid(field, data[field as keyof typeof data]));
  const handleUpdate = (field: string, value: any) => {
    if (useOnboarding) {
      // For onboarding store, updates would need to be handled via the appropriate method
      // Currently just logging for future implementation
      console.debug(`Update onboarding field: ${field} = ${value}`);
    } else {
      // Update campaign store
      campaignStore.updateStep(selectedNodeId!, { [field]: value });
    }
  };
  const renderRequiredIndicator = (field: string) => {
    if (!requiredFields.includes(field)) return null;
    const isValidField = isFieldValid(field, data[field as keyof typeof data]);
    return (
      <Badge
        variant={isValidField ? 'secondary' : 'destructive'}
        className="ml-2 h-5 text-[10px]"
      >
        {isValidField ? <CheckCircle className="w-3 h-3 mr-1" /> : <AlertCircle className="w-3 h-3 mr-1" />}
        {isValidField ? 'Valid' : 'Required'}
      </Badge>
    );
  };
  return (
    <TooltipProvider>
      <div className="w-full h-full bg-slate-50 border-l border-slate-200 overflow-y-auto p-4">
        <h3 className="text-lg font-semibold mb-4 text-slate-800">
          Step Settings
        </h3>
        <Separator className="mb-4" />
        
        {/* Validation Status */}
        {!isValid && (
          <Alert variant="destructive" className="mb-4 text-xs">
            <AlertDescription className="flex items-center">
              Please fill in all required fields marked with <AlertCircle className="w-3.5 h-3.5 mx-1 inline" />
            </AlertDescription>
          </Alert>
        )}
        
        {/* Title */}
        <div className="mb-4">
          <Label htmlFor="step-title">Step Title *</Label>
          <Input
            id="step-title"
            value={data.title || ''}
            onChange={(e) => handleUpdate('title', e.target.value)}
            required
            className="mt-1"
          />
          <p className="text-xs text-slate-500 mt-1">A descriptive name for this step</p>
        </div>
        
        <Separator className="my-4" />
      {/* LinkedIn Steps */}
      {(resolvedStepType === 'linkedin_connect' || resolvedStepType === 'linkedin_message') && (
        <>
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-[#0077B5] mb-2 flex items-center">
              <span className="w-1 h-1 bg-[#0077B5] rounded-full mr-2" />
              LinkedIn Configuration
            </h4>
          </div>
          <div className="mb-4">
            <Label htmlFor="linkedin-message">{resolvedStepType === 'linkedin_connect' ? 'Message (Optional)' : 'Message'}</Label>
            <div className="flex items-start gap-2">
              <Textarea
                id="linkedin-message"
                rows={4}
                value={data.message || ''}
                onChange={(e) => handleUpdate('message', e.target.value)}
                placeholder={
                  resolvedStepType === 'linkedin_connect' 
                    ? 'Hi {{first_name}}, I\'d like to connect with you... (Optional - LinkedIn limits connection messages to 4-5/month)'
                    : 'Hi {{first_name}}, I noticed...'
                }
                className={requiredFields.includes('message') && !isFieldValid('message', data.message) ? 'border-red-500' : ''}
              />
              {resolvedStepType === 'linkedin_message' && renderRequiredIndicator('message')}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {requiredFields.includes('message') && !isFieldValid('message', data.message)
                ? 'Message is required'
                : resolvedStepType === 'linkedin_connect'
                ? 'Use {{first_name}}, {{last_name}}, {{company_name}}, {{title}}, {{industry}} for personalization. Note: LinkedIn limits connection messages to 4-5 per month for normal accounts.'
                : 'Use {{first_name}}, {{last_name}}, {{company_name}}, {{title}}, {{industry}} for personalization'
              }
            </p>
          </div>
          <div className="mb-4 p-3 bg-white rounded-lg border border-slate-200">
            <span className="text-xs text-slate-600 font-semibold mb-2 block">
              Available Variables:
            </span>
            <div className="flex flex-row gap-2 flex-wrap">
              {['first_name', 'last_name', 'company_name', 'title', 'industry', 'email'].map((varName) => (
                <span
                  key={varName}
                  className="text-xs bg-slate-100 px-2 py-1 rounded font-mono cursor-pointer hover:bg-slate-200"
                  onClick={() => {
                    const current = data.message || '';
                    handleUpdate('message', current + `{{${varName}}}`);
                  }}
                >
                  {`{{${varName}}}`}
                </span>
              ))}
            </div>
          </div>
        </>
      )}
      {/* Email Steps */}
      {(resolvedStepType === 'email_send' || resolvedStepType === 'email_followup') && (
        <>
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-[#F59E0B] mb-2 flex items-center">
              <span className="w-1 h-1 bg-[#F59E0B] rounded-full mr-2" />
              Email Configuration
            </h4>
          </div>
          <div className="mb-4">
            <Label htmlFor="email-subject">Subject</Label>
            <div className="flex items-start gap-2">
              <Input
                id="email-subject"
                value={data.subject || ''}
                onChange={(e) => handleUpdate('subject', e.target.value)}
                placeholder="Re: {{company_name}} Partnership"
                className={requiredFields.includes('subject') && !isFieldValid('subject', data.subject) ? 'border-red-500' : ''}
              />
              {renderRequiredIndicator('subject')}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {requiredFields.includes('subject') && !isFieldValid('subject', data.subject) ? 'Subject is required' : 'Email subject line'}
            </p>
          </div>
          <div className="mb-4">
            <Label htmlFor="email-body">Email Body</Label>
            <div className="flex items-start gap-2">
              <Textarea
                id="email-body"
                rows={6}
                value={data.body || ''}
                onChange={(e) => handleUpdate('body', e.target.value)}
                placeholder="Hi {{first_name}}, ..."
                className={requiredFields.includes('body') && !isFieldValid('body', data.body) ? 'border-red-500' : ''}
              />
              {renderRequiredIndicator('body')}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {requiredFields.includes('body') && !isFieldValid('body', data.body)
                ? 'Email body is required'
                : 'Use {{first_name}}, {{last_name}}, {{company_name}}, {{title}} for personalization'
              }
            </p>
          </div>
          <div className="flex items-center space-x-2 mb-4">
            <Switch
              id="tracking-enabled"
              checked={data.trackingEnabled || false}
              onCheckedChange={(checked) => handleUpdate('trackingEnabled', checked)}
            />
            <Label htmlFor="tracking-enabled">Enable open/click tracking</Label>
          </div>
          <div className="mb-4 p-3 bg-white rounded-lg border border-slate-200">
            <span className="text-xs text-slate-600 font-semibold mb-2 block">
              Available Variables:
            </span>
            <div className="flex flex-row gap-2 flex-wrap">
              {['first_name', 'last_name', 'company_name', 'title', 'email'].map((varName) => (
                <span
                  key={varName}
                  className="text-xs bg-slate-100 px-2 py-1 rounded font-mono cursor-pointer hover:bg-slate-200"
                  onClick={() => {
                    const current = data.body || '';
                    handleUpdate('body', current + `{{${varName}}}`);
                  }}
                >
                  {`{{${varName}}}`}
                </span>
              ))}
            </div>
          </div>
        </>
      )}
      {/* Delay Step */}
      {resolvedStepType === 'delay' && (
        <>
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-[#10B981] mb-2 flex items-center">
              <span className="w-1 h-1 bg-[#10B981] rounded-full mr-2" />
              Delay Configuration
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-5 w-5 p-0 ml-2">
                    <Info className="h-4 w-4 text-slate-500" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Set how long to wait before executing the next step. At least one time unit (days, hours, or minutes) must be greater than 0.</p>
                </TooltipContent>
              </Tooltip>
            </h4>
          </div>
          {!isDelayValid(data) && (
            <Alert variant="destructive" className="mb-4 text-xs">
              <AlertDescription>At least one time unit (Days, Hours, or Minutes) must be greater than 0</AlertDescription>
            </Alert>
          )}
          <div className="flex flex-col gap-4">
            <div>
              <Label htmlFor="delay-days">Days *</Label>
              <Input
                id="delay-days"
                type="number"
                value={data.delayDays || 0}
                onChange={(e) => handleUpdate('delayDays', parseInt(e.target.value) || 0)}
                min={0}
                max={365}
                className={!isDelayValid(data) && (parseInt(data.delayDays) || 0) === 0 ? 'border-red-500 mt-1' : 'mt-1'}
              />
              <p className="text-xs text-slate-500 mt-1">Number of days to wait (0-365). At least one time unit must be &gt; 0.</p>
            </div>
            <div>
              <Label htmlFor="delay-hours">Hours *</Label>
              <Input
                id="delay-hours"
                type="number"
                value={data.delayHours || 0}
                onChange={(e) => handleUpdate('delayHours', parseInt(e.target.value) || 0)}
                min={0}
                max={23}
                className={!isDelayValid(data) && (parseInt(data.delayHours) || 0) === 0 ? 'border-red-500 mt-1' : 'mt-1'}
              />
              <p className="text-xs text-slate-500 mt-1">Additional hours to wait (0-23). At least one time unit must be &gt; 0.</p>
            </div>
            <div>
              <Label htmlFor="delay-minutes">Minutes (Optional)</Label>
              <Input
                id="delay-minutes"
                type="number"
                value={data.delayMinutes || 0}
                onChange={(e) => handleUpdate('delayMinutes', parseInt(e.target.value) || 0)}
                min={0}
                max={59}
                className="mt-1"
              />
              <p className="text-xs text-slate-500 mt-1">Additional minutes to wait (0-59). Optional but can be combined with days/hours.</p>
            </div>
          </div>
          <div className={`mt-4 p-3 rounded-lg border ${isDelayValid(data) ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            <span className={`text-[11px] ${isDelayValid(data) ? 'text-green-900' : 'text-red-900'}`}>
              <strong>Total Delay:</strong> {data.delayDays || 0} day(s), {data.delayHours || 0} hour(s), {data.delayMinutes || 0} minute(s)
              {!isDelayValid(data) && (
                <span className="block mt-1 font-semibold">
                  ⚠️ Invalid: At least one time unit must be greater than 0
                </span>
              )}
            </span>
          </div>
        </>
      )}
      {/* Condition Step */}
      {resolvedStepType === 'condition' && (
        <>
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-[#10B981] mb-2 flex items-center">
              <span className="w-1 h-1 bg-[#10B981] rounded-full mr-2" />
              Condition Configuration
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-5 w-5 p-0 ml-2">
                    <Info className="h-4 w-4 text-slate-500" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Define a condition to check before proceeding. The workflow will check if the previous step met this condition. If true, continue to next step; if false, the workflow may skip or take alternative path.</p>
                </TooltipContent>
              </Tooltip>
            </h4>
          </div>
          {!isFieldValid('conditionType', data.conditionType) && (
            <Alert variant="destructive" className="mb-4 text-xs">
              <AlertDescription>Condition Type is required. Please select a condition to check.</AlertDescription>
            </Alert>
          )}
          <div className="mb-4">
            <Label htmlFor="condition-type">Condition Type *</Label>
            <Select value={data.conditionType || ''} onValueChange={(val) => handleUpdate('conditionType', val)}>
              <SelectTrigger id="condition-type" className={requiredFields.includes('conditionType') && !isFieldValid('conditionType', data.conditionType) ? 'border-red-500 mt-1' : 'mt-1'}>
                <SelectValue placeholder="Select condition" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel className="bg-slate-50 font-semibold text-[#0077B5]">📱 LINKEDIN</SelectLabel>
                  <SelectItem value="connected">✅ If Connected on LinkedIn</SelectItem>
                  <SelectItem value="linkedin_replied">💬 If Replied to LinkedIn Message</SelectItem>
                  <SelectItem value="linkedin_followed">👥 If Followed Back on LinkedIn</SelectItem>
                </SelectGroup>
                <SelectGroup>
                  <SelectLabel className="bg-slate-50 font-semibold text-[#F59E0B]">📧 EMAIL</SelectLabel>
                  <SelectItem value="replied">✉️ If Replied to Email</SelectItem>
                  <SelectItem value="opened">👁️ If Opened Email</SelectItem>
                  <SelectItem value="clicked">🔗 If Clicked Email Link</SelectItem>
                </SelectGroup>
                <SelectGroup>
                  <SelectLabel className="bg-slate-50 font-semibold text-[#25D366]">💬 WHATSAPP</SelectLabel>
                  <SelectItem value="whatsapp_delivered">✓ If WhatsApp Message Delivered</SelectItem>
                  <SelectItem value="whatsapp_read">✓✓ If WhatsApp Message Read</SelectItem>
                  <SelectItem value="whatsapp_replied">💬 If Replied to WhatsApp</SelectItem>
                </SelectGroup>
                <SelectGroup>
                  <SelectLabel className="bg-slate-50 font-semibold text-[#8B5CF6]">📞 VOICE AGENT</SelectLabel>
                  <SelectItem value="voice_answered">📞 If Call Answered</SelectItem>
                  <SelectItem value="voice_not_answered">❌ If Call Not Answered</SelectItem>
                  <SelectItem value="voice_completed">✅ If Call Completed</SelectItem>
                  <SelectItem value="voice_busy">📵 If Line Busy</SelectItem>
                  <SelectItem value="voice_failed">⚠️ If Call Failed</SelectItem>
                </SelectGroup>
                <SelectGroup>
                  <SelectLabel className="bg-slate-50 font-semibold text-[#E4405F]">📷 INSTAGRAM</SelectLabel>
                  <SelectItem value="instagram_followed">👥 If Followed Back</SelectItem>
                  <SelectItem value="instagram_liked">❤️ If Liked Post</SelectItem>
                  <SelectItem value="instagram_replied">💬 If Replied to DM</SelectItem>
                  <SelectItem value="instagram_commented">💭 If Commented on Post</SelectItem>
                  <SelectItem value="instagram_story_viewed">👁️ If Viewed Story</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 mt-4">
            <span className="text-[11px] text-blue-900 block mb-2 font-semibold">
              📋 How Conditions Work:
            </span>
            <span className="text-[11px] text-blue-900 block mb-1">
              1. The system checks the status of the <strong>previous step</strong> in the workflow
            </span>
            <span className="text-[11px] text-blue-900 block mb-1">
              2. If the condition is <strong>met</strong> (e.g., "If Connected on LinkedIn" = true), the workflow continues to the next step
            </span>
            <span className="text-[11px] text-blue-900 block">
              3. If the condition is <strong>not met</strong>, the workflow may skip steps or take an alternative path
            </span>
          </div>
          <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 mt-2">
            <span className="text-[11px] text-amber-900">
              <strong>⚠️ Important:</strong> Make sure the previous step in your workflow can produce the result you're checking for. For example, if checking "If Connected on LinkedIn", ensure there's a LinkedIn connection step before this condition.
            </span>
          </div>
        </>
      )}
      {/* WhatsApp Steps */}
      {resolvedStepType === 'whatsapp_send' && (
        <>
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-[#25D366] mb-2 flex items-center">
              <span className="w-1 h-1 bg-[#25D366] rounded-full mr-2" />
              WhatsApp Configuration
            </h4>
          </div>
          <div className="mb-4">
            <Label htmlFor="whatsapp-template">WhatsApp Template</Label>
            <Select value={data.whatsappTemplate || ''} onValueChange={(val) => handleUpdate('whatsappTemplate', val)}>
              <SelectTrigger id="whatsapp-template" className="mt-1">
                <SelectValue placeholder="None (Free Text)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">None (Free Text)</SelectItem>
                <SelectItem value="greeting">Greeting Template</SelectItem>
                <SelectItem value="followup">Follow-up Template</SelectItem>
                <SelectItem value="reminder">Reminder Template</SelectItem>
                <SelectItem value="custom">Custom Template</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="mb-4">
            <Label htmlFor="whatsapp-message">Message</Label>
            <div className="flex items-start gap-2">
              <Textarea
                id="whatsapp-message"
                rows={4}
                value={data.whatsappMessage || ''}
                onChange={(e) => handleUpdate('whatsappMessage', e.target.value)}
                placeholder="Hi {{first_name}}, ..."
                className={requiredFields.includes('whatsappMessage') && !isFieldValid('whatsappMessage', data.whatsappMessage) ? 'border-red-500' : ''}
              />
              {renderRequiredIndicator('whatsappMessage')}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {requiredFields.includes('whatsappMessage') && !isFieldValid('whatsappMessage', data.whatsappMessage)
                ? 'Message is required'
                : 'Use {{first_name}}, {{last_name}}, {{company_name}}, {{title}}, {{phone}} for personalization'
              }
            </p>
          </div>
          <div className="mb-4 p-3 bg-white rounded-lg border border-slate-200">
            <span className="text-xs text-slate-600 font-semibold mb-2 block">
              Available Variables:
            </span>
            <div className="flex flex-row gap-2 flex-wrap">
              {['first_name', 'last_name', 'company_name', 'title', 'email', 'phone'].map((varName) => (
                <span
                  key={varName}
                  className="text-xs bg-slate-100 px-2 py-1 rounded font-mono cursor-pointer hover:bg-slate-200"
                  onClick={() => {
                    const current = data.whatsappMessage || '';
                    handleUpdate('whatsappMessage', current + `{{${varName}}}`);
                  }}
                >
                  {`{{${varName}}}`}
                </span>
              ))}
            </div>
          </div>
        </>
      )}
      {/* Voice Agent Steps */}
      {resolvedStepType === 'voice_agent_call' && (
        <>
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-[#8B5CF6] mb-2 flex items-center">
              <span className="w-1 h-1 bg-[#8B5CF6] rounded-full mr-2" />
              Voice Agent Configuration
            </h4>
          </div>
          <div className="mb-4">
            <Label htmlFor="voice-agent">Voice Agent *</Label>
            <Select
              value={data.voiceAgentId || ''}
              onValueChange={(val) => {
                const agentId = val;
                handleUpdate('voiceAgentId', agentId);
                // Set agent name based on ID (you can fetch from API)
                const agentNames: Record<string, string> = {
                  '24': 'VAPI Agent',
                  '1': 'Agent 1',
                  '2': 'Agent 2',
                  '3': 'Agent 3',
                };
                handleUpdate('voiceAgentName', agentNames[agentId] || 'Custom Agent');
              }}
            >
              <SelectTrigger id="voice-agent" className={requiredFields.includes('voiceAgentId') && !isFieldValid('voiceAgentId', data.voiceAgentId) ? 'border-red-500 mt-1' : 'mt-1'}>
                <SelectValue placeholder="Select agent" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="24">VAPI Agent</SelectItem>
                <SelectItem value="1">Agent 1</SelectItem>
                <SelectItem value="2">Agent 2</SelectItem>
                <SelectItem value="3">Agent 3</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="mb-4">
            <Label htmlFor="voice-template">Voice Template</Label>
            <Select value={data.voiceTemplate || ''} onValueChange={(val) => handleUpdate('voiceTemplate', val)}>
              <SelectTrigger id="voice-template" className="mt-1">
                <SelectValue placeholder="Default Template" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Default Template</SelectItem>
                <SelectItem value="greeting">Greeting Template</SelectItem>
                <SelectItem value="sales">Sales Template</SelectItem>
                <SelectItem value="followup">Follow-up Template</SelectItem>
                <SelectItem value="custom">Custom Template</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="mb-4">
            <Label htmlFor="voice-context">Additional Context</Label>
            <Textarea
              id="voice-context"
              rows={3}
              value={data.voiceContext || ''}
              onChange={(e) => handleUpdate('voiceContext', e.target.value)}
              placeholder="Additional context for the voice agent..."
              className="mt-1"
            />
            <p className="text-xs text-slate-500 mt-1">Provide context about the lead or conversation</p>
          </div>
        </>
      )}
      {/* Additional LinkedIn Steps */}
      {resolvedStepType === 'linkedin_scrape_profile' && (
        <>
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-[#0077B5] mb-2 flex items-center">
              <span className="w-1 h-1 bg-[#0077B5] rounded-full mr-2" />
              LinkedIn Profile Scraping Configuration
            </h4>
          </div>
          <div className="mb-4">
            <Label htmlFor="linkedin-profile-url">LinkedIn Profile URL (Optional)</Label>
            <Input
              id="linkedin-profile-url"
              value={data.linkedinCompanyUrl || ''}
              onChange={(e) => handleUpdate('linkedinCompanyUrl', e.target.value)}
              placeholder="https://linkedin.com/in/username"
              className="mt-1"
            />
            <p className="text-xs text-slate-500 mt-1">Leave empty to scrape from lead's LinkedIn profile</p>
          </div>
          <div className="mb-4">
            <Label htmlFor="scrape-fields">Fields to Scrape *</Label>
            <Select
              value={data.linkedinScrapeFields?.[0] || ''}
              onValueChange={(val) => {
                const currentFields = data.linkedinScrapeFields || [];
                if (currentFields.includes(val)) {
                  handleUpdate('linkedinScrapeFields', currentFields.filter((f: string) => f !== val));
                } else {
                  handleUpdate('linkedinScrapeFields', [...currentFields, val]);
                }
              }}
            >
              <SelectTrigger id="scrape-fields" className={requiredFields.includes('linkedinScrapeFields') && !isFieldValid('linkedinScrapeFields', data.linkedinScrapeFields) ? 'border-red-500 mt-1' : 'mt-1'}>
                <SelectValue placeholder="Select fields" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="title">Title</SelectItem>
                <SelectItem value="company">Company</SelectItem>
                <SelectItem value="location">Location</SelectItem>
                <SelectItem value="experience">Experience</SelectItem>
                <SelectItem value="education">Education</SelectItem>
                <SelectItem value="skills">Skills</SelectItem>
                <SelectItem value="connections">Connections</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </>
      )}
      {resolvedStepType === 'linkedin_company_search' && (
        <>
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-[#0077B5] mb-2 flex items-center">
              <span className="w-1 h-1 bg-[#0077B5] rounded-full mr-2" />
              LinkedIn Company Search Configuration
            </h4>
          </div>
          <div className="mb-4">
            <Label htmlFor="company-name">Company Name *</Label>
            <div className="flex items-start gap-2">
              <Input
                id="company-name"
                value={data.linkedinCompanyName || ''}
                onChange={(e) => handleUpdate('linkedinCompanyName', e.target.value)}
                placeholder="{{company_name}}"
                className={requiredFields.includes('linkedinCompanyName') && !isFieldValid('linkedinCompanyName', data.linkedinCompanyName) ? 'border-red-500 mt-1' : 'mt-1'}
              />
              {renderRequiredIndicator('linkedinCompanyName')}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {requiredFields.includes('linkedinCompanyName') && !isFieldValid('linkedinCompanyName', data.linkedinCompanyName) ? 'Company name is required' : 'Use {{company_name}} variable or enter company name'}
            </p>
          </div>
        </>
      )}
      {resolvedStepType === 'linkedin_employee_list' && (
        <>
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-[#0077B5] mb-2 flex items-center">
              <span className="w-1 h-1 bg-[#0077B5] rounded-full mr-2" />
              LinkedIn Employee List Configuration
            </h4>
          </div>
          <div className="mb-4">
            <Label htmlFor="company-linkedin-url">Company LinkedIn URL *</Label>
            <div className="flex items-start gap-2">
              <Input
                id="company-linkedin-url"
                value={data.linkedinCompanyUrl || ''}
                onChange={(e) => handleUpdate('linkedinCompanyUrl', e.target.value)}
                placeholder="https://linkedin.com/company/company-name"
                className={requiredFields.includes('linkedinCompanyUrl') && !isFieldValid('linkedinCompanyUrl', data.linkedinCompanyUrl) ? 'border-red-500 mt-1' : 'mt-1'}
              />
              {renderRequiredIndicator('linkedinCompanyUrl')}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {requiredFields.includes('linkedinCompanyUrl') && !isFieldValid('linkedinCompanyUrl', data.linkedinCompanyUrl) ? 'Company LinkedIn URL is required' : 'Full LinkedIn company page URL'}
            </p>
          </div>
        </>
      )}
      {resolvedStepType === 'linkedin_autopost' && (
        <>
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-[#0077B5] mb-2 flex items-center">
              <span className="w-1 h-1 bg-[#0077B5] rounded-full mr-2" />
              LinkedIn Auto-Post Configuration
            </h4>
          </div>
          <div className="mb-4">
            <Label htmlFor="post-content">Post Content *</Label>
            <div className="flex items-start gap-2">
              <Textarea
                id="post-content"
                rows={4}
                value={data.linkedinPostContent || ''}
                onChange={(e) => handleUpdate('linkedinPostContent', e.target.value)}
                placeholder="Share your thoughts..."
                className={requiredFields.includes('linkedinPostContent') && !isFieldValid('linkedinPostContent', data.linkedinPostContent) ? 'border-red-500' : ''}
              />
              {renderRequiredIndicator('linkedinPostContent')}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {requiredFields.includes('linkedinPostContent') && !isFieldValid('linkedinPostContent', data.linkedinPostContent) ? 'Post content is required' : 'Content to post on LinkedIn'}
            </p>
          </div>
          <div className="mb-4">
            <Label htmlFor="post-image-url">Image URL (optional)</Label>
            <Input
              id="post-image-url"
              value={data.linkedinPostImageUrl || ''}
              onChange={(e) => handleUpdate('linkedinPostImageUrl', e.target.value)}
              placeholder="https://example.com/image.jpg"
              className="mt-1"
            />
          </div>
        </>
      )}
      {resolvedStepType === 'linkedin_comment_reply' && (
        <>
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-[#0077B5] mb-2 flex items-center">
              <span className="w-1 h-1 bg-[#0077B5] rounded-full mr-2" />
              LinkedIn Comment Reply Configuration
            </h4>
          </div>
          <div className="mb-4">
            <Label htmlFor="reply-message">Reply Message *</Label>
            <div className="flex items-start gap-2">
              <Textarea
                id="reply-message"
                rows={3}
                value={data.linkedinCommentText || ''}
                onChange={(e) => handleUpdate('linkedinCommentText', e.target.value)}
                placeholder="Thanks for your comment!"
                className={requiredFields.includes('linkedinCommentText') && !isFieldValid('linkedinCommentText', data.linkedinCommentText) ? 'border-red-500' : ''}
              />
              {renderRequiredIndicator('linkedinCommentText')}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {requiredFields.includes('linkedinCommentText') && !isFieldValid('linkedinCommentText', data.linkedinCommentText) ? 'Reply message is required' : 'Message to reply to comments'}
            </p>
          </div>
        </>
      )}
      {/* Instagram Steps */}
      {resolvedStepType === 'instagram_follow' && (
        <>
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-[#E4405F] mb-2 flex items-center">
              <span className="w-1 h-1 bg-[#E4405F] rounded-full mr-2" />
              Instagram Configuration
            </h4>
          </div>
          <div className="mb-4">
            <Label htmlFor="instagram-username">Instagram Username</Label>
            <div className="flex items-start gap-2">
              <Input
                id="instagram-username"
                value={data.instagramUsername || ''}
                onChange={(e) => handleUpdate('instagramUsername', e.target.value)}
                placeholder="{{instagram_username}}"
                className={requiredFields.includes('instagramUsername') && !isFieldValid('instagramUsername', data.instagramUsername) ? 'border-red-500 mt-1' : 'mt-1'}
              />
              {renderRequiredIndicator('instagramUsername')}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {requiredFields.includes('instagramUsername') && !isFieldValid('instagramUsername', data.instagramUsername) ? 'Username is required' : 'Use {{instagram_username}} variable or enter username'}
            </p>
          </div>
        </>
      )}
      {resolvedStepType === 'instagram_like' && (
        <>
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-[#E4405F] mb-2 flex items-center">
              <span className="w-1 h-1 bg-[#E4405F] rounded-full mr-2" />
              Instagram Like Configuration
            </h4>
          </div>
          <div className="mb-4">
            <Label htmlFor="instagram-post-url">Post URL *</Label>
            <div className="flex items-start gap-2">
              <Input
                id="instagram-post-url"
                value={data.instagramPostUrl || ''}
                onChange={(e) => handleUpdate('instagramPostUrl', e.target.value)}
                placeholder="https://instagram.com/p/..."
                className={requiredFields.includes('instagramPostUrl') && !isFieldValid('instagramPostUrl', data.instagramPostUrl) ? 'border-red-500 mt-1' : 'mt-1'}
              />
              {renderRequiredIndicator('instagramPostUrl')}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {requiredFields.includes('instagramPostUrl') && !isFieldValid('instagramPostUrl', data.instagramPostUrl) ? 'Post URL is required' : 'Instagram post URL to like'}
            </p>
          </div>
        </>
      )}
      {resolvedStepType === 'instagram_dm' && (
        <>
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-[#E4405F] mb-2 flex items-center">
              <span className="w-1 h-1 bg-[#E4405F] rounded-full mr-2" />
              Instagram DM Configuration
            </h4>
          </div>
          <div className="mb-4">
            <Label htmlFor="instagram-dm-username">Instagram Username</Label>
            <div className="flex items-start gap-2">
              <Input
                id="instagram-dm-username"
                value={data.instagramUsername || ''}
                onChange={(e) => handleUpdate('instagramUsername', e.target.value)}
                placeholder="{{instagram_username}}"
                className={requiredFields.includes('instagramUsername') && !isFieldValid('instagramUsername', data.instagramUsername) ? 'border-red-500 mt-1' : 'mt-1'}
              />
              {renderRequiredIndicator('instagramUsername')}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {requiredFields.includes('instagramUsername') && !isFieldValid('instagramUsername', data.instagramUsername) ? 'Username is required' : 'Instagram username to send DM to'}
            </p>
          </div>
          <div className="mb-4">
            <Label htmlFor="instagram-dm-message">DM Message</Label>
            <div className="flex items-start gap-2">
              <Textarea
                id="instagram-dm-message"
                rows={4}
                value={data.instagramDmMessage || ''}
                onChange={(e) => handleUpdate('instagramDmMessage', e.target.value)}
                placeholder="Hi {{first_name}},..."
                className={requiredFields.includes('instagramDmMessage') && !isFieldValid('instagramDmMessage', data.instagramDmMessage) ? 'border-red-500' : ''}
              />
              {renderRequiredIndicator('instagramDmMessage')}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {requiredFields.includes('instagramDmMessage') && !isFieldValid('instagramDmMessage', data.instagramDmMessage)
                ? 'Message is required'
                : 'Use {{first_name}}, {{last_name}}, {{company_name}} for personalization'
              }
            </p>
          </div>
          <div className="mb-4 p-3 bg-white rounded-lg border border-slate-200">
            <span className="text-xs text-slate-600 font-semibold mb-2 block">
              Available Variables:
            </span>
            <div className="flex flex-row gap-2 flex-wrap">
              {['first_name', 'last_name', 'company_name', 'title', 'instagram_username'].map((varName) => (
                <span
                  key={varName}
                  className="text-xs bg-slate-100 px-2 py-1 rounded font-mono cursor-pointer hover:bg-slate-200"
                  onClick={() => {
                    const current = data.instagramDmMessage || '';
                    handleUpdate('instagramDmMessage', current + `{{${varName}}}`);
                  }}
                >
                  {`{{${varName}}}`}
                </span>
              ))}
            </div>
          </div>
        </>
      )}
      {resolvedStepType === 'instagram_autopost' && (
        <>
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-[#E4405F] mb-2 flex items-center">
              <span className="w-1 h-1 bg-[#E4405F] rounded-full mr-2" />
              Instagram Auto-Post Configuration
            </h4>
          </div>
          <div className="mb-4">
            <Label htmlFor="instagram-post-caption">Post Caption *</Label>
            <div className="flex items-start gap-2">
              <Textarea
                id="instagram-post-caption"
                rows={4}
                value={data.instagramPostCaption || ''}
                onChange={(e) => handleUpdate('instagramPostCaption', e.target.value)}
                placeholder="Share your moment..."
                className={requiredFields.includes('instagramPostCaption') && !isFieldValid('instagramPostCaption', data.instagramPostCaption) ? 'border-red-500' : ''}
              />
              {renderRequiredIndicator('instagramPostCaption')}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {requiredFields.includes('instagramPostCaption') && !isFieldValid('instagramPostCaption', data.instagramPostCaption) ? 'Post caption is required' : 'Caption for the Instagram post'}
            </p>
          </div>
          <div className="mb-4">
            <Label htmlFor="instagram-image-url">Image URL *</Label>
            <div className="flex items-start gap-2">
              <Input
                id="instagram-image-url"
                value={data.instagramPostImageUrl || ''}
                onChange={(e) => handleUpdate('instagramPostImageUrl', e.target.value)}
                placeholder="https://example.com/image.jpg"
                className={requiredFields.includes('instagramPostImageUrl') && !isFieldValid('instagramPostImageUrl', data.instagramPostImageUrl) ? 'border-red-500 mt-1' : 'mt-1'}
              />
              {renderRequiredIndicator('instagramPostImageUrl')}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {requiredFields.includes('instagramPostImageUrl') && !isFieldValid('instagramPostImageUrl', data.instagramPostImageUrl) ? 'Image URL is required' : 'URL of the image to post'}
            </p>
          </div>
          <div className="mb-4">
            <Label htmlFor="instagram-schedule">Schedule</Label>
            <Select value={data.instagramAutopostSchedule || 'daily'} onValueChange={(val) => handleUpdate('instagramAutopostSchedule', val)}>
              <SelectTrigger id="instagram-schedule" className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="custom">Custom Time</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {data.instagramAutopostSchedule === 'custom' && (
            <div className="mb-4">
              <Label htmlFor="instagram-post-time">Post Time</Label>
              <Input
                id="instagram-post-time"
                type="time"
                value={data.instagramAutopostTime || ''}
                onChange={(e) => handleUpdate('instagramAutopostTime', e.target.value)}
                className="mt-1"
              />
            </div>
          )}
        </>
      )}
      {resolvedStepType === 'instagram_comment_reply' && (
        <>
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-[#E4405F] mb-2 flex items-center">
              <span className="w-1 h-1 bg-[#E4405F] rounded-full mr-2" />
              Instagram Comment Reply Configuration
            </h4>
          </div>
          <div className="mb-4">
            <Label htmlFor="instagram-comment-reply">Reply Message *</Label>
            <div className="flex items-start gap-2">
              <Textarea
                id="instagram-comment-reply"
                rows={3}
                value={data.instagramCommentText || ''}
                onChange={(e) => handleUpdate('instagramCommentText', e.target.value)}
                placeholder="Thanks for your comment!"
                className={requiredFields.includes('instagramCommentText') && !isFieldValid('instagramCommentText', data.instagramCommentText) ? 'border-red-500' : ''}
              />
              {renderRequiredIndicator('instagramCommentText')}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {requiredFields.includes('instagramCommentText') && !isFieldValid('instagramCommentText', data.instagramCommentText) ? 'Reply message is required' : 'Message to reply to Instagram comments'}
            </p>
          </div>
        </>
      )}
      {resolvedStepType === 'instagram_story_view' && (
        <>
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-[#E4405F] mb-2 flex items-center">
              <span className="w-1 h-1 bg-[#E4405F] rounded-full mr-2" />
              Instagram Story View Configuration
            </h4>
          </div>
          <div className="mb-4">
            <Label htmlFor="instagram-story-username">Instagram Username *</Label>
            <div className="flex items-start gap-2">
              <Input
                id="instagram-story-username"
                value={data.instagramUsername || ''}
                onChange={(e) => handleUpdate('instagramUsername', e.target.value)}
                placeholder="{{instagram_username}}"
                className={requiredFields.includes('instagramUsername') && !isFieldValid('instagramUsername', data.instagramUsername) ? 'border-red-500 mt-1' : 'mt-1'}
              />
              {renderRequiredIndicator('instagramUsername')}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {requiredFields.includes('instagramUsername') && !isFieldValid('instagramUsername', data.instagramUsername) ? 'Username is required' : 'Use {{instagram_username}} variable or enter username'}
            </p>
          </div>
        </>
      )}
      {/* Lead Generation Step */}
      {resolvedStepType === 'lead_generation' && (
        <>
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-[#6366F1] mb-2 flex items-center">
              <span className="w-1 h-1 bg-[#6366F1] rounded-full mr-2" />
              Lead Generation Configuration
            </h4>
          </div>
          <div className="mb-4">
            <Label htmlFor="lead-query">Search Query</Label>
            <div className="flex items-start gap-2">
              <Textarea
                id="lead-query"
                rows={3}
                value={data.leadGenerationQuery || ''}
                onChange={(e) => handleUpdate('leadGenerationQuery', e.target.value)}
                placeholder="e.g., Software Engineers at Tech Companies in San Francisco"
                className={requiredFields.includes('leadGenerationQuery') && !isFieldValid('leadGenerationQuery', data.leadGenerationQuery) ? 'border-red-500' : ''}
              />
              {renderRequiredIndicator('leadGenerationQuery')}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {requiredFields.includes('leadGenerationQuery') && !isFieldValid('leadGenerationQuery', data.leadGenerationQuery)
                ? 'Search query is required'
                : 'Enter keywords, job titles, company names, or locations to search for leads'
              }
            </p>
          </div>
          <div className="mb-4">
            <Label htmlFor="lead-limit">Number of Leads</Label>
            <div className="flex items-start gap-2">
              <Input
                id="lead-limit"
                type="number"
                value={data.leadGenerationLimit || 50}
                onChange={(e) => handleUpdate('leadGenerationLimit', parseInt(e.target.value) || 50)}
                min={1}
                max={1000}
                className={requiredFields.includes('leadGenerationLimit') && !isFieldValid('leadGenerationLimit', data.leadGenerationLimit) ? 'border-red-500 mt-1' : 'mt-1'}
              />
              {renderRequiredIndicator('leadGenerationLimit')}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {requiredFields.includes('leadGenerationLimit') && !isFieldValid('leadGenerationLimit', data.leadGenerationLimit)
                ? 'Number of leads is required'
                : 'Maximum number of leads to generate (1-1000)'
              }
            </p>
          </div>
          <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <span className="text-[11px] text-blue-900">
              <strong>Note:</strong> This step will generate leads from the data source. The leads will be added to your campaign automatically.
            </span>
          </div>
        </>
      )}
      {/* Other LinkedIn Steps */}
      {(resolvedStepType === 'linkedin_visit' || resolvedStepType === 'linkedin_follow') && (
        <p className="text-sm text-slate-600">
          This step will be executed automatically. No configuration needed.
        </p>
      )}
    </div>
    </TooltipProvider>
  );
}
