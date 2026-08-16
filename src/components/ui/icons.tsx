import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function IconBase({ children, ...props }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {children}
    </svg>
  );
}

export function ArrowRightIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </IconBase>
  );
}

export function CalendarIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M7 3v3m10-3v3M4 9h16" />
      <rect x="4" y="5" width="16" height="16" rx="2" />
      <path d="M8 13h2m4 0h2m-8 4h2" />
    </IconBase>
  );
}

export function ChartIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M4 20V10m6 10V4m6 16v-7m4 7H2" />
    </IconBase>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="m5 12 4 4L19 6" />
    </IconBase>
  );
}

export function ClockIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </IconBase>
  );
}

export function CreditCardIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 10h18m4 5h4" />
    </IconBase>
  );
}

export function MenuIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </IconBase>
  );
}

export function MessageIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M20 15a3 3 0 0 1-3 3H8l-5 3V7a3 3 0 0 1 3-3h11a3 3 0 0 1 3 3Z" />
      <path d="M8 9h8m-8 4h5" />
    </IconBase>
  );
}

export function ShieldIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 22s8-3.5 8-10V5l-8-3-8 3v7c0 6.5 8 10 8 10Z" />
      <path d="m9 12 2 2 4-5" />
    </IconBase>
  );
}

export function SparklesIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="m12 3 1.2 3.8L17 8l-3.8 1.2L12 13l-1.2-3.8L7 8l3.8-1.2L12 3Z" />
      <path d="m19 14 .8 2.2L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.8L19 14ZM5 12l.7 2.3L8 15l-2.3.7L5 18l-.7-2.3L2 15l2.3-.7L5 12Z" />
    </IconBase>
  );
}

export function TeamIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20v-2a5 5 0 0 1 5-5h2a5 5 0 0 1 5 5v2" />
      <path d="M16 4a3 3 0 0 1 0 6m2 3a4 4 0 0 1 3 4v2" />
    </IconBase>
  );
}

export function XIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="m6 6 12 12M18 6 6 18" />
    </IconBase>
  );
}

