import React, { useState } from "react";
import { X, ArrowLeft, Play, Download, ExternalLink, Image as ImageIcon, Video, Trash2, Paperclip, Check, ChevronLeft, ChevronRight, Sparkles, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImageGroup {
  generation_id: string;
  urls: string[];
  created_at: number;
}

interface VideoAsset {
  url: string;
  created_at: number;
  duration?: number;
  prompt_history?: string[];
}

interface SelectedAsset {
  url: string;
  type: "image" | "video";
}

interface UnifiedGalleryAsset {
  type: "image" | "video";
  id: string;
  urls?: string[];
  videos?: VideoAsset[];
  created_at: number;
}

export function AgentBuilderGallery({
  images = [],
  videos = [],
  loading = false,
  onBack,
  onClose,
  onGenerateImages,
  onAnimateImage,
  onExtendVideo,
  onAddDialogues,
  onDeleteAssets,
  isFullHistory = false,
  onLoadFullHistory,
}: {
  images?: ImageGroup[];
  videos?: VideoAsset[];
  loading?: boolean;
  onBack: () => void;
  onClose?: () => void;
  onGenerateImages?: (urls: string[]) => void;
  onAnimateImage?: (url: string) => void;
  onExtendVideo?: (url: string) => void;
  onAddDialogues?: (url: string) => void;
  onDeleteAssets?: (urls: string[]) => void;
  isFullHistory?: boolean;
  onLoadFullHistory?: () => void;
}) {
  const [selectedGroup, setSelectedGroup] = useState<ImageGroup | null>(null);
  const [activeVideo, setActiveVideo] = useState<string | null>(null);
  const [selectedAssets, setSelectedAssets] = useState<SelectedAsset[]>([]);
  const [activeImage, setActiveImage] = useState<{ url: string; urls: string[] } | null>(null);
  const [selectedVideoGroup, setSelectedVideoGroup] = useState<{ group_key: string; videos: VideoAsset[]; created_at: number } | null>(null);

  // Group sequential loop videos by prompt_history[0] (or keep ungrouped if sidecar missing)
  const videoGroups = React.useMemo(() => {
    const groupsMap: { [key: string]: VideoAsset[] } = {};
    const ungroupedList: VideoAsset[] = [];
    
    videos.forEach((vid) => {
      const firstPrompt = vid.prompt_history?.[0];
      if (firstPrompt && firstPrompt.trim()) {
        if (!groupsMap[firstPrompt]) {
          groupsMap[firstPrompt] = [];
        }
        groupsMap[firstPrompt].push(vid);
      } else {
        ungroupedList.push(vid);
      }
    });
    
    const resultGroups: { group_key: string; videos: VideoAsset[]; created_at: number }[] = [];
    
    // Convert groupsMap to array
    Object.entries(groupsMap).forEach(([key, items]) => {
      // Sort items: first gen (shortest duration) first
      items.sort((a, b) => {
        const durA = a.duration || 0;
        const durB = b.duration || 0;
        if (durA !== durB) return durA - durB;
        return a.created_at - b.created_at;
      });
      
      const maxCreatedAt = Math.max(...items.map((v) => v.created_at));
      
      resultGroups.push({
        group_key: key,
        videos: items,
        created_at: maxCreatedAt
      });
    });
    
    // For ungrouped videos, each one forms its own group of size 1
    ungroupedList.forEach((vid, index) => {
      resultGroups.push({
        group_key: `ungrouped_${vid.url}_${index}`,
        videos: [vid],
        created_at: vid.created_at
      });
    });
    
    // Sort final groups by created_at descending (most recent first)
    resultGroups.sort((a, b) => b.created_at - a.created_at);
    
    return resultGroups;
  }, [videos]);

  const [visibleCount, setVisibleCount] = useState(12);

  React.useEffect(() => {
    setVisibleCount(12);
  }, [images, videos]);

  const unifiedAssets = React.useMemo(() => {
    const assets: UnifiedGalleryAsset[] = [];
    
    // Add image groups
    images.forEach((imgGroup) => {
      assets.push({
        type: "image",
        id: imgGroup.generation_id,
        urls: imgGroup.urls,
        created_at: imgGroup.created_at
      });
    });
    
    // Add video groups
    videoGroups.forEach((vidGroup) => {
      assets.push({
        type: "video",
        id: vidGroup.group_key,
        videos: vidGroup.videos,
        created_at: vidGroup.created_at
      });
    });
    
    // Sort all unified assets by created_at descending (most recent first)
    assets.sort((a, b) => b.created_at - a.created_at);
    return assets;
  }, [images, videoGroups]);

  const getDateHeader = (ts: number): string => {
    if (!ts) return "Unknown Date";
    const date = new Date(ts * 1000);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return "Today";
    }
    if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    }
    
    return date.toLocaleDateString(undefined, {
      month: "long",
      day: "numeric",
      year: "numeric"
    });
  };

  const groupedAssetsByDate = React.useMemo(() => {
    const sliced = unifiedAssets.slice(0, visibleCount);
    const groups: { dateHeader: string; items: UnifiedGalleryAsset[] }[] = [];
    const dateHeadersMap: { [header: string]: UnifiedGalleryAsset[] } = {};
    
    sliced.forEach((asset) => {
      const header = getDateHeader(asset.created_at);
      if (!dateHeadersMap[header]) {
        dateHeadersMap[header] = [];
      }
      dateHeadersMap[header].push(asset);
    });
    
    const seenHeaders = new Set<string>();
    sliced.forEach((asset) => {
      const header = getDateHeader(asset.created_at);
      if (!seenHeaders.has(header)) {
        seenHeaders.add(header);
        groups.push({
          dateHeader: header,
          items: dateHeadersMap[header]
        });
      }
    });
    
    return groups;
  }, [unifiedAssets, visibleCount]);

  const formatTimestamp = (ts: number) => {
    if (!ts) return "Unknown Date";
    const date = new Date(ts * 1000);
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleDownload = async (url: string, name: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(url, "_blank");
    }
  };

  const toggleAssetSelection = (url: string, type: "image" | "video") => {
    setSelectedAssets((prev) => {
      const exists = prev.find((item) => item.url === url);
      if (exists) {
        return prev.filter((item) => item.url !== url);
      } else {
        return [...prev, { url, type }];
      }
    });
  };

  const isAssetSelected = (url: string) => {
    return selectedAssets.some((asset) => asset.url === url);
  };

  const getAssetTypeCount = (type: "image" | "video") => {
    return selectedAssets.filter((a) => a.type === type).length;
  };

  const hasSelected = selectedAssets.length > 0;
  const imageCount = getAssetTypeCount("image");
  const videoCount = getAssetTypeCount("video");

  // Constraints
  const showAnimate = selectedAssets.length === 1 && imageCount === 1;
  const showExtend = selectedAssets.length === 1 && videoCount === 1;
  const showAttach = selectedAssets.length >= 1 && selectedAssets.length <= 5 && videoCount === 0;
  const showDelete = selectedAssets.length > 0;

  const handleDeselect = () => {
    setSelectedAssets([]);
  };

  const handleAnimate = () => {
    if (onAnimateImage && showAnimate) {
      onAnimateImage(selectedAssets[0].url);
      setSelectedAssets([]);
    }
  };

  const handleExtend = () => {
    if (onExtendVideo && showExtend) {
      onExtendVideo(selectedAssets[0].url);
      setSelectedAssets([]);
    }
  };

  const handleAddDialogues = () => {
    if (onAddDialogues && showExtend) {
      onAddDialogues(selectedAssets[0].url);
      setSelectedAssets([]);
    }
  };

  const handleAttach = () => {
    if (onGenerateImages && showAttach) {
      onGenerateImages(selectedAssets.map((a) => a.url));
      setSelectedAssets([]);
    }
  };

  const handleDelete = () => {
    if (onDeleteAssets && showDelete) {
      if (confirm(`Are you sure you want to delete the ${selectedAssets.length} selected asset(s)?`)) {
        onDeleteAssets(selectedAssets.map((a) => a.url));
        setSelectedAssets([]);
      }
    }
  };

  return (
    <div className="relative flex flex-col items-center w-[480px] max-w-full h-[620px] bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-300 outline-none">
      {/* ── HEADER (CONTEXTUAL OR STANDARD) ── */}
      {hasSelected ? (
        <div className="w-full flex shrink-0 items-center justify-between p-4 bg-slate-900 text-white z-20 animate-in slide-in-from-top duration-200">
          <div className="flex items-center gap-3">
            <button
              onClick={handleDeselect}
              className="p-1.5 hover:bg-slate-800 rounded-full text-slate-300 hover:text-white transition-colors active:scale-95"
            >
              <X className="size-4" />
            </button>
            <span className="text-xs font-bold uppercase tracking-wider">
              {selectedAssets.length} Selected
            </span>
          </div>

          <div className="flex items-center gap-1">
            {showAnimate && (
              <div className="relative group">
                <button
                  onClick={handleAnimate}
                  className="p-2 hover:bg-slate-800 rounded-xl text-emerald-400 hover:text-emerald-300 transition-colors active:scale-95 cursor-pointer"
                >
                  <Video className="size-4.5" />
                </button>
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 hidden group-hover:block bg-slate-800 text-white text-[9px] font-bold py-1 px-2 rounded-lg whitespace-nowrap z-[99] pointer-events-none shadow-lg border border-slate-700">
                  Animate Image
                </div>
              </div>
            )}

            {showExtend && (
              <div className="relative group">
                <button
                  onClick={handleExtend}
                  className="p-2 hover:bg-slate-800 rounded-xl text-blue-400 hover:text-blue-300 transition-colors active:scale-95 cursor-pointer"
                >
                  <Video className="size-4.5" />
                </button>
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 hidden group-hover:block bg-slate-800 text-white text-[9px] font-bold py-1 px-2 rounded-lg whitespace-nowrap z-[99] pointer-events-none shadow-lg border border-slate-700">
                  Extend Video
                </div>
              </div>
            )}

            {showExtend && (
              <div className="relative group">
                <button
                  onClick={handleAddDialogues}
                  className="p-2 hover:bg-slate-800 rounded-xl text-emerald-400 hover:text-emerald-300 transition-colors active:scale-95 cursor-pointer"
                >
                  <Volume2 className="size-4.5" />
                </button>
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 hidden group-hover:block bg-slate-800 text-white text-[9px] font-bold py-1 px-2 rounded-lg whitespace-nowrap z-[99] pointer-events-none shadow-lg border border-slate-700">
                  Add Dialogues
                </div>
              </div>
            )}

            {showAttach && (
              <div className="relative group">
                <button
                  onClick={handleAttach}
                  className="p-2 hover:bg-slate-800 rounded-xl text-yellow-400 hover:text-yellow-300 transition-colors active:scale-95 cursor-pointer"
                >
                  <Paperclip className="size-4.5" />
                </button>
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 hidden group-hover:block bg-slate-800 text-white text-[9px] font-bold py-1 px-2 rounded-lg whitespace-nowrap z-[99] pointer-events-none shadow-lg border border-slate-700">
                  Attach as Reference
                </div>
              </div>
            )}

            {showDelete && (
              <div className="relative group">
                <button
                  onClick={handleDelete}
                  className="p-2 hover:bg-slate-800 rounded-xl text-rose-500 hover:text-rose-400 transition-colors active:scale-95 cursor-pointer"
                >
                  <Trash2 className="size-4.5" />
                </button>
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 hidden group-hover:block bg-slate-800 text-white text-[9px] font-bold py-1 px-2 rounded-lg whitespace-nowrap z-[99] pointer-events-none shadow-lg border border-slate-700">
                  Delete Selected
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="w-full flex shrink-0 items-center justify-between p-4 border-b border-slate-100 bg-white/80 z-10">
          <div className="flex items-center gap-2 pl-2">
            <button
              onClick={onBack}
              className="p-1.5 hover:bg-slate-50 rounded-full text-slate-400 hover:text-slate-600 transition-all active:scale-95"
              title="Back to Welcome"
            >
              <ArrowLeft className="size-4" />
            </button>
            <span className="text-[11px] font-bold text-[#0b1957] uppercase tracking-wider flex items-center gap-2">
              Asset Vault & Gallery
              {loading && <span className="inline-block size-3 rounded-full border-2 border-slate-200 border-t-[#0b1957] animate-spin" />}
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

      {/* Main Content (Scrollable Container) */}
      <div className="flex-1 w-full min-h-0 overflow-y-auto px-6 py-4 space-y-6 scrollbar-none bg-slate-50/50">
        {loading && images.length === 0 && videos.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-16 text-center space-y-4">
            <div className="size-16 rounded-full flex items-center justify-center border-4 border-slate-100 border-t-[#0b1957] animate-spin" />
            <div className="space-y-1">
              <h3 className="font-bold text-slate-700 text-sm animate-pulse">Accessing Vault...</h3>
              <p className="text-xs text-slate-400 max-w-[240px] leading-relaxed">
                Retrieving your media assets and generation history.
              </p>
            </div>
          </div>
        ) : images.length === 0 && videos.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-16 text-center space-y-4">
            <div className="size-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
              <Sparkles className="size-8" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-slate-700 text-sm">No assets found</h3>
              <p className="text-xs text-slate-400 max-w-[240px] leading-relaxed">
                Start generating image concepts or videos to see them listed in your asset vault.
              </p>
            </div>
          </div>
        ) : (
          <>
            {groupedAssetsByDate.map((group) => {
              return (
                <div key={group.dateHeader} className="space-y-2.5">
                  {/* Date Header */}
                  <h3 className="text-xs font-extrabold text-[#0b1957]/80 uppercase tracking-wider pl-1.5 pt-2 select-none">
                    {group.dateHeader}
                  </h3>
                  
                  {/* 3-Column Grid */}
                  <div className="grid grid-cols-3 gap-3">
                    {group.items.map((asset) => {
                      if (asset.type === "image") {
                        const isGroup = (asset.urls?.length || 0) > 1;
                        const hasSelectedInGroup = asset.urls?.some((url) => isAssetSelected(url)) || false;
                        const topUrl = asset.urls?.[0] || "";
                        
                        if (!isGroup) {
                          const isSel = isAssetSelected(topUrl);
                          return (
                            <div
                              key={asset.id}
                              onClick={() => toggleAssetSelection(topUrl, "image")}
                              className="relative w-full aspect-square pr-1.5 pb-1.5 select-none cursor-pointer"
                            >
                              <div className={cn(
                                "absolute inset-x-0 inset-y-0 mr-1 mb-1 rounded-2xl bg-slate-900 border overflow-hidden group shadow-sm hover:shadow transition-all",
                                isSel ? "border-[#0b1957] ring-2 ring-[#0b1957]/20" : "border-slate-200 hover:border-[#0b1957]/30"
                              )}>
                                <img
                                  src={topUrl}
                                  alt="Asset"
                                  className="w-full h-full object-cover pointer-events-none"
                                  loading="lazy"
                                />
                                {/* Selection check overlay */}
                                <div className={cn(
                                  "absolute top-1.5 right-1.5 size-4 rounded-full border flex items-center justify-center transition-all z-25",
                                  isSel ? "bg-[#0b1957] border-[#0b1957] text-white" : "bg-white/70 border-slate-300 backdrop-blur-sm opacity-0 group-hover:opacity-100"
                                )}>
                                  {isSel && <Check className="size-2.5 stroke-[3]" />}
                                </div>
                              </div>
                            </div>
                          );
                        } else {
                          // Stacked Image card deck
                          return (
                            <div
                              key={asset.id}
                              onClick={() => setSelectedGroup(images.find(g => g.generation_id === asset.id) || null)}
                              className="relative w-full aspect-square pr-1.5 pb-1.5 select-none cursor-pointer"
                            >
                              {/* Layer 3 */}
                              <div className="absolute inset-0 rounded-2xl bg-slate-300/80 border border-slate-300/50 -rotate-3 -translate-x-1 -translate-y-1 shadow-sm" />
                              {/* Layer 2 */}
                              <div className="absolute inset-0 rounded-2xl bg-slate-200/90 border border-slate-200/70 rotate-3 translate-x-1 translate-y-1 shadow-sm" />
                              {/* Layer 1 */}
                              <div className={cn(
                                "absolute inset-0 rounded-2xl bg-slate-900 border overflow-hidden group shadow-md hover:shadow-lg transition-all",
                                hasSelectedInGroup ? "border-[#0b1957] ring-2 ring-[#0b1957]/20" : "border-slate-200 hover:border-[#0b1957]/40"
                              )}>
                                <img
                                  src={topUrl}
                                  alt="Image Stack"
                                  className="w-full h-full object-cover pointer-events-none"
                                  loading="lazy"
                                />
                                <div className={cn(
                                  "absolute top-1.5 right-1.5 size-4 rounded-full border flex items-center justify-center transition-all z-25",
                                  hasSelectedInGroup ? "bg-[#0b1957] border-[#0b1957] text-white" : "bg-white/70 border-slate-300 backdrop-blur-sm opacity-0 group-hover:opacity-100"
                                )}>
                                  {hasSelectedInGroup && <Check className="size-2.5 stroke-[3]" />}
                                </div>
                              </div>
                            </div>
                          );
                        }
                      } else {
                        // Video type
                        const isGroup = (asset.videos?.length || 0) > 1;
                        const hasSelectedInGroup = asset.videos?.some((vid) => isAssetSelected(vid.url)) || false;
                        const topVid = asset.videos?.[0];
                        
                        if (!topVid) return null;
                        
                        if (!isGroup) {
                          const isSel = isAssetSelected(topVid.url);
                          return (
                            <div
                              key={asset.id}
                              onClick={() => toggleAssetSelection(topVid.url, "video")}
                              className="relative w-full aspect-square pr-1.5 pb-1.5 select-none cursor-pointer"
                            >
                              <div className={cn(
                                "absolute inset-x-0 inset-y-0 mr-1 mb-1 rounded-2xl bg-slate-900 border overflow-hidden group shadow-sm hover:shadow transition-all",
                                isSel ? "border-[#0b1957] ring-2 ring-[#0b1957]/20" : "border-slate-200 hover:border-[#0b1957]/30"
                              )}>
                                <video
                                  src={topVid.url}
                                  preload="metadata"
                                  className="w-full h-full object-cover pointer-events-none"
                                />
                                {topVid.duration !== undefined && topVid.duration > 0 && (
                                  <div className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 bg-black/60 rounded text-[9px] text-white font-bold z-20 shadow-sm">
                                    {topVid.duration}s
                                  </div>
                                )}
                                {/* Play overlay */}
                                <div
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveVideo(topVid.url);
                                  }}
                                  className="absolute inset-0 bg-black/35 flex items-center justify-center opacity-80 group-hover:opacity-100 transition-opacity"
                                >
                                  <div className="size-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30 group-hover:scale-110 transition-transform">
                                    <Play className="size-4 text-white fill-current translate-x-0.5" />
                                  </div>
                                </div>
                                <div className={cn(
                                  "absolute top-1.5 right-1.5 size-4 rounded-full border flex items-center justify-center transition-all z-25",
                                  isSel ? "bg-[#0b1957] border-[#0b1957] text-white" : "bg-white/70 border-slate-300 backdrop-blur-sm opacity-0 group-hover:opacity-100"
                                )}>
                                  {isSel && <Check className="size-2.5 stroke-[3]" />}
                                </div>
                              </div>
                            </div>
                          );
                        } else {
                          // Stacked Video card deck
                          return (
                            <div
                              key={asset.id}
                              onClick={() => {
                                const derivedGroup = videoGroups.find(g => g.group_key === asset.id);
                                if (derivedGroup) {
                                  setSelectedVideoGroup(derivedGroup);
                                }
                              }}
                              className="relative w-full aspect-square pr-1.5 pb-1.5 select-none cursor-pointer"
                            >
                              {/* Layer 3 */}
                              <div className="absolute inset-0 rounded-2xl bg-slate-300/80 border border-slate-300/50 -rotate-3 -translate-x-1 -translate-y-1 shadow-sm" />
                              {/* Layer 2 */}
                              <div className="absolute inset-0 rounded-2xl bg-slate-200/90 border border-slate-200/70 rotate-3 translate-x-1 translate-y-1 shadow-sm" />
                              {/* Layer 1 */}
                              <div className={cn(
                                "absolute inset-0 rounded-2xl bg-slate-900 border overflow-hidden group shadow-md hover:shadow-lg transition-all",
                                hasSelectedInGroup ? "border-[#0b1957] ring-2 ring-[#0b1957]/20" : "border-slate-200 hover:border-[#0b1957]/40"
                              )}>
                                <video
                                  src={topVid.url}
                                  preload="metadata"
                                  className="w-full h-full object-cover pointer-events-none"
                                />
                                {topVid.duration !== undefined && topVid.duration > 0 && (
                                  <div className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 bg-black/60 rounded text-[9px] text-white font-bold z-20 shadow-sm">
                                    {topVid.duration}s
                                  </div>
                                )}
                                <div
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveVideo(topVid.url);
                                  }}
                                  className="absolute inset-0 bg-black/35 flex items-center justify-center opacity-80 group-hover:opacity-100 transition-opacity"
                                >
                                  <div className="size-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30 group-hover:scale-110 transition-transform">
                                    <Play className="size-4 text-white fill-current translate-x-0.5" />
                                  </div>
                                </div>
                                <div className={cn(
                                  "absolute top-1.5 right-1.5 size-4 rounded-full border flex items-center justify-center transition-all z-25",
                                  hasSelectedInGroup ? "bg-[#0b1957] border-[#0b1957] text-white" : "bg-white/70 border-slate-300 backdrop-blur-sm opacity-0 group-hover:opacity-100"
                                )}>
                                  {hasSelectedInGroup && <Check className="size-2.5 stroke-[3]" />}
                                </div>
                              </div>
                            </div>
                          );
                        }
                      }
                    })}
                  </div>
                </div>
              );
            })}
            
            {/* Cute load more button */}
            {unifiedAssets.length > visibleCount ? (
              <div className="flex justify-center pt-3 pb-6 animate-in fade-in duration-300">
                <button
                  onClick={() => setVisibleCount((prev) => prev + 12)}
                  className="px-5 py-2 text-[11px] font-bold text-slate-700 bg-white border border-slate-200 rounded-full hover:bg-slate-50 transition-all active:scale-95 shadow-sm flex items-center gap-1.5 hover:border-slate-300"
                >
                  <Sparkles className="size-3 text-[#0b1957] fill-current" />
                  Load More
                </button>
              </div>
            ) : (
              !isFullHistory && onLoadFullHistory && (
                <div className="flex justify-center pt-3 pb-6 animate-in fade-in duration-300">
                  <button
                    onClick={onLoadFullHistory}
                    className="px-5 py-2 text-[11px] font-bold text-[#0b1957] bg-blue-50/50 border border-blue-100 rounded-full hover:bg-blue-50 hover:border-blue-200 transition-all active:scale-95 shadow-sm flex items-center gap-1.5"
                  >
                    <Sparkles className="size-3 text-[#0b1957] fill-current animate-pulse" />
                    Load Older Generations (Pre-90 Days)
                  </button>
                </div>
              )
            )}
          </>
        )}
      </div>

      {/* ── OVERLAYS / LIGHTBOX MODALS ── */}

      {/* Image Group Detailed Modal Overlay */}
      {selectedGroup && (
        <div className="absolute inset-0 bg-slate-950/80 z-50 flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="bg-white w-full rounded-2xl p-4 max-h-[90%] flex flex-col space-y-4 shadow-2xl relative animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setSelectedGroup(null)}
              className="absolute top-3 right-3 p-1.5 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="size-4" />
            </button>
            
            <div className="pr-8">
              <h4 className="font-bold text-sm text-[#0b1957]">
                Image Group Previews
              </h4>
              <p className="text-[10px] text-slate-400">
                Generated {formatTimestamp(selectedGroup.created_at)}
              </p>
            </div>

            {/* Grid of 4 images */}
            <div className="grid grid-cols-2 gap-3 flex-1 overflow-y-auto pr-1">
              {selectedGroup.urls.map((url, idx) => {
                const isSel = isAssetSelected(url);
                return (
                  <div
                    key={idx}
                    onClick={() => setActiveImage({ url, urls: selectedGroup.urls })}
                    className={cn(
                      "rounded-xl overflow-hidden bg-slate-50 border relative group aspect-square flex flex-col cursor-pointer transition-all",
                      isSel ? "border-[#0b1957] ring-2 ring-[#0b1957]/20" : "border-slate-200"
                    )}
                  >
                    <img
                      src={url}
                      alt={`Preview ${idx + 1}`}
                      className="w-full h-full object-cover flex-1"
                    />
                    {/* Action overlays on hover */}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-2 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(url, "_blank");
                        }}
                        className="p-1 bg-white/20 hover:bg-white/30 text-white rounded transition-colors"
                        title="Open Original"
                      >
                        <ExternalLink className="size-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownload(url, `concept-${selectedGroup.generation_id.slice(-6)}-${idx + 1}.png`);
                        }}
                        className="p-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded transition-colors"
                        title="Download Image"
                      >
                        <Download className="size-3.5" />
                      </button>
                    </div>
                    {/* Selection check icon overlay */}
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleAssetSelection(url, "image");
                      }}
                      className={cn(
                        "absolute top-2 right-2 size-5 rounded-full border flex items-center justify-center transition-all z-20 cursor-pointer active:scale-95",
                        isSel ? "bg-[#0b1957] border-[#0b1957] text-white animate-in zoom-in-50" : "bg-white/80 border-slate-300 backdrop-blur-sm opacity-100"
                      )}
                    >
                      {isSel && <Check className="size-3 stroke-[3]" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Video Modal Player Overlay */}
      {activeVideo && (
        <div className="absolute inset-0 bg-slate-950/90 z-60 flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="w-full max-w-[380px] bg-slate-900 rounded-2xl overflow-hidden shadow-2xl relative animate-in zoom-in-95 duration-200 border border-slate-800 flex flex-col">
            <button
              onClick={() => setActiveVideo(null)}
              className="absolute top-3 right-3 z-10 p-1.5 bg-black/40 hover:bg-black/60 rounded-full text-white/80 hover:text-white transition-colors"
            >
              <X className="size-4" />
            </button>
            
            <div className="aspect-video bg-black flex items-center justify-center relative">
              <video
                src={activeVideo}
                controls
                autoPlay
                className="w-full h-full object-contain"
              />
            </div>
            
            <div className="p-4 flex items-center justify-between bg-slate-950">
              <span className="text-[10px] text-slate-400 font-semibold">Video Playback</span>
              <div className="flex gap-2">
                {onExtendVideo && (
                  <button
                    onClick={() => {
                      onExtendVideo(activeVideo);
                      setActiveVideo(null);
                    }}
                    className="py-1.5 px-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Video className="size-3.5" />
                    Extend Video
                  </button>
                )}
                {onAddDialogues && (
                  <button
                    onClick={() => {
                      onAddDialogues(activeVideo);
                      setActiveVideo(null);
                    }}
                    className="py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Volume2 className="size-3.5" />
                    Add Dialogues
                  </button>
                )}
                <button
                  onClick={() => handleDownload(activeVideo, "playground-video.mp4")}
                  className="py-1.5 px-3 bg-[#0b1957] hover:bg-blue-900 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Download className="size-3.5" />
                  Download Video
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Image Fullscreen Lightbox Modal */}
      {activeImage && (() => {
        const currentIdx = activeImage.urls.indexOf(activeImage.url);
        const isSel = isAssetSelected(activeImage.url);
        return (
          <div 
            className="absolute inset-0 bg-slate-950/95 z-55 flex flex-col items-center justify-between p-6 animate-in fade-in duration-200"
            onClick={() => setActiveImage(null)}
          >
            {/* Top bar */}
            <div className="w-full flex justify-between items-center z-20" onClick={(e) => e.stopPropagation()}>
              <span className="text-[10px] font-bold text-white/70 uppercase tracking-wider">
                Image Preview {currentIdx + 1} of {activeImage.urls.length}
              </span>
              <button
                onClick={() => setActiveImage(null)}
                className="p-1.5 bg-white/10 hover:bg-white/20 rounded-full text-white/80 hover:text-white transition-colors"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Center container with arrows & image */}
            <div className="relative flex-1 w-full flex items-center justify-center min-h-0" onClick={(e) => e.stopPropagation()}>
              {activeImage.urls.length > 1 && (
                <>
                  {/* Previous Button */}
                  <button
                    disabled={currentIdx <= 0}
                    onClick={() => {
                      if (currentIdx > 0) {
                        setActiveImage({ url: activeImage.urls[currentIdx - 1], urls: activeImage.urls });
                      }
                    }}
                    className="absolute left-2 z-30 p-2 bg-white/10 hover:bg-white/20 disabled:opacity-20 text-white rounded-full transition-all active:scale-95 cursor-pointer"
                  >
                    <ChevronLeft className="size-5" />
                  </button>

                  {/* Next Button */}
                  <button
                    disabled={currentIdx >= activeImage.urls.length - 1}
                    onClick={() => {
                      if (currentIdx < activeImage.urls.length - 1) {
                        setActiveImage({ url: activeImage.urls[currentIdx + 1], urls: activeImage.urls });
                      }
                    }}
                    className="absolute right-2 z-30 p-2 bg-white/10 hover:bg-white/20 disabled:opacity-20 text-white rounded-full transition-all active:scale-95 cursor-pointer"
                  >
                    <ChevronRight className="size-5" />
                  </button>
                </>
              )}

              <img
                src={activeImage.url}
                alt={`Expanded Preview ${currentIdx + 1}`}
                className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-2xl"
              />
            </div>

            {/* Bottom Footer Actions */}
            <div 
              className="w-full flex items-center justify-center gap-3 bg-slate-900/80 backdrop-blur-md p-3 rounded-2xl border border-white/10 z-20 max-w-full overflow-x-auto select-none" 
              onClick={(e) => e.stopPropagation()}
            >
              {/* Select Toggle Button */}
              <button
                onClick={() => toggleAssetSelection(activeImage.url, "image")}
                className={cn(
                  "h-9 px-4 flex items-center justify-center gap-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap active:scale-95",
                  isSel 
                    ? "bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700" 
                    : "bg-white/10 hover:bg-white/20 text-white border border-white/10"
                )}
              >
                <Check className={cn("size-3.5", isSel ? "text-emerald-400 stroke-[3]" : "text-white/50")} />
                {isSel ? "Selected" : "Select"}
              </button>

              {/* Animate Concept Button (Camera icon) */}
              {onAnimateImage && (
                <button
                  onClick={() => {
                    onAnimateImage(activeImage.url);
                    setActiveImage(null);
                  }}
                  className="h-9 px-4 bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-500/30 flex items-center justify-center gap-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap active:scale-95"
                  title="Animate Concept"
                >
                  <Video className="size-3.5" />
                  Animate
                </button>
              )}

              {/* Attach as Reference Button */}
              {onGenerateImages && (
                <button
                  onClick={() => {
                    onGenerateImages([activeImage.url]);
                    setActiveImage(null);
                  }}
                  className="h-9 px-4 bg-amber-600 hover:bg-amber-500 text-white border border-amber-500/30 flex items-center justify-center gap-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap active:scale-95"
                  title="Attach as Reference"
                >
                  <Paperclip className="size-3.5" />
                  Attach
                </button>
              )}

              {/* Download Button */}
              <button
                onClick={() => handleDownload(activeImage.url, `concept-max-${currentIdx + 1}.png`)}
                className="h-9 px-4 bg-[#0b1957] hover:bg-blue-800 text-white border border-blue-900/50 flex items-center justify-center gap-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap active:scale-95"
              >
                <Download className="size-3.5" />
                Download
              </button>
            </div>
          </div>
        )}
      )()}

      {/* Video Group Stack detailed Modal Overlay */}
      {selectedVideoGroup && (
        <div className="absolute inset-0 bg-slate-950/80 z-50 flex items-center justify-center p-6 animate-in fade-in duration-200" onClick={() => setSelectedVideoGroup(null)}>
          <div 
            className="bg-white w-full max-w-[380px] rounded-3xl p-5 max-h-[85%] flex flex-col space-y-4 shadow-2xl relative animate-in zoom-in-95 duration-200 border border-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedVideoGroup(null)}
              className="absolute top-4 right-4 p-1.5 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors cursor-pointer active:scale-95"
            >
              <X className="size-4" />
            </button>
            
            <div className="pr-8 space-y-1">
              <h4 className="font-bold text-sm text-[#0b1957] flex items-center gap-1.5">
                <Video className="size-4 text-[#0b1957]" />
                Video Sequence Generations
              </h4>
              <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
                This stack contains {selectedVideoGroup.videos.length} extended segments of the same concept. Showing longest generations first.
              </p>
            </div>

            {/* List of videos (longest first) */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-none">
              {[...selectedVideoGroup.videos].reverse().map((vid, idx) => {
                const isSel = isAssetSelected(vid.url);
                return (
                  <div
                    key={idx}
                    className={cn(
                      "p-2.5 rounded-2xl border transition-all flex items-center justify-between gap-3 shadow-sm bg-slate-50/20",
                      isSel ? "border-[#0b1957] bg-blue-50/10" : "border-slate-100 hover:border-slate-200"
                    )}
                  >
                    <div 
                      className="w-[100px] aspect-video rounded-xl bg-slate-900 border border-slate-200 overflow-hidden relative cursor-pointer group flex-shrink-0"
                      onClick={() => setActiveVideo(vid.url)}
                    >
                      <video
                        src={vid.url}
                        preload="metadata"
                        className="w-full h-full object-cover pointer-events-none"
                      />
                      {/* Play hover overlay */}
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-70 group-hover:opacity-100 transition-opacity">
                        <Play className="size-4.5 text-white fill-current translate-x-0.5" />
                      </div>
                      {/* Duration badge */}
                      <div className="absolute bottom-1 right-1 px-1 py-0.5 bg-black/60 rounded text-[8px] text-white font-bold">
                        {vid.duration ? `${vid.duration}s` : "Video"}
                      </div>
                    </div>

                    <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5 h-full">
                      <div className="min-w-0">
                        <div className="text-[10px] font-bold text-slate-700 truncate">
                          {idx === 0 ? "Longest / Final Video" : `Extension Part ${selectedVideoGroup.videos.length - idx}`}
                        </div>
                        <div className="text-[9px] text-slate-400 font-medium mt-0.5">
                          Duration: {vid.duration || 8}s • {formatTimestamp(vid.created_at)}
                        </div>
                      </div>
                      
                      {/* Action buttons inside the modal item */}
                      <div className="flex items-center gap-1.5 mt-2">
                        <button
                          onClick={() => toggleAssetSelection(vid.url, "video")}
                          className={cn(
                            "h-6.5 px-2.5 flex items-center justify-center gap-1 text-[9px] font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap active:scale-95 border",
                            isSel 
                              ? "bg-[#0b1957] hover:bg-blue-900 text-white border-[#0b1957]" 
                              : "bg-white hover:bg-slate-50 text-slate-600 border-slate-200"
                          )}
                        >
                          <Check className={cn("size-2.5", isSel ? "text-white stroke-[3]" : "text-slate-400")} />
                          {isSel ? "Selected" : "Select"}
                        </button>
                        <button
                          onClick={() => handleDownload(vid.url, `video-segment-${vid.duration || 8}s.mp4`)}
                          className="h-6.5 w-6.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg flex items-center justify-center transition-all cursor-pointer active:scale-95 border border-slate-200/40"
                          title="Download Segment"
                        >
                          <Download className="size-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
