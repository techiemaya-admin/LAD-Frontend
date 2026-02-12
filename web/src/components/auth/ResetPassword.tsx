"use client";
import React, { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Lock, Eye, EyeOff, CheckCircle2, ArrowRight } from "lucide-react";
import authService from "@/services/authService";
import { validatePassword, validateConfirmPassword } from "../../utils/validation";
import Link from "next/link";

const ResetPassword: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [formData, setFormData] = useState({ password: "", confirmPassword: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setFormErrors((prev) => ({ ...prev, [name]: "" }));
    setError(null);
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    const passwordError = validatePassword(formData.password);
    if (passwordError) errors.password = passwordError;
    const confirmError = validateConfirmPassword(formData.password, formData.confirmPassword);
    if (confirmError) errors.confirmPassword = confirmError;
    return errors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setError("Invalid or missing reset token. Please request a new password reset link.");
      return;
    }

    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await authService.resetPassword(formData.password, token);
      setSuccess(true);
    } catch (err: any) {
      console.error('[ResetPassword] Failed:', err);
      setError(err.message || "Failed to reset password. The link may have expired.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="w-full max-w-[430px] p-8 rounded-2xl shadow-2xl border backdrop-blur-xl bg-white/60 border-gray-200 text-center">
        <div className="flex justify-center mb-6">
          <div className="p-3 bg-green-100 rounded-full">
            <CheckCircle2 className="w-12 h-12 text-green-600" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Password reset complete</h2>
        <p className="text-gray-600 mb-8">
          Your password has been successfully reset. You can now sign in with your new password.
        </p>
        <Button 
          onClick={() => router.push("/login")}
          className="w-full p-6 rounded-lg text-lg font-semibold bg-[#0b1957] text-white flex items-center justify-center gap-2"
        >
          Go to Sign In <ArrowRight size={20} />
        </Button>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="w-full max-w-[430px] p-8 rounded-2xl shadow-2xl border backdrop-blur-xl bg-white/60 border-gray-200 text-center">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Invalid Link</h2>
        <p className="text-gray-600 mb-8">
          The password reset link is invalid or has expired.
        </p>
        <Link 
          href="/forgot-password" 
          className="inline-flex items-center text-blue-600 hover:text-blue-700 font-semibold"
        >
          Request a new link
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[430px] p-8 rounded-2xl shadow-2xl border backdrop-blur-xl bg-white/60 border-gray-200">
      {/* Logo */}
      <img
        src="/logo.png"
        className="w-24 mx-auto mb-2 opacity-100 drop-shadow-md"
        alt="logo"
      />
      {/* Title */}
      <h2 className="text-center text-2xl font-bold text-gray-800 mb-1">
        Set New Password
      </h2>
      <p className="text-center text-gray-600 mb-6 text-sm">
        Please enter and confirm your new password below.
      </p>

      {error && (
        <div className="mb-3 rounded-md border border-red-300 bg-red-100 text-red-700 text-sm px-3 py-2">
          ❗ {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Password Input */}
        <div>
          <label className="text-gray-700 text-sm font-semibold">New Password</label>
          <div className="relative mt-1">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
            <input
              name="password"
              type={showPassword ? "text" : "password"}
              value={formData.password}
              onChange={handleChange}
              disabled={loading}
              placeholder="•••••••••"
              className="
                w-full rounded-xl pl-10 pr-10 py-3
                bg-white border border-gray-300
                text-gray-800 placeholder-gray-400
                focus:outline-none focus:ring-2 focus:ring-blue-500
                transition shadow-sm
              "
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600"
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
          {formErrors.password && (
            <p className="text-xs text-red-500 mt-1">🔐 {formErrors.password}</p>
          )}
        </div>

        {/* Confirm Password Input */}
        <div>
          <label className="text-gray-700 text-sm font-semibold">Confirm Password</label>
          <div className="relative mt-1">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
            <input
              name="confirmPassword"
              type={showPassword ? "text" : "password"}
              value={formData.confirmPassword}
              onChange={handleChange}
              disabled={loading}
              placeholder="•••••••••"
              className="
                w-full rounded-xl pl-10 pr-3 py-3
                bg-white border border-gray-300
                text-gray-800 placeholder-gray-400
                focus:outline-none focus:ring-2 focus:ring-blue-500
                transition shadow-sm
              "
            />
          </div>
          {formErrors.confirmPassword && (
            <p className="text-xs text-red-500 mt-1">🔐 {formErrors.confirmPassword}</p>
          )}
        </div>

        {/* Action Button */}
        <Button
          type="submit"
          disabled={loading}
          className="
            w-full p-6 rounded-lg text-lg font-semibold
            bg-[#0b1957] text-white
            hover:shadow-lg transition-shadow
          "
        >
          {loading ? "⏳ Updating..." : "Reset Password"}
        </Button>
      </form>
    </div>
  );
};

export default ResetPassword;
