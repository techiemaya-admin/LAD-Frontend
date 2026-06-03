import React from "react";
import { X, Sparkles, Download, Maximize2, ChevronLeft, ChevronRight } from "lucide-react";
import { BuilderBottomInput } from "./BuilderBottomInput";
import ReactMarkdown from "react-markdown";

export function AgentBuilderImageOutput({
  title = "Generated Concepts",
  description = "",
  images = [],
  onClose,
  onNext,
  phase,
  generating = false,
}: {
  title?: string;
  description?: string;
  images?: string[];
  onClose?: () => void;
  onNext?: (val?: string) => void;
  phase?: string;
  generating?: boolean;
}) {
  const [previewImage, setPreviewImage] = React.useState<string | null>(null);
  const [activeIndex, setActiveIndex] = React.useState(0);
  const carouselRef = React.useRef<HTMLDivElement>(null);

  const scrollToIndex = (index: number) => {
    if (!carouselRef.current || index < 0 || index >= images.length) return;
    setActiveIndex(index);
    const container = carouselRef.current;
    const children = container.children;
    if (children && children[index]) {
      const child = children[index] as HTMLElement;
      const offsetLeft = child.offsetLeft - (container.clientWidth - child.clientWidth) / 2;
      container.scrollTo({
        left: offsetLeft,
        behavior: "smooth"
      });
    }
  };

  const handleScroll = () => {
    if (!carouselRef.current) return;
    const container = carouselRef.current;
    const scrollLeft = container.scrollLeft;
    const containerWidth = container.clientWidth;
    const children = Array.from(container.children);
    if (children.length === 0) return;

    let closestIndex = 0;
    let minDiff = Infinity;
    children.forEach((child, idx) => {
      const childCenter = (child as HTMLElement).offsetLeft + (child as HTMLElement).clientWidth / 2;
      const containerCenter = scrollLeft + containerWidth / 2;
      const diff = Math.abs(childCenter - containerCenter);
      if (diff < minDiff) {
        minDiff = diff;
        closestIndex = idx;
      }
    });

    if (closestIndex !== activeIndex) {
      setActiveIndex(closestIndex);
    }
  };

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!previewImage) return;
      const currentIdx = images.indexOf(previewImage);
      if (currentIdx === -1) return;

      if (e.key === "ArrowLeft" && currentIdx > 0) {
        setPreviewImage(images[currentIdx - 1]);
      } else if (e.key === "ArrowRight" && currentIdx < images.length - 1) {
        setPreviewImage(images[currentIdx + 1]);
      } else if (e.key === "Escape") {
        setPreviewImage(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [previewImage, images]);

  const handleDownload = (imgData: string, index: number) => {
    const a = document.createElement("a");
    a.href = imgData;
    a.download = `generated-concept-${index + 1}.png`;
    a.click();
  };

  return (
    <div className="relative flex flex-col items-center w-[512px] max-w-full h-[650px] bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-300 outline-none focus:outline-none focus:ring-0">
      
      {/* Header */}
      <div className="w-full flex shrink-0 items-center justify-between p-4 border-b border-slate-100 bg-white/80 z-10">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-emerald-500 animate-pulse" />
          <span className="text-[11px] font-bold text-[#0b1957] uppercase tracking-wider">
            {phase || "Media Generation"}
          </span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 bg-slate-50 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-all active:scale-95 border border-slate-100"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      {/* Main Grid View */}
      <div className="relative flex-1 min-h-0 w-full flex flex-col pt-4">
        <div className="flex-grow overflow-y-auto scrollbar-none px-6 pb-12">
          <h2 className="text-lg font-bold text-[#0b1957] text-center leading-snug mb-2">
            {title}
          </h2>
          {description && (
            <div className="text-xs text-slate-500 text-center mb-4 italic px-4 leading-relaxed font-medium">
              <ReactMarkdown>{description}</ReactMarkdown>
            </div>
          )}

          {/* Carousel Wrapper */}
          <div className="relative w-full max-w-sm mx-auto flex items-center">
            {/* Previous Carousel Button */}
            {images.length > 1 && (
              <button
                type="button"
                onClick={() => scrollToIndex(activeIndex - 1)}
                disabled={activeIndex === 0}
                className="absolute -left-6 z-20 p-1.5 bg-white/90 hover:bg-white text-slate-700 disabled:opacity-20 hover:disabled:bg-white/90 hover:disabled:text-slate-700 rounded-full border border-slate-200 transition-all active:scale-95 opacity-50 hover:opacity-100 flex items-center justify-center cursor-pointer shadow-md"
                title="Previous concept"
              >
                <ChevronLeft className="size-4" />
              </button>
            )}

            {/* Horizontal Carousel */}
            <div 
              ref={carouselRef}
              onScroll={handleScroll}
              className="flex overflow-x-auto gap-4 snap-x snap-mandatory w-full py-2 scroll-smooth"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {images.map((img, idx) => (
                <div
                  key={idx}
                  className="relative w-[260px] shrink-0 aspect-square snap-center rounded-2xl overflow-hidden border border-slate-100 shadow-sm bg-slate-50 flex items-center justify-center group"
                >
                  <img
                    src={img}
                    alt={`Generated concept ${idx + 1}`}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-102"
                  />
                  
                  {/* Overlay controls with 50% opacity by default, 100% on hover */}
                  <div className="absolute bottom-3 right-3 z-10 flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setPreviewImage(img)}
                      className="p-1.5 bg-black/60 text-white rounded-lg transition-all active:scale-95 opacity-50 hover:opacity-100 flex items-center justify-center cursor-pointer shadow"
                      title="Expand to full screen"
                    >
                      <Maximize2 className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDownload(img, idx)}
                      className="p-1.5 bg-black/60 text-white rounded-lg transition-all active:scale-95 opacity-50 hover:opacity-100 flex items-center justify-center cursor-pointer shadow"
                      title="Download concept"
                    >
                      <Download className="size-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Next Carousel Button */}
            {images.length > 1 && (
              <button
                type="button"
                onClick={() => scrollToIndex(activeIndex + 1)}
                disabled={activeIndex === images.length - 1}
                className="absolute -right-6 z-20 p-1.5 bg-white/90 hover:bg-white text-slate-700 disabled:opacity-20 hover:disabled:bg-white/90 hover:disabled:text-slate-700 rounded-full border border-slate-200 transition-all active:scale-95 opacity-50 hover:opacity-100 flex items-center justify-center cursor-pointer shadow-md"
                title="Next concept"
              >
                <ChevronRight className="size-4" />
              </button>
            )}
          </div>
        </div>
        {/* Fade overlay at the bottom of the scrollable area */}
        <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-white via-white/80 to-transparent pointer-events-none z-10" />
      </div>

      {/* Full screen preview lightbox */}
      {previewImage && (() => {
        const currentPreviewIndex = images.indexOf(previewImage);
        return (
          <div 
            className="absolute inset-0 bg-black/90 z-50 flex flex-col items-center justify-center p-4 animate-in fade-in duration-200"
            onClick={() => setPreviewImage(null)}
          >
            <button
              type="button"
              onClick={() => setPreviewImage(null)}
              className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all active:scale-95 z-55"
            >
              <X className="size-5" />
            </button>

            {images.length > 1 && (
              <>
                {/* Previous Lightbox Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (currentPreviewIndex > 0) {
                      setPreviewImage(images[currentPreviewIndex - 1]);
                    }
                  }}
                  disabled={currentPreviewIndex <= 0}
                  className="absolute left-6 top-1/2 -translate-y-1/2 z-55 p-3 bg-white/10 hover:bg-white/20 text-white disabled:opacity-20 hover:disabled:bg-white/10 rounded-full transition-all active:scale-95 opacity-50 hover:opacity-100 flex items-center justify-center cursor-pointer shadow-lg"
                  title="Previous concept"
                >
                  <ChevronLeft className="size-6" />
                </button>

                {/* Next Lightbox Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (currentPreviewIndex < images.length - 1) {
                      setPreviewImage(images[currentPreviewIndex + 1]);
                    }
                  }}
                  disabled={currentPreviewIndex >= images.length - 1}
                  className="absolute right-6 top-1/2 -translate-y-1/2 z-55 p-3 bg-white/10 hover:bg-white/20 text-white disabled:opacity-20 hover:disabled:bg-white/10 rounded-full transition-all active:scale-95 opacity-50 hover:opacity-100 flex items-center justify-center cursor-pointer shadow-lg"
                  title="Next concept"
                >
                  <ChevronRight className="size-6" />
                </button>
              </>
            )}
            
            <img
              src={previewImage}
              alt="Fullscreen concept preview"
              className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
            
            <div className="mt-4 flex gap-4" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => {
                  handleDownload(previewImage, currentPreviewIndex >= 0 ? currentPreviewIndex : 0);
                }}
                className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-900 rounded-xl font-bold text-xs flex items-center gap-2 transition-all active:scale-95 shadow-lg"
              >
                <Download className="size-4" />
                Download Image
              </button>
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="px-4 py-2 bg-white/15 hover:bg-white/25 text-white rounded-xl font-bold text-xs transition-all active:scale-95"
              >
                Close
              </button>
            </div>
          </div>
        );
      })()}

      {/* Generating/Loading Overlay if in revision */}
      {generating && (
        <div className="absolute inset-x-0 bottom-0 top-[60px] bg-white/80 backdrop-blur-sm z-30 flex flex-col items-center justify-center space-y-4">
          <div className="relative size-16 flex items-center justify-center">
            <div className="absolute inset-0 bg-[#0b1957]/10 rounded-full animate-ping" />
            <div className="size-10 border-2 border-[#0b1957] border-t-transparent rounded-full animate-spin" />
          </div>
          <p className="text-sm font-bold text-[#0b1957]">Regenerating concepts...</p>
        </div>
      )}

      {/* Refinement input bar */}
      <div className="w-full flex flex-col mt-auto pb-4 pt-2 bg-gradient-to-t from-white via-white to-transparent relative z-20 border-t border-slate-50">
        <BuilderBottomInput
          onSend={(val) => onNext?.(val)}
          placeholder="Describe changes you want..."
        />
      </div>
    </div>
  );
}
