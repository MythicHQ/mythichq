import { X } from 'lucide-react';

const SearchClearButton = ({ value, onClear, label = 'search', className = '' }) => {
  if (!value) return null;

  return (
    <button
      type="button"
      className={`search-clear-button ${className}`.trim()}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onClear();
      }}
      aria-label={`Clear ${label}`}
      title={`Clear ${label}`}
    >
      <X size={15} aria-hidden="true" />
    </button>
  );
};

export default SearchClearButton;
