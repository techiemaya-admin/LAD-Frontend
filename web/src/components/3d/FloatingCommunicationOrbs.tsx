'use client';
import { motion } from 'framer-motion';
import { Phone, Mail, MessageSquare, Share2 } from 'lucide-react';
import { useState, useEffect, memo } from 'react';

const FloatingCommunicationOrbs = memo(() => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Set initial value without animation
    setIsMobile(window.innerWidth < 768);
    
    let resizeTimeout: NodeJS.Timeout;
    const checkMobile = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        setIsMobile(window.innerWidth < 768);
      }, 150); // Debounce resize events
    };
    
    window.addEventListener('resize', checkMobile, { passive: true });
    return () => {
      window.removeEventListener('resize', checkMobile);
      clearTimeout(resizeTimeout);
    };
  }, []);

  const orbs = [
    { 
      icon: Phone, 
      color: 'from-blue-500 to-cyan-500',
      label: 'Voice Calls',
      delay: 0,
    },
    { 
      icon: Mail, 
      color: 'from-purple-500 to-pink-500',
      label: 'Email',
      delay: 0.2,
    },
    { 
      icon: MessageSquare, 
      color: 'from-green-500 to-emerald-500',
      label: 'Chat',
      delay: 0.4,
    },
    { 
      icon: Share2, 
      color: 'from-orange-500 to-red-500',
      label: 'Social Media',
      delay: 0.6,
    },
  ];

  const containerHeight = isMobile ? 'h-[400px]' : 'h-[700px]';
  const radius = isMobile ? 100 : 200;
  const coreSize = isMobile ? 'w-24 h-24' : 'w-32 h-32';
  const orbSize = isMobile ? 'w-16 h-16' : 'w-20 h-20';
  const orbIconSize = isMobile ? 'w-8 h-8' : 'w-10 h-10';

  return (
    <div className={`relative w-full ${containerHeight} overflow-hidden`}>
      {/* Central AI Core */}
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10"
        style={{ willChange: 'transform' }}
        initial={{ scale: 0, rotate: 0 }}
        animate={{ 
          scale: [1, 1.08, 1],
          rotate: 360
        }}
        transition={{ 
          duration: 25,
          repeat: Infinity,
          ease: "linear"
        }}
      >
        <div className={`relative ${coreSize}`}>
          {/* Outer ring */}
          <motion.div
            className="absolute inset-0 rounded-full bg-gradient-to-r from-[#0b1957] via-[#0b1957] to-[#0b1957] opacity-15"
            animate={{
              scale: [1, 1.5, 1],
              opacity: [0.15, 0.3, 0.15]
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          {/* Middle ring */}
          <motion.div
            className="absolute inset-2 rounded-full bg-gradient-to-r from-[#0b1957] to-[#0b1957] opacity-20"
            animate={{
              scale: [1, 1.3, 1],
              rotate: -360
            }}
            transition={{
              duration: 15,
              repeat: Infinity,
              ease: "linear"
            }}
          />
          {/* Core */}
          <div className="absolute inset-0 rounded-full bg-[#0b1957] flex items-center justify-center shadow-2xl">
            <span className="text-white font-bold text-sm md:text-2xl">LAD</span>
          </div>
        </div>
      </motion.div>

      {/* Floating Communication Orbs */}
      {orbs.map((orb, index) => {
        const Icon = orb.icon;
        const angle = (index * 2 * Math.PI) / orbs.length;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        
        return (
          <motion.div
            key={index}
            className="absolute top-1/2 left-1/2 z-5"
            style={{
              x: x,
              y: y,
              willChange: 'transform'
            }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{
              scale: [1, 1.1, 1],
              opacity: [0.7, 1, 0.7],
              x: [x, x * 1.08, x],
              y: [y, y * 1.08, y]
            }}
            transition={{
              duration: 5,
              delay: orb.delay,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            <div className="relative group cursor-pointer">
              {/* Glow effect */}
              <motion.div
                className={`absolute -inset-2 md:-inset-4 bg-gradient-to-r ${orb.color} rounded-full blur-lg opacity-40`}
                animate={{
                  scale: [1, 1.4, 1],
                  opacity: [0.25, 0.5, 0.25]
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
              {/* Orb */}
              <div className={`relative ${orbSize} rounded-full bg-gradient-to-r ${orb.color} flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform duration-300`}>
                <Icon className={`${orbIconSize} text-white`} />
              </div>
              {/* Label */}
              {!isMobile && (
                <motion.div
                  className="absolute top-full mt-2 left-1/2 -translate-x-1/2 whitespace-nowrap bg-black/80 text-white px-3 py-1 rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                  initial={{ y: -10 }}
                  whileHover={{ y: 0 }}
                >
                  {orb.label}
                </motion.div>
              )}
            </div>
          </motion.div>
        );
      })}

      {/* Connection Lines - Desktop only */}
      {!isMobile && (
        <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity: 0.1 }}>
          {orbs.map((_, index) => {
            const angle = (index * 2 * Math.PI) / orbs.length;
            const x = 50 + Math.cos(angle) * (radius / 6);
            const y = 50 + Math.sin(angle) * (radius / 6);
            return (
              <motion.line
                key={index}
                x1="50%"
                y1="50%"
                x2={`${x}%`}
                y2={`${y}%`}
                stroke="url(#gradient)"
                strokeWidth="2"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: [0, 1, 0] }}
                transition={{
                  duration: 3,
                  delay: index * 0.2,
                  repeat: Infinity,
                  ease: "linear"
                }}
              />
            );
          })}
          <defs>
            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0b1957" />
              <stop offset="100%" stopColor="#0b1957" />
            </linearGradient>
          </defs>
        </svg>
      )}

      {/* Floating particles - Mobile friendly */}
      {[...Array(isMobile ? 8 : 15)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 md:w-2 md:h-2 rounded-full bg-[#0b1957]"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            willChange: 'opacity, transform'
          }}
          animate={{
            y: [0, -15, 0],
            opacity: [0, 0.6, 0],
            scale: [0, 0.8, 0]
          }}
          transition={{
            duration: 4 + Math.random() * 2,
            delay: Math.random() * 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      ))}
    </div>
  );
});

export default FloatingCommunicationOrbs;
