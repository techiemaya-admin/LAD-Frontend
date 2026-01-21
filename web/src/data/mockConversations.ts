import { Conversation, Message, Contact, Channel, InternalComment } from '@/types/conversation';

const generateMessages = (conversationId: string, count: number, channel: Channel): Message[] => {
  const messages: Message[] = [];
  const baseTime = new Date();
  baseTime.setHours(baseTime.getHours() - count);

  const sampleContents: Record<Channel, string[]> = {
    whatsapp: [
      "Hi! I saw your product demo and I'm really interested.",
      "Can you tell me more about pricing?",
      "That sounds great! When can we schedule a call?",
      "Perfect, I'll check with my team and get back to you.",
      "We've decided to move forward with your solution!",
      "What's the implementation timeline?",
      "Our team is very excited about this partnership.",
    ],
    linkedin: [
      "Thanks for connecting! I noticed your company does enterprise solutions.",
      "Would love to learn more about your B2B offerings.",
      "I've shared your profile with our procurement team.",
      "Can we set up a professional introduction call?",
      "Your case studies look impressive.",
      "We're exploring similar solutions for Q2.",
    ],
    gmail: [
      "Dear Team, Following up on our previous discussion...",
      "Please find attached the requested documentation.",
      "Thank you for the detailed proposal.",
      "We have reviewed the contract terms.",
      "Our legal team has approved the agreement.",
      "Looking forward to the kickoff meeting.",
    ],
  };

  const contents = sampleContents[channel];

  for (let i = 0; i < count; i++) {
    const isOutgoing = Math.random() > 0.5;
    const messageTime = new Date(baseTime);
    messageTime.setMinutes(messageTime.getMinutes() + i * 15);

    messages.push({
      id: `msg-${conversationId}-${i}`,
      conversationId,
      content: contents[i % contents.length],
      timestamp: messageTime,
      isOutgoing,
      status: isOutgoing ? (Math.random() > 0.3 ? 'read' : 'delivered') : 'read',
      sender: {
        id: isOutgoing ? 'user-1' : `contact-${conversationId}`,
        name: isOutgoing ? 'You' : 'Contact',
      },
    });
  }

  return messages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
};

const contacts: Contact[] = [
  {
    id: 'c1',
    name: 'Sarah Mitchell',
    email: 'sarah.mitchell@techcorp.com',
    phone: '+1 555-0123',
    company: 'TechCorp Industries',
    position: 'Head of Procurement',
    tags: ['hot'],
    notes: ['Interested in enterprise plan', 'Decision maker'],
    isOnline: true,
  },
  {
    id: 'c2',
    name: 'James Chen',
    email: 'j.chen@innovate.io',
    phone: '+1 555-0456',
    company: 'Innovate.io',
    position: 'CTO',
    tags: ['warm'],
    notes: ['Technical evaluation in progress'],
    lastSeen: new Date(Date.now() - 3600000),
  },
  {
    id: 'c3',
    name: 'Emily Rodriguez',
    email: 'emily.r@globalfinance.com',
    company: 'Global Finance Ltd',
    position: 'Operations Manager',
    tags: ['hot'],
    notes: ['Budget approved for Q1', 'Needs compliance docs'],
    isOnline: true,
  },
  {
    id: 'c4',
    name: 'Michael Thompson',
    email: 'm.thompson@startuphub.co',
    company: 'StartupHub',
    position: 'Founder',
    tags: ['cold'],
    notes: ['Early stage exploration'],
    lastSeen: new Date(Date.now() - 86400000),
  },
  {
    id: 'c5',
    name: 'Amanda Foster',
    email: 'amanda@enterpriseco.com',
    phone: '+1 555-0789',
    company: 'Enterprise Co',
    position: 'VP of Sales',
    tags: ['warm'],
    notes: ['Referred by existing customer'],
    isOnline: true,
  },
  {
    id: 'c6',
    name: 'David Kim',
    email: 'david.kim@nexgen.tech',
    company: 'NexGen Technologies',
    position: 'Product Manager',
    tags: ['hot'],
    notes: ['Demo scheduled for next week'],
    lastSeen: new Date(Date.now() - 1800000),
  },
  {
    id: 'c7',
    name: 'Lisa Wang',
    email: 'lwang@cloudscape.io',
    company: 'CloudScape',
    position: 'IT Director',
    tags: ['warm'],
    notes: ['Comparing with competitors'],
  },
  {
    id: 'c8',
    name: 'Robert Martinez',
    email: 'r.martinez@datadrive.com',
    phone: '+1 555-0321',
    company: 'DataDrive Inc',
    position: 'CEO',
    tags: ['hot'],
    notes: ['High priority lead', 'Enterprise tier interest'],
    isOnline: true,
  },
];

const channels: Channel[] = ['whatsapp', 'linkedin', 'gmail'];

export const mockConversations: Conversation[] = contacts.map((contact, index) => {
  const channel = channels[index % channels.length];
  const messageCount = Math.floor(Math.random() * 15) + 5;
  const messages = generateMessages(contact.id, messageCount, channel);
  const unreadCount = Math.random() > 0.5 ? Math.floor(Math.random() * 5) : 0;

  return {
    id: `conv-${contact.id}`,
    channel,
    contact,
    messages,
    lastMessage: messages[messages.length - 1],
    unreadCount,
    status: Math.random() > 0.2 ? 'open' : 'resolved',
    createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
    updatedAt: messages[messages.length - 1]?.timestamp || new Date(),
  };
});

export const mockInternalComments: InternalComment[] = [
  {
    id: 'ic1',
    conversationId: 'conv-c1',
    content: 'High priority - CEO wants this closed by end of week',
    author: { id: 'team1', name: 'John Manager' },
    timestamp: new Date(Date.now() - 3600000),
  },
  {
    id: 'ic2',
    conversationId: 'conv-c1',
    content: 'Sent updated pricing to procurement team',
    author: { id: 'team2', name: 'Sales Rep' },
    timestamp: new Date(Date.now() - 1800000),
  },
];
