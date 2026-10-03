import React from 'react';
import { useWatchlist } from '../pages/Admin/WatchlistContext';
import { Bookmark, CheckCircle, Info, X } from 'lucide-react';

const Toast = () => {
  const { toastMessage, setToastMessage } = useWatchlist();

  if (!toastMessage) return null;

  return (
    <div className={`toast-container toast-${toastMessage.type || 'info'}`}>
      <div className="toast-icon">
        {toastMessage.type === 'add' ? (
          <Bookmark size={18} fill="#E50914" color="#E50914" />
        ) : toastMessage.type === 'remove' ? (
          <Info size={18} color="#9CA3AF" />
        ) : (
          <CheckCircle size={18} color="#10B981" />
        )}
      </div>
      <span className="toast-text">{toastMessage.text}</span>
      <button className="toast-close" onClick={() => setToastMessage(null)} aria-label="Close notification">
        <X size={16} />
      </button>
    </div>
  );
};

export default Toast;
