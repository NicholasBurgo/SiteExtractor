import React from 'react';
import { clsx } from 'clsx';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost' | 'destructive' | 'success' | 'warning';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export function Button({ 
  variant = 'default', 
  size = 'md', 
  className, 
  children, 
  ...props 
}: ButtonProps) {
  return (
    <button
      className={clsx(
        'inline-flex items-center justify-center rounded-full font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none',
        {
          'bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-105 shadow-lg hover:shadow-xl': variant === 'default',
          'border-2 border-primary bg-transparent text-primary hover:bg-primary hover:text-primary-foreground hover:scale-105 shadow-md': variant === 'outline',
          'bg-muted/50 text-foreground hover:bg-primary/20 hover:text-primary hover:scale-105': variant === 'ghost',
          'bg-destructive text-destructive-foreground hover:bg-destructive/90 hover:scale-105 shadow-lg hover:shadow-xl': variant === 'destructive',
          'bg-success text-success-foreground hover:bg-success/90 hover:scale-105 shadow-lg hover:shadow-xl': variant === 'success',
          'bg-warning text-warning-foreground hover:bg-warning/90 hover:scale-105 shadow-lg hover:shadow-xl': variant === 'warning',
          'h-9 px-5 text-xs': size === 'sm',
          'h-11 px-7 py-2 text-sm': size === 'md',
          'h-12 px-9 text-base': size === 'lg',
        },
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

