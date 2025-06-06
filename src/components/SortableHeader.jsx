import React from 'react';
import PropTypes from 'prop-types';
import { SortAscIcon, SortDescIcon } from './Icons';

/**
 * A sortable table header component that displays a column label with sort indicators
 *
 * @param {Object} props - Component props
 * @param {string} props.field - The field name to sort by
 * @param {string} props.label - The display label for the column
 * @param {string} props.currentSortField - The currently active sort field
 * @param {string} props.currentSortOrder - The current sort order ('asc' or 'desc')
 * @param {Function} props.onSort - Callback function when header is clicked
 * @param {string} props.className - Additional CSS classes
 * @returns {JSX.Element} The sortable header component
 */
const SortableHeader = ({
  field,
  label,
  currentSortField,
  currentSortOrder,
  onSort,
  className = ''
}) => {
  const isActive = currentSortField === field;

  return (
    <th
      className={`table-header-cell cursor-pointer select-none ${className}`}
      onClick={() => onSort(field)}
    >
      <div className="flex items-center space-x-1">
        <span>{label}</span>
        <div className="flex flex-col h-4 justify-center">
          {isActive ? (
            currentSortOrder === 'asc' ? (
              <SortAscIcon className="w-3 h-3 text-primary-600" />
            ) : (
              <SortDescIcon className="w-3 h-3 text-primary-600" />
            )
          ) : (
            <div className="w-3 h-3 opacity-60">
              <SortAscIcon className="w-3 h-3 text-gray-500" />
            </div>
          )}
        </div>
      </div>
    </th>
  );
};

SortableHeader.propTypes = {
  field: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  currentSortField: PropTypes.string.isRequired,
  currentSortOrder: PropTypes.string.isRequired,
  onSort: PropTypes.func.isRequired,
  className: PropTypes.string
};

export default SortableHeader;
