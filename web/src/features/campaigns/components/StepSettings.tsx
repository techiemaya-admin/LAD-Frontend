'use client';
import React from 'react';
import { 
  Box, 
  Typography, 
  TextField, 
  Stack, 
  Divider, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  Switch, 
  FormControlLabel, 
  ListSubheader,
  Chip,
  Alert,
  Tooltip,
  IconButton
} from '@mui/material';
import { InfoOutlined, CheckCircle, ErrorOutline } from '@mui/icons-material';
import { useCampaignStore } from '../store/campaignStore';
import { useOnboardingStore } from '@/store/onboardingStore';
import { StepType } from '@/types/campaign';
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
export default function StepSettings() {
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
      <Box
        sx={{
          width: '100%',
          bgcolor: '#F8FAFC',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 3,
        }}
      >
        <Typography variant="body2" sx={{ color: '#64748B', textAlign: 'center' }}>
          {selectedNodeId ? 'This step cannot be edited' : 'Select a step to configure'}
        </Typography>
      </Box>
    );
  }
  const stepType = selectedNode.type as StepType;
  // Handle both data structure (campaign store) and direct properties (onboarding store)
  // For onboarding store, data might be nested in node.data or be direct properties
  const nodeData = selectedNode.data || {};
  const data = {
    ...selectedNode, // Direct properties (onboarding store format)
    ...nodeData,     // Nested data (campaign store format)
    // Ensure we have the latest values by prioritizing nested data over direct
  };
  const requiredFields = getRequiredFields(stepType);
  // Special validation for delay step
  const isValid = stepType === 'delay' 
    ? isDelayValid(data)
    : requiredFields.every(field => isFieldValid(field, data[field as keyof typeof data]));
  const handleUpdate = (field: string, value: any) => {
    if (useOnboarding) {
      // Update onboarding store workflowNodes
      const updatedNodes = onboardingNodes.map((node: any) => {
        if (node.id === selectedNodeId) {
          return {
            ...node,
            data: {
              ...(node.data || node),
              [field]: value,
            },
            // Also update direct properties for backward compatibility
            [field]: value,
          };
        }
        return node;
      });
      onboardingStore.setState({ workflowNodes: updatedNodes });
    } else {
      // Update campaign store
      campaignStore.updateStep(selectedNodeId!, { [field]: value });
    }
  };
  const renderRequiredIndicator = (field: string) => {
    if (!requiredFields.includes(field)) return null;
    const isValidField = isFieldValid(field, data[field as keyof typeof data]);
    return (
      <Chip
        icon={isValidField ? <CheckCircle sx={{ fontSize: 14 }} /> : <ErrorOutline sx={{ fontSize: 14 }} />}
        label={isValidField ? 'Valid' : 'Required'}
        size="small"
        color={isValidField ? 'success' : 'error'}
        sx={{ ml: 1, height: 20, fontSize: '10px' }}
      />
    );
  };
  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        bgcolor: '#F8FAFC',
        borderLeft: '1px solid #E2E8F0',
        overflowY: 'auto',
        p: 2,
      }}
    >
      <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: '#1E293B' }}>
        Step Settings
      </Typography>
      <Divider sx={{ mb: 2 }} />
      {/* Validation Status */}
      {!isValid && (
        <Alert severity="warning" sx={{ mb: 2, fontSize: '12px' }}>
          Please fill in all required fields marked with <ErrorOutline sx={{ fontSize: 14, verticalAlign: 'middle' }} />
        </Alert>
      )}
      {/* Title */}
      <TextField
        fullWidth
        label="Step Title"
        value={data.title || ''}
        onChange={(e) => handleUpdate('title', e.target.value)}
        required
        helperText="A descriptive name for this step"
        sx={{ mb: 2 }}
        size="small"
      />
      <Divider sx={{ my: 2 }} />
      {/* LinkedIn Steps */}
      {(stepType === 'linkedin_connect' || stepType === 'linkedin_message') && (
        <>
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#0077B5', mb: 1, display: 'flex', alignItems: 'center' }}>
              <Box component="span" sx={{ width: 4, height: 4, bgcolor: '#0077B5', borderRadius: '50%', mr: 1 }} />
              LinkedIn Configuration
            </Typography>
          </Box>
          <TextField
            fullWidth
            multiline
            rows={4}
            label={stepType === 'linkedin_connect' ? 'Message (Optional)' : 'Message'}
            value={data.message || ''}
            onChange={(e) => handleUpdate('message', e.target.value)}
            placeholder={
              stepType === 'linkedin_connect' 
                ? 'Hi {{first_name}}, I\'d like to connect with you... (Optional - LinkedIn limits connection messages to 4-5/month)'
                : 'Hi {{first_name}}, I noticed...'
            }
            required={stepType === 'linkedin_message'}
            error={requiredFields.includes('message') && !isFieldValid('message', data.message)}
            helperText={
              requiredFields.includes('message') && !isFieldValid('message', data.message)
                ? 'Message is required'
                : stepType === 'linkedin_connect'
                ? 'Use {{first_name}}, {{last_name}}, {{company_name}}, {{title}} for personalization. Note: LinkedIn limits connection messages to 4-5 per month for normal accounts.'
                : 'Use {{first_name}}, {{last_name}}, {{company_name}}, {{title}} for personalization'
            }
            sx={{ mb: 2 }}
            size="small"
            InputProps={{
              endAdornment: stepType === 'linkedin_message' ? renderRequiredIndicator('message') : null,
            }}
          />
          <Box sx={{ mb: 2, p: 1.5, bgcolor: '#FFFFFF', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
            <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600, mb: 1, display: 'block' }}>
              Available Variables:
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              {['first_name', 'last_name', 'company_name', 'title', 'email'].map((varName) => (
                <Typography
                  key={varName}
                  variant="caption"
                  sx={{
                    bgcolor: '#F1F5F9',
                    px: 1,
                    py: 0.5,
                    borderRadius: '4px',
                    fontFamily: 'monospace',
                    cursor: 'pointer',
                    '&:hover': { bgcolor: '#E2E8F0' },
                  }}
                  onClick={() => {
                    const current = data.message || '';
                    handleUpdate('message', current + `{{${varName}}}`);
                  }}
                >
                  {`{{${varName}}}`}
                </Typography>
              ))}
            </Stack>
          </Box>
        </>
      )}
      {/* Email Steps */}
      {(stepType === 'email_send' || stepType === 'email_followup') && (
        <>
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#F59E0B', mb: 1, display: 'flex', alignItems: 'center' }}>
              <Box component="span" sx={{ width: 4, height: 4, bgcolor: '#F59E0B', borderRadius: '50%', mr: 1 }} />
              Email Configuration
            </Typography>
          </Box>
          <TextField
            fullWidth
            label="Subject"
            value={data.subject || ''}
            onChange={(e) => handleUpdate('subject', e.target.value)}
            placeholder="Re: {{company_name}} Partnership"
            required
            error={requiredFields.includes('subject') && !isFieldValid('subject', data.subject)}
            helperText={requiredFields.includes('subject') && !isFieldValid('subject', data.subject) ? 'Subject is required' : 'Email subject line'}
            sx={{ mb: 2 }}
            size="small"
            InputProps={{
              endAdornment: renderRequiredIndicator('subject'),
            }}
          />
          <TextField
            fullWidth
            multiline
            rows={6}
            label="Email Body"
            value={data.body || ''}
            onChange={(e) => handleUpdate('body', e.target.value)}
            placeholder="Hi {{first_name}}, ..."
            required
            error={requiredFields.includes('body') && !isFieldValid('body', data.body)}
            helperText={
              requiredFields.includes('body') && !isFieldValid('body', data.body)
                ? 'Email body is required'
                : 'Use {{first_name}}, {{last_name}}, {{company_name}}, {{title}} for personalization'
            }
            sx={{ mb: 2 }}
            size="small"
            InputProps={{
              endAdornment: renderRequiredIndicator('body'),
            }}
          />
          <FormControlLabel
            control={
              <Switch
                checked={data.trackingEnabled || false}
                onChange={(e) => handleUpdate('trackingEnabled', e.target.checked)}
              />
            }
            label="Enable open/click tracking"
            sx={{ mb: 2 }}
          />
          <Box sx={{ mb: 2, p: 1.5, bgcolor: '#FFFFFF', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
            <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600, mb: 1, display: 'block' }}>
              Available Variables:
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              {['first_name', 'last_name', 'company_name', 'title', 'email'].map((varName) => (
                <Typography
                  key={varName}
                  variant="caption"
                  sx={{
                    bgcolor: '#F1F5F9',
                    px: 1,
                    py: 0.5,
                    borderRadius: '4px',
                    fontFamily: 'monospace',
                    cursor: 'pointer',
                    '&:hover': { bgcolor: '#E2E8F0' },
                  }}
                  onClick={() => {
                    const current = data.body || '';
                    handleUpdate('body', current + `{{${varName}}}`);
                  }}
                >
                  {`{{${varName}}}`}
                </Typography>
              ))}
            </Stack>
          </Box>
        </>
      )}
      {/* Delay Step */}
      {stepType === 'delay' && (
        <>
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#10B981', mb: 1, display: 'flex', alignItems: 'center' }}>
              <Box component="span" sx={{ width: 4, height: 4, bgcolor: '#10B981', borderRadius: '50%', mr: 1 }} />
              Delay Configuration
              <Tooltip title="Set how long to wait before executing the next step. At least one time unit (days, hours, or minutes) must be greater than 0.">
                <IconButton size="small" sx={{ ml: 1, p: 0.5 }}>
                  <InfoOutlined sx={{ fontSize: 16, color: '#64748B' }} />
                </IconButton>
              </Tooltip>
            </Typography>
          </Box>
          {!isDelayValid(data) && (
            <Alert severity="error" sx={{ mb: 2, fontSize: '12px' }}>
              At least one time unit (Days, Hours, or Minutes) must be greater than 0
            </Alert>
          )}
          <Stack spacing={2}>
            <TextField
              type="number"
              label="Days *"
              value={data.delayDays || 0}
              onChange={(e) => handleUpdate('delayDays', parseInt(e.target.value) || 0)}
              inputProps={{ min: 0, max: 365 }}
              required
              error={!isDelayValid(data) && (parseInt(data.delayDays) || 0) === 0}
              helperText="Number of days to wait (0-365). At least one time unit must be > 0."
              sx={{ mb: 1 }}
              size="small"
            />
            <TextField
              type="number"
              label="Hours *"
              value={data.delayHours || 0}
              onChange={(e) => handleUpdate('delayHours', parseInt(e.target.value) || 0)}
              inputProps={{ min: 0, max: 23 }}
              required
              error={!isDelayValid(data) && (parseInt(data.delayHours) || 0) === 0}
              helperText="Additional hours to wait (0-23). At least one time unit must be > 0."
              sx={{ mb: 1 }}
              size="small"
            />
            <TextField
              type="number"
              label="Minutes (Optional)"
              value={data.delayMinutes || 0}
              onChange={(e) => handleUpdate('delayMinutes', parseInt(e.target.value) || 0)}
              inputProps={{ min: 0, max: 59 }}
              helperText="Additional minutes to wait (0-59). Optional but can be combined with days/hours."
              sx={{ mb: 1 }}
              size="small"
            />
          </Stack>
          <Box sx={{ mt: 2, p: 1.5, bgcolor: isDelayValid(data) ? '#F0FDF4' : '#FEF2F2', borderRadius: '8px', border: `1px solid ${isDelayValid(data) ? '#BBF7D0' : '#FECACA'}` }}>
            <Typography variant="caption" sx={{ color: isDelayValid(data) ? '#166534' : '#991B1B', fontSize: '11px' }}>
              <strong>Total Delay:</strong> {data.delayDays || 0} day(s), {data.delayHours || 0} hour(s), {data.delayMinutes || 0} minute(s)
              {!isDelayValid(data) && (
                <Box component="span" sx={{ display: 'block', mt: 0.5, fontWeight: 600 }}>
                  ⚠️ Invalid: At least one time unit must be greater than 0
                </Box>
              )}
            </Typography>
          </Box>
        </>
      )}
      {/* Condition Step */}
      {stepType === 'condition' && (
        <>
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#10B981', mb: 1, display: 'flex', alignItems: 'center' }}>
              <Box component="span" sx={{ width: 4, height: 4, bgcolor: '#10B981', borderRadius: '50%', mr: 1 }} />
              Condition Configuration
              <Tooltip title="Define a condition to check before proceeding. The workflow will check if the previous step met this condition. If true, continue to next step; if false, the workflow may skip or take alternative path.">
                <IconButton size="small" sx={{ ml: 1, p: 0.5 }}>
                  <InfoOutlined sx={{ fontSize: 16, color: '#64748B' }} />
                </IconButton>
              </Tooltip>
            </Typography>
          </Box>
          {!isFieldValid('conditionType', data.conditionType) && (
            <Alert severity="error" sx={{ mb: 2, fontSize: '12px' }}>
              Condition Type is required. Please select a condition to check.
            </Alert>
          )}
          <FormControl fullWidth sx={{ mb: 2 }} required error={requiredFields.includes('conditionType') && !isFieldValid('conditionType', data.conditionType)}>
            <InputLabel>Condition Type *</InputLabel>
            <Select
              value={data.conditionType || ''}
              onChange={(e) => handleUpdate('conditionType', e.target.value)}
              label="Condition Type *"
              size="small"
              error={requiredFields.includes('conditionType') && !isFieldValid('conditionType', data.conditionType)}
            >
              <ListSubheader sx={{ bgcolor: '#F8FAFC', fontWeight: 600, color: '#0077B5' }}>📱 LINKEDIN</ListSubheader>
              <MenuItem value="connected">✅ If Connected on LinkedIn</MenuItem>
              <MenuItem value="linkedin_replied">💬 If Replied to LinkedIn Message</MenuItem>
              <MenuItem value="linkedin_followed">👥 If Followed Back on LinkedIn</MenuItem>
              <ListSubheader sx={{ bgcolor: '#F8FAFC', fontWeight: 600, color: '#F59E0B', mt: 1 }}>📧 EMAIL</ListSubheader>
              <MenuItem value="replied">✉️ If Replied to Email</MenuItem>
              <MenuItem value="opened">👁️ If Opened Email</MenuItem>
              <MenuItem value="clicked">🔗 If Clicked Email Link</MenuItem>
              <ListSubheader sx={{ bgcolor: '#F8FAFC', fontWeight: 600, color: '#25D366', mt: 1 }}>💬 WHATSAPP</ListSubheader>
              <MenuItem value="whatsapp_delivered">✓ If WhatsApp Message Delivered</MenuItem>
              <MenuItem value="whatsapp_read">✓✓ If WhatsApp Message Read</MenuItem>
              <MenuItem value="whatsapp_replied">💬 If Replied to WhatsApp</MenuItem>
              <ListSubheader sx={{ bgcolor: '#F8FAFC', fontWeight: 600, color: '#8B5CF6', mt: 1 }}>📞 VOICE AGENT</ListSubheader>
              <MenuItem value="voice_answered">📞 If Call Answered</MenuItem>
              <MenuItem value="voice_not_answered">❌ If Call Not Answered</MenuItem>
              <MenuItem value="voice_completed">✅ If Call Completed</MenuItem>
              <MenuItem value="voice_busy">📵 If Line Busy</MenuItem>
              <MenuItem value="voice_failed">⚠️ If Call Failed</MenuItem>
              <ListSubheader sx={{ bgcolor: '#F8FAFC', fontWeight: 600, color: '#E4405F', mt: 1 }}>📷 INSTAGRAM</ListSubheader>
              <MenuItem value="instagram_followed">👥 If Followed Back</MenuItem>
              <MenuItem value="instagram_liked">❤️ If Liked Post</MenuItem>
              <MenuItem value="instagram_replied">💬 If Replied to DM</MenuItem>
              <MenuItem value="instagram_commented">💭 If Commented on Post</MenuItem>
              <MenuItem value="instagram_story_viewed">👁️ If Viewed Story</MenuItem>
            </Select>
          </FormControl>
          <Box sx={{ p: 1.5, bgcolor: '#F0F9FF', borderRadius: '8px', border: '1px solid #BAE6FD', mt: 2 }}>
            <Typography variant="caption" sx={{ color: '#0369A1', fontSize: '11px', display: 'block', mb: 1, fontWeight: 600 }}>
              📋 How Conditions Work:
            </Typography>
            <Typography variant="caption" sx={{ color: '#0369A1', fontSize: '11px', display: 'block', mb: 0.5 }}>
              1. The system checks the status of the <strong>previous step</strong> in the workflow
            </Typography>
            <Typography variant="caption" sx={{ color: '#0369A1', fontSize: '11px', display: 'block', mb: 0.5 }}>
              2. If the condition is <strong>met</strong> (e.g., "If Connected on LinkedIn" = true), the workflow continues to the next step
            </Typography>
            <Typography variant="caption" sx={{ color: '#0369A1', fontSize: '11px', display: 'block' }}>
              3. If the condition is <strong>not met</strong>, the workflow may skip steps or take an alternative path
            </Typography>
          </Box>
          <Box sx={{ p: 1.5, bgcolor: '#FFFBEB', borderRadius: '8px', border: '1px solid #FDE68A', mt: 1 }}>
            <Typography variant="caption" sx={{ color: '#92400E', fontSize: '11px' }}>
              <strong>⚠️ Important:</strong> Make sure the previous step in your workflow can produce the result you're checking for. For example, if checking "If Connected on LinkedIn", ensure there's a LinkedIn connection step before this condition.
            </Typography>
          </Box>
        </>
      )}
      {/* WhatsApp Steps */}
      {stepType === 'whatsapp_send' && (
        <>
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#25D366', mb: 1, display: 'flex', alignItems: 'center' }}>
              <Box component="span" sx={{ width: 4, height: 4, bgcolor: '#25D366', borderRadius: '50%', mr: 1 }} />
              WhatsApp Configuration
            </Typography>
          </Box>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>WhatsApp Template</InputLabel>
            <Select
              value={data.whatsappTemplate || ''}
              onChange={(e) => handleUpdate('whatsappTemplate', e.target.value)}
              label="WhatsApp Template"
              size="small"
            >
              <MenuItem value="">None (Free Text)</MenuItem>
              <MenuItem value="greeting">Greeting Template</MenuItem>
              <MenuItem value="followup">Follow-up Template</MenuItem>
              <MenuItem value="reminder">Reminder Template</MenuItem>
              <MenuItem value="custom">Custom Template</MenuItem>
            </Select>
          </FormControl>
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Message"
            value={data.whatsappMessage || ''}
            onChange={(e) => handleUpdate('whatsappMessage', e.target.value)}
            placeholder="Hi {{first_name}}, ..."
            required
            error={requiredFields.includes('whatsappMessage') && !isFieldValid('whatsappMessage', data.whatsappMessage)}
            helperText={
              requiredFields.includes('whatsappMessage') && !isFieldValid('whatsappMessage', data.whatsappMessage)
                ? 'Message is required'
                : 'Use {{first_name}}, {{last_name}}, {{company_name}}, {{title}}, {{phone}} for personalization'
            }
            sx={{ mb: 2 }}
            size="small"
            InputProps={{
              endAdornment: renderRequiredIndicator('whatsappMessage'),
            }}
          />
          <Box sx={{ mb: 2, p: 1.5, bgcolor: '#FFFFFF', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
            <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600, mb: 1, display: 'block' }}>
              Available Variables:
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              {['first_name', 'last_name', 'company_name', 'title', 'email', 'phone'].map((varName) => (
                <Typography
                  key={varName}
                  variant="caption"
                  sx={{
                    bgcolor: '#F1F5F9',
                    px: 1,
                    py: 0.5,
                    borderRadius: '4px',
                    fontFamily: 'monospace',
                    cursor: 'pointer',
                    '&:hover': { bgcolor: '#E2E8F0' },
                  }}
                  onClick={() => {
                    const current = data.whatsappMessage || '';
                    handleUpdate('whatsappMessage', current + `{{${varName}}}`);
                  }}
                >
                  {`{{${varName}}}`}
                </Typography>
              ))}
            </Stack>
          </Box>
        </>
      )}
      {/* Voice Agent Steps */}
      {stepType === 'voice_agent_call' && (
        <>
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#8B5CF6', mb: 1, display: 'flex', alignItems: 'center' }}>
              <Box component="span" sx={{ width: 4, height: 4, bgcolor: '#8B5CF6', borderRadius: '50%', mr: 1 }} />
              Voice Agent Configuration
            </Typography>
          </Box>
          <FormControl fullWidth sx={{ mb: 2 }} required error={requiredFields.includes('voiceAgentId') && !isFieldValid('voiceAgentId', data.voiceAgentId)}>
            <InputLabel>Voice Agent *</InputLabel>
            <Select
              value={data.voiceAgentId || ''}
              onChange={(e) => {
                const agentId = e.target.value;
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
              label="Voice Agent *"
              size="small"
            >
              <MenuItem value="24">VAPI Agent</MenuItem>
              <MenuItem value="1">Agent 1</MenuItem>
              <MenuItem value="2">Agent 2</MenuItem>
              <MenuItem value="3">Agent 3</MenuItem>
            </Select>
          </FormControl>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Voice Template</InputLabel>
            <Select
              value={data.voiceTemplate || ''}
              onChange={(e) => handleUpdate('voiceTemplate', e.target.value)}
              label="Voice Template"
              size="small"
            >
              <MenuItem value="">Default Template</MenuItem>
              <MenuItem value="greeting">Greeting Template</MenuItem>
              <MenuItem value="sales">Sales Template</MenuItem>
              <MenuItem value="followup">Follow-up Template</MenuItem>
              <MenuItem value="custom">Custom Template</MenuItem>
            </Select>
          </FormControl>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Additional Context"
            value={data.voiceContext || ''}
            onChange={(e) => handleUpdate('voiceContext', e.target.value)}
            placeholder="Additional context for the voice agent..."
            helperText="Provide context about the lead or conversation"
            sx={{ mb: 2 }}
            size="small"
          />
        </>
      )}
      {/* Additional LinkedIn Steps */}
      {stepType === 'linkedin_scrape_profile' && (
        <>
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#0077B5', mb: 1, display: 'flex', alignItems: 'center' }}>
              <Box component="span" sx={{ width: 4, height: 4, bgcolor: '#0077B5', borderRadius: '50%', mr: 1 }} />
              LinkedIn Profile Scraping Configuration
            </Typography>
          </Box>
          <TextField
            fullWidth
            label="LinkedIn Profile URL (Optional)"
            value={data.linkedinCompanyUrl || ''}
            onChange={(e) => handleUpdate('linkedinCompanyUrl', e.target.value)}
            placeholder="https://linkedin.com/in/username"
            helperText="Leave empty to scrape from lead's LinkedIn profile"
            sx={{ mb: 2 }}
            size="small"
          />
          <FormControl fullWidth sx={{ mb: 2 }} required error={requiredFields.includes('linkedinScrapeFields') && !isFieldValid('linkedinScrapeFields', data.linkedinScrapeFields)}>
            <InputLabel>Fields to Scrape *</InputLabel>
            <Select
              multiple
              value={data.linkedinScrapeFields || []}
              onChange={(e) => handleUpdate('linkedinScrapeFields', e.target.value)}
              label="Fields to Scrape *"
              size="small"
              error={requiredFields.includes('linkedinScrapeFields') && !isFieldValid('linkedinScrapeFields', data.linkedinScrapeFields)}
            >
              <MenuItem value="name">Name</MenuItem>
              <MenuItem value="title">Title</MenuItem>
              <MenuItem value="company">Company</MenuItem>
              <MenuItem value="location">Location</MenuItem>
              <MenuItem value="experience">Experience</MenuItem>
              <MenuItem value="education">Education</MenuItem>
              <MenuItem value="skills">Skills</MenuItem>
              <MenuItem value="connections">Connections</MenuItem>
            </Select>
          </FormControl>
        </>
      )}
      {stepType === 'linkedin_company_search' && (
        <>
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#0077B5', mb: 1, display: 'flex', alignItems: 'center' }}>
              <Box component="span" sx={{ width: 4, height: 4, bgcolor: '#0077B5', borderRadius: '50%', mr: 1 }} />
              LinkedIn Company Search Configuration
            </Typography>
          </Box>
          <TextField
            fullWidth
            label="Company Name *"
            value={data.linkedinCompanyName || ''}
            onChange={(e) => handleUpdate('linkedinCompanyName', e.target.value)}
            placeholder="{{company_name}}"
            required
            error={requiredFields.includes('linkedinCompanyName') && !isFieldValid('linkedinCompanyName', data.linkedinCompanyName)}
            helperText={requiredFields.includes('linkedinCompanyName') && !isFieldValid('linkedinCompanyName', data.linkedinCompanyName) ? 'Company name is required' : 'Use {{company_name}} variable or enter company name'}
            sx={{ mb: 2 }}
            size="small"
            InputProps={{
              endAdornment: renderRequiredIndicator('linkedinCompanyName'),
            }}
          />
        </>
      )}
      {stepType === 'linkedin_employee_list' && (
        <>
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#0077B5', mb: 1, display: 'flex', alignItems: 'center' }}>
              <Box component="span" sx={{ width: 4, height: 4, bgcolor: '#0077B5', borderRadius: '50%', mr: 1 }} />
              LinkedIn Employee List Configuration
            </Typography>
          </Box>
          <TextField
            fullWidth
            label="Company LinkedIn URL *"
            value={data.linkedinCompanyUrl || ''}
            onChange={(e) => handleUpdate('linkedinCompanyUrl', e.target.value)}
            placeholder="https://linkedin.com/company/company-name"
            required
            error={requiredFields.includes('linkedinCompanyUrl') && !isFieldValid('linkedinCompanyUrl', data.linkedinCompanyUrl)}
            helperText={requiredFields.includes('linkedinCompanyUrl') && !isFieldValid('linkedinCompanyUrl', data.linkedinCompanyUrl) ? 'Company LinkedIn URL is required' : 'Full LinkedIn company page URL'}
            sx={{ mb: 2 }}
            size="small"
            InputProps={{
              endAdornment: renderRequiredIndicator('linkedinCompanyUrl'),
            }}
          />
        </>
      )}
      {stepType === 'linkedin_autopost' && (
        <>
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#0077B5', mb: 1, display: 'flex', alignItems: 'center' }}>
              <Box component="span" sx={{ width: 4, height: 4, bgcolor: '#0077B5', borderRadius: '50%', mr: 1 }} />
              LinkedIn Auto-Post Configuration
            </Typography>
          </Box>
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Post Content *"
            value={data.linkedinPostContent || ''}
            onChange={(e) => handleUpdate('linkedinPostContent', e.target.value)}
            placeholder="Share your thoughts..."
            required
            error={requiredFields.includes('linkedinPostContent') && !isFieldValid('linkedinPostContent', data.linkedinPostContent)}
            helperText={requiredFields.includes('linkedinPostContent') && !isFieldValid('linkedinPostContent', data.linkedinPostContent) ? 'Post content is required' : 'Content to post on LinkedIn'}
            sx={{ mb: 2 }}
            size="small"
            InputProps={{
              endAdornment: renderRequiredIndicator('linkedinPostContent'),
            }}
          />
          <TextField
            fullWidth
            label="Image URL (optional)"
            value={data.linkedinPostImageUrl || ''}
            onChange={(e) => handleUpdate('linkedinPostImageUrl', e.target.value)}
            placeholder="https://example.com/image.jpg"
            sx={{ mb: 2 }}
            size="small"
          />
        </>
      )}
      {stepType === 'linkedin_comment_reply' && (
        <>
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#0077B5', mb: 1, display: 'flex', alignItems: 'center' }}>
              <Box component="span" sx={{ width: 4, height: 4, bgcolor: '#0077B5', borderRadius: '50%', mr: 1 }} />
              LinkedIn Comment Reply Configuration
            </Typography>
          </Box>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Reply Message *"
            value={data.linkedinCommentText || ''}
            onChange={(e) => handleUpdate('linkedinCommentText', e.target.value)}
            placeholder="Thanks for your comment!"
            required
            error={requiredFields.includes('linkedinCommentText') && !isFieldValid('linkedinCommentText', data.linkedinCommentText)}
            helperText={requiredFields.includes('linkedinCommentText') && !isFieldValid('linkedinCommentText', data.linkedinCommentText) ? 'Reply message is required' : 'Message to reply to comments'}
            sx={{ mb: 2 }}
            size="small"
            InputProps={{
              endAdornment: renderRequiredIndicator('linkedinCommentText'),
            }}
          />
        </>
      )}
      {/* Instagram Steps */}
      {stepType === 'instagram_follow' && (
        <>
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#E4405F', mb: 1, display: 'flex', alignItems: 'center' }}>
              <Box component="span" sx={{ width: 4, height: 4, bgcolor: '#E4405F', borderRadius: '50%', mr: 1 }} />
              Instagram Configuration
            </Typography>
          </Box>
          <TextField
            fullWidth
            label="Instagram Username"
            value={data.instagramUsername || ''}
            onChange={(e) => handleUpdate('instagramUsername', e.target.value)}
            placeholder="{{instagram_username}}"
            required
            error={requiredFields.includes('instagramUsername') && !isFieldValid('instagramUsername', data.instagramUsername)}
            helperText={requiredFields.includes('instagramUsername') && !isFieldValid('instagramUsername', data.instagramUsername) ? 'Username is required' : 'Use {{instagram_username}} variable or enter username'}
            sx={{ mb: 2 }}
            size="small"
            InputProps={{
              endAdornment: renderRequiredIndicator('instagramUsername'),
            }}
          />
        </>
      )}
      {stepType === 'instagram_like' && (
        <>
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#E4405F', mb: 1, display: 'flex', alignItems: 'center' }}>
              <Box component="span" sx={{ width: 4, height: 4, bgcolor: '#E4405F', borderRadius: '50%', mr: 1 }} />
              Instagram Like Configuration
            </Typography>
          </Box>
          <TextField
            fullWidth
            label="Post URL *"
            value={data.instagramPostUrl || ''}
            onChange={(e) => handleUpdate('instagramPostUrl', e.target.value)}
            placeholder="https://instagram.com/p/..."
            required
            error={requiredFields.includes('instagramPostUrl') && !isFieldValid('instagramPostUrl', data.instagramPostUrl)}
            helperText={requiredFields.includes('instagramPostUrl') && !isFieldValid('instagramPostUrl', data.instagramPostUrl) ? 'Post URL is required' : 'Instagram post URL to like'}
            sx={{ mb: 2 }}
            size="small"
            InputProps={{
              endAdornment: renderRequiredIndicator('instagramPostUrl'),
            }}
          />
        </>
      )}
      {stepType === 'instagram_dm' && (
        <>
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#E4405F', mb: 1, display: 'flex', alignItems: 'center' }}>
              <Box component="span" sx={{ width: 4, height: 4, bgcolor: '#E4405F', borderRadius: '50%', mr: 1 }} />
              Instagram DM Configuration
            </Typography>
          </Box>
          <TextField
            fullWidth
            label="Instagram Username"
            value={data.instagramUsername || ''}
            onChange={(e) => handleUpdate('instagramUsername', e.target.value)}
            placeholder="{{instagram_username}}"
            required
            error={requiredFields.includes('instagramUsername') && !isFieldValid('instagramUsername', data.instagramUsername)}
            helperText={requiredFields.includes('instagramUsername') && !isFieldValid('instagramUsername', data.instagramUsername) ? 'Username is required' : 'Instagram username to send DM to'}
            sx={{ mb: 2 }}
            size="small"
            InputProps={{
              endAdornment: renderRequiredIndicator('instagramUsername'),
            }}
          />
          <TextField
            fullWidth
            multiline
            rows={4}
            label="DM Message"
            value={data.instagramDmMessage || ''}
            onChange={(e) => handleUpdate('instagramDmMessage', e.target.value)}
            placeholder="Hi {{first_name}},..."
            required
            error={requiredFields.includes('instagramDmMessage') && !isFieldValid('instagramDmMessage', data.instagramDmMessage)}
            helperText={
              requiredFields.includes('instagramDmMessage') && !isFieldValid('instagramDmMessage', data.instagramDmMessage)
                ? 'Message is required'
                : 'Use {{first_name}}, {{last_name}}, {{company_name}} for personalization'
            }
            sx={{ mb: 2 }}
            size="small"
            InputProps={{
              endAdornment: renderRequiredIndicator('instagramDmMessage'),
            }}
          />
          <Box sx={{ mb: 2, p: 1.5, bgcolor: '#FFFFFF', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
            <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600, mb: 1, display: 'block' }}>
              Available Variables:
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              {['first_name', 'last_name', 'company_name', 'title', 'instagram_username'].map((varName) => (
                <Typography
                  key={varName}
                  variant="caption"
                  sx={{
                    bgcolor: '#F1F5F9',
                    px: 1,
                    py: 0.5,
                    borderRadius: '4px',
                    fontFamily: 'monospace',
                    cursor: 'pointer',
                    '&:hover': { bgcolor: '#E2E8F0' },
                  }}
                  onClick={() => {
                    const current = data.instagramDmMessage || '';
                    handleUpdate('instagramDmMessage', current + `{{${varName}}}`);
                  }}
                >
                  {`{{${varName}}}`}
                </Typography>
              ))}
            </Stack>
          </Box>
        </>
      )}
      {stepType === 'instagram_autopost' && (
        <>
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#E4405F', mb: 1, display: 'flex', alignItems: 'center' }}>
              <Box component="span" sx={{ width: 4, height: 4, bgcolor: '#E4405F', borderRadius: '50%', mr: 1 }} />
              Instagram Auto-Post Configuration
            </Typography>
          </Box>
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Post Caption *"
            value={data.instagramPostCaption || ''}
            onChange={(e) => handleUpdate('instagramPostCaption', e.target.value)}
            placeholder="Share your moment..."
            required
            error={requiredFields.includes('instagramPostCaption') && !isFieldValid('instagramPostCaption', data.instagramPostCaption)}
            helperText={requiredFields.includes('instagramPostCaption') && !isFieldValid('instagramPostCaption', data.instagramPostCaption) ? 'Post caption is required' : 'Caption for the Instagram post'}
            sx={{ mb: 2 }}
            size="small"
            InputProps={{
              endAdornment: renderRequiredIndicator('instagramPostCaption'),
            }}
          />
          <TextField
            fullWidth
            label="Image URL *"
            value={data.instagramPostImageUrl || ''}
            onChange={(e) => handleUpdate('instagramPostImageUrl', e.target.value)}
            placeholder="https://example.com/image.jpg"
            required
            error={requiredFields.includes('instagramPostImageUrl') && !isFieldValid('instagramPostImageUrl', data.instagramPostImageUrl)}
            helperText={requiredFields.includes('instagramPostImageUrl') && !isFieldValid('instagramPostImageUrl', data.instagramPostImageUrl) ? 'Image URL is required' : 'URL of the image to post'}
            sx={{ mb: 2 }}
            size="small"
            InputProps={{
              endAdornment: renderRequiredIndicator('instagramPostImageUrl'),
            }}
          />
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Schedule</InputLabel>
            <Select
              value={data.instagramAutopostSchedule || 'daily'}
              onChange={(e) => handleUpdate('instagramAutopostSchedule', e.target.value)}
              label="Schedule"
              size="small"
            >
              <MenuItem value="daily">Daily</MenuItem>
              <MenuItem value="weekly">Weekly</MenuItem>
              <MenuItem value="custom">Custom Time</MenuItem>
            </Select>
          </FormControl>
          {data.instagramAutopostSchedule === 'custom' && (
            <TextField
              fullWidth
              type="time"
              label="Post Time"
              value={data.instagramAutopostTime || ''}
              onChange={(e) => handleUpdate('instagramAutopostTime', e.target.value)}
              sx={{ mb: 2 }}
              size="small"
            />
          )}
        </>
      )}
      {stepType === 'instagram_comment_reply' && (
        <>
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#E4405F', mb: 1, display: 'flex', alignItems: 'center' }}>
              <Box component="span" sx={{ width: 4, height: 4, bgcolor: '#E4405F', borderRadius: '50%', mr: 1 }} />
              Instagram Comment Reply Configuration
            </Typography>
          </Box>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Reply Message *"
            value={data.instagramCommentText || ''}
            onChange={(e) => handleUpdate('instagramCommentText', e.target.value)}
            placeholder="Thanks for your comment!"
            required
            error={requiredFields.includes('instagramCommentText') && !isFieldValid('instagramCommentText', data.instagramCommentText)}
            helperText={requiredFields.includes('instagramCommentText') && !isFieldValid('instagramCommentText', data.instagramCommentText) ? 'Reply message is required' : 'Message to reply to Instagram comments'}
            sx={{ mb: 2 }}
            size="small"
            InputProps={{
              endAdornment: renderRequiredIndicator('instagramCommentText'),
            }}
          />
        </>
      )}
      {stepType === 'instagram_story_view' && (
        <>
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#E4405F', mb: 1, display: 'flex', alignItems: 'center' }}>
              <Box component="span" sx={{ width: 4, height: 4, bgcolor: '#E4405F', borderRadius: '50%', mr: 1 }} />
              Instagram Story View Configuration
            </Typography>
          </Box>
          <TextField
            fullWidth
            label="Instagram Username *"
            value={data.instagramUsername || ''}
            onChange={(e) => handleUpdate('instagramUsername', e.target.value)}
            placeholder="{{instagram_username}}"
            required
            error={requiredFields.includes('instagramUsername') && !isFieldValid('instagramUsername', data.instagramUsername)}
            helperText={requiredFields.includes('instagramUsername') && !isFieldValid('instagramUsername', data.instagramUsername) ? 'Username is required' : 'Use {{instagram_username}} variable or enter username'}
            sx={{ mb: 2 }}
            size="small"
            InputProps={{
              endAdornment: renderRequiredIndicator('instagramUsername'),
            }}
          />
        </>
      )}
      {/* Lead Generation Step */}
      {stepType === 'lead_generation' && (
        <>
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#6366F1', mb: 1, display: 'flex', alignItems: 'center' }}>
              <Box component="span" sx={{ width: 4, height: 4, bgcolor: '#6366F1', borderRadius: '50%', mr: 1 }} />
              Lead Generation Configuration
            </Typography>
          </Box>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Search Query"
            value={data.leadGenerationQuery || ''}
            onChange={(e) => handleUpdate('leadGenerationQuery', e.target.value)}
            placeholder="e.g., Software Engineers at Tech Companies in San Francisco"
            required
            error={requiredFields.includes('leadGenerationQuery') && !isFieldValid('leadGenerationQuery', data.leadGenerationQuery)}
            helperText={
              requiredFields.includes('leadGenerationQuery') && !isFieldValid('leadGenerationQuery', data.leadGenerationQuery)
                ? 'Search query is required'
                : 'Enter keywords, job titles, company names, or locations to search for leads'
            }
            sx={{ mb: 2 }}
            size="small"
            InputProps={{
              endAdornment: renderRequiredIndicator('leadGenerationQuery'),
            }}
          />
          <TextField
            fullWidth
            type="number"
            label="Number of Leads"
            value={data.leadGenerationLimit || 50}
            onChange={(e) => handleUpdate('leadGenerationLimit', parseInt(e.target.value) || 50)}
            inputProps={{ min: 1, max: 1000 }}
            required
            error={requiredFields.includes('leadGenerationLimit') && !isFieldValid('leadGenerationLimit', data.leadGenerationLimit)}
            helperText={
              requiredFields.includes('leadGenerationLimit') && !isFieldValid('leadGenerationLimit', data.leadGenerationLimit)
                ? 'Number of leads is required'
                : 'Maximum number of leads to generate (1-1000)'
            }
            sx={{ mb: 2 }}
            size="small"
            InputProps={{
              endAdornment: renderRequiredIndicator('leadGenerationLimit'),
            }}
          />
          <Box sx={{ mb: 2, p: 1.5, bgcolor: '#F0F9FF', borderRadius: '8px', border: '1px solid #BAE6FD' }}>
            <Typography variant="caption" sx={{ color: '#0369A1', fontSize: '11px' }}>
              <strong>Note:</strong> This step will generate leads from the data source. The leads will be added to your campaign automatically.
            </Typography>
          </Box>
        </>
      )}
      {/* Other LinkedIn Steps */}
      {(stepType === 'linkedin_visit' || stepType === 'linkedin_follow') && (
        <Typography variant="body2" sx={{ color: '#64748B' }}>
          This step will be executed automatically. No configuration needed.
        </Typography>
      )}
    </Box>
  );
}