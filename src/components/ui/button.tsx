import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.99] cursor-pointer select-none',
  {
    variants: {
      variant: {
        primary:
          'bg-nova-500 text-white shadow-[0_0_0_1px_rgba(139,134,250,0.4),0_8px_30px_-10px_rgba(110,103,245,0.5)] hover:bg-nova-400',
        secondary:
          'surface text-fog-100 hover:border-line-bright hover:bg-ink-800',
        ghost: 'text-fog-300 hover:text-fog-100 hover:bg-ink-850',
        outline: 'border border-line-bright text-fog-100 hover:border-nova-400/50 hover:text-white',
        link: 'text-nova-300 underline-offset-4 hover:underline',
        destructive: 'border border-bad/30 text-bad hover:bg-bad/10',
      },
      size: {
        sm: 'h-8 px-3 text-[13px]',
        md: 'h-10 px-4 text-sm',
        lg: 'h-12 px-7 text-[15px]',
        icon: 'size-10',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
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
    return <Comp className={cn(buttonVariants({ variant, size }), className)} ref={ref} {...props} />;
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
