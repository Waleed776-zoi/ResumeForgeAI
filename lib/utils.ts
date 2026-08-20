import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * The standard shadcn/Aceternity class helper. `clsx` handles conditionals,
 * `twMerge` resolves Tailwind conflicts so a caller's `className` can
 * genuinely override a component's defaults instead of losing to whichever
 * rule Tailwind happened to emit last.
 *
 * Both packages were already dependencies, so this costs nothing new.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
