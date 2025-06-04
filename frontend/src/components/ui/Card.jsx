import React from 'react';
import PropTypes from 'prop-types';

/**
 * Card component with header, body, and footer
 */
const Card = ({
  children,
  className = '',
  ...props
}) => {
  return (
    <div 
      className={`bg-white rounded-lg shadow-soft overflow-hidden ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

const CardHeader = ({
  children,
  className = '',
  ...props
}) => {
  return (
    <div 
      className={`px-6 py-4 border-b border-slate-200 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

const CardTitle = ({
  children,
  className = '',
  ...props
}) => {
  return (
    <h3 
      className={`text-lg font-medium text-slate-800 ${className}`}
      {...props}
    >
      {children}
    </h3>
  );
};

const CardBody = ({
  children,
  className = '',
  ...props
}) => {
  return (
    <div 
      className={`p-6 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

const CardFooter = ({
  children,
  className = '',
  ...props
}) => {
  return (
    <div 
      className={`px-6 py-4 bg-slate-50 border-t border-slate-200 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

Card.Header = CardHeader;
Card.Title = CardTitle;
Card.Body = CardBody;
Card.Footer = CardFooter;

Card.propTypes = {
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
};

CardHeader.propTypes = {
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
};

CardTitle.propTypes = {
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
};

CardBody.propTypes = {
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
};

CardFooter.propTypes = {
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
};

export default Card;
