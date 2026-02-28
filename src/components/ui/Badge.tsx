import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-wide',
  {
    variants: {
      variant: {
        neutral: 'border-neutral-200 bg-white/80 text-neutral-700',
        lavender: 'border-brand-lavender-200 bg-brand-lavender-50 text-brand-lavender-700',
        blue: 'border-brand-blue-200 bg-brand-blue-100/80 text-brand-blue-700',
        ready: 'border-emerald-200 bg-emerald-50 text-emerald-700',
        running: 'border-sky-200 bg-sky-50 text-sky-700',
        failed: 'border-red-200 bg-red-50 text-red-700',
      },
    },
    defaultVariants: {
      variant: 'neutral',
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}
