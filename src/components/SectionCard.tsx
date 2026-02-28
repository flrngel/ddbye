import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

export function SectionCard({
  title,
  subtitle,
  action,
  className,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={cn('rounded-[28px] border border-white/70 bg-white/85 p-5 shadow-[0_18px_60px_-28px_rgba(75,85,150,0.35)] backdrop-blur', className)}>
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h3 className="font-rounded text-base font-bold text-neutral-900">{title}</h3>
          {subtitle ? <p className="mt-1 text-sm text-neutral-500">{subtitle}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
