import React from 'react';

const SkeletonCard = ({ count = 1 }) => {
  const skeletons = Array.from({ length: count });

  return (
    <>
      {skeletons.map((_, i) => (
        <div key={i} className="skeleton-card">
          <div className="skeleton-poster shimmer" />
          <div className="skeleton-info">
            <div className="skeleton-badge shimmer" />
            <div className="skeleton-title shimmer" />
            <div className="skeleton-text shimmer" />
          </div>
        </div>
      ))}
    </>
  );
};

export default SkeletonCard;
