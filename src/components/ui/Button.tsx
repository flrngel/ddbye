import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-2xl text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-lavender-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-brand-lavender-500 text-white shadow-sm hover:-translate-y-0.5 hover:bg-brand-lavender-600',
        secondary: 'bg-white text-neutral-900 border border-neutral-200 hover:border-brand-lavender-300 hover:bg-brand-lavender-50',
        ghost: 'text-neutral-700 hover:bg-white/70 hover:text-neutral-900',
        subtle: 'bg-brand-blue-100/70 text-brand-blue-700 hover:bg-brand-blue-100',
      },
      size: {
        default: 'h-11 px-4',
        sm: 'h-9 px-3 text-sm rounded-xl',
        lg: 'h-12 px-5 text-base',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return <Comp ref={ref} className={cn(buttonVariants({ variant, size, className }))} {...props} />;
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
