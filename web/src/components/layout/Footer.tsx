'use client';

import Link from 'next/link';
import { memo } from 'react';

const Footer = memo(function Footer() {
  return (
    <footer className=" text-white bg-[#000724] text-white py-16">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-4 gap-8 mb-12">
          {/* Company Info */}
          <div>
            <h3 className="text-2xl font-bold mb-4">Mr LAD</h3>
            <p className="text-gray-300 text-sm mb-2">Powered by Techiemaya</p>
            <p className="text-gray-400 text-sm">
              AI-powered agents that close deals automatically across all communication channels.
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Product</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/#features" className="text-gray-300 hover:text-white transition-colors">
                  Features
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="text-gray-300 hover:text-white transition-colors">
                  Pricing
                </Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Company</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/blog" className="text-gray-300 hover:text-white transition-colors">
                  Blog
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-gray-300 hover:text-white transition-colors">
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Legal</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/privacy-policy" className="text-gray-300 hover:text-white transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms-of-service" className="text-gray-300 hover:text-white transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/cookies-policy" className="text-gray-300 hover:text-white transition-colors">
                  Cookies Policy
                </Link>
              </li>
              <li>
                <Link href="/account-deletion-policy" className="text-gray-300 hover:text-white transition-colors">
                  Account Deletion Policy
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-700 pt-8">
          {/* Copyright */}
          <div className="text-center text-gray-400 text-sm">
            <p>&copy; 2026 Mr LAD by Techiemaya. All rights reserved.</p>
          </div>
        </div>
      </div>
    </footer>
  );
});

export default Footer;
