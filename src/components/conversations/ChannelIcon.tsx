import { memo } from 'react';
import { Linkedin, Mail } from 'lucide-react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faWhatsapp } from '@fortawesome/free-brands-svg-icons';
import { Channel } from '@/types/conversation';
import { cn } from '@/lib/utils';

interface ChannelIconProps {
  channel: Channel;
  size?: number;
  className?: string;
  showBackground?: boolean;
}

const channelConfig: Record<Channel, { colorClass: string; bgClass: string; color: string }> = {
  whatsapp: {
    colorClass: 'text-green-500',
    bgClass: 'bg-green-100',
    color: '#25D366',
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
};

export const ChannelIcon = memo(function ChannelIcon({
  channel,
  size = 16,
  className,
  showBackground = false,
}: ChannelIconProps) {
  const config = channelConfig[channel];

  const renderIcon = () => {
    if (channel === 'whatsapp') {
      return (
        <FontAwesomeIcon
          icon={faWhatsapp}
          size={`${size}px` as any}
          style={{ color: config.color }}
        />
      );
    } else if (channel === 'linkedin') {
      return <Linkedin size={size} style={{ color: config.color }} />;
    } else if (channel === 'gmail') {
      return <Mail size={size} style={{ color: config.color }} />;
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
