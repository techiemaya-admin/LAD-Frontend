"use client";
import ForgotPassword from '../../components/auth/ForgotPassword';
import Image from 'next/image';
import { motion } from 'framer-motion';

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-[#0b1957] flex flex-col">
      <main className="flex-1 flex items-center justify-center">
        <div className="w-full max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 items-center px-4 py-12">
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
          </motion.div>

          {/* Right: ForgotPassword form */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="p-8 md:p-12 flex flex-col justify-center items-center"
          >
            <ForgotPassword />
          </motion.div>
        </div>
      </main>
    </div>
  );
}
