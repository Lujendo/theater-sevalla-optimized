import React from 'react';

const SavedSearchChip = ({ search, onApply, onDelete }) => (
  <div className="inline-flex items-center bg-primary-50 text-primary-700 rounded-full px-3 py-1 text-sm mr-2 mb-2">
    <button
      onClick={() => onApply(search)}
      className="mr-1 hover:text-primary-900"
      aria-label={`Apply saved search: ${search.name}`}
    >
      {search.name}
    </button>
    <button
      onClick={() => onDelete(search.id)}
      className="ml-1 text-primary-400 hover:text-primary-700"
      aria-label={`Delete saved search: ${search.name}`}
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  </div>
);

export default SavedSearchChip;
