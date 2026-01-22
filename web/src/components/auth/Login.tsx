
// "use client";
// import React, { useState, useEffect } from "react";
// import { useDispatch, useSelector } from "react-redux";
// import { useRouter } from "next/navigation";
// import { Button } from "@/components/ui/button";
// import { Eye, EyeOff } from "lucide-react";
// import {
//   loginStart,
//   loginSuccess,
//   loginFailure,
//   clearError,
//   logout,
// } from "../../store/slices/authSlice";
// import authService from "../../services/authService";
// import { validateEmail, validatePassword } from "../../utils/validation";
// type RootState = any;
// const Login: React.FC = () => {
//   const dispatch = useDispatch();
//   const router = useRouter();
//   const [formData, setFormData] = useState({ email: "", password: "" });
//   const [showPassword, setShowPassword] = useState(false);
//   const [formErrors, setFormErrors] = useState<Record<string, string>>({});
//   const auth = useSelector((state: RootState) => state.auth);
//   const { isAuthenticated, loading, error } = auth || {
//     isAuthenticated: false,
//     loading: false,
//     error: null,
//   };
//   useEffect(() => {
//     if (error) {
//       setFormErrors((prev) => ({ ...prev, submit: error }));
//     }
//     return () => {
//       if (error) dispatch(clearError());
//     };
//   }, [error, dispatch]);
//   const validateForm = () => {
//     const errors: Record<string, string> = {};
//     const emailError = validateEmail(formData.email);
//     if (emailError) errors.email = emailError;
//     const passwordError = validatePassword(formData.password);
//     if (passwordError) errors.password = passwordError;
//     return errors;
//   };
//   const handleChange = (e: any) => {
//     const { name, value } = e.target;
//     setFormData((prev) => ({ ...prev, [name]: value }));
//     setFormErrors((prev) => ({ ...prev, [name]: "", submit: "" }));
//   };
//   const handleSubmit = async (e: any) => {
//     e.preventDefault();
//     const errors = validateForm();
//     if (Object.keys(errors).length > 0) return setFormErrors(errors);
//     dispatch(loginStart());
//     try {
//       await authService.login(formData);
//       const user = await authService.getCurrentUser();
//       dispatch(loginSuccess(user));
//       router.push("/dashboard");
//     } catch (err: any) {
//       dispatch(loginFailure(err.message));
//     }
//   };
//   return (
//     <div className="min-h-screen flex items-center justify-center bg-white p-4">
//       {/* CARD */}
//       <div className="w-full max-w-[420px] p-8 bg-white rounded-[15px] shadow-lg border border-gray-200">
//         {/* Logo */}
//         <img
//           src="/logo.png"
//           className="w-24 mx-auto mb-4 opacity-90"
//           alt="logo"
//         />
//         {/* Title */}
//         <h2 className="text-center text-xl font-semibold text-gray-800 mb-6">
//           Welcome Back
//         </h2>
//         {formErrors.submit && (
//           <div className="mb-3 rounded-md border border-red-300 bg-red-100 text-red-700 text-sm px-3 py-2">
//             {formErrors.submit}
//           </div>
//         )}
//         <form onSubmit={handleSubmit} className="space-y-5">
//           {/* Email */}
//           <div>
//             <label className="text-gray-700 text-sm font-medium">Email</label>
//             <input
//               name="email"
//               value={formData.email}
//               onChange={handleChange}
//               disabled={loading}
//               className="
//                 mt-1 w-full rounded-full px-4 py-3
//                 bg-[#f1f3f5] border border-gray-300
//                 text-gray-800 placeholder-gray-500
//                 focus:outline-none focus:ring-2 focus:ring-blue-400
//                 transition
//               "
//               type="email"
//             />
//             {formErrors.email && (
//               <p className="text-xs text-red-500 mt-1">{formErrors.email}</p>
//             )}
//           </div>
//           {/* Password */}
//           <div>
//             <label className="text-gray-700 text-sm font-medium">
//               Password
//             </label>
//             <div className="relative mt-1">
//               <input
//                 name="password"
//                 type={showPassword ? "text" : "password"}
//                 value={formData.password}
//                 onChange={handleChange}
//                 disabled={loading}
//                 className="
//                   w-full rounded-full px-4 py-3 pr-10
//                   bg-[#f1f3f5] border border-gray-300
//                   text-gray-800 placeholder-gray-500
//                   focus:outline-none focus:ring-2 focus:ring-blue-400
//                   transition
//                 "
//               />
//               <button
//                 type="button"
//                 onClick={() => setShowPassword(!showPassword)}
//                 className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600"
//               >
//                 {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
//               </button>
//             </div>
//             {formErrors.password && (
//               <p className="text-xs text-red-500 mt-1">
//                 {formErrors.password}
//               </p>
//             )}
//           </div>
//           {/* Button */}
//           <Button
//             type="submit"
//             className="w-full py-3 rounded-full bg-[#172560] text-white text-lg hover:bg-blue-700 transition"
//           >
//             {loading ? "Signing in..." : "Sign In"}
//           </Button>
//         </form>
//       </div>
//     </div>
//   );
// };
// export default Login;
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
  const [rememberMe, setRememberMe] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const auth = useSelector((state: RootState) => state.auth);
  const { loading, error } = auth || { loading: false, error: null };
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
      // Save or clear credentials based on Remember Me
      if (rememberMe) {
        localStorage.setItem('savedEmail', formData.email);
        localStorage.setItem('savedPassword', formData.password);
      } else {
        localStorage.removeItem('savedEmail');
        localStorage.removeItem('savedPassword');
      }
      const loginResponse = await authService.login(formData);
      const user = await authService.getCurrentUser();
      dispatch(loginSuccess(user));
      // Verify token is stored before redirecting (use safeStorage, not direct localStorage)
      const { safeStorage } = await import('@/utils/storage');
      const storedToken = safeStorage.getItem('token');
      + '...');
      router.push("/dashboard");
    } catch (err: any) {
      console.error('[Login] Login failed:', err);
      dispatch(loginFailure(err.message));
    }
  };
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#dbeafe] to-[#f1f5f9] p-4">
      {/* CARD */}
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
          {/* Remember Me Checkbox */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="rememberMe"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-white border-gray-300 rounded focus:ring-blue-500 focus:ring-2 cursor-pointer"
            />
            <label
              htmlFor="rememberMe"
              className="ml-2 text-sm text-gray-700 cursor-pointer select-none"
            >
              💾 Remember my credentials
            </label>
          </div>
          {/* Login Button */}
          <Button
            type="submit"
            className="
              w-full py-3 rounded-xl text-lg font-semibold
              bg-gradient-to-r from-[#172560] to-[#1e3a8a]
              text-white shadow-lg hover:shadow-xl hover:scale-[1.02]
              transition-all
            "
          >
            {loading ? "⏳ Signing in..." : "🚀 Sign In"}
          </Button>
        </form>
        {/* Footer */}
        {/* <p className="text-center text-gray-600 text-sm mt-5">
          Need help? <span className="text-blue-700 font-semibold cursor-pointer">Contact Support</span>
        </p> */}
      </div>
    </div>
  );
};
export default Login;