import React from 'react';
import PropTypes from 'prop-types';
import { Button } from './ui';

/**
 * A modern reusable confirmation dialog component
 */
const ConfirmationDialogModern = ({
  isOpen,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  isDestructive = false
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900 bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-soft max-w-md w-full p-6 animate-fade-in">
        <h3 className="text-lg font-medium text-slate-800 mb-2">{title}</h3>
        <p className="text-slate-600 mb-6">{message}</p>
        <div className="flex justify-end space-x-3">
          <Button
            variant="secondary"
            onClick={onCancel}
          >
            {cancelText}
          </Button>
          <Button
            variant={isDestructive ? 'danger' : 'primary'}
            onClick={onConfirm}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
};

ConfirmationDialogModern.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  title: PropTypes.string,
  message: PropTypes.string,
  confirmText: PropTypes.string,
  cancelText: PropTypes.string,
  onConfirm: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  isDestructive: PropTypes.bool
};

export default ConfirmationDialogModern;
