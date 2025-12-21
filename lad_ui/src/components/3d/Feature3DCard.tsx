'use client';

import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { ReactNode, useRef } from 'react';

interface Feature3DCardProps {
  title: string;
  description: string;
  icon: ReactNode;
  gradient: string;
  index: number;
}

const Feature3DCard = ({ title, description, icon, gradient, index }: Feature3DCardProps) => {
  const ref = useRef<HTMLDivElement>(null);
  
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  
  const mouseXSpring = useSpring(x);
  const mouseYSpring = useSpring(y);
  
  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["17.5deg", "-17.5deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-17.5deg", "17.5deg"]);
  
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    
    const rect = ref.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const xPct = mouseX / width - 0.5;
    const yPct = mouseY / height - 0.5;
    
    x.set(xPct);
    y.set(yPct);
  };
  
  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1, duration: 0.5 }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        rotateX,
        rotateY,
        transformStyle: "preserve-3d",
      }}
      className="relative group"
    >
      {/* Glow effect */}
      <motion.div
        className={`absolute -inset-1 bg-gradient-to-r ${gradient} rounded-2xl blur-xl opacity-0 group-hover:opacity-75 transition-opacity duration-500`}
        style={{
          transform: "translateZ(-50px)",
        }}
      />
      
      {/* Card */}
      <div className="relative bg-white dark:bg-gray-900 rounded-2xl p-8 shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        {/* Background gradient overlay */}
        <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-5`} />
        
        {/* Floating icon */}
        <motion.div
          className="relative mb-6"
          style={{
            transform: "translateZ(75px)",
          }}
          whileHover={{ scale: 1.1, rotateZ: 5 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          <div className={`w-16 h-16 rounded-xl bg-gradient-to-r ${gradient} flex items-center justify-center shadow-lg`}>
            {icon}
          </div>
        </motion.div>
        
        {/* Content */}
        <motion.div
          style={{
            transform: "translateZ(50px)",
          }}
        >
          <h3 className="text-2xl font-bold mb-3 bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
            {title}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
            {description}
          </p>
        </motion.div>
        
        {/* Shine effect */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
          style={{
            transform: "translateX(-100%)",
          }}
          whileHover={{
            transform: "translateX(100%)",
          }}
          transition={{ duration: 0.6 }}
        />
        
        {/* 3D depth indicators */}
        <div className="absolute top-4 right-4 flex gap-1">
          {[...Array(3)].map((_, i) => (
            <motion.div
              key={i}
              className={`w-1.5 h-1.5 rounded-full bg-gradient-to-r ${gradient}`}
              style={{
                transform: `translateZ(${(i + 1) * 10}px)`,
              }}
              animate={{
                opacity: [0.3, 1, 0.3],
              }}
              transition={{
                duration: 2,
                delay: i * 0.2,
                repeat: Infinity,
              }}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
};

export default Feature3DCard;
