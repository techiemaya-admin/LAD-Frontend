"use client";
import React from 'react';
import Register from '@/components/auth/Register';
import AuthPageShell from '@/components/auth/AuthPageShell';

export default function RegisterPage() {
  return (
    <AuthPageShell>
      <Register />
    </AuthPageShell>
  );
}
