import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function isMobileDevice(): boolean {
  return /Android|iPhone|iPad|iPod|Tablet|Mobile/i.test(navigator.userAgent);
}
