import React from 'react';
import { getRatingBadge } from '../utils/helpers';

const RatingBadge = ({ rating, showScore = true, size = 'medium' }) => {
  const badgeInfo = getRatingBadge(rating);
  const formattedScore = typeof rating === 'number' ? rating.toFixed(1) : 'N/A';

  const sizeStyles = {
    small: {
      fontSize: '0.7rem',
      padding: '2px 8px',
      gap: '4px',
    },
    medium: {
      fontSize: '0.78rem',
      padding: '4px 10px',
      gap: '6px',
    },
    large: {
      fontSize: '0.9rem',
      padding: '6px 14px',
      gap: '8px',
    },
  };

  const styleObj = sizeStyles[size] || sizeStyles.medium;

  return (
    <div
      className="rating-badge-pill"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        fontWeight: '700',
        borderRadius: '20px',
        color: badgeInfo.color,
        backgroundColor: badgeInfo.bg,
        border: `1px solid ${badgeInfo.border}`,
        boxShadow: badgeInfo.glow,
        letterSpacing: '0.3px',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        ...styleObj,
      }}
      title={`Rating: ${formattedScore} / 10 (${badgeInfo.label})`}
    >
      <span>{badgeInfo.icon}</span>
      {showScore && <span style={{ color: '#FFFFFF', fontWeight: '800' }}>{formattedScore}</span>}
      <span className="badge-tier-text">{badgeInfo.tier}</span>
    </div>
  );
};

export default RatingBadge;
