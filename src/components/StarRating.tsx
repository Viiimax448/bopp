import { FaStar, FaRegStar, FaStarHalfAlt } from 'react-icons/fa';
import React from 'react';

interface StarRatingProps {
  rating: number;
  onChange: (value: number) => void;
  starSize?: number;
  className?: string;
}

const StarRating: React.FC<StarRatingProps> = ({ rating, onChange, starSize = 28, className = '' }) => {
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {[1, 2, 3, 4, 5].map((star) => {
        let Icon = FaRegStar;
        if (rating >= star) {
          Icon = FaStar;
        } else if (rating === star - 0.5) {
          Icon = FaStarHalfAlt;
        }
        return (
          <div key={star} className="relative inline-block" style={{ width: starSize, height: starSize }}>
            <Icon size={starSize} className="text-current select-none pointer-events-none" />
            {/* Hitboxes táctiles */}
            <button
              type="button"
              className="absolute left-0 top-0 w-1/2 h-full z-10 bg-transparent border-none p-0 m-0 cursor-pointer"
              aria-label={`Calificar ${star - 0.5} estrellas`}
              tabIndex={0}
              onClick={() => onChange(star - 0.5)}
            />
            <button
              type="button"
              className="absolute right-0 top-0 w-1/2 h-full z-10 bg-transparent border-none p-0 m-0 cursor-pointer"
              aria-label={`Calificar ${star} estrellas`}
              tabIndex={0}
              onClick={() => onChange(star)}
            />
          </div>
        );
      })}
    </div>
  );
};

export default StarRating;
