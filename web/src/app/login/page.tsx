"use client";
import React from 'react';
import Login from '../../components/auth/Login';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Image from 'next/image';
import { motion } from 'framer-motion';

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-[#1a2f6b] flex flex-col">
      <main className="flex-1 flex items-start pt-8 md:pt-0 md:items-center justify-center">
        <div className="w-full max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 items-center px-4 py-6 md:py-12">
          {/* Left: Hero / Illustration + marketing */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7 }}
            className="hidden md:flex flex-col gap-6 items-start justify-center"
          >
            <div className="relative w-full h-[720px]">
              <Image src="/LAD-Image.svg" alt="LAD hero" fill style={{ objectFit: 'cover' }} priority={false} />
            </div>

            {/* <h2 className="text-4xl font-bold text-[#0b1957] dark:text-white">LAD — Let Agent Deal</h2> */}
            {/* <p className="text-lg text-gray-600 dark:text-gray-300 max-w-md">
              AI agents that autonomously handle sales — qualify leads, negotiate and close
              deals across voice, chat, email and social channels.
            </p> */}

          </motion.div>

          {/* Right: Login form */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="p-8 md:p-12 flex flex-col justify-center items-center"
          >
            <Login />
          </motion.div>
        </div>
      </main>
    </div>
  );
}
