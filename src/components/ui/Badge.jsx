import React from 'react';
import PropTypes from 'prop-types';

/**
 * Badge component with different variants and sizes
 */
const Badge = ({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  ...props
}) => {
  // Base classes
  const baseClasses = 'inline-flex items-center font-medium rounded-full';
  
  // Variant classes
  const variantClasses = {
    primary: 'bg-primary-100 text-primary-800',
    secondary: 'bg-slate-100 text-slate-800',
    success: 'bg-green-100 text-green-800',
    danger: 'bg-red-100 text-red-800',
    warning: 'bg-yellow-100 text-yellow-800',
    info: 'bg-blue-100 text-blue-800',
  };
  
  // Size classes
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-0.5 text-sm',
    lg: 'px-3 py-1 text-base',
  };
  
  // Combine all classes
  const badgeClasses = `
    ${baseClasses}
    ${variantClasses[variant] || variantClasses.primary}
    ${sizeClasses[size] || sizeClasses.md}
    ${className}
  `;
  
  return (
    <span
      className={badgeClasses}
      {...props}
    >
      {children}
    </span>
  );
};

Badge.propTypes = {
  children: PropTypes.node.isRequired,
  variant: PropTypes.oneOf(['primary', 'secondary', 'success', 'danger', 'warning', 'info']),
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  className: PropTypes.string,
};

export default Badge;
