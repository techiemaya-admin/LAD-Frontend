"use client";
import { useState, useEffect } from "react";
import { Home, Phone, Video, Search, CircleDollarSign, GitFork, Cable, DollarSign, Settings, LogOut, User as UserIcon, ChevronDown, SwatchBook, ChartNoAxesCombined, Menu, X, Send, GraduationCap } from "lucide-react";
import { NavLink } from "./NavLink";
import { cn } from "@/lib/utils";
import { usePathname, useRouter } from "next/navigation";
import { useDispatch, useSelector } from 'react-redux';
import { logout as logoutAction } from '@/store/slices/authSlice';
import authService from '@/services/authService';
import { useAuth } from '@/contexts/AuthContext';
import logo from "../assets/logo.png";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
type RootState = {
  auth: {
    user: {
      id?: string;
      name?: string;
      role?: string;
      avatar?: string;
      capabilities?: string[];
    } | null;
  };
  settings: {
    companyName: string;
    companyLogo: string;
  };
};
type NavItem = {
  href: string;
  label: string;
  icon: any;
  details: string;
  requiredCapability?: string;
  requiredFeature?: string; // For feature-flag based access
};
export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useDispatch();
  const { hasFeature } = useAuth();
  const user = useSelector((state: RootState) => state.auth.user);
  const companyLogo = useSelector((state: RootState) => state.settings.companyLogo);
  const [isExpanded, setIsExpanded] = useState(false);
  const [displayName, setDisplayName] = useState('User');
  const [isHydrated, setIsHydrated] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  // Education vertical context
  const isEducation = hasFeature('education_vertical');
  // Hydration check
  useEffect(() => {
    setIsHydrated(true);
  }, []);
  // Update display name when user data changes
  useEffect(() => {
    if (!isHydrated) return;
    setDisplayName(user?.name || 'User');
  }, [user, isHydrated]);
  const handleLogout = async () => {
    try {
      await authService.logout();
      dispatch(logoutAction());
      setTimeout(() => router.push('/login'), 1200);
    } catch (e) {
      dispatch(logoutAction());
      setTimeout(() => router.push('/login'), 1200);
    }
    setIsMobileMenuOpen(false);
  };
  // Define all possible navigation items with their required capabilities
  const allNavItems: NavItem[] = [
    {
      href: "/dashboard",
      label: "Overview",
      icon: Home,
      details: "See your overall dashboard and metrics.",
      requiredCapability: 'view_overview'
    },
    {
      href: "/onboarding",
      label: "AI Assistant",
      icon: Search,
      details: "AI-powered ICP assistant and workflow setup",
      requiredCapability: 'view_ai_assistant'
    },
    {
      href: "/campaigns",
      label: "Campaigns",
      icon: Send,
      details: "Multi-channel outreach campaigns with LinkedIn and Email automation.",
      requiredCapability: 'view_campaigns'
    },
    {
      href: "/make-call",
      label: "Make a Call",
      icon: Phone,
      details: "Place outgoing calls using your assigned numbers.",
      requiredCapability: 'view_make_call'
    },
    {
      href: "/call-logs",
      label: "Call Logs",
      icon: ChartNoAxesCombined,
      details: "Review past call history and recordings.",
      requiredCapability: 'view_call_logs'
    },
    {
      href: "/pipeline",
      label: isEducation ? "Students" : "Pipeline",
      icon: isEducation ? GraduationCap : CircleDollarSign,
      details: isEducation ? "Manage student admissions and counseling." : "Manage your sales pipeline and deals.",
      requiredCapability: 'view_pipeline'
    },
  ];
  // Filter navigation items based on user capabilities (only after hydration)
  const nav = isHydrated ? allNavItems.filter(item => {
    // If user is admin or owner, show all items
    const isAdminOrOwner = user?.role === 'admin' || user?.role === 'owner';
    // Admin/owner sees all items
    if (isAdminOrOwner && !item.requiredCapability) return true;
    // If the item doesn't require any specific capability, show it
    if (!item.requiredCapability) return true;
    // TEMPORARY: If no capabilities are defined or empty array, show all items
    // TODO: Implement proper RBAC with capabilities from backend
    if (!user?.capabilities || user.capabilities.length === 0 || (user.capabilities.length === 1 && user.capabilities[0] === null)) {
      return true; // Show all items when no capabilities are set
    }
    // Check if user has the required capability
    const hasCapability = user.capabilities.includes(item.requiredCapability);
    return hasCapability;
  }) : []; // Show empty nav during SSR to prevent hydration mismatch
  return (
    <>
      {/* Mobile Top Bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 z-[60] bg-sidebar/95 backdrop-blur-2xl border-b border-sidebar-border flex items-center justify-between px-3">
        <button
          aria-label="Open menu"
          className="p-2 rounded-lg hover:bg-white/10 active:scale-95 transition"
          onClick={() => setIsMobileMenuOpen(true)}
        >
          <Menu className="h-6 w-6 text-sidebar-foreground" />
        </button>
        <div className="flex items-center gap-2">
          <img
            src={isHydrated && companyLogo ? companyLogo : logo.src}
            alt="Company Logo"
            loading="eager"
            fetchPriority="high"
            decoding="async"
            className="w-8 h-8 object-contain"
          />
          <span className="text-sm font-medium text-sidebar-foreground/90">{displayName}</span>
        </div>
        <div className="w-10" />
      </div>
      {/* Mobile Drawer */}
      <div
        className={cn(
          "md:hidden fixed inset-y-0 left-0 w-72 bg-sidebar/95 backdrop-blur-2xl border-r border-sidebar-border shadow-2xl z-[70]",
          "transition-transform duration-300 ease-out",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="h-14 px-3 flex items-center justify-between border-b border-sidebar-border">
          <div className="flex items-center gap-2">
            <img
              src={isHydrated && companyLogo ? companyLogo : logo.src}
              alt="Company Logo"
              loading="eager"
              fetchPriority="high"
              decoding="async"
              className="w-8 h-8 object-contain"
            />
            <span className="text-sm font-semibold text-sidebar-foreground">LAD</span>
          </div>
          <button aria-label="Close menu" onClick={() => setIsMobileMenuOpen(false)} className="p-2 rounded-lg hover:bg-white/10">
            <X className="h-5 w-5 text-sidebar-foreground" />
          </button>
        </div>
        <nav className="flex-1 flex flex-col px-2 space-y-1 py-2 overflow-y-auto">
          {nav.map((n) => {
            const Icon = n.icon;
            const isActive = pathname === n.href;
            return (
              <div key={n.href} className="relative group">
                <NavLink
                  href={n.href}
                  className={cn(
                    "relative flex items-center rounded-xl overflow-visible px-3 h-12",
                    isActive ? "bg-primary/90 text-white" : "hover:bg-white/10 text-sidebar-foreground"
                  )}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Icon className={cn("h-5 w-5", isActive ? "text-white" : "text-sidebar-foreground")} />
                  <span className="ml-3 text-sm font-medium">{n.label}</span>
                </NavLink>
              </div>
            );
          })}
        </nav>
        {/* Mobile User/Settings/Pricing/Logout */}
        <div className="border-t border-sidebar-border p-3 space-y-2">
          <NavLink
            href="/pricing"
            className="w-full flex items-center gap-2 rounded-xl px-4 py-2 hover:bg-white/10 text-sm text-sidebar-foreground"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <DollarSign className="h-4 w-4" />
            <span>Pricing</span>
          </NavLink>
          <NavLink
            href="/settings"
            className="w-full flex items-center gap-2 rounded-xl px-4 py-2 hover:bg-white/10 text-sm text-sidebar-foreground"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <Settings className="h-4 w-4" />
            <span>Settings</span>
          </NavLink>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 rounded-xl px-4 py-2 bg-white/10 hover:bg-white/15 text-sm text-sidebar-foreground"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </div>
      {/* Mobile Backdrop */}
      {isMobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/40 z-[65]"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
      <aside
        className={cn(
          "hidden md:flex flex-col shrink-0 h-screen border-r border-sidebar-border shadow-2xl",
          "bg-white",
          "transition-all duration-500 ease-[cubic-bezier(.4,0,.2,1)]",
          "overflow-hidden fixed left-0 top-0 z-50",
          isExpanded ? "w-64" : "w-16"
        )}
        onMouseEnter={() => setIsExpanded(true)}
        onMouseLeave={() => setIsExpanded(false)}
      >
      {/* Logo */}
      <div
        className={cn(
          "flex items-center justify-center transition-all duration-500 ease-[cubic-bezier(.19,1,.22,1)]",
          isExpanded ? "my-6" : "my-4"
        )}
      >
        <img
          src={isHydrated && companyLogo ? companyLogo : logo.src}
          alt="Company Logo"
          loading="eager"
          fetchPriority="high"
          decoding="async"
          className={cn(
            "object-contain drop-shadow-[0_4px_18px_rgba(0,0,0,0.45)] transition-all duration-500 ease-[cubic-bezier(.19,1,.22,1)]",
            isExpanded ? "w-24 h-24" : "w-10 h-10"
          )}
        />
      </div>
      {/* Navigation */}
      <nav className="flex-1 flex flex-col px-2 space-y-1 py-2">
        {nav.map((n) => {
          const Icon = n.icon;
          const isActive = pathname === n.href;
          return (
            <div key={n.href} className="relative group">
              <NavLink
                href={n.href}
                className={cn(
                  "relative flex items-center rounded-2xl overflow-visible",
                  "transition-all duration-400 ease-[cubic-bezier(.19,1,.22,1)]",
                  "hover:-translate-y-[2px] hover:scale-[1.01]",
                  isExpanded
                    ? "pl-3 pr-4 h-12 w-full"
                    : "h-12 w-12 mx-auto justify-center"
                )}
              >
                {/* Active / hover glass background */}
                <div
                  className={cn(
                    "absolute inset-0 z-0 rounded-2xl",
                    "transition-all duration-400 ease-[cubic-bezier(.19,1,.22,1)]",
                    isActive
                      ? "bg-primary/95 backdrop-blur-xl shadow-[0_10px_30px_rgba(0,0,0,0.45)]"
                      : "bg-transparent group-hover:bg-white/10 group-hover:backdrop-blur-sm group-hover:shadow-[0_8px_24px_rgba(0,0,0,0.38)]"
                  )}
                />
                {/* Icon wrapper */}
                <div
                  className={cn(
                    "relative z-10 flex justify-center items-center flex-shrink-0",
                    "w-10 h-10 rounded-xl",
                    "transition-all duration-400 ease-[cubic-bezier(.19,1,.22,1)]",
                    // isActive
                    //   ? "bg-white/20"
                    //   : "bg-primary-light/80 group-hover:bg-primary-light/90",
                    // "group-hover:translate-x-[1px]"
                  )}
                >
                  <Icon
                    className={cn(
                      "h-5 w-5 transition-colors duration-300 relative z-10",
                      isActive
                        ? "text-white"
                        : "text-gray-900 group-hover:text-black"
                    )}
                    style={!isActive ? { color: '#1a1a1a !important' } : undefined}
                  />
                </div>
                {/* Label */}
                {isExpanded && (
                  <span
                    className={cn(
                      "relative z-10 text-sm font-medium whitespace-nowrap ml-3",
                      "transition-all duration-500 ease-[cubic-bezier(.4,0,.2,1)]",
                      isActive ? "text-white group-hover:text-white" : "text-gray-900 group-hover:text-black"
                    )}
                    style={!isActive ? { color: '#1a1a1a !important' } : undefined}
                  >
                    {n.label}
                  </span>
                )}
              </NavLink>
              {/* Tooltip for collapsed state */}
              {!isExpanded && (
                <div
                  className={cn(
                    "absolute left-full ml-3 px-3 py-2 rounded-xl border border-white/10",
                    "bg-sidebar/95 backdrop-blur-xl shadow-[0_10px_30px_rgba(0,0,0,0.5)]",
                    "opacity-0 invisible scale-95 translate-y-[2px] pointer-events-none",
                    "group-hover:opacity-100 group-hover:visible group-hover:scale-100 group-hover:translate-y-0",
                    "transition-all duration-250 ease-[cubic-bezier(.19,1,.22,1)]",
                    "whitespace-nowrap z-[100] top-0"
                  )}
                >
                  <span className="block text-xs font-medium text-gray-900" style={{ color: 'oklch(0.145 0 0)', WebkitTextFillColor: 'oklch(0.145 0 0)' }}>
                    {n.label}
                  </span>
                  {n.details && (
                    <span className="block mt-0.5 text-[11px] text-muted-foreground/80 max-w-[200px]">
                      {n.details}
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </nav>
      {/* User Profile Dropdown Section */}
      <div className="border-t border-sidebar-border mt-auto">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div
              className={cn(
                "flex items-center p-3 transition-all duration-500 cursor-pointer hover:bg-white/5",
                isExpanded ? "justify-start gap-3" : "justify-center"
              )}
            >
              {/* Avatar */}
              {isHydrated && user?.avatar ? (
                <img
                  src={user.avatar}
                  className="w-9 h-9 rounded-full object-cover flex-shrink-0"
                  alt="avatar"
                />
              ) : (
                <div className="w-9 h-9 rounded-full flex items-center justify-center bg-primary text-white font-semibold text-sm flex-shrink-0">
                  {displayName.charAt(0).toUpperCase()}
                </div>
              )}
              {/* User Info - shown when expanded */}
              {isExpanded && (
                <div className="flex items-center justify-between min-w-0 flex-1 gap-2">
                  <div className="flex flex-col items-start justify-center min-w-0 flex-1">
                    <div className="text-sm text-gray-900 font-medium leading-tight truncate w-full" style={{ color: 'oklch(0.145 0 0)', WebkitTextFillColor: 'oklch(0.145 0 0)' }}>
                      {displayName}
                    </div>
                    <div className="text-xs text-muted-foreground/80 leading-tight">
                      {user?.role || 'admin'}
                    </div>
                  </div>
                  <ChevronDown className="h-4 w-4 text-muted-foreground/60 flex-shrink-0" />
                </div>
              )}
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="top" className="w-56 mb-2 ml-2">
            <DropdownMenuItem asChild>
              <NavLink href="/pricing" className="flex items-center cursor-pointer">
                <DollarSign className="mr-2 h-4 w-4" />
                <span>Pricing</span>
              </NavLink>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <NavLink href="/settings" className="flex items-center cursor-pointer">
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </NavLink>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={handleLogout}
              className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer"
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>Logout</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        {/* Version Number */}
        <div className="h-10 flex items-center justify-center border-t border-sidebar-border/50">
          {isExpanded && (
            <span className="text-[11px] tracking-wide text-muted-foreground/80 transition-opacity duration-500">
              v1.0.0
            </span>
          )}
        </div>
      </div>
      </aside>
    </>
  );
}