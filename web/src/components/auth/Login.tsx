"use client";
import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Eye, EyeOff, Mail, Lock } from "lucide-react";
import {
  loginStart,
  loginSuccess,
  loginFailure,
  clearError,
} from "@/store/slices/authSlice";
import authService from "@/services/authService";
import { useAuth } from "@/contexts/AuthContext";
import { validateEmail, validatePassword } from "../../utils/validation";
type RootState = any;

const Login: React.FC = () => {
  const dispatch = useDispatch();
  const { refreshUser } = useAuth();

  const router = useRouter();
  const searchParams = useSearchParams();
  // Mobile entry points can arrive with the legacy `/onboarding` redirect.
  // Keep genuine deep links intact, but route that legacy destination to the
  // mobile-ready advanced search experience.
  const requestedRedirectUrl = searchParams.get('redirect_url') || '/onboarding/advanced-search-ai';
  const [isMobile, setIsMobile] = useState(false);
  const isLegacyOnboardingRedirect = requestedRedirectUrl === '/onboarding' || requestedRedirectUrl.startsWith('/onboarding?');
  const redirectUrl = isMobile && isLegacyOnboardingRedirect
    ? '/onboarding/advanced-search-ai'
    : requestedRedirectUrl;
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const auth = useSelector((state: RootState) => state.auth);
  const { loading, error } = auth || { loading: false, error: null };

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 768px)');
    const syncMobile = () => setIsMobile(mediaQuery.matches);
    syncMobile();
    mediaQuery.addEventListener('change', syncMobile);
    return () => mediaQuery.removeEventListener('change', syncMobile);
  }, []);

  useEffect(() => {
    // Load saved credentials
    const savedEmail = localStorage.getItem('savedEmail');
    const savedPassword = localStorage.getItem('savedPassword');
    if (savedEmail && savedPassword) {
      setFormData({ email: savedEmail, password: savedPassword });
      setRememberMe(true);
    }
  }, []);

  useEffect(() => {
    // Start downloading the (heavy) post-login page while the user types, so
    // router.push after auth doesn't pay the full chunk-load on click.
    router.prefetch(redirectUrl);
  }, [router, redirectUrl]);

  useEffect(() => {
    if (error) {
      setFormErrors((prev) => ({ ...prev, submit: error }));
    }
    return () => {
      if (error) dispatch(clearError());
    };
  }, [error, dispatch]);

  const validateForm = () => {
    const errors: Record<string, string> = {};
    const emailError = validateEmail(formData.email);
    if (emailError) errors.email = emailError;
    const passwordError = validatePassword(formData.password);
    if (passwordError) errors.password = passwordError;
    return errors;
  };

  const handleChange = (e: any) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setFormErrors((prev) => ({ ...prev, [name]: "", submit: "" }));
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    const errors = validateForm();
    if (Object.keys(errors).length > 0) return setFormErrors(errors);
    dispatch(loginStart());
    try {
      // The login response already carries the user (id/name/role/tenant/
      // capabilities) - navigate on it immediately instead of blocking on a
      // second /api/auth/me round trip that re-fetches the same data.
      const loginResp = await authService.login(formData);
      const user = (loginResp?.user || {}) as any;
      dispatch(loginSuccess(user));
      // AuthContext otherwise stays null until a full page refresh, leaving the
      // sidebar empty (nav items + display name) on the first post-login render.
      refreshUser(user);
      // Honour redirect_url param (e.g. /tenant/onboard/new for super-admin)
      // Fall back to default dashboard for all other users
      // Read the viewport at submit time as well, so a very fast login cannot
      // race the mobile media-query effect above.
      const destination = window.matchMedia('(max-width: 768px)').matches && isLegacyOnboardingRedirect
        ? '/onboarding/advanced-search-ai'
        : requestedRedirectUrl;
      router.push(destination);
      // Backfill the richer /me payload (tenants[] for the switcher,
      // tenantFeatures[] for feature gates) WITHOUT blocking navigation.
      authService.getCurrentUser()
        .then((fullUser) => {
          dispatch(loginSuccess(fullUser));
          refreshUser(fullUser as any);
        })
        .catch(() => { /* non-blocking enrichment; AuthContext self-heals on next mount */ });
    } catch (err: any) {
      console.error('[Login] Login failed:', err);
      dispatch(loginFailure(err.message));
    }
  };

  return (
      <div className="w-full max-w-[400px] sm:max-w-[420px] p-6 sm:p-7 rounded-2xl shadow-2xl border backdrop-blur-xl bg-gradient-to-b from-white to-gray-50 dark:from-[#071131] dark:to-[#071131] border-gray-200 dark:border-gray-700 mx-auto">
        {/* Logo - driven by the app theme (.dark class), not OS prefers-color-scheme */}
        <img
          src="/MrLAD-logo.svg"
          className="w-20 sm:w-24 mx-auto mb-2 opacity-100 drop-shadow-md block dark:hidden"
          alt="logo"
        />
        <img
          src="/MrLAD-logo-white.svg"
          className="w-20 sm:w-24 mx-auto mb-2 opacity-100 drop-shadow-md hidden dark:block"
          alt=""
          aria-hidden="true"
        />
        {/* Title */}
        <h2 className="text-center text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-1">
          👋 Welcome Back!
        </h2>
        <p className="text-center text-gray-600 dark:text-gray-200 mb-4 sm:mb-6 text-xs sm:text-sm">
          We&apos;re happy to see you again. Please sign in.
        </p>
        {formErrors.submit && (
          <div className="mb-3 rounded-md border border-red-300 dark:border-red-600 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-sm px-3 py-2">
            ❗ {formErrors.submit}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
          {/* Email Input */}
          <div>
            <label className="text-gray-900 dark:text-white text-sm font-semibold">Email</label>
            <div className="relative mt-1">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400" size={20} />
              <input
                name="email"
                value={formData.email}
                onChange={handleChange}
                disabled={loading}
                type="email"
                placeholder="you@example.com"
                className="
                  w-full rounded-xl pl-10 pr-3 py-2.5 sm:py-3
                  bg-white/80 dark:bg-gray-800/40 border border-gray-300 dark:border-gray-600
                  text-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-gray-500
                  focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400
                  transition shadow-sm

                    /* ── FIXES FOR DARK MODE AUTOFILL ── */
                    dark:autofill:bg-[#0e1a3a]
                    dark:autofill:text-white
                    dark:[&:-webkit-autofill]:shadow-[0_0_0_1000px_#0e1a3a_inset]
                    dark:[&:-webkit-autofill]:[text-fill-color:white]
                    dark:[&:-webkit-autofill]:[-webkit-text-fill-color:white]
                  "
              />
            </div>
            {formErrors.email && (
              <p className="text-xs text-red-500 mt-1">⚠️ {formErrors.email}</p>
            )}
          </div>
          {/* Password Input */}
          <div>
            <label className="text-gray-900 dark:text-white text-sm font-semibold">Password</label>
            <div className="relative mt-1">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400" size={20} />
              <input
                name="password"
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={handleChange}
                disabled={loading}
                placeholder="•••••••••"
                className="
                  w-full rounded-xl pl-10 pr-10 py-2.5 sm:py-3
                  bg-white/80 dark:bg-gray-800/40 border border-gray-300 dark:border-gray-600
                  text-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-gray-500
                  focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400
                  transition shadow-sm
                  /* ── FIXES FOR DARK MODE AUTOFILL ── */
                    dark:autofill:bg-[#0e1a3a]
                    dark:autofill:text-white
                    dark:[&:-webkit-autofill]:shadow-[0_0_0_1000px_#0e1a3a_inset]
                    dark:[&:-webkit-autofill]:[text-fill-color:white]
                    dark:[&:-webkit-autofill]:[-webkit-text-fill-color:white]
                  "
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 dark:text-gray-400"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            {formErrors.password && (
              <p className="text-xs text-red-500 mt-1">
                🔐 {formErrors.password}
              </p>
            )}
          </div>
          {/* Remember Me Checkbox */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="rememberMe"
              checked={rememberMe}
              onCheckedChange={(checked) => setRememberMe(checked === true)}
              className="
                h-4 w-4 rounded-md
                border-gray-300 dark:border-gray-600
                bg-white/80 dark:bg-gray-800/40
                data-[state=checked]:bg-blue-600 dark:data-[state=checked]:bg-blue-500
                data-[state=checked]:border-blue-600 dark:data-[state=checked]:border-blue-500
                data-[state=checked]:text-white
                focus-visible:ring-2 focus-visible:ring-blue-500 dark:focus-visible:ring-blue-400
                hover:border-blue-500 dark:hover:border-blue-400
                transition-colors cursor-pointer
              "
            />
            <label
              htmlFor="rememberMe"
              className="text-sm font-medium text-gray-700 dark:text-gray-200 cursor-pointer select-none"
            >
              Remember
            </label>
          </div>
          {/* Login Button */}
          <Button
            type="submit"
            className="
              w-full p-2.5 sm:p-3 rounded-lg text-sm sm:text-base font-semibold
              bg-primary dark:bg-blue-600 dark:hover:bg-blue-500 text-[#ffffff]
              hover:shadow-lg hover:shadow-primary/50 transition-all duration-300
              transform hover:scale-105 active:scale-95
              uppercase tracking-wide border border-white/20 cursor-pointer
            "
          >
            {loading ? "⏳ Signing in..." : "Sign In"}
          </Button>
        </form>
        {/* Footer */}
      </div>
    
  );
};
export default Login;
