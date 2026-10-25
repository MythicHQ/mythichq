import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const MovieRail = ({ children, hideScrollbar = false, loop = false }) => {
  const railRef = useRef(null);
  const [railPosition, setRailPosition] = useState({ canScroll: false, atStart: true, atEnd: true });

  const updateRailPosition = useCallback(() => {
    const rail = railRef.current;
    if (!rail) return;
    const maxScrollLeft = Math.max(0, rail.scrollWidth - rail.clientWidth);
    setRailPosition({
      canScroll: maxScrollLeft > 2,
      atStart: rail.scrollLeft <= 2,
      atEnd: rail.scrollLeft >= maxScrollLeft - 2,
    });
  }, []);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return undefined;
    updateRailPosition();
    rail.addEventListener('scroll', updateRailPosition, { passive: true });
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(updateRailPosition) : null;
    observer?.observe(rail);
    if (rail.firstElementChild) observer?.observe(rail.firstElementChild);
    return () => {
      rail.removeEventListener('scroll', updateRailPosition);
      observer?.disconnect();
    };
  }, [children, updateRailPosition]);

  const moveRail = (direction) => {
    const rail = railRef.current;
    if (!rail) return;

    const maxScrollLeft = rail.scrollWidth - rail.clientWidth;
    if (loop && maxScrollLeft > 0) {
      const atStart = rail.scrollLeft <= 1;
      const atEnd = rail.scrollLeft >= maxScrollLeft - 1;

      if (direction < 0 && atStart) {
        rail.scrollTo({ left: maxScrollLeft, behavior: 'smooth' });
        return;
      }
      if (direction > 0 && atEnd) {
        rail.scrollTo({ left: 0, behavior: 'smooth' });
        return;
      }
    }

    rail.scrollBy({ left: direction * 620, behavior: 'smooth' });
  };

  return (
    <div className={`movie-rail${hideScrollbar ? ' hide-scrollbar' : ''}`}>
      {railPosition.canScroll && !railPosition.atStart && <button className="movie-rail-arrow movie-rail-arrow-left" onClick={() => moveRail(-1)} aria-label="Show previous movies">
        <ChevronLeft size={22} />
      </button>}
      <div ref={railRef} className="horizontal-scroll-container">
        {children}
      </div>
      {railPosition.canScroll && !railPosition.atEnd && <button className="movie-rail-arrow movie-rail-arrow-right" onClick={() => moveRail(1)} aria-label="Show more movies">
        <ChevronRight size={22} />
      </button>}
    </div>
  );
};

export default MovieRail;
