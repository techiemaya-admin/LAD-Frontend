# Voice Agent Data Structure Reference

## API Response Format
**Endpoint:** `http://localhost:3000/api/voice-agent/available-agents`

### Complete Example Response
```json
{
  "success": true,
  "data": [
    {
      "agent_id": "30",
      "agent_name": "Mira Singh(G Links)(new)elven labs anjali",
      "agent_language": "en",
      "gender": "female",
      "agent_instructions": "[Long instructions text...]",
      "system_instructions": "[Long system instructions...]",
      "voice_id": "990a9ca5-7b05-4fb5-847f-a9d10dc563e1",
      "description": "Eleven Labs Premium english indian Anjali female",
      "voice_gender": "female",
      "accent": "en-in",
      "provider": "eleven-labs",
      "voice_sample_url": "gs://voiceagent-recording/voices/elevenlabs/990a9ca5-7b05-4fb5-847f-a9d10dc563e1.wav",
      "provider_voice_id": "7vLdoQUU3acmEiAVXlaN"
    },
    {
      "agent_id": "14",
      "agent_name": "Mira Singh(G Links)(short)Cartesia Arushi",
      "agent_language": "en",
      "gender": "female",
      "agent_instructions": "[Long instructions text...]",
      "system_instructions": "[Long system instructions...]",
      "voice_id": "aaa16c76-ea25-4cc0-ab4e-682ad9355905",
      "description": "Cartesia's hindi Arushi female voice",
      "voice_gender": "female",
      "accent": "en-IN",
      "provider": "cartesia",
      "voice_sample_url": "gs://voiceagent-recording/voices/cartesia/95d51f79-c397-46f9-b49a-23763d3eaa2d.wav",
      "provider_voice_id": "95d51f79-c397-46f9-b49a-23763d3eaa2d"
    }
    // ... 8 more agents
  ],
  "count": 10
}
```

## Internal Agent Type
**Location:** `src/types/agent.ts`

```typescript
export interface Agent {
  // Identifiers
  id?: string;                              // Internal ID (from agent_id)
  agent_id?: string;                        // API ID
  
  // Names
  name?: string;                            // Internal name (from agent_name)
  agent_name?: string;                      // API agent name
  
  // Voice Properties
  gender?: AgentGender;                     // Internal gender (from voice_gender)
  voice_gender?: string;                    // API voice gender
  
  // Language
  language?: string;                        // Internal language code
  agent_language?: string;                  // API agent language
  
  // Status
  status?: AgentStatus;                     // 'active' | 'draft' | 'inactive'
  
  // Instructions
  agent_instructions?: string;              // Agent system instructions
  system_instructions?: string;             // System prompt
  outbound_starter_prompt?: string;         // Initial greeting
  
  // Voice Provider Info
  description?: string;                     // Agent description/use case
  voice_id?: string;                        // Voice provider's voice ID
  voice_sample_url?: string;                // URL to sample audio
  accent?: string;                          // Regional accent code (en-IN, hi-IN, etc.)
  provider?: string;                        // Voice provider (eleven-labs, cartesia, google-chirp)
  provider_voice_id?: string;               // Provider-specific voice ID
  
  // Timestamps
  created_at?: string;                      // ISO date string
  updated_at?: string;                      // ISO date string
}
```

## Data Mapping Logic
**Location:** `src/components/voice-agent/VoiceAgentSettings.tsx` (lines 87-110)

```typescript
const mappedAgents = agentsArray.map((agent: any) => ({
  // Use agent_id as primary ID, fallback to id
  id: agent.agent_id || agent.id,
  agent_id: agent.agent_id,
  
  // Use agent_name as primary name, fallback to name
  name: agent.agent_name || agent.name,
  agent_name: agent.agent_name,
  
  // Use voice_gender as primary gender, fallback to gender
  gender: agent.voice_gender || agent.gender,
  voice_gender: agent.voice_gender,
  
  // Use agent_language as primary language, fallback to language
  language: agent.agent_language || agent.language,
  agent_language: agent.agent_language,
  
  // Other properties (direct mapping)
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
```

## AgentSelector Display Fields
**Location:** `src/components/voice-agent/AgentSelector.tsx` (lines 68-115)

```typescript
{
  agentName: agent.name || agent.agent_name || 'Unnamed Agent',
  status: agent.status,                    // Badge: 'Active' | 'Draft' | 'Inactive'
  gender: agent.voice_gender,              // Display: 'female' | 'male'
  accent: agent.accent || agent.language,  // Display: 'en-IN' | 'hi-IN' | 'en-US'
  description: agent.description,          // Truncated preview text
  provider: agent.provider                 // Display: 'eleven-labs' | 'cartesia' | 'google-chirp'
}
```

## Available Voice Providers

### 1. ElevenLabs (eleven-labs)
- High-quality AI voices
- Sample agents: Anjali, Simran
- Format: Voice ID from ElevenLabs API
- Sample URL pattern: `gs://voiceagent-recording/voices/elevenlabs/{voice_id}.wav`

### 2. Cartesia (cartesia)
- Natural-sounding voices
- Sample agents: Arushi, Isha, Punjabi, Naveen, Pavan
- Format: UUID for voice identification
- Sample URL pattern: `gs://voiceagent-recording/voices/cartesia/{uuid}.wav`

### 3. Google Chirp (google-chirp, google_chirp)
- Google Cloud speech synthesis
- Sample agents: Autonoe, Kore
- Format: Named voice IDs (e.g., `en-IN-Chirp3-HD-Kore`)
- Sample URL pattern: `gs://voiceagent-recording/voices/google-chirp/{uuid}.wav`

## Language/Accent Codes

| Code      | Description           | Providers                |
|-----------|----------------------|--------------------------|
| en-US     | English (US)         | Cartesia                 |
| en-IN     | English (India)      | ElevenLabs, Cartesia, Google |
| en-in     | English (India)      | ElevenLabs               |
| hi-IN     | Hindi (India)        | Google Chirp             |
| hi-in     | Hindi (India)        | Cartesia                 |

## Agent List (10 Total)

| # | Agent ID | Name | Provider | Gender | Accent | Voice ID |
|---|----------|------|----------|--------|--------|----------|
| 1 | 30 | Mira Singh (new) | ElevenLabs | Female | en-in | 990a9ca5-7b05... |
| 2 | 14 | Mira Singh (short) | Cartesia | Female | en-IN | aaa16c76-ea25... |
| 3 | 8 | Mira Singh (gujarati) | Cartesia | Female | hi-IN | f47fe3d4-d25a... |
| 4 | 7 | Mira Singh (Simran) | ElevenLabs | Female | en-in | 9b276ca9-4dd7... |
| 5 | 9 | Mira Singh (Autonoe) | Google Chirp | Female | en-in | 39c2271c-9fd4... |
| 6 | 17 | Mira Singh (Kore) | Google Chirp | Female | hi-IN | 9a03612f-33ce... |
| 7 | 12 | Mira Singh (ElevenLabs2) | ElevenLabs | Female | en-IN | 3ce624d8-37c2... |
| 8 | 6 | Naveen (Glinks) | Cartesia | Male | en-US | 880b0bbf-7ec2... |
| 9 | 18 | Mira Singh (punjabi) | Cartesia | Female | en-IN | 7d6ff340-6cb0... |
| 10 | 19 | Pavan (glinks) | Cartesia | Male | en-IN | 09f81231-1735... |

## Storage Patterns

### Token Storage
- Primary: `localStorage.getItem('token')`
- Secondary: `localStorage.getItem('accessToken')`
- Fallback: `sessionStorage.getItem('token')`
- Final fallback: `sessionStorage.getItem('accessToken')`

### API Endpoints
- Auth check: `/api/auth/me`
- Agent list: `/api/voice-agent/available-agents`
- Backend: `http://localhost:3000/api/voice-agent/available-agents`

## Error Handling

### Expected Console Logs
```
✅ Success Path:
  🔑 Token found: true
  🔐 Checking authentication...
  📡 Auth response status: 200
  ✅ Authenticated as: user@example.com
  🔍 Fetching agents from proxy...
  📡 Response status: 200 OK
  ✅ Agents fetched successfully: {...}
  📊 Mapped agents: Array(10)

❌ Error Path:
  🔑 Token found: false
  ❌ Error: No authentication token found
  OR
  📡 Auth response status: 401
  ❌ Auth error: {...}
  OR
  📡 Response status: 401 Unauthorized
  ❌ Response error: {"error":"Not authenticated"}
```

## Usage in Components

### Accessing Agent Properties
```typescript
// In AgentSelector or other components
const agent = agents[0];
const agentId = agent.id || agent.agent_id;
const agentName = agent.name || agent.agent_name;
const voiceGender = agent.voice_gender || agent.gender;
const language = agent.accent || agent.language || agent.agent_language;
```

### Selecting an Agent
```typescript
const selectedAgent = agents.find(a => 
  (a.id || a.agent_id) === selectedAgentId
);
```

### Populating Form
```typescript
if (selectedAgent) {
  const formData = {
    name: selectedAgent.name || selectedAgent.agent_name,
    gender: selectedAgent.voice_gender || selectedAgent.gender,
    language: selectedAgent.agent_language || selectedAgent.language,
    agent_instructions: selectedAgent.agent_instructions,
    system_instructions: selectedAgent.system_instructions,
    outbound_starter_prompt: selectedAgent.outbound_starter_prompt,
  };
}
```

