import React, { useState, useRef, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  TextField, 
  IconButton, 
  Button, 
  Paper, 
  Chip, 
  CircularProgress,
  Avatar
} from '@mui/material';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import MicIcon from '@mui/icons-material/Mic';
import SearchIcon from '@mui/icons-material/Search';
import SendIcon from '@mui/icons-material/Send';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import PersonIcon from '@mui/icons-material/Person';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CodeIcon from '@mui/icons-material/Code';
import BusinessIcon from '@mui/icons-material/Business';

export default function AIChatSection({ onSendPrompt, onApplyParams, loading, chatHistory = [] }) {
  const [input, setInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatHistory]);

  const handleSend = () => {
    if (input.trim()) {
      onSendPrompt(input);
      setInput('');
    }
  };

  const handleMicClick = () => {
    setIsRecording(!isRecording);
    // TODO: Integrate audio recording
  };

  const handleApplyParams = (params) => {
    if (onApplyParams) {
      onApplyParams(params);
    }
  };

  const suggestedActions = [
    { 
      icon: <BusinessIcon />, 
      text: 'Find companies', 
      color: '#FFE082',
      prompt: 'What type of companies are you looking for? Please specify the company type or industry and location.'
    },
    { 
      icon: <AutoAwesomeIcon />, 
      text: 'Industry search', 
      color: '#B3E5FC',
      prompt: 'What industry would you like to search? Please tell me the industry name and location you\'re interested in.'
    },
    { 
      icon: <PersonIcon />, 
      text: 'Employee search', 
      color: '#C8E6C9',
      prompt: 'Find executives in healthcare sector'
    },
    { 
      icon: <CodeIcon />, 
      text: 'Custom query', 
      color: '#F8BBD0',
      prompt: 'Search for SaaS companies with more than 50 employees'
    },
  ];

  const handleQuickAction = (prompt) => {
    onSendPrompt(prompt);
  };

  const showWelcome = chatHistory.length === 0 && !loading;

  return (
    <Box 
      id="ai-chat-section"
      sx={{ 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column',
        maxWidth: '1200px',
        margin: '0 auto',
        px: 2,
        position: 'relative',
        background: 'transparent',
        // Ensure content is above background layers
        '& > *': {
          position: 'relative',
          zIndex: 2,
        }
      }}>
      {/* Welcome Screen */}
      {showWelcome && (
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', mb: 4, mt: 4 }}>
          <Typography 
            variant="h3" 
            sx={{ 
              fontWeight: 700, 
              mb: 2,
              background: 'linear-gradient(135deg, #1a2d7a 0%, #0b1957 50%, #0a1445 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              textAlign: 'center'
            }}
          >
            Let Agent Deal
          </Typography>
          <Typography 
            variant="body1" 
            sx={{ 
              mb: 4, 
              color: 'oklch(0.145 0 0)',
              textAlign: 'center',
              maxWidth: '600px'
            }}
          >
            Get started by typing a task and LAD can do the rest. Not sure where to start?
          </Typography>

          {/* Suggested Actions */}
          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, 
            gap: 2,
            width: '100%',
            maxWidth: '900px',
            mb: 4
          }}>
            {suggestedActions.map((action, index) => (
              <Paper
                key={index}
                elevation={0}
                onClick={() => handleQuickAction(action.prompt)}
                sx={{
                  p: 2.5,
                  cursor: 'pointer',
                  border: '1px solid oklch(0.922 0 0)',
                  borderRadius: '20px',
                  background: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  transition: 'all 0.3s ease-in-out',
                  color: '#0b1957',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 4px 12px rgba(11, 25, 87, 0.15)',
                    borderColor: '#0b1957',
                    background: '#ffffff',
                  }
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Box sx={{ 
                    color: '#0b1957',
                    display: 'flex',
                    alignItems: 'center'
                  }}>
                    {action.icon}
                  </Box>
                  <Typography variant="body1" sx={{ fontWeight: 500, color: '#0b1957' }}>
                    {action.text}
                  </Typography>
                </Box>
                <IconButton 
                  size="small" 
                  sx={{ 
                    ml: 1,
                    color: '#0b1957',
                    '&:hover': {
                      bgcolor: 'oklch(0.97 0 0)',
                    }
                  }}
                >
                  <SendIcon fontSize="small" />
                </IconButton>
              </Paper>
            ))}
          </Box>
        </Box>
      )}

      {/* Chat Messages */}
      {chatHistory.length > 0 && (
        <Box sx={{ 
          flex: 1, 
          overflowY: 'auto', 
          mb: 2,
          px: 1,
          '&::-webkit-scrollbar': {
            width: '8px',
          },
          '&::-webkit-scrollbar-thumb': {
            background: 'linear-gradient(180deg, #00D9FF, #7C3AED)',
            borderRadius: '4px',
          }
        }}>
          {chatHistory.map((message, index) => (
            <Box
              key={index}
              sx={{
                display: 'flex',
                mb: 3,
                alignItems: 'flex-start',
                flexDirection: message.role === 'user' ? 'row-reverse' : 'row',
                gap: 2
              }}
            >
              <Avatar
                sx={{
                  bgcolor: '#0b1957',
                  background: '#0b1957',
                  width: 36,
                  height: 36,
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                }}
              >
                {message.role === 'user' ? (
                  <PersonIcon fontSize="small" sx={{ color: '#ffffff' }} />
                ) : (
                  <SmartToyIcon fontSize="small" sx={{ color: '#ffffff' }} />
                )}
              </Avatar>
              <Box sx={{ 
                flex: 1,
                maxWidth: '70%',
                minWidth: 0
              }}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 2,
                    background: '#ffffff',
                    color: '#0b1957',
                    borderRadius: '20px',
                    border: '1px solid oklch(0.922 0 0)',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                  }}
                >
                  <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: '#0b1957' }}>
                    {message.content}
                  </Typography>
                  
                  {/* Show expanded keywords if available */}
                  {message.expandedKeywords && (
                    <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid oklch(0.922 0 0)' }}>
                      <Typography variant="caption" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 0.5, fontWeight: 600, color: '#7C3AED' }}>
                        <AutoAwesomeIcon fontSize="small" sx={{ fontSize: '14px' }} />
                        AI-Expanded Keywords
                      </Typography>
                      <Box sx={{ 
                        display: 'flex', 
                        flexWrap: 'wrap', 
                        gap: 0.5, 
                        maxHeight: '120px', 
                        overflowY: 'auto',
                        p: 1,
                        bgcolor: 'oklch(0.985 0 0)',
                        borderRadius: '8px',
                        '&::-webkit-scrollbar': { width: '4px' },
                        '&::-webkit-scrollbar-thumb': { background: '#7C3AED', borderRadius: '2px' }
                      }}>
                        {message.expandedKeywords.map((keyword, idx) => (
                          <Chip 
                            key={idx}
                            label={keyword} 
                            size="small" 
                            sx={{ 
                              bgcolor: '#ffffff',
                              color: '#7C3AED',
                              border: '1px solid #E9D5FF',
                              fontSize: '0.75rem',
                              height: '24px',
                              '&:hover': { bgcolor: '#F3E8FF' }
                            }} 
                          />
                        ))}
                      </Box>
                    </Box>
                  )}
                  
                  {message.suggestedParams && (
                    <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid oklch(0.922 0 0)' }}>
                      <Typography variant="caption" sx={{ mb: 1, display: 'block', fontWeight: 600, color: '#0b1957' }}>
                        Suggested Parameters:
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1.5 }}>
                        {message.suggestedParams.keywords && (
                          <Chip 
                            label={`Keywords: ${message.suggestedParams.keywords}`} 
                            size="small" 
                            sx={{ 
                              bgcolor: 'oklch(0.97 0 0)',
                              color: '#0b1957',
                              border: '1px solid oklch(0.922 0 0)',
                            }} 
                          />
                        )}
                        {message.suggestedParams.location && (
                          <Chip 
                            label={`Location: ${message.suggestedParams.location}`} 
                            size="small"
                            sx={{ 
                              bgcolor: 'oklch(0.97 0 0)',
                              color: '#0b1957',
                              border: '1px solid oklch(0.922 0 0)',
                            }}
                          />
                        )}
                      </Box>
                      <Button 
                        size="small" 
                        variant="contained"
                        onClick={() => handleApplyParams(message.suggestedParams)}
                        sx={{
                          mt: 1,
                          background: '#0b1957',
                          color: '#ffffff',
                          border: '1px solid #0b1957',
                          borderRadius: '20px',
                          '&:hover': {
                            background: '#0d1f6f',
                          }
                        }}
                      >
                        Apply & Search
                      </Button>
                    </Box>
                  )}
                </Paper>
              </Box>
            </Box>
          ))}
          {loading && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
              <Avatar sx={{ 
                background: '#0b1957', 
                width: 36, 
                height: 36,
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
              }}>
                <SmartToyIcon fontSize="small" sx={{ color: '#ffffff' }} />
              </Avatar>
              <Paper elevation={0} sx={{ 
                p: 2, 
                background: '#ffffff',
                border: '1px solid oklch(0.922 0 0)',
                borderRadius: '20px',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CircularProgress size={16} sx={{ color: '#0b1957' }} />
                  <Typography variant="body2" sx={{ color: '#0b1957' }}>
                    AI is thinking...
                  </Typography>
                </Box>
              </Paper>
            </Box>
          )}
          <div ref={messagesEndRef} />
        </Box>
      )}

      {/* Input Area - Fixed at bottom */}
      <Box sx={{ 
        position: 'sticky',
        bottom: 0,
        pt: 2,
        pb: 1,
      }}>
        <Box sx={{ position: 'relative' }}>
          <TextField
            inputRef={inputRef}
            fullWidth
            multiline
            maxRows={6}
            placeholder="Summarize the latest"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              if (e.target.value.length > 3000) {
                setInput(e.target.value.substring(0, 3000));
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            disabled={loading}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: '20px',
                background: '#ffffff',
                border: '1px solid oklch(0.922 0 0)',
                fontSize: '1rem',
                py: 1,
                pr: 10,
                color: '#0b1957',
                '&:hover': {
                  borderColor: '#0b1957',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                },
                '&.Mui-focused': {
                  borderColor: '#0b1957',
                  boxShadow: '0 0 0 2px rgba(11, 25, 87, 0.2)',
                }
              },
              '& .MuiOutlinedInput-input': {
                py: 1.5,
                '&::placeholder': {
                  color: 'oklch(0.556 0 0)',
                  opacity: 1,
                }
              }
            }}
          />
          <IconButton
            onClick={handleSend}
            disabled={loading || !input.trim()}
            sx={{
              position: 'absolute',
              right: 8,
              bottom: 8,
              background: '#0b1957',
              color: '#ffffff',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
              '&:hover': {
                background: '#0d1f6f',
                boxShadow: '0 2px 6px rgba(11, 25, 87, 0.3)',
              },
              '&.Mui-disabled': {
                background: 'oklch(0.97 0 0)',
                color: 'oklch(0.556 0 0)',
              }
            }}
          >
            <SendIcon />
          </IconButton>
        </Box>

        {/* Action Buttons and Character Counter */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 0.5, px: 0.5 }}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {/* Hidden: Attach, Voice Message, and Browse Prompts buttons */}
          </Box>
          <Typography variant="caption" sx={{ fontSize: '0.75rem', color: 'oklch(0.556 0 0)' }}>
            {input.length} / 3,000
          </Typography>
        </Box>

      </Box>
    </Box>
  );
}

