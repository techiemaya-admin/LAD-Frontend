"use client";
import {
  Navbar,
  NavBody,
  NavItems,
  MobileNav,
  NavbarLogo,
  NavbarButton,
  MobileNavHeader,
  MobileNavToggle,
  MobileNavMenu,
} from "@/components/ui/resizable-navbar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { motion } from "framer-motion";
import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";

export function NavbarDemo() {
  const router = useRouter();
  const pathname = usePathname();
  const navItems = [
    {
      name: "Home",
      link: "/",
    },
    {
      name: "Pricing",
      link: "/pricing",
    },
    {
      name: "Contact",
      link: "/contact",
    },
  ];

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleGetStarted = () => {
    router.push('/onboarding');
  };

  const login = () => {
    router.push('/login');
  };
  const isLoginPage = pathname === '/login';
  return (
    <div className="relative w-full">
      <Navbar>
        {/* Desktop Navigation */}
        <NavBody>
          <NavbarLogo />
          <NavItems items={navItems} activePath={pathname} />
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <NavbarButton variant="secondary" onClick={login}>Login</NavbarButton>
            <NavbarButton variant="primary" onClick={handleGetStarted}>Get Started</NavbarButton>
          </div>
        </NavBody>

        {/* Mobile Navigation */}
        <MobileNav>
          <MobileNavHeader>
            <NavbarLogo />
            {isLoginPage ? (
              <div className="flex items-center gap-3 pr-2">
                {navItems.map((item, idx) => (
                  <motion.a
                    key={`header-link-${idx}`}
                    href={item.link}
                    whileTap={{ scale: 0.9 }}
                    transition={{ type: "spring", stiffness: 400, damping: 17 }}
                    className="text-[12px] font-semibold text-[#0b1957] hover:opacity-80 transition-opacity select-none"
                  >
                    {item.name}
                  </motion.a>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <ThemeToggle />
                <MobileNavToggle
                  isOpen={isMobileMenuOpen}
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                />
              </div>
            )}
          </MobileNavHeader>

          <MobileNavMenu
            isOpen={isMobileMenuOpen}
            onClose={() => setIsMobileMenuOpen(false)}
          >
            <div className="mb-4 flex items-center gap-2 border-b pb-4">
              <span className="text-sm font-medium text-foreground">Theme:</span>
              <ThemeToggle />
            </div>
            {navItems.map((item, idx) => (
              <motion.a
                key={`mobile-link-${idx}`}
                href={item.link}
                onClick={() => setIsMobileMenuOpen(false)}
                whileTap={{ scale: 0.92 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
                className={`relative text-neutral-600 dark:text-neutral-300 select-none ${pathname === item.link ? 'font-bold text-[#0b1957] dark:text-[#0b1957]' : ''}`}
              >
                <span className="block">{item.name}</span>
              </motion.a>
            ))}
            <div className="flex w-full flex-col gap-4">
              <NavbarButton
                onClick={() => {
                  setIsMobileMenuOpen(false)
                  login();
                }}
                variant="secondary"
                className="w-full"
              >
                Login
              </NavbarButton>
              <NavbarButton
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  handleGetStarted();
                }}
                variant="primary"
                className="w-full"
              >
                Get Started
              </NavbarButton>
            </div>
          </MobileNavMenu>
        </MobileNav>
      </Navbar>
    </div>
  );
}

export default function Header() {
  return <NavbarDemo />;
}