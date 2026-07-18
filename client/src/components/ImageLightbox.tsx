/**
 * ImageLightbox — Full-screen image viewer with zoom, navigation, keyboard & swipe support
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from "lucide-react";

interface ImageLightboxProps {
  images: string[];
  initialIndex?: number;
  isOpen: boolean;
  onClose: () => void;
  altText?: string;
}

export default function ImageLightbox({
  images,
  initialIndex = 0,
  isOpen,
  onClose,
  altText = "Product image",
}: ImageLightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoomed, setZoomed] = useState(false);
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 });
  const imgRef = useRef<HTMLImageElement>(null);

  // Touch swipe state
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  // Sync index when lightbox opens
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex);
      setZoomed(false);
    }
  }, [isOpen, initialIndex]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") goToPrev();
      if (e.key === "ArrowRight") goToNext();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, currentIndex, images.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  const goToPrev = useCallback(() => {
    setZoomed(false);
    setCurrentIndex((i) => (i - 1 + images.length) % images.length);
  }, [images.length]);

  const goToNext = useCallback(() => {
    setZoomed(false);
    setCurrentIndex((i) => (i + 1) % images.length);
  }, [images.length]);

  const handleImageClick = (e: React.MouseEvent<HTMLImageElement>) => {
    if (!zoomed) {
      // Calculate click position as percentage for transform-origin
      const rect = e.currentTarget.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      setZoomPos({ x, y });
      setZoomed(true);
    } else {
      setZoomed(false);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLImageElement>) => {
    if (!zoomed) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setZoomPos({ x, y });
  };

  // Touch swipe handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    // Only swipe if horizontal movement is dominant
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) {
      if (dx < 0) goToNext();
      else goToPrev();
    }
    touchStartX.current = null;
    touchStartY.current = null;
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.92)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/25 text-white transition-colors"
        aria-label="Close"
      >
        <X size={22} />
      </button>

      {/* Zoom toggle button */}
      <button
        onClick={() => setZoomed((z) => !z)}
        className="absolute top-4 left-4 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/25 text-white transition-colors"
        aria-label={zoomed ? "Zoom out" : "Zoom in"}
      >
        {zoomed ? <ZoomOut size={20} /> : <ZoomIn size={20} />}
      </button>

      {/* Prev button */}
      {images.length > 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); goToPrev(); }}
          className="absolute left-2 sm:left-6 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/25 text-white transition-colors"
          aria-label="Previous image"
        >
          <ChevronLeft size={24} />
        </button>
      )}

      {/* Main image */}
      <div
        className="relative flex items-center justify-center w-full h-full px-14 py-14"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <img
          ref={imgRef}
          src={images[currentIndex]}
          alt={`${altText} ${currentIndex + 1}`}
          onClick={handleImageClick}
          onMouseMove={handleMouseMove}
          className="max-w-full max-h-full object-contain select-none transition-transform duration-200"
          style={{
            cursor: zoomed ? "zoom-out" : "zoom-in",
            transform: zoomed ? "scale(2.5)" : "scale(1)",
            transformOrigin: `${zoomPos.x}% ${zoomPos.y}%`,
            maxHeight: "calc(100vh - 120px)",
            maxWidth: "calc(100vw - 120px)",
          }}
          draggable={false}
        />
      </div>

      {/* Next button */}
      {images.length > 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); goToNext(); }}
          className="absolute right-2 sm:right-6 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/25 text-white transition-colors"
          aria-label="Next image"
        >
          <ChevronRight size={24} />
        </button>
      )}

      {/* Thumbnail strip at bottom */}
      {images.length > 1 && (
        <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 px-4 overflow-x-auto">
          {images.map((img, i) => (
            <button
              key={i}
              onClick={(e) => { e.stopPropagation(); setCurrentIndex(i); setZoomed(false); }}
              className={`flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden border-2 transition-all ${
                i === currentIndex ? "border-amber-400 opacity-100" : "border-white/30 opacity-50 hover:opacity-80"
              }`}
            >
              <img src={img} alt="" className="w-full h-full object-contain bg-white p-0.5" draggable={false} />
            </button>
          ))}
        </div>
      )}

      {/* Image counter */}
      {images.length > 1 && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white/70 text-sm font-medium">
          {currentIndex + 1} / {images.length}
        </div>
      )}
    </div>
  );
}
