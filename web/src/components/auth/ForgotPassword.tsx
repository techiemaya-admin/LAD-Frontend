"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Mail, ArrowLeft, CheckCircle2 } from "lucide-react";
import authService from "@/services/authService";
import { validateEmail } from "../../utils/validation";
import Link from "next/link";

const ForgotPassword: React.FC = () => {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [emailError, setEmailError] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    setEmailError("");
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validateEmail(email);
    if (err) {
      setEmailError(err);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await authService.forgotPassword(email);
      setSuccess(true);
    } catch (err: any) {
      console.error('[ForgotPassword] Failed:', err);
      setError(err.message || "Failed to send reset email. Please try again.");
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
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Check your email</h2>
        <p className="text-gray-600 mb-8">
          We've sent a password reset link to <span className="font-semibold">{email}</span>. 
          Please check your inbox and follow the instructions.
        </p>
        <Link 
          href="/login" 
          className="inline-flex items-center text-blue-600 hover:text-blue-700 font-semibold"
        >
          <ArrowLeft size={18} className="mr-2" />
          Back to login
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
        Forgot Password?
      </h2>
      <p className="text-center text-gray-600 mb-6 text-sm">
        Enter your email address and we'll send you a link to reset your password.
      </p>

      {error && (
        <div className="mb-3 rounded-md border border-red-300 bg-red-100 text-red-700 text-sm px-3 py-2">
          ❗ {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Email Input */}
        <div>
          <label className="text-gray-700 text-sm font-semibold">Email</label>
          <div className="relative mt-1">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
            <input
              name="email"
              value={email}
              onChange={handleChange}
              disabled={loading}
              type="email"
              placeholder="you@example.com"
              className="
                w-full rounded-xl pl-10 pr-3 py-3
                bg-white border border-gray-300
                text-gray-800 placeholder-gray-400
                focus:outline-none focus:ring-2 focus:ring-blue-500
                transition shadow-sm
              "
            />
          </div>
          {emailError && (
            <p className="text-xs text-red-500 mt-1">⚠️ {emailError}</p>
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
          {loading ? "⏳ Sending..." : "Send Reset Link"}
        </Button>

        {/* Footer */}
        <div className="text-center mt-6">
          <Link 
            href="/login" 
            className="inline-flex items-center text-sm text-gray-800 hover:text-gray-600 transition"
          >
            <ArrowLeft size={16} className="mr-1" />
            Back to login
          </Link>
        </div>
      </form>
    </div>
  );
};

export default ForgotPassword;
