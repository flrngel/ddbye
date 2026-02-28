import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, type, ...props }, ref) => {
  return (
    <input
      ref={ref}
      type={type}
      className={cn(
        'flex h-11 w-full rounded-2xl border border-white/70 bg-white/90 px-4 text-sm text-neutral-900 shadow-sm outline-none ring-offset-white placeholder:text-neutral-500 focus:border-brand-lavender-300 focus-visible:ring-2 focus-visible:ring-brand-lavender-500',
        className,
      )}
      {...props}
    />
  );
});
Input.displayName = 'Input';

export { Input };
