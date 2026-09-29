import * as React from 'react';
import { cn } from '@/lib/utils';

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<'input'>>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      ref={ref}
      className={cn(
        'flex h-10 w-full rounded-lg border border-line bg-ink-900/80 px-3.5 text-sm text-fog-100 placeholder:text-fog-600 transition-colors focus-visible:border-nova-400/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nova-500/20',
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = 'Input';

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<'textarea'>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        'flex min-h-24 w-full rounded-lg border border-line bg-ink-900/80 px-3.5 py-3 text-sm text-fog-100 placeholder:text-fog-600 transition-colors focus-visible:border-nova-400/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nova-500/20',
        className,
      )}
      {...props}
    />
  ),
);
Textarea.displayName = 'Textarea';

export { Input, Textarea };
