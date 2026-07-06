import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function toDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

export function formatDeadline(date: Date | string): string {
  return toDate(date).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function daysUntil(date: Date | string): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = toDate(date);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export function urgencyColor(daysLeft: number): string {
  if (daysLeft <= 3) return "bg-red-500";
  if (daysLeft <= 7) return "bg-amber-500";
  return "bg-emerald-500";
}

export function urgencyTextColor(daysLeft: number): string {
  if (daysLeft <= 3) return "text-red-600";
  if (daysLeft <= 7) return "text-amber-600";
  return "text-emerald-600";
}
