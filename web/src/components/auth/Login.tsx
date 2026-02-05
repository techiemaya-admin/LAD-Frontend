"use client";
import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, Mail, Lock } from "lucide-react";
import {
  loginStart,
  loginSuccess,
  loginFailure,
  clearError,
} from "@/store/slices/authSlice";
import authService from "@/services/authService";
import { validateEmail, validatePassword } from "../../utils/validation";
type RootState = any;

const Login: React.FC = () => {
  const dispatch = useDispatch();

  const router = useRouter();
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const auth = useSelector((state: RootState) => state.auth);
  const { loading, error } = auth || { loading: false, error: null };

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
      await authService.login(formData);
      const user = await authService.getCurrentUser();
      dispatch(loginSuccess(user));
      // Verify token is stored before redirecting (use safeStorage, not direct localStorage)
      router.push("/dashboard");
    } catch (err: any) {
      console.error('[Login] Login failed:', err);
      dispatch(loginFailure(err.message));
    }
  };

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
          👋 Welcome Back!
        </h2>
        <p className="text-center text-gray-600 mb-6 text-sm">
          We're happy to see you again. Please sign in.
        </p>
        {formErrors.submit && (
          <div className="mb-3 rounded-md border border-red-300 bg-red-100 text-red-700 text-sm px-3 py-2">
            ❗ {formErrors.submit}
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
                value={formData.email}
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
            {formErrors.email && (
              <p className="text-xs text-red-500 mt-1">⚠️ {formErrors.email}</p>
            )}
          </div>
          {/* Password Input */}
          <div>
            <label className="text-gray-700 text-sm font-semibold">Password</label>
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
              <p className="text-xs text-red-500 mt-1">
                🔐 {formErrors.password}
              </p>
            )}
          </div>
          {/* Login Button */}
          <Button
            type="submit"
            className="
              w-full p-6 rounded-lg text-lg font-semibold
              bg-[#0b1957] text-white
              hover:shadow-lg transition-shadow

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
