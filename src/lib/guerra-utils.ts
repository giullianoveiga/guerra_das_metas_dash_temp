import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getProgressColor(progress: number) {
  if (progress < 80) return 'bg-red-500';
  if (progress < 100) return 'bg-yellow-500';
  return 'bg-secondary';
}

// Format percentage without rounding, using comma as decimal separator
export function formatPercent(value: number | undefined | null): string {
  if (value === undefined || value === null) return '0%';
  // Truncate to 2 decimal places (not round)
  const truncated = Math.floor(value * 100) / 100;
  return String(truncated).replace('.', ',') + '%';
}