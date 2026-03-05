"use client";
import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useSelector } from 'react-redux';
type RootState = any;
type PrivateRouteProps = {
  children: React.ReactNode;
};
const PrivateRoute: React.FC<PrivateRouteProps> = ({ children }) => {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  useEffect(() => {
    if (!mounted) return;
    if (!isAuthenticated && pathname !== '/login') {
      const redirect = encodeURIComponent(pathname || '/dashboard');
      router.replace(`/login?from=${redirect}`);
    }
  }, [isAuthenticated, pathname, router, mounted]);
  if (!mounted) return null; // avoid SSR/CSR mismatch
  if (!isAuthenticated) return null;
  return <>{children}</>;
};
export default PrivateRoute;