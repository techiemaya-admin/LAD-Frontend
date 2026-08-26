import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const avatarColors: string[] = [
  "#3B82F6", // Blue
  "#10B981", // Green
  "#8B5CF6", // Purple
  "#F59E0B", // Orange
  "#EF4444", // Red
  "#06B6D4", // Cyan
  "#EC4899", // Pink
  "#84CC16", // Lime
  "#6366F1", // Indigo
  "#14B8A6", // Teal
  "#F97316", // Deep Orange
  "#A855F7", // Violet
  "#E11D48", // Rose
  "#0EA5E9", // Sky Blue
  "#65A30D", // Olive
  "#6B7280", // Slate Gray
];

export function getAvatarColor(identifier?: string | null): string {
  if (!identifier) return "#6B7280"; // Default Gray
 
  // Keep only digits, fallback to original string if no digits
  const clean = identifier.replace(/\D/g, "") || identifier;
 
  let hash = 0;
 
  for (let i = 0; i < clean.length; i++) {
    hash = (hash * 31 + clean.charCodeAt(i)) >>> 0;
  }
 
  return avatarColors[hash % avatarColors.length];
}
