import React from 'react';
import styles from './Button.module.css';

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement>;

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', ...props }, ref) => (
    <button ref={ref} className={`${styles.root} ${className}`} {...props} />
  ),
);
Button.displayName = 'Button';

export default Button;
