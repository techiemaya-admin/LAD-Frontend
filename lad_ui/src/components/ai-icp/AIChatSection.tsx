/**
 * AI Chat Section Component
 * Enhanced conversational interface for ICP definition and company searches
 */

'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Send, 
  Loader2, 
  Bot, 
  User, 
  Building2, 
  Sparkles, 
  Users, 
  Code,
  Mic,
  CheckCircle2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { 
  MayaAIChatMessage, 
  MayaAISuggestedParams,
  MayaAIActionResult 
} from '@/services/mayaAIService';

interface AIChatSectionProps {
  onSendPrompt: (message: string) => void;
  onApplyParams: (params: MayaAISuggestedParams) => void;
  loading?: boolean;
  chatHistory?: MayaAIChatMessage[];
  className?: string;
}

export default function AIChatSection({
  onSendPrompt,
  onApplyParams,
  loading = false,
  chatHistory = [],
  className
}: AIChatSectionProps) {
  const [input, setInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatHistory]);

  const handleSend = () => {
    if (input.trim() && !loading) {
      onSendPrompt(input.trim());
      setInput('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleMicClick = () => {
    setIsRecording(!isRecording);
    // TODO: Integrate audio recording
  };

  const handleApplyParams = (params: MayaAISuggestedParams) => {
    if (onApplyParams) {
      onApplyParams(params);
    }
  };

  const suggestedActions = [
    { 
      icon: Building2, 
      text: 'Find companies', 
      color: 'bg-amber-100 hover:bg-amber-200 text-amber-700',
      prompt: 'What type of companies are you looking for? Please specify the company type or industry and location.'
    },
    { 
      icon: Sparkles, 
      text: 'Industry search', 
      color: 'bg-blue-100 hover:bg-blue-200 text-blue-700',
      prompt: 'What industry would you like to search? Please tell me the industry name and location you\'re interested in.'
    },
    { 
      icon: Users, 
      text: 'Employee search', 
      color: 'bg-green-100 hover:bg-green-200 text-green-700',
      prompt: 'Find executives in specific companies or industries'
    },
    { 
      icon: Code, 
      text: 'Custom query', 
      color: 'bg-pink-100 hover:bg-pink-200 text-pink-700',
      prompt: 'Search for SaaS companies with more than 50 employees'
    },
  ];

  const handleQuickAction = (prompt: string) => {
    onSendPrompt(prompt);
  };

  const showWelcome = chatHistory.length === 0 && !loading;

  return (
    <Card className={cn('flex flex-col h-full border-0 shadow-none', className)}>
      <CardContent className="flex flex-col h-full p-0">
        {/* Chat Messages */}
        <ScrollArea className="flex-1 px-4 py-6">
          {showWelcome && (
            <div className="flex flex-col items-center justify-center h-full space-y-6 text-center px-4">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Welcome to Agent Maya
                </h2>
                <p className="text-muted-foreground max-w-md">
                  Your AI assistant for finding ideal customers. Tell me about your target companies or define your ICP.
                </p>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl w-full">
                {suggestedActions.map((action, index) => {
                  const Icon = action.icon;
                  return (
                    <Button
                      key={index}
                      variant="outline"
                      onClick={() => handleQuickAction(action.prompt)}
                      className={cn(
                        'h-auto py-4 px-4 justify-start text-left transition-all',
                        action.color
                      )}
                    >
                      <Icon className="h-5 w-5 mr-3 flex-shrink-0" />
                      <span className="font-medium">{action.text}</span>
                    </Button>
                  );
                })}
              </div>
            </div>
          )}

          {chatHistory.length > 0 && (
            <div className="space-y-4">
              {chatHistory.map((message, index) => (
                <ChatMessage 
                  key={index} 
                  message={message} 
                  onApplyParams={handleApplyParams}
                />
              ))}
            </div>
          )}

          {loading && (
            <div className="flex items-center space-x-2 text-muted-foreground ml-12 mt-4">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Maya is thinking...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </ScrollArea>

        {/* Input Area */}
        <div className="border-t bg-background p-4">
          <div className="flex items-end space-x-2 max-w-4xl mx-auto">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef as any}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask Maya about companies, define your ICP, or give commands..."
                disabled={loading}
                rows={1}
                maxLength={3000}
                className="w-full resize-none rounded-lg border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 min-h-[44px] max-h-[120px]"
                style={{
                  height: 'auto',
                  minHeight: '44px',
                  maxHeight: '120px'
                }}
                onInput={(e: any) => {
                  e.target.style.height = 'auto';
                  e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                }}
              />
              {input.length > 0 && (
                <span className="absolute bottom-2 right-2 text-xs text-muted-foreground">
                  {input.length}/3000
                </span>
              )}
            </div>
            
            <Button
              onClick={handleSend}
              disabled={!input.trim() || loading}
              size="icon"
              className="h-[44px] w-[44px] flex-shrink-0"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Chat Message Component
 */
interface ChatMessageProps {
  message: MayaAIChatMessage & {
    suggestedParams?: MayaAISuggestedParams;
    actionResult?: MayaAIActionResult;
  };
  onApplyParams: (params: MayaAISuggestedParams) => void;
}

function ChatMessage({ message, onApplyParams }: ChatMessageProps) {
  const isUser = message.role === 'user';

  return (
    <div className={cn('flex gap-3', isUser ? 'flex-row-reverse' : 'flex-row')}>
      {/* Avatar */}
      <div className={cn(
        'flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-full',
        isUser ? 'bg-blue-600' : 'bg-gradient-to-br from-purple-600 to-blue-600'
      )}>
        {isUser ? (
          <User className="h-4 w-4 text-white" />
        ) : (
          <Bot className="h-4 w-4 text-white" />
        )}
      </div>

      {/* Message Content */}
      <div className={cn('flex flex-col space-y-2 max-w-[80%]', isUser && 'items-end')}>
        <div
          className={cn(
            'rounded-2xl px-4 py-3 text-sm',
            isUser
              ? 'bg-blue-600 text-white'
              : 'bg-muted text-foreground'
          )}
        >
          <div className="whitespace-pre-wrap break-words">{message.content}</div>
        </div>

        {/* Suggested Parameters */}
        {message.suggestedParams && (
          <div className="space-y-2 w-full">
            <div className="flex flex-wrap gap-2">
              {message.suggestedParams.keywords && (
                <Badge variant="secondary" className="text-xs">
                  Keywords: {message.suggestedParams.keywords}
                </Badge>
              )}
              {message.suggestedParams.location && (
                <Badge variant="secondary" className="text-xs">
                  Location: {message.suggestedParams.location}
                </Badge>
              )}
              {message.suggestedParams.companySize && (
                <Badge variant="secondary" className="text-xs">
                  Size: {message.suggestedParams.companySize}
                </Badge>
              )}
              {message.suggestedParams.jobTitles && message.suggestedParams.jobTitles.length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  Titles: {message.suggestedParams.jobTitles.join(', ')}
                </Badge>
              )}
            </div>
            
            <Button
              onClick={() => onApplyParams(message.suggestedParams!)}
              size="sm"
              className="w-full sm:w-auto"
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Apply & Search
            </Button>
          </div>
        )}

        {/* Action Results */}
        {message.actionResult && (
          <ActionResultDisplay actionResult={message.actionResult} />
        )}

        {/* Timestamp */}
        {message.timestamp && (
          <span className="text-xs text-muted-foreground">
            {new Date(message.timestamp).toLocaleTimeString()}
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * Action Result Display Component
 */
interface ActionResultDisplayProps {
  actionResult: MayaAIActionResult;
}

function ActionResultDisplay({ actionResult }: ActionResultDisplayProps) {
  return (
    <Card className="w-full">
      <CardContent className="p-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Badge variant="outline" className="text-xs">
              {actionResult.type.replace('_', ' ').toUpperCase()}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {actionResult.count} items
            </span>
          </div>
          
          {actionResult.data && actionResult.data.length > 0 && (
            <div className="space-y-1 text-sm max-h-48 overflow-y-auto">
              {actionResult.data.slice(0, 10).map((item: any, index: number) => (
                <div key={index} className="flex items-start space-x-2 text-xs p-2 rounded hover:bg-muted">
                  <span className="font-medium text-muted-foreground">{index + 1}.</span>
                  <div className="flex-1">
                    {item.company && <div className="font-medium">{item.company}</div>}
                    {item.phone && <div className="text-muted-foreground">{item.phone}</div>}
                    {item.location && <div className="text-muted-foreground">{item.location}</div>}
                    {item.name && <div className="font-medium">{item.name}</div>}
                  </div>
                </div>
              ))}
              {actionResult.data.length > 10 && (
                <div className="text-xs text-muted-foreground text-center pt-2">
                  ... and {actionResult.data.length - 10} more items
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
