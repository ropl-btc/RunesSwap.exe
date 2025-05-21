import React from "react";
import "98.css";

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement>;

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = "", ...props }, ref) => (
    <button ref={ref} className={`button ${className}`} {...props} />
  ),
);
Button.displayName = "Button";

export default Button;
