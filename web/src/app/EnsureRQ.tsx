"use client";

import { useQueryClient } from "@tanstack/react-query";

export default function EnsureRQ() {
  useQueryClient(); // will throw if provider isn't active
  return null;
}
