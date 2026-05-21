import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  // Base:
  // - transition-colors + transition-transform (for press scale)
  // - active:scale-[0.97] gives a tactile press feedback
  // - focus-visible ring uses the `--ring` token (Agent N owns tokens)
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors duration-100 transform-gpu active:scale-[0.97] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:opacity-90',
        destructive: 'bg-destructive text-destructive-foreground hover:opacity-90',
        outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
        secondary: 'bg-secondary text-secondary-foreground hover:opacity-80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
        icon: 'h-10 w-10',
        xs: 'h-7 rounded-md px-2 text-xs',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  /**
   * When true, renders a spinner prefix, disables click, and keeps the button
   * non-interactive while preserving its width.
   *
   * Usage pattern (any caller site):
   *   <Button loading={pending} onClick={...}>提交</Button>
   *
   * With `useTransition` or a `useFormStatus`-backed submit, pass the pending
   * flag as `loading` so the spinner reflects async progress. Note: `asChild`
   * delegates rendering to a child element, so `loading` only applies when
   * `asChild` is false (the default).
   */
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant, size, asChild = false, loading = false, disabled, onClick, children, ...props },
    ref
  ) => {
    const Comp = asChild ? Slot : 'button';

    // When rendering via Slot we can't inject extra children without breaking
    // Radix's single-child contract; fall back to the plain loading-less path.
    if (asChild) {
      return (
        <Comp
          className={cn(buttonVariants({ variant, size, className }))}
          ref={ref}
          {...props}
        >
          {children}
        </Comp>
      );
    }

    const isDisabled = disabled || loading;

    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={isDisabled}
        aria-busy={loading || undefined}
        onClick={loading ? undefined : onClick}
        {...props}
      >
        {loading ? <Loader2 className="mr-2 h-4 w-4 shrink-0 animate-spin" aria-hidden="true" /> : null}
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
