import { memo, useState, useCallback, useRef, useEffect } from 'react';
import { Send, Paperclip, Smile, X, Bot, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Channel, Attachment } from '@/types/conversation';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type AgentType = 'human' | 'ai';

interface MessageComposerProps {
  channel: Channel;
  onSendMessage: (content: string, attachments?: Attachment[]) => void;
  disabled?: boolean;
}

const channelPlaceholders: Record<Channel, string> = {
  whatsapp: 'Type a message...',
  linkedin: 'Write a professional message...',
  gmail: 'Compose your email...',
};

export const MessageComposer = memo(function MessageComposer({
  channel,
  onSendMessage,
  disabled = false,
}: MessageComposerProps) {
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [agentType, setAgentType] = useState<AgentType>('human');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 150)}px`;
    }
  }, [message]);

  const handleSend = useCallback(() => {
    if ((message.trim() || attachments.length > 0) && !disabled) {
      onSendMessage(message, attachments.length > 0 ? attachments : undefined);
      setMessage('');
      setAttachments([]);
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  }, [message, attachments, onSendMessage, disabled]);

  const handleAttachmentClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newAttachments: Attachment[] = Array.from(files).map((file, idx) => ({
      id: `attach-${Date.now()}-${idx}`,
      name: file.name,
      type: file.type.startsWith('image/') ? 'image' : 'file',
      url: URL.createObjectURL(file),
      size: file.size,
    }));

    setAttachments((prev) => [...prev, ...newAttachments]);
    e.target.value = '';
  }, []);

  const removeAttachment = useCallback((id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  return (
    <div className="border-t border-border bg-card p-3">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileChange}
        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
      />

      {/* Attachment previews */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {attachments.map((attachment) => (
            <div
              key={attachment.id}
              className="flex items-center gap-2 bg-secondary/50 rounded-lg px-3 py-1.5 text-sm"
            >
              {attachment.type === 'image' ? (
                <img
                  src={attachment.url}
                  alt={attachment.name}
                  className="h-6 w-6 rounded object-cover"
                />
              ) : (
                <Paperclip className="h-4 w-4 text-muted-foreground" />
              )}
              <span className="truncate max-w-[120px]">{attachment.name}</span>
              <button
                onClick={() => removeAttachment(attachment.id)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2">
        {/* Agent type dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 flex-shrink-0 text-muted-foreground hover:text-foreground"
              disabled={disabled}
            >
              {agentType === 'human' ? (
                <User className="h-5 w-5" />
              ) : (
                <Bot className="h-5 w-5" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="bg-popover z-50">
            <DropdownMenuItem
              onClick={() => setAgentType('human')}
              className={cn(agentType === 'human' && 'bg-accent')}
            >
              <User className="h-4 w-4 mr-2" />
              Human Agent
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setAgentType('ai')}
              className={cn(agentType === 'ai' && 'bg-accent')}
            >
              <Bot className="h-4 w-4 mr-2" />
              AI Agent
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Attachment button */}
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 flex-shrink-0 text-muted-foreground hover:text-foreground"
          disabled={disabled}
          onClick={handleAttachmentClick}
        >
          <Paperclip className="h-5 w-5" />
        </Button>

        {/* Text input */}
        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={channelPlaceholders[channel]}
            disabled={disabled}
            className={cn(
              'min-h-[40px] max-h-[150px] resize-none py-2.5 pr-10',
              'bg-secondary/50 border-0 focus-visible:ring-1 focus-visible:ring-primary/30'
            )}
            rows={1}
          />
        </div>

        {/* Emoji picker button */}
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 flex-shrink-0 text-muted-foreground hover:text-foreground"
          disabled={disabled}
        >
          <Smile className="h-5 w-5" />
        </Button>

        {/* Send button */}
        <Button
          onClick={handleSend}
          disabled={(!message.trim() && attachments.length === 0) || disabled}
          size="icon"
          className="h-9 w-9 flex-shrink-0"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>

      {/* Channel hint */}
      <p className="text-[10px] text-muted-foreground mt-2 px-1">
        Press Enter to send • Shift+Enter for new line
      </p>
    </div>
  );
});
