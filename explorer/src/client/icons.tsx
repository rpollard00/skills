import type { ReactNode } from "react";

const Icon = ({ d, size = 12 }: { readonly d: string; readonly size?: number }): ReactNode => (
  <svg className="icon" width={size} height={size} viewBox="0 0 12 12" aria-hidden="true" focusable="false">
    <path d={d} fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const ArrowLeft = (): ReactNode => <Icon d="M10,6H2M5.5,2.5L2,6l3.5,3.5" />;
export const ArrowRight = (): ReactNode => <Icon d="M2,6h8M6.5,2.5L10,6l-3.5,3.5" />;
export const Cross = (): ReactNode => <Icon d="M2.5,2.5l7,7M9.5,2.5l-7,7" />;
export const FitFrame = (): ReactNode => <Icon d="M1.5,4.5v-3h3M7.5,1.5h3v3M10.5,7.5v3h-3M4.5,10.5h-3v-3" />;
export const LockClosed = (): ReactNode => <Icon d="M2.5,5.5h7v5h-7ZM4,5.5V4a2,2 0 0 1 4,0v1.5" />;
export const LockOpen = (): ReactNode => <Icon d="M2.5,5.5h7v5h-7ZM7.5,5.5V3.6a1.9,1.9 0 0 1 3.8,0" />;
