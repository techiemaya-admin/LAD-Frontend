'use client';

import { motion } from 'framer-motion';
import { Phone, Mail, MessageSquare, Share2 } from 'lucide-react';

const FloatingCommunicationOrbs = () => {
  const orbs = [
    { 
      icon: Phone, 
      color: 'from-blue-500 to-cyan-500',
      label: 'Voice Calls',
      delay: 0,
      path: 'M50,50 Q80,30 100,50 T150,50'
    },
    { 
      icon: Mail, 
      color: 'from-purple-500 to-pink-500',
      label: 'Email',
      delay: 0.2,
      path: 'M50,50 Q20,70 50,100 T100,100'
    },
    { 
      icon: MessageSquare, 
      color: 'from-green-500 to-emerald-500',
      label: 'Chat',
      delay: 0.4,
      path: 'M50,50 Q80,80 120,70 T180,80'
    },
    { 
      icon: Share2, 
      color: 'from-orange-500 to-red-500',
      label: 'Social Media',
      delay: 0.6,
      path: 'M50,50 Q10,40 30,10 T60,0'
    },
  ];

  return (
    <div className="relative w-full h-[600px] overflow-hidden">
      {/* Central AI Core */}
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
        initial={{ scale: 0, rotate: 0 }}
        animate={{ 
          scale: [1, 1.1, 1],
          rotate: 360
        }}
        transition={{ 
          duration: 20,
          repeat: Infinity,
          ease: "linear"
        }}
      >
        <div className="relative w-32 h-32">
          {/* Outer ring */}
          <motion.div
            className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 opacity-20"
            animate={{
              scale: [1, 1.5, 1],
              opacity: [0.2, 0.4, 0.2]
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          
          {/* Middle ring */}
          <motion.div
            className="absolute inset-4 rounded-full bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 opacity-30"
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
          <div className="absolute inset-8 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center shadow-2xl">
            <span className="text-white font-bold text-2xl">LAD</span>
          </div>
        </div>
      </motion.div>

      {/* Floating Communication Orbs */}
      {orbs.map((orb, index) => {
        const Icon = orb.icon;
        const angle = (index * 2 * Math.PI) / orbs.length;
        const radius = 200;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;

        return (
          <motion.div
            key={index}
            className="absolute top-1/2 left-1/2"
            style={{
              x: x,
              y: y
            }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.7, 1, 0.7],
              x: [x, x * 1.2, x],
              y: [y, y * 1.2, y]
            }}
            transition={{
              duration: 4,
              delay: orb.delay,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            <div className={`relative group cursor-pointer`}>
              {/* Glow effect */}
              <motion.div
                className={`absolute -inset-4 bg-gradient-to-r ${orb.color} rounded-full blur-xl opacity-50`}
                animate={{
                  scale: [1, 1.5, 1],
                  opacity: [0.3, 0.6, 0.3]
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
              
              {/* Orb */}
              <div className={`relative w-20 h-20 rounded-full bg-gradient-to-r ${orb.color} flex items-center justify-center shadow-2xl transform group-hover:scale-110 transition-transform duration-300`}>
                <Icon className="w-10 h-10 text-white" />
              </div>
              
              {/* Label */}
              <motion.div
                className="absolute top-full mt-2 left-1/2 -translate-x-1/2 whitespace-nowrap bg-black/80 text-white px-3 py-1 rounded-full text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                initial={{ y: -10 }}
                whileHover={{ y: 0 }}
              >
                {orb.label}
              </motion.div>
            </div>
          </motion.div>
        );
      })}

      {/* Connection Lines */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity: 0.2 }}>
        {orbs.map((_, index) => {
          const angle = (index * 2 * Math.PI) / orbs.length;
          const radius = 200;
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
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="50%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#ec4899" />
          </linearGradient>
        </defs>
      </svg>

      {/* Floating particles */}
      {[...Array(20)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 rounded-full bg-blue-500"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
          animate={{
            y: [0, -30, 0],
            opacity: [0, 1, 0],
            scale: [0, 1, 0]
          }}
          transition={{
            duration: 3 + Math.random() * 2,
            delay: Math.random() * 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      ))}
    </div>
  );
};

export default FloatingCommunicationOrbs;
