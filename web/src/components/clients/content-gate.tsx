"use client";
import React from "react";
export default function ContentGate({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}