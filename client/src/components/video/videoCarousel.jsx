import React, { useState } from 'react';
import VideoPlayer from './videoPlayer';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const VideoCarousel = ({ videoIds }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const handlePrevious = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    setCurrentIndex((prev) => (prev === 0 ? videoIds.length - 1 : prev - 1));
    setTimeout(() => setIsAnimating(false), 300);
  };

  const handleNext = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    setCurrentIndex((prev) => (prev === videoIds.length - 1 ? 0 : prev + 1));
    setTimeout(() => setIsAnimating(false), 300);
  };

  if (!videoIds || videoIds.length === 0) return null;

  return (
    <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden">
      <div 
        className="absolute inset-0 flex transition-transform duration-300 ease-in-out"
        style={{ 
          transform: `translateX(-${currentIndex * 100}%)`,
          width: `${videoIds.length * (100 / videoIds.length)}%`
        }}
      >
        {videoIds.map((videoId, index) => (
          <div 
            key={videoId}
            className="flex-shrink-0 w-full h-full"
          >
            <VideoPlayer videoId={videoId} />
          </div>
        ))}
      </div>

      {videoIds.length > 1 && (
        <>
          <button
            onClick={handlePrevious}
            className="absolute left-2 top-1/2 -translate-y-1/2 p-1 rounded-full bg-black/50 text-white hover:text-black hover:bg-white/90 transition-colors z-10"
            disabled={isAnimating}
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            onClick={handleNext}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full bg-black/50 text-white hover:text-black hover:bg-white/90 transition-colors z-10"
            disabled={isAnimating}
          >
            <ChevronRight className="w-6 h-6" />
          </button>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex space-x-1 z-10">
            {videoIds.map((_, index) => (
              <div
                role="button"
                key={index}
                onClick={() => {
                  if (!isAnimating) {
                    setIsAnimating(true);
                    setCurrentIndex(index);
                    setTimeout(() => setIsAnimating(false), 300);
                  }
                }}
                className={`w-2 h-2 rounded-full transition-colors cursor-pointer 
                  ${index === currentIndex ? 'bg-white' : 'bg-white/50'}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default VideoCarousel;