import { forwardRef, type ButtonHTMLAttributes } from 'react';
import './Button.css';

type Variant = 'primary' | 'ghost' | 'danger' | 'google' | 'download';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  block?: boolean;
  lg?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', block, lg, className = '', children, ...rest }, ref) => {
    const classes = [
      'btn',
      `btn--${variant}`,
      block ? 'btn--block' : '',
      lg ? 'btn--lg' : '',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <button ref={ref} className={classes} {...rest}>
        {children}
      </button>
    );
  },
);

Button.displayName = 'Button';
