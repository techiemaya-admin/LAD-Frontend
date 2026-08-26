import React from "react";
import { createPortal } from "react-dom";
import { X, Sparkles, Download, Maximize2, ChevronLeft, ChevronRight, Check, Loader2, Video, ArrowLeft } from "lucide-react";
import { BuilderBottomInput } from "./BuilderBottomInput";
import ReactMarkdown from "react-markdown";

async function imageToFile(imgUrl: string, filename: string): Promise<File> {
  try {
    const response = await fetch(imgUrl);
    const blob = await response.blob();
    return new File([blob], filename, { type: blob.type || "image/png" });
  } catch (err) {
    if (imgUrl.startsWith("data:")) {
      const arr = imgUrl.split(",");
      const mime = arr[0].match(/:(.*?);/)?.[1] || "image/png";
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      return new File([u8arr], filename, { type: mime });
    }
    throw err;
  }
}

export function AgentBuilderImageOutput({
  title = "Generated Concepts",
  description = "",
  images = [],
  video,
  onClose,
  onNext,
  phase,
  generating = false,
  references = [],
  onUpload,
  onRemove,
  isUploading = false,
  error = "",
  onBack,
  hideHeader = false,
}: {
  title?: string;
  description?: string;
  images?: string[];
  video?: string;
  onClose?: () => void;
  onNext?: (val?: string) => void;
  phase?: string;
  generating?: boolean;
  references?: { filename: string; thumbnail: string; path: string }[];
  onUpload?: (file: File) => Promise<{ filename: string; thumbnail: string; path: string } | undefined>;
  onRemove?: (path: string) => Promise<void>;
  isUploading?: boolean;
  error?: string;
  onBack?: () => void;
  hideHeader?: boolean;
}) {
  const [previewImage, setPreviewImage] = React.useState<string | null>(null);
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => {
    setMounted(true);
  }, []);
  const [activeIndex, setActiveIndex] = React.useState(0);
  const carouselRef = React.useRef<HTMLDivElement>(null);
  const [selectedPaths, setSelectedPaths] = React.useState<{ [idx: number]: string }>({});
  const [uploadingIndices, setUploadingIndices] = React.useState<{ [idx: number]: boolean }>({});

  const handleFilesSelected = (files: FileList) => {
    if (onUpload) {
      Array.from(files).forEach((file) => {
        onUpload(file);
      });
    }
  };

  React.useEffect(() => {
    setSelectedPaths((prev) => {
      const next = { ...prev };
      let changed = false;
      Object.keys(next).forEach((idxStr) => {
        const idx = parseInt(idxStr, 10);
        const path = next[idx];
        const exists = references.some((ref) => ref.path === path);
        if (!exists) {
          delete next[idx];
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [references]);

  const handleToggleSelection = async (imgUrl: string, idx: number) => {
    if (uploadingIndices[idx]) return;

    const isSelected = selectedPaths[idx] !== undefined;

    if (isSelected) {
      const pathToRemove = selectedPaths[idx];
      setUploadingIndices((prev) => ({ ...prev, [idx]: true }));
      try {
        if (onRemove) {
          await onRemove(pathToRemove);
        }
        setSelectedPaths((prev) => {
          const next = { ...prev };
          delete next[idx];
          return next;
        });
      } catch (err) {
        console.error("Error removing concept reference:", err);
      } finally {
        setUploadingIndices((prev) => ({ ...prev, [idx]: false }));
      }
    } else {
      if (Object.keys(selectedPaths).length >= 5) {
        alert("Maximum of 5 reference images allowed.");
        return;
      }

      setUploadingIndices((prev) => ({ ...prev, [idx]: true }));
      try {
        const filename = `selected-concept-${idx + 1}.png`;
        const file = await imageToFile(imgUrl, filename);
        if (onUpload) {
          const ref = await onUpload(file);
          if (ref && ref.path) {
            setSelectedPaths((prev) => ({ ...prev, [idx]: ref.path }));
          }
        }
      } catch (err) {
        console.error("Error uploading concept reference:", err);
      } finally {
        setUploadingIndices((prev) => ({ ...prev, [idx]: false }));
      }
    }
  };

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

  const handleDownload = async (imgData: string, index: number) => {
    try {
      const response = await fetch(imgData);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `generated-concept-${index + 1}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.warn("Direct blob download failed, falling back to navigation:", err);
      const a = document.createElement("a");
      a.href = imgData;
      a.target = "_blank";
      a.click();
    }
  };

  return (
    <div className={hideHeader 
      ? "relative flex flex-col items-center w-full min-h-0 bg-transparent overflow-visible outline-none focus:outline-none focus:ring-0" 
      : "relative flex flex-col items-center w-[512px] max-w-full h-[650px] bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-300 outline-none focus:outline-none focus:ring-0"
    }>
      
      {/* Header */}
      {!hideHeader && (
        <div className="w-full flex shrink-0 items-center justify-between p-4 border-b border-slate-100 bg-white/80 z-10">
          <div className="flex items-center gap-2">
            {onBack && (
              <button
                onClick={onBack}
                className="mr-1 p-1 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-all active:scale-95 border border-transparent hover:border-slate-100"
                aria-label="Go back"
              >
                <ArrowLeft className="size-4" />
              </button>
            )}
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
      )}

      {/* Main Grid View */}
      <div className={hideHeader ? "relative w-full flex flex-col pt-2" : "relative flex-1 min-h-0 w-full flex flex-col pt-4"}>
        <div className={hideHeader ? "w-full flex flex-col pb-2" : "flex-grow overflow-y-auto scrollbar-none px-6 pb-12"}>
          {!hideHeader && (
            <>
              <h2 className="text-lg font-bold text-[#0b1957] text-center leading-snug mb-2">
                {title}
              </h2>
              {description && (
                <div className="text-xs text-slate-500 text-center mb-4 italic px-4 leading-relaxed font-medium">
                  <ReactMarkdown>{description}</ReactMarkdown>
                </div>
              )}
            </>
          )}

          {/* Animated Video Preview */}
          {video && (
            <div className={`w-full mx-auto mb-6 rounded-2xl overflow-hidden border border-slate-100 shadow-[0_4px_20px_rgba(11,25,87,0.15)] bg-slate-950 aspect-video flex items-center justify-center relative group ${hideHeader ? 'max-w-[480px]' : 'max-w-sm'}`}>
              <video
                src={video}
                autoPlay
                loop
                muted
                controls
                className="w-full h-full object-contain"
              />
              <div className="absolute top-3 left-3 bg-[#0b1957]/80 text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider backdrop-blur-sm">
                Veo 3.1 Animation
              </div>
            </div>
          )}

          {/* Carousel Wrapper */}
          <div className={`relative w-full mx-auto flex items-center ${hideHeader ? 'max-w-[580px]' : 'max-w-sm'}`}>
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
              {images.map((img, idx) => {
                const isSelected = selectedPaths[idx] !== undefined;
                return (
                  <div
                    key={idx}
                    className={`relative w-[260px] shrink-0 aspect-square snap-center rounded-2xl overflow-hidden border bg-slate-50 flex items-center justify-center group transition-all duration-300 ${
                      isSelected
                        ? "border-emerald-500 ring-2 ring-emerald-500/30 shadow-[0_0_16px_rgba(16,185,129,0.4)]"
                        : "border-slate-100 shadow-sm"
                    }`}
                  >
                    <img
                      src={img}
                      alt={`Generated concept ${idx + 1}`}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-102"
                    />

                    {/* Selection circle button in top-right */}
                    <div className="absolute top-3 right-3 z-30 group/tooltip flex items-center justify-center">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleSelection(img, idx);
                        }}
                        className={`size-7 rounded-full transition-all active:scale-95 flex items-center justify-center cursor-pointer shadow-md border ${
                          isSelected
                            ? "bg-emerald-500 border-emerald-600 text-white opacity-100"
                            : "bg-white border-slate-200 text-slate-400 opacity-50 hover:opacity-100 hover:text-emerald-500"
                        }`}
                        disabled={uploadingIndices[idx]}
                      >
                        {uploadingIndices[idx] ? (
                          <Loader2 className="size-4 text-emerald-500 animate-spin" />
                        ) : isSelected ? (
                          <Check className="size-4 stroke-[3.5] opacity-80" />
                        ) : (
                          <div className="size-3 rounded-full border border-slate-300" />
                        )}
                      </button>
                      <span className="absolute top-9 right-0 hidden group-hover/tooltip:block bg-slate-900 text-white text-[10px] font-semibold px-2 py-1 rounded shadow-md whitespace-nowrap z-50 pointer-events-none transition-all">
                        Attach this image for further improvements
                      </span>
                    </div>
                    
                    {/* Overlay controls with 50% opacity by default, 100% on hover */}
                    <div className="absolute bottom-3 right-3 z-10 flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onNext?.(`[ANIMATE_IMAGE] index=${idx}`);
                        }}
                        className="p-1.5 bg-black/60 text-white rounded-lg transition-all active:scale-95 opacity-50 hover:opacity-100 flex items-center justify-center cursor-pointer shadow"
                        title="Animate concept with AI"
                      >
                        <Video className="size-3.5" />
                      </button>
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
                );
              })}
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
      {previewImage && mounted && createPortal(
        (() => {
          const currentPreviewIndex = images.indexOf(previewImage);
          return (
            <div 
              className="fixed inset-0 bg-black/90 flex flex-col items-center justify-center p-4 animate-in fade-in duration-200"
              style={{ zIndex: 99999 }}
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
                    setPreviewImage(null);
                    onNext?.(`[ANIMATE_IMAGE] index=${currentPreviewIndex}`);
                  }}
                  className="px-4 py-2 bg-gradient-to-br from-[#0b1957] to-[#1e293b] hover:from-[#0b1957] hover:to-[#0b1957] text-white rounded-xl font-bold text-xs flex items-center gap-2 transition-all active:scale-95 shadow-lg cursor-pointer"
                >
                  <Video className="size-4" />
                  Animate Concept
                </button>
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
        })(),
        document.body
      )}

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

      {/* Uploaded References Thumbnails Area */}
      {!hideHeader && (references.length > 0 || isUploading) && (
        <div className="w-full flex flex-col px-8 mb-2 z-30 space-y-1 animate-in fade-in duration-200">
          <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
            References ({references.length}/5)
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            {references.map((ref) => (
              <div key={ref.path} className="relative w-10 h-10 rounded-lg overflow-hidden border border-slate-200 bg-slate-50 shadow-sm group">
                <img src={ref.thumbnail} alt={ref.filename} className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => onRemove?.(ref.path)}
                  className="absolute top-0.5 right-0.5 bg-slate-900/70 hover:bg-slate-950 text-white rounded-full p-0.5 shadow-sm transition-colors cursor-pointer"
                  aria-label="Remove image"
                >
                  <X className="size-2.5" />
                </button>
              </div>
            ))}
            {isUploading && (
              <div className="w-10 h-10 rounded-lg border border-dashed border-slate-300 flex items-center justify-center bg-slate-50 animate-pulse">
                <Loader2 className="size-3.5 text-slate-400 animate-spin" />
              </div>
            )}
          </div>
          {error && (
            <div className="text-[10px] text-red-500 font-semibold mt-1">
              {error}
            </div>
          )}
        </div>
      )}

      {/* Refinement input bar */}
      {!hideHeader && (
        <div className="w-full flex flex-col mt-auto pb-6 pt-2 bg-gradient-to-t from-white via-white to-transparent relative z-20 border-t border-slate-50">
          {references.length > 0 && (
            <div className="text-[10px] text-slate-500 font-medium italic text-center px-6 mb-2 animate-in fade-in duration-200">
              user has attached {references.length} references with this request.
            </div>
          )}
          <BuilderBottomInput
            onSend={(val) => onNext?.(val)}
            placeholder="Describe changes you want..."
            enableUpload={true}
            onFilesSelected={handleFilesSelected}
          />
        </div>
      )}
    </div>
  );
}
