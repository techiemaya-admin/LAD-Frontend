'use client';

import { motion } from 'framer-motion';

interface LADLogo3DProps {
  size?: 'sm' | 'md' | 'lg';
  animated?: boolean;
}

const LADLogo3D = ({ size = 'md', animated = true }: LADLogo3DProps) => {
  const sizes = {
    sm: { container: 120, avatar: 50, text: 'text-sm', icon: 16 },
    md: { container: 200, avatar: 85, text: 'text-2xl', icon: 28 },
    lg: { container: 280, avatar: 120, text: 'text-4xl', icon: 40 },
  };

  const config = sizes[size];

  return (
    <div 
      className="relative flex flex-col items-center justify-center"
      style={{ width: config.container, height: config.container }}
    >
      {/* Floating communication icons */}
      <motion.div
        className="absolute"
        style={{ top: '15%', left: '10%' }}
        animate={animated ? {
          y: [0, -10, 0],
          opacity: [0.6, 1, 0.6],
        } : undefined}
        transition={animated ? {
          duration: 2.5,
          repeat: Infinity,
          ease: "easeInOut"
        } : undefined}
      >
        {/* Phone icon */}
        <div 
          className="rounded-lg bg-gradient-to-br from-cyan-400 to-cyan-600 p-2 shadow-lg"
          style={{ width: config.icon, height: config.icon }}
        >
          <svg viewBox="0 0 24 24" fill="white" className="w-full h-full">
            <path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56a.977.977 0 0 0-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z"/>
          </svg>
        </div>
      </motion.div>

      <motion.div
        className="absolute"
        style={{ top: '10%', right: '15%' }}
        animate={animated ? {
          y: [0, -8, 0],
          opacity: [0.6, 1, 0.6],
        } : undefined}
        transition={animated ? {
          duration: 3,
          delay: 0.5,
          repeat: Infinity,
          ease: "easeInOut"
        } : undefined}
      >
        {/* Email icon */}
        <div 
          className="rounded-lg bg-gradient-to-br from-cyan-400 to-blue-500 p-2 shadow-lg"
          style={{ width: config.icon, height: config.icon }}
        >
          <svg viewBox="0 0 24 24" fill="white" className="w-full h-full">
            <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
          </svg>
        </div>
      </motion.div>

      <motion.div
        className="absolute"
        style={{ top: '25%', right: '5%' }}
        animate={animated ? {
          y: [0, -6, 0],
          scale: [1, 1.1, 1],
          opacity: [0.6, 1, 0.6],
        } : undefined}
        transition={animated ? {
          duration: 2.8,
          delay: 1,
          repeat: Infinity,
          ease: "easeInOut"
        } : undefined}
      >
        {/* Handshake icon */}
        <div 
          className="rounded-lg bg-gradient-to-br from-yellow-400 to-yellow-600 p-2 shadow-lg"
          style={{ width: config.icon * 1.2, height: config.icon * 1.2 }}
        >
          <svg viewBox="0 0 24 24" fill="white" className="w-full h-full">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
        </div>
      </motion.div>

      {/* Main character container */}
      <motion.div
        className="relative z-10"
        animate={animated ? {
          y: [0, -5, 0],
        } : undefined}
        transition={animated ? {
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut"
        } : undefined}
      >
        {/* Character head with hoodie */}
        <div className="relative" style={{ width: config.avatar, height: config.avatar }}>
          {/* Hoodie background */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-gray-700 via-gray-800 to-gray-900 shadow-2xl overflow-hidden">
            {/* Tech circuit pattern */}
            <svg className="absolute inset-0 w-full h-full opacity-30" viewBox="0 0 100 100">
              <path d="M20 20 L40 20 L40 40 M60 20 L80 20 M20 60 L40 60 M60 60 L80 60 L80 80" 
                stroke="currentColor" strokeWidth="2" fill="none" className="text-cyan-400"/>
              <circle cx="40" cy="20" r="3" fill="currentColor" className="text-cyan-400"/>
              <circle cx="40" cy="40" r="3" fill="currentColor" className="text-cyan-400"/>
              <circle cx="60" cy="20" r="3" fill="currentColor" className="text-purple-400"/>
              <circle cx="80" cy="60" r="3" fill="currentColor" className="text-purple-400"/>
            </svg>
          </div>

          {/* Face */}
          <div className="absolute inset-[20%] top-[25%] rounded-full bg-gradient-to-br from-orange-200 to-orange-300 shadow-inner" />
          
          {/* Cyber glasses */}
          <motion.div 
            className="absolute inset-x-[15%] top-[35%] h-[20%] rounded-lg bg-gradient-to-br from-cyan-400 to-purple-600 shadow-lg"
            animate={animated ? {
              boxShadow: [
                '0 0 10px rgba(6, 182, 212, 0.5)',
                '0 0 20px rgba(147, 51, 234, 0.8)',
                '0 0 10px rgba(6, 182, 212, 0.5)',
              ],
            } : undefined}
            transition={animated ? {
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            } : undefined}
          >
            {/* Matrix-style code reflection */}
            <div className="absolute inset-0 overflow-hidden rounded-lg">
              <motion.div
                className="text-cyan-300 text-[6px] font-mono opacity-40 whitespace-nowrap"
                animate={animated ? {
                  y: ['-100%', '0%'],
                } : undefined}
                transition={animated ? {
                  duration: 3,
                  repeat: Infinity,
                  ease: "linear"
                } : undefined}
              >
                01010011010
              </motion.div>
            </div>
          </motion.div>

          {/* Hoodie strings */}
          <div className="absolute bottom-[15%] left-[35%] w-1 h-[15%] bg-cyan-400 rounded-full" />
          <div className="absolute bottom-[15%] right-[35%] w-1 h-[15%] bg-cyan-400 rounded-full" />
        </div>

        {/* Golden "A" letter */}
        <motion.div
          className="absolute -right-8 top-[20%]"
          style={{ width: config.avatar * 0.5, height: config.avatar * 0.6 }}
          animate={animated ? {
            rotateY: [0, 10, 0],
            scale: [1, 1.05, 1],
          } : undefined}
          transition={animated ? {
            duration: 2.5,
            repeat: Infinity,
            ease: "easeInOut"
          } : undefined}
        >
          <div className="w-full h-full rounded-lg bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-600 shadow-2xl flex items-center justify-center"
            style={{
              boxShadow: '0 10px 40px rgba(251, 191, 36, 0.5), inset 0 -2px 10px rgba(0,0,0,0.2)',
            }}
          >
            <span className={`${config.text} font-black text-white`} style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.3)' }}>
              A
            </span>
          </div>
        </motion.div>
      </motion.div>

      {/* LAD branding */}
      <motion.div
        className="relative mt-4"
        initial={animated ? { opacity: 0, y: 20 } : undefined}
        animate={animated ? { opacity: 1, y: 0 } : { opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className={`${config.text} font-black tracking-tight`}>
          <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 bg-clip-text text-transparent drop-shadow-lg">
            LAD
          </span>
        </div>
        <div className={`text-xs sm:text-sm text-gray-400 text-center tracking-wide uppercase font-semibold ${size === 'sm' ? 'hidden' : ''}`}>
          Let Agent Deal
        </div>
      </motion.div>

      {/* Glow effect */}
      <motion.div
        className="absolute inset-0 rounded-full blur-3xl opacity-30"
        style={{
          background: 'radial-gradient(circle, rgba(6,182,212,0.4) 0%, rgba(147,51,234,0.4) 50%, transparent 70%)',
        }}
        animate={animated ? {
          scale: [1, 1.2, 1],
          opacity: [0.2, 0.4, 0.2],
        } : undefined}
        transition={animated ? {
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut"
        } : undefined}
      />
    </div>
  );
};

export default LADLogo3D;
