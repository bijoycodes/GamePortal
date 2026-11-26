import type { IconProps } from "./icons";

export function GamepadMark({ className }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className ?? "h-6 w-6"}
    >
      <path d="M7 8h10a4 4 0 0 1 4 4v3a3 3 0 0 1-5.3 1.9L14 15h-4l-1.7 1.9A3 3 0 0 1 3 15v-3a4 4 0 0 1 4-4Z" />
      <path d="M7 11v3M5.5 12.5h3M16 12h.01M18 14h.01" />
    </svg>
  );
}
