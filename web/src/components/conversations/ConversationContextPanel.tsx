import { memo, useState } from 'react';
import { Conversation, ContactTag, InternalComment } from '@/types/conversation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Building2,
  Mail,
  Phone,
  MapPin,
  Tag,
  MessageSquare,
  Clock,
  Send,
  X,
} from 'lucide-react';
import { ChannelIcon } from './ChannelIcon';
import { mockInternalComments } from '@/data/mockConversations';
import { formatDistanceToNow } from 'date-fns';

interface ConversationContextPanelProps {
  conversation: Conversation;
  onClose: () => void;
}

const tagColors: Record<ContactTag, string> = {
  hot: 'bg-destructive/10 text-destructive border-destructive/20',
  warm: 'bg-warning/10 text-warning border-warning/20',
  cold: 'bg-info/10 text-info border-info/20',
};

export const ConversationContextPanel = memo(function ConversationContextPanel({
  conversation,
  onClose,
}: ConversationContextPanelProps) {
  const { contact, channel, createdAt } = conversation;
  const [newNote, setNewNote] = useState('');
  const [newComment, setNewComment] = useState('');

  const initials = contact.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const comments = mockInternalComments.filter(
    (c) => c.conversationId === conversation.id
  );

  return (
    <div className="h-full flex flex-col bg-card border-l border-border">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h3 className="font-heading font-semibold text-sm">Contact Details</h3>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4">
          {/* Profile */}
          <div className="flex flex-col items-center text-center mb-6">
            <div className="relative mb-3">
              <Avatar className="h-16 w-16">
                <AvatarImage src={contact.avatar} alt={contact.name} />
                <AvatarFallback className="bg-primary/10 text-primary text-xl font-medium">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-1 -right-1">
                <ChannelIcon channel={channel} size={16} showBackground />
              </div>
            </div>
            <h4 className="font-semibold">{contact.name}</h4>
            {contact.position && (
              <p className="text-sm text-muted-foreground">{contact.position}</p>
            )}

            {/* Tags */}
            <div className="flex flex-wrap gap-1.5 mt-3 justify-center">
              {contact.tags.map((tag) => (
                <Badge
                  key={tag}
                  variant="outline"
                  className={`text-[10px] uppercase ${tagColors[tag]}`}
                >
                  {tag}
                </Badge>
              ))}
            </div>
          </div>

          {/* Contact Info */}
          <div className="space-y-3 mb-6">
            {contact.company && (
              <div className="flex items-center gap-3 text-sm">
                <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span>{contact.company}</span>
              </div>
            )}
            <div className="flex items-center gap-3 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="truncate">{contact.email}</span>
            </div>
            {contact.phone && (
              <div className="flex items-center gap-3 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span>{contact.phone}</span>
              </div>
            )}
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <Clock className="h-4 w-4 flex-shrink-0" />
              <span>Conversation started {formatDistanceToNow(createdAt, { addSuffix: true })}</span>
            </div>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="notes" className="w-full">
            <TabsList className="w-full grid grid-cols-2 h-9">
              <TabsTrigger value="notes" className="text-xs">
                <Tag className="h-3 w-3 mr-1.5" />
                Notes
              </TabsTrigger>
              <TabsTrigger value="comments" className="text-xs">
                <MessageSquare className="h-3 w-3 mr-1.5" />
                Internal
              </TabsTrigger>
            </TabsList>

            <TabsContent value="notes" className="mt-3">
              {/* Add note */}
              <div className="flex gap-2 mb-3">
                <Textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Add a note..."
                  className="min-h-[60px] text-xs"
                />
              </div>
              <Button size="sm" className="w-full mb-4" disabled={!newNote.trim()}>
                Add Note
              </Button>

              {/* Existing notes */}
              <div className="space-y-2">
                {contact.notes.map((note, i) => (
                  <div
                    key={i}
                    className="p-2.5 bg-muted/50 rounded-lg text-xs text-muted-foreground"
                  >
                    {note}
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="comments" className="mt-3">
              {/* Add internal comment */}
              <div className="flex gap-2 mb-3">
                <Textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add internal comment (not visible to contact)..."
                  className="min-h-[60px] text-xs"
                />
              </div>
              <Button size="sm" className="w-full mb-4" disabled={!newComment.trim()}>
                <Send className="h-3 w-3 mr-1.5" />
                Post Comment
              </Button>

              {/* Internal comments */}
              <div className="space-y-3">
                {comments.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    No internal comments yet
                  </p>
                ) : (
                  comments.map((comment) => (
                    <div key={comment.id} className="bg-muted/50 rounded-lg p-2.5">
                      <div className="flex items-center gap-2 mb-1">
                        <Avatar className="h-5 w-5">
                          <AvatarFallback className="text-[8px] bg-primary/10 text-primary">
                            {comment.author.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs font-medium">{comment.author.name}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {formatDistanceToNow(comment.timestamp, { addSuffix: true })}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">{comment.content}</p>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </ScrollArea>
    </div>
  );
});
