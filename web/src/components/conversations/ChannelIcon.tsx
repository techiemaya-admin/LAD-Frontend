import { memo } from 'react';
import { Linkedin, Mail, Instagram, Building2, Server } from 'lucide-react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faWhatsapp } from '@fortawesome/free-brands-svg-icons';
import { faMicrosoft } from '@fortawesome/free-brands-svg-icons';
import { Channel, WaSubChannel } from '@/types/conversation';
import { cn } from '@/lib/utils';

// Includes virtual sub-channels not in the SDK Channel union (e.g. 'custom_email')
type AnyChannel = Channel | WaSubChannel | 'custom_email';

interface ChannelIconProps {
  channel: AnyChannel;
  size?: number;
  className?: string;
  showBackground?: boolean;
  overrideColor?: string;
}

const channelConfig: Record<string, { colorClass: string; bgClass: string; color: string }> = {
  whatsapp: {
    colorClass: 'text-green-500',
    bgClass: 'bg-green-100',
    color: '#25D366',
  },
  personal_whatsapp: {
    colorClass: 'text-green-500',
    bgClass: 'bg-green-100',
    color: '#25D366',
  },
  business_whatsapp: {
    colorClass: 'text-emerald-600',
    bgClass: 'bg-emerald-100',
    color: '#128C7E',
  },
  linkedin: {
    colorClass: 'text-blue-600',
    bgClass: 'bg-blue-100',
    color: '#0077B5',
  },
  gmail: {
    colorClass: 'text-orange-300',
    bgClass: 'bg-orange-100',
    color: '#FFB563',
  },
  outlook: {
    colorClass: 'text-blue-700',
    bgClass: 'bg-blue-50',
    color: '#0078D4',
  },
  custom_email: {
    colorClass: 'text-emerald-600',
    bgClass: 'bg-emerald-50',
    color: '#059669',
  },
  instagram: {
    colorClass: 'text-pink-600',
    bgClass: 'bg-pink-50',
    color: '#E4405F',
  },
};

export const ChannelIcon = memo(function ChannelIcon({
  channel,
  size = 16,
  className,
  showBackground = false,
  overrideColor,
}: ChannelIconProps) {
  const config = channelConfig[channel] ?? channelConfig.whatsapp;
  const iconColor = overrideColor || config.color;

  const renderIcon = () => {
    if (channel === 'whatsapp' || channel === 'personal_whatsapp') {
      return (
        <FontAwesomeIcon
          icon={faWhatsapp}
          size={`${size}px` as any}
          style={{ color: iconColor }}
        />
      );
    } else if (channel === 'business_whatsapp') {
      // WhatsApp Business — WA icon with a small building overlay
      return (
        <div className="relative inline-flex">
          <FontAwesomeIcon
            icon={faWhatsapp}
            size={`${size}px` as any}
            style={{ color: iconColor }}
          />
          <Building2
            size={Math.max(8, Math.round(size * 0.55))}
            className="absolute -bottom-0.5 -right-1 text-emerald-700 bg-white rounded-full"
          />
        </div>
      );
    } else if (channel === 'linkedin') {
      return <Linkedin size={size} style={{ color: iconColor }} />;
    } else if (channel === 'gmail') {
      return <Mail size={size} style={{ color: iconColor }} />;
    } else if (channel === 'outlook') {
      return (
        <FontAwesomeIcon
          icon={faMicrosoft}
          size={`${size}px` as any}
          style={{ color: iconColor }}
        />
      );
    } else if (channel === 'custom_email') {
      // Self-hosted SMTP — server icon makes the distinction obvious vs Gmail/Outlook
      return <Server size={size} style={{ color: iconColor }} />;
    } else if (channel === 'instagram') {
      return <Instagram size={size} style={{ color: iconColor }} />;
    }
  };

  if (showBackground) {
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-full p-1.5',
          config.bgClass,
          className
        )}
      >
        {renderIcon()}
      </div>
    );
  }

  return <div className={className}>{renderIcon()}</div>;
});
