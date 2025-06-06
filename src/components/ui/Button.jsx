import React from 'react';
import PropTypes from 'prop-types';

/**
 * Button component with different variants and sizes
 * Can be rendered as different elements using the "as" prop
 */
const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  type = 'button',
  fullWidth = false,
  disabled = false,
  onClick,
  className = '',
  as: Component = 'button',
  ...props
}) => {
  // Base classes
  const baseClasses = 'inline-flex items-center justify-center font-medium transition-all duration-200 rounded-md focus:outline-none focus:ring-1 focus:ring-offset-1';

  // Variant classes
  const variantClasses = {
    primary: 'bg-white text-primary-600 hover:bg-primary-50 focus:ring-primary-500 border border-primary-500 hover:border-primary-600 hover:shadow-sm transition-all',
    secondary: 'bg-white text-slate-600 hover:bg-slate-50 focus:ring-slate-500 border border-slate-300 hover:border-slate-400 hover:shadow-sm transition-all',
    outline: 'bg-white hover:bg-slate-50 text-slate-700 focus:ring-primary-500 border border-slate-300 hover:border-slate-400 hover:shadow-sm transition-all',
    danger: 'bg-white text-red-600 hover:bg-red-50 focus:ring-red-500 border border-red-500 hover:border-red-600 hover:shadow-sm transition-all',
    success: 'bg-white text-green-600 hover:bg-green-50 focus:ring-green-500 border border-green-500 hover:border-green-600 hover:shadow-sm transition-all',
    ghost: 'bg-transparent hover:bg-slate-100 text-slate-700 focus:ring-slate-500 border border-transparent hover:shadow-sm transition-all',
  };

  // Size classes
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-sm',
  };

  // Disabled classes
  const disabledClasses = disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer';

  // Width classes
  const widthClasses = fullWidth ? 'w-full' : '';

  // Combine all classes
  const buttonClasses = `
    ${baseClasses}
    ${variantClasses[variant] || variantClasses.primary}
    ${sizeClasses[size] || sizeClasses.md}
    ${disabledClasses}
    ${widthClasses}
    ${className}
  `;

  // Only pass the type prop to button elements
  const buttonProps = Component === 'button' ? { type, ...props } : props;

  return (
    <Component
      className={buttonClasses}
      disabled={disabled}
      onClick={onClick}
      {...buttonProps}
    >
      {children}
    </Component>
  );
};

Button.propTypes = {
  children: PropTypes.node.isRequired,
  variant: PropTypes.oneOf(['primary', 'secondary', 'outline', 'danger', 'success', 'ghost']),
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  type: PropTypes.oneOf(['button', 'submit', 'reset']),
  fullWidth: PropTypes.bool,
  disabled: PropTypes.bool,
  onClick: PropTypes.func,
  className: PropTypes.string,
  as: PropTypes.elementType,
};

export default Button;
