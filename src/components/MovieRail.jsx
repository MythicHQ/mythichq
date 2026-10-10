import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const MovieRail = ({ children }) => {
  const railRef = useRef(null);

  const moveRail = (direction) => {
    railRef.current?.scrollBy({ left: direction * 620, behavior: 'smooth' });
  };

  return (
    <div className="movie-rail">
      <button className="movie-rail-arrow movie-rail-arrow-left" onClick={() => moveRail(-1)} aria-label="Show previous movies">
        <ChevronLeft size={22} />
      </button>
      <div ref={railRef} className="horizontal-scroll-container">
        {children}
      </div>
      <button className="movie-rail-arrow movie-rail-arrow-right" onClick={() => moveRail(1)} aria-label="Show more movies">
        <ChevronRight size={22} />
      </button>
    </div>
  );
};

export default MovieRail;