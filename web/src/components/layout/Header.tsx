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
                  <a
                    key={`header-link-${idx}`}
                    href={item.link}
                    className="text-[12px] font-semibold text-[#0b1957] hover:opacity-80 transition-opacity"
                  >
                    {item.name}
                  </a>
                ))}
              </div>
            ) : (
              <MobileNavToggle
                isOpen={isMobileMenuOpen}
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              />
            )}
          </MobileNavHeader>

          <MobileNavMenu
            isOpen={isMobileMenuOpen}
            onClose={() => setIsMobileMenuOpen(false)}
          >
            {navItems.map((item, idx) => (
              <a
                key={`mobile-link-${idx}`}
                href={item.link}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`relative text-neutral-600 dark:text-neutral-300 ${pathname === item.link ? 'font-bold text-[#0b1957] dark:text-[#0b1957]' : ''}`}
              >
                <span className="block">{item.name}</span>
              </a>
            ))}
          </MobileNavMenu>
        </MobileNav>
      </Navbar>
    </div>
  );
}

export default function Header() {
  return <NavbarDemo />;
}