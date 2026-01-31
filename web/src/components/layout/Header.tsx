'use client';

import { useState, memo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Header = memo(function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  // Helper to check if a link is active
  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    if (href.startsWith('/#')) return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <header className="sticky top-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-b border-gray-200 dark:border-gray-700">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo and Company */}
          <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <h1 className="text-3xl font-bold text-[#0b1957] dark:text-white">LAD</h1>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <Link href="/" className={`transition-all font-medium pb-2 border-b-2 ${
              isActive('/') 
                ? 'font-bold text-[#0b1957] dark:text-white border-[#0b1957]' 
                : 'text-gray-700 dark:text-white hover:text-[#0b1957] dark:hover:text-white border-transparent'
            }`}>
              Home
            </Link>
            <Link href="/pricing" className={`transition-all font-medium pb-2 border-b-2 ${
              isActive('/pricing')
                ? 'font-bold text-[#0b1957] dark:text-white border-[#0b1957]'
                : 'text-gray-700 dark:text-white hover:text-[#0b1957] dark:hover:text-white border-transparent'
            }`}>
              Pricing
            </Link>
            <Link href="/contact" className={`transition-all font-medium pb-2 border-b-2 ${
              isActive('/contact')
                ? 'font-bold text-[#0b1957] dark:text-white border-[#0b1957]'
                : 'text-gray-700 dark:text-white hover:text-[#0b1957] dark:hover:text-white border-transparent'
            }`}>
              Contact
            </Link>
          </nav>

          {/* Auth Buttons */}
          <div className="hidden md:flex items-center gap-4">
            <Link href="/login" className={`px-6 py-2 rounded-lg transition-colors font-medium ${
              isActive('/login')
                ? 'bg-[#0b1957] text-white font-bold'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}>
              Login
            </Link>
            <Link href="/register" className={`px-6 py-3 rounded-lg transition-shadow font-medium ${
              isActive('/register')
                ? 'bg-[#0b1957] text-white font-bold'
                : 'bg-[#0b1957] text-white hover:shadow-lg'
            }`}>
              Sign Up
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6 text-gray-900 dark:text-white" />
            ) : (
              <Menu className="w-6 h-6 text-gray-900 dark:text-white" />
            )}
          </button>
        </div>

        {/* Mobile Navigation */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="md:hidden mt-4 pb-4 border-t border-gray-200 dark:border-gray-700 pt-4"
            >
              <nav className="flex flex-col gap-4">
                <Link href="/" className={`transition-all font-medium pb-2 border-b-2 ${
                  isActive('/')
                    ? 'font-bold text-[#0b1957] dark:text-white border-[#0b1957]'
                    : 'text-gray-700 dark:text-white hover:text-[#0b1957] dark:hover:text-white border-transparent'
                }`}>
                  Home
                </Link>
                <Link href="/#features" className={`transition-all font-medium pb-2 border-b-2 ${
                  isActive('/#features')
                    ? 'font-bold text-[#0b1957] dark:text-white border-[#0b1957]'
                    : 'text-gray-700 dark:text-white hover:text-[#0b1957] dark:hover:text-white border-transparent'
                }`}>
                  Features
                </Link>
                <Link href="/pricing" className={`transition-all font-medium pb-2 border-b-2 ${
                  isActive('/pricing')
                    ? 'font-bold text-[#0b1957] dark:text-white border-[#0b1957]'
                    : 'text-gray-700 dark:text-white hover:text-[#0b1957] dark:hover:text-white border-transparent'
                }`}>
                  Pricing
                </Link>
                <Link href="/contact" className={`transition-all font-medium pb-2 border-b-2 ${
                  isActive('/contact')
                    ? 'font-bold text-[#0b1957] dark:text-white border-[#0b1957]'
                    : 'text-gray-700 dark:text-white hover:text-[#0b1957] dark:hover:text-white border-transparent'
                }`}>
                  Contact
                </Link>
                <div className="flex gap-3 mt-4">
                  <Link href="/login" className={`flex-1 px-4 py-2 text-center rounded-lg transition-colors font-medium ${
                    isActive('/login')
                      ? 'bg-[#0b1957] text-white font-bold'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}>
                    Login
                  </Link>
                  <Link href="/register" className={`flex-1 px-4 py-2 text-center rounded-lg transition-shadow font-medium ${
                    isActive('/register')
                      ? 'bg-[#0b1957] text-white font-bold'
                      : 'bg-[#0b1957] text-white hover:shadow-lg'
                  }`}>
                    Sign Up
                  </Link>
                </div>
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
});

export default Header;
