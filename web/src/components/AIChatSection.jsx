import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Paperclip, 
  Mic, 
  Search, 
  Send, 
  Bot, 
  User, 
  Sparkles, 
  Code, 
  Building2,
  Loader2
} from 'lucide-react';
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
      icon: <Building2 className="w-5 h-5" />, 
      text: 'Find companies', 
      color: '#FFE082',
      prompt: 'What type of companies are you looking for? Please specify the company type or industry and location.'
    },
    { 
      icon: <Sparkles className="w-5 h-5" />, 
      text: 'Industry search', 
      color: '#B3E5FC',
      prompt: 'What industry would you like to search? Please tell me the industry name and location you\'re interested in.'
    },
    { 
      icon: <User className="w-5 h-5" />, 
      text: 'Employee search', 
      color: '#C8E6C9',
      prompt: 'Find executives in healthcare sector'
    },
    { 
      icon: <Code className="w-5 h-5" />, 
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
    <div 
      id="ai-chat-section"
      className="h-full flex flex-col max-w-[1200px] mx-auto px-4 relative bg-transparent"
    >
      {/* Welcome Screen */}
      {showWelcome && (
        <div className="flex-1 flex flex-col justify-center items-center mb-8 mt-8">
          <h1 
            className="text-5xl font-bold mb-4 bg-gradient-to-r from-[#1a2d7a] via-[#0b1957] to-[#0a1445] bg-clip-text text-transparent text-center"
          >
            Let Agent Deal
          </h1>
          <p 
            className="mb-8 text-[oklch(0.145_0_0)] text-center max-w-[600px]"
          >
            Get started by typing a task and LAD can do the rest. Not sure where to start?
          </p>
          {/* Suggested Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-[900px] mb-8">
            {suggestedActions.map((action, index) => (
              <Card
                key={index}
                onClick={() => handleQuickAction(action.prompt)}
                className="p-5 cursor-pointer border border-[oklch(0.922_0_0)] rounded-[20px] bg-white flex items-center justify-between transition-all duration-300 text-[#0b1957] shadow-sm hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(11,25,87,0.15)] hover:border-[#0b1957]"
              >
                <div className="flex items-center gap-3">
                  <div className="text-[#0b1957] flex items-center">
                    {action.icon}
                  </div>
                  <span className="font-medium text-[#0b1957]">
                    {action.text}
                  </span>
                </div>
                <Button 
                  size="icon"
                  variant="ghost"
                  className="ml-2 text-[#0b1957] h-8 w-8 hover:bg-[oklch(0.97_0_0)]"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </Card>
            ))}
          </div>
        </div>
      )}
      {/* Chat Messages */}
      {chatHistory.length > 0 && (
        <div className="flex-1 overflow-y-auto mb-4 px-2 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:bg-gradient-to-b [&::-webkit-scrollbar-thumb]:from-[#00D9FF] [&::-webkit-scrollbar-thumb]:to-[#7C3AED] [&::-webkit-scrollbar-thumb]:rounded">
          {chatHistory.map((message, index) => (
            <div
              key={index}
              className={`flex mb-6 items-start gap-4 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              <Avatar className="bg-[#0b1957] w-9 h-9 shadow-sm">
                <AvatarFallback className="bg-[#0b1957]">
                  {message.role === 'user' ? (
                    <User className="h-4 w-4 text-white" />
                  ) : (
                    <Bot className="h-4 w-4 text-white" />
                  )}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 max-w-[70%] min-w-0">
                <Card className="p-4 bg-white text-[#0b1957] rounded-[20px] border border-[oklch(0.922_0_0)] shadow-sm">
                  <p className="whitespace-pre-wrap break-words text-[#0b1957]">
                    {message.content}
                  </p>
                  {/* Show expanded keywords if available */}
                  {message.expandedKeywords && (
                    <div className="mt-4 pt-4 border-t border-[oklch(0.922_0_0)]">
                      <div className="mb-2 flex items-center gap-1 text-xs font-semibold text-[#7C3AED]">
                        <Sparkles className="h-3.5 w-3.5" />
                        AI-Expanded Keywords
                      </div>
                      <div className="flex flex-wrap gap-1 max-h-[120px] overflow-y-auto p-2 bg-[oklch(0.985_0_0)] rounded-lg [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-[#7C3AED] [&::-webkit-scrollbar-thumb]:rounded">
                        {message.expandedKeywords.map((keyword, idx) => (
                          <Badge 
                            key={idx}
                            variant="outline"
                            className="bg-white text-[#7C3AED] border-[#E9D5FF] text-xs h-6 hover:bg-[#F3E8FF]"
                          >
                            {keyword}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {message.suggestedParams && (
                    <div className="mt-4 pt-4 border-t border-[oklch(0.922_0_0)]">
                      <span className="mb-2 block text-xs font-semibold text-[#0b1957]">
                        Suggested Parameters:
                      </span>
                      <div className="flex flex-wrap gap-1 mb-3">
                        {message.suggestedParams.keywords && (
                          <Badge 
                            variant="outline"
                            className="bg-[oklch(0.97_0_0)] text-[#0b1957] border-[oklch(0.922_0_0)]"
                          >
                            Keywords: {message.suggestedParams.keywords}
                          </Badge>
                        )}
                        {message.suggestedParams.location && (
                          <Badge 
                            variant="outline"
                            className="bg-[oklch(0.97_0_0)] text-[#0b1957] border-[oklch(0.922_0_0)]"
                          >
                            Location: {message.suggestedParams.location}
                          </Badge>
                        )}
                      </div>
                      <Button 
                        size="sm"
                        onClick={() => handleApplyParams(message.suggestedParams)}
                        className="mt-2 bg-[#0b1957] text-white border border-[#0b1957] rounded-[20px] hover:bg-[#0d1f6f]"
                      >
                        Apply & Search
                      </Button>
                    </div>
                  )}
                </Card>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex items-center gap-4 mb-6">
              <Avatar className="bg-[#0b1957] w-9 h-9 shadow-sm">
                <AvatarFallback className="bg-[#0b1957]">
                  <Bot className="h-4 w-4 text-white" />
                </AvatarFallback>
              </Avatar>
              <Card className="p-4 bg-white border border-[oklch(0.922_0_0)] rounded-[20px] shadow-sm">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-[#0b1957]" />
                  <span className="text-sm text-[#0b1957]">
                    AI is thinking...
                  </span>
                </div>
              </Card>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      )}
      {/* Input Area - Fixed at bottom */}
      <div className="sticky bottom-0 pt-4 pb-2">
        <div className="relative">
          <Textarea
            ref={inputRef}
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
            className="resize-none rounded-[20px] bg-white border border-[oklch(0.922_0_0)] text-base py-3 pr-24 text-[#0b1957] placeholder:text-[oklch(0.556_0_0)] hover:border-[#0b1957] hover:shadow-sm focus:border-[#0b1957] focus:shadow-[0_0_0_2px_rgba(11,25,87,0.2)] disabled:opacity-50"
            rows={1}
          />
          <Button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            size="icon"
            className="absolute right-2 bottom-2 bg-[#0b1957] text-white shadow-sm hover:bg-[#0d1f6f] hover:shadow-md disabled:bg-[oklch(0.97_0_0)] disabled:text-[oklch(0.556_0_0)]"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        {/* Action Buttons and Character Counter */}
        <div className="flex justify-between items-center mt-1 px-1">
          <div className="flex gap-2">
            {/* Hidden: Attach, Voice Message, and Browse Prompts buttons */}
          </div>
          <span className="text-xs text-[oklch(0.556_0_0)]">
            {input.length} / 3,000
          </span>
        </div>
      </div>
    </div>
  );
}
