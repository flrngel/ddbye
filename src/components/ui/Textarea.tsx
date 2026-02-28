import * as React from 'react';
import { cn } from '@/lib/utils';

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => {
  return (
    <textarea
      ref={ref}
      className={cn(
        'flex min-h-[112px] w-full rounded-3xl border border-white/70 bg-white/90 px-4 py-3 text-sm text-neutral-900 shadow-sm outline-none ring-offset-white placeholder:text-neutral-500 focus:border-brand-lavender-300 focus-visible:ring-2 focus-visible:ring-brand-lavender-500',
        className,
      )}
      {...props}
    />
  );
});
Textarea.displayName = 'Textarea';

export { Textarea };
