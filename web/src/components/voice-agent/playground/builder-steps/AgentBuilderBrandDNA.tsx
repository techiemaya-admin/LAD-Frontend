"use client";

import React, { useState } from "react";
import { X, Sparkles, Copy, Check, BookOpen, Palette, Layers, ExternalLink, Type, ArrowLeft, ZoomIn } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

export interface BrandAsset {
  key: string;
  category: string;
  url: string;
  context?: string;
}

export interface BrandDnaData {
  brand_name: string;
  domain: string;
  url: string;
  overview?: string;
  tagline?: string;
  values?: string[];
  tone?: string;
  colors?: {
    primary?: string;
    background?: string;
    accent?: string;
  };
  fonts?: {
    title?: string;
    body?: string;
  };
  assets?: BrandAsset[];
  testimonials?: Array<{ quote: string; author?: string }>;
}

export function AgentBuilderBrandDNA({
  brandDna,
  onClose,
  onNext,
  phase,
  onBack,
  hideButtons = false,
  fullBleed = false,
}: {
  brandDna?: BrandDnaData;
  onClose?: () => void;
  onNext: (val: string) => void;
  phase?: string;
  onBack?: () => void;
  hideButtons?: boolean;
  fullBleed?: boolean;
}) {
  const [copiedColor, setCopiedColor] = useState<string | null>(null);
  const [zoomedAsset, setZoomedAsset] = useState<BrandAsset | null>(null);
  const [loadedAssets, setLoadedAssets] = useState<Record<string, boolean>>({});
  const [failedAssets, setFailedAssets] = useState<Record<string, boolean>>({});

  const checkersStyle: React.CSSProperties = {
    backgroundImage: "conic-gradient(#f1f5f9 25%, transparent 0 50%, #f1f5f9 0 75%, transparent 0)",
    backgroundSize: "12px 12px",
    backgroundColor: "#ffffff"
  };

  React.useEffect(() => {
    if (!brandDna?.fonts) return;

    const fontsToLoad: string[] = [];
    const extractFonts = (fontStr?: string) => {
      if (!fontStr) return;
      fontStr.split(",").forEach((f) => {
        const cleaned = f.replace(/['"]/g, "").trim();
        // Skip generic fallback/system fonts
        if (
          cleaned &&
          !/^(system-ui|sans-serif|serif|monospace|-apple-system|BlinkMacSystemFont|Segoe UI|Arial|Helvetica|Times New Roman|Courier New|sans|serif)$/i.test(cleaned)
        ) {
          fontsToLoad.push(cleaned);
        }
      });
    };

    extractFonts(brandDna.fonts.title);
    extractFonts(brandDna.fonts.body);

    if (fontsToLoad.length > 0) {
      const uniqueFonts = Array.from(new Set(fontsToLoad));
      const linkId = "google-fonts-brand-dna";
      let linkElement = document.getElementById(linkId) as HTMLLinkElement;
      if (!linkElement) {
        linkElement = document.createElement("link");
        linkElement.id = linkId;
        linkElement.rel = "stylesheet";
        document.head.appendChild(linkElement);
      }
      
      const href = uniqueFonts
        .map((font) => `family=${font.replace(/\s+/g, "+")}`)
        .join("&");
      linkElement.href = `https://fonts.googleapis.com/css2?${href}&display=swap`;
    }

    return () => {
      const linkElement = document.getElementById("google-fonts-brand-dna");
      if (linkElement) {
        linkElement.remove();
      }
    };
  }, [brandDna?.fonts]);

  if (!brandDna) {
    return (
      <div className={cn(
        "relative flex flex-col items-center justify-center p-8",
        fullBleed 
          ? "w-full h-full bg-transparent" 
          : "w-[448px] max-w-full h-[88%] max-h-[660px] min-h-[460px] bg-white rounded-3xl border border-slate-200 shadow-xl"
      )}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0b1957]" />
        <p className="mt-4 text-sm font-semibold text-slate-500">Loading Brand DNA Profile...</p>
      </div>
    );
  }

  const handleCopyColor = (color: string) => {
    navigator.clipboard.writeText(color);
    setCopiedColor(color);
    setTimeout(() => setCopiedColor(null), 2000);
  };

  // Group assets by category
  const categories: Record<string, BrandAsset[]> = {};
  if (brandDna.assets) {
    brandDna.assets.forEach((asset) => {
      const cat = asset.category || "General Assets";
      if (!categories[cat]) categories[cat] = [];
      categories[cat].push(asset);
    });
  }

  return (
    <div className={cn(
      "relative flex flex-col items-center overflow-hidden transition-all duration-300",
      fullBleed 
        ? "w-full h-full bg-transparent" 
        : "w-[448px] max-w-full h-[88%] max-h-[660px] min-h-[460px] bg-white rounded-3xl border border-slate-200 shadow-xl animate-in fade-in zoom-in-95"
    )}>
      
      {/* Header */}
      {!fullBleed && (
        <div className="w-full flex flex-shrink-0 items-center justify-between p-4 border-b border-slate-100 bg-white/80 z-10">
          <div className="flex items-center gap-2 pl-4">
            <Sparkles className="size-4 text-emerald-500" />
            <span className="text-[11px] font-bold text-[#0b1957] uppercase tracking-wider">
              {"Extracted Brand DNA"}
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

      {/* Main Content Area */}
      <div className="flex-1 w-full overflow-y-auto scrollbar-none pt-6 px-6 pb-20 space-y-6">
        
        {/* Title & Domain */}
        <div className="text-center space-y-1">
          <h2
            className="text-2xl font-extrabold text-[#0b1957] tracking-tight"
            style={{ fontFamily: brandDna.fonts?.title || "inherit" }}
          >
            {brandDna.brand_name || "Extracted Brand DNA"}
          </h2>
          <a
            href={brandDna.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-blue-500 font-semibold hover:underline"
          >
            {brandDna.domain} <ExternalLink className="size-3" />
          </a>
          {brandDna.tagline && (
            <div
              className="text-sm font-semibold text-slate-500 mt-2 italic markdown-content"
              style={{ fontFamily: brandDna.fonts?.body || "inherit" }}
            >
              <ReactMarkdown
                components={{
                  p: ({ ...props }) => <span {...props} />,
                }}
              >
                {`“${brandDna.tagline}”`}
              </ReactMarkdown>
            </div>
          )}
        </div>

        {/* Company Overview Card */}
        {brandDna.overview && (
          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-2">
            <h3 className="text-xs font-bold text-[#0b1957] uppercase tracking-wider flex items-center gap-1.5">
              <BookOpen className="size-3.5 text-blue-500" /> Company Overview
            </h3>
            <div
              className="text-xs text-slate-600 leading-relaxed font-medium markdown-content"
              style={{ fontFamily: brandDna.fonts?.body || "inherit" }}
            >
              <ReactMarkdown
                components={{
                  strong: ({ ...props }) => <strong className="font-bold text-[#0b1957]" {...props} />,
                  p: ({ ...props }) => <p className="leading-relaxed" {...props} />,
                }}
              >
                {brandDna.overview}
              </ReactMarkdown>
            </div>
          </div>
        )}

        {/* Brand Values & Tone */}
        {(brandDna.values || brandDna.tone) && (
          <div className="grid grid-cols-2 gap-4">
            {brandDna.values && brandDna.values.length > 0 && (
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
                <h4 className="text-[10px] font-bold text-[#0b1957] uppercase tracking-wider mb-2">
                  Brand Values
                </h4>
                <ul className="space-y-1.5">
                  {brandDna.values.slice(0, 4).map((val, idx) => (
                    <li key={idx} className="text-[11px] text-slate-600 font-semibold flex items-start gap-1">
                      <span className="text-emerald-500 select-none">•</span>
                      <div
                        className="inline markdown-content"
                        style={{ fontFamily: brandDna.fonts?.body || "inherit" }}
                      >
                        <ReactMarkdown
                          components={{
                            p: ({ ...props }) => <span {...props} />,
                          }}
                        >
                          {val}
                        </ReactMarkdown>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {brandDna.tone && (
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
                <h4 className="text-[10px] font-bold text-[#0b1957] uppercase tracking-wider mb-2">
                  Tone of Voice
                </h4>
                <div
                  className="text-[11px] text-slate-600 font-semibold leading-relaxed markdown-content"
                  style={{ fontFamily: brandDna.fonts?.body || "inherit" }}
                >
                  <ReactMarkdown
                    components={{
                      strong: ({ ...props }) => <strong className="font-bold text-[#0b1957]" {...props} />,
                      p: ({ ...props }) => <p className="leading-relaxed" {...props} />,
                    }}
                  >
                    {brandDna.tone}
                  </ReactMarkdown>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Visual Token Swatches */}
        {brandDna.colors && (
          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-3">
            <h3 className="text-xs font-bold text-[#0b1957] uppercase tracking-wider flex items-center gap-1.5">
              <Palette className="size-3.5 text-pink-500" /> Brand Identity Colors
            </h3>
            <div className="flex flex-wrap gap-3">
              {Object.entries(brandDna.colors).map(([key, hex]) => {
                if (!hex) return null;
                const isCopied = copiedColor === hex;
                return (
                  <button
                    key={key}
                    onClick={() => handleCopyColor(hex)}
                    className="flex-1 min-w-[125px] max-w-[145px] flex items-center gap-2.5 p-2 bg-white border border-slate-200 rounded-xl hover:shadow-md active:scale-95 transition-all text-left group"
                  >
                    <div
                      className="size-7 rounded-lg border border-slate-100 shadow-inner flex-shrink-0"
                      style={{ backgroundColor: hex }}
                    />
                    <div className="min-w-0">
                      <div className="text-[10px] font-bold text-slate-400 capitalize truncate leading-none">
                        {key}
                      </div>
                      <div className="text-xs font-bold text-[#0b1957] flex items-center gap-1 mt-0.5">
                        {hex}
                        {isCopied ? (
                          <Check className="size-3 text-emerald-500" />
                        ) : (
                          <Copy className="size-3 text-slate-300 group-hover:text-[#0b1957] transition-colors" />
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Typography settings */}
        {brandDna.fonts && (
          <div className="grid grid-cols-2 gap-4 bg-slate-50 border border-slate-100 rounded-2xl p-4">
            {brandDna.fonts.title && (
              <div className="space-y-1.5">
                <span className="text-[9px] font-bold text-slate-400 uppercase flex items-center gap-1">
                  <Type className="size-3 text-blue-500" /> Header Font
                </span>
                <div className="flex flex-wrap gap-1">
                  {brandDna.fonts.title.split(",").map((font, idx) => {
                    const cleanFont = font.replace(/['"]/g, "").trim();
                    return (
                      <span
                        key={idx}
                        className="inline-block px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-bold text-[#0b1957]"
                        style={{ fontFamily: `${font}, sans-serif` }}
                      >
                        {cleanFont}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
            {brandDna.fonts.body && (
              <div className="space-y-1.5">
                <span className="text-[9px] font-bold text-slate-400 uppercase flex items-center gap-1">
                  <Type className="size-3 text-emerald-500" /> Body Font
                </span>
                <div className="flex flex-wrap gap-1">
                  {brandDna.fonts.body.split(",").map((font, idx) => {
                    const cleanFont = font.replace(/['"]/g, "").trim();
                    return (
                      <span
                        key={idx}
                        className="inline-block px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-bold text-[#0b1957]"
                        style={{ fontFamily: `${font}, sans-serif` }}
                      >
                        {cleanFont}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Asset Manifest Library */}
        {brandDna.assets && brandDna.assets.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-[#0b1957] uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="size-3.5 text-purple-500" /> Contextual Asset Library
            </h3>
            
            {Object.entries(categories).map(([categoryName, assetList]) => (
              <div key={categoryName} className="space-y-2 border-t border-slate-100 pt-3">
                <h4 className="text-[10px] font-bold text-[#0b1957]/70 uppercase tracking-wider">
                  {categoryName}
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  {assetList.map((asset) => (
                    <div
                      key={asset.key}
                      className="group relative bg-slate-50 border border-slate-150 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col h-28 cursor-pointer"
                      onClick={() => setZoomedAsset(asset)}
                    >
                      {/* Asset Preview Thumbnail */}
                      <div
                        className="flex-1 relative overflow-hidden flex items-center justify-center border-b border-slate-100"
                        style={checkersStyle}
                      >
                        {/* Shimmer Loading Wireframe skeleton */}
                        {!loadedAssets[asset.key] && (
                          <div className="absolute inset-0 bg-slate-100/90 animate-pulse flex flex-col items-center justify-center gap-1.5 z-10">
                            <div className="w-9 h-9 rounded-lg bg-slate-200/80" />
                            <div className="w-14 h-1.5 rounded bg-slate-200/80" />
                          </div>
                        )}
                        {failedAssets[asset.key] ? (
                          <div className="flex flex-col items-center justify-center text-slate-300 gap-1.5 p-4 w-full h-full bg-slate-50">
                            <svg className="size-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span className="text-[8px] font-semibold text-slate-400">Failed to load</span>
                          </div>
                        ) : asset.url.endsWith(".svg") ? (
                          <div className="p-3 w-full h-full flex items-center justify-center bg-white/40">
                            <img
                              src={asset.url}
                              alt={asset.key}
                              onLoad={() => setLoadedAssets((prev) => ({ ...prev, [asset.key]: true }))}
                              onError={() => {
                                setLoadedAssets((prev) => ({ ...prev, [asset.key]: true }));
                                setFailedAssets((prev) => ({ ...prev, [asset.key]: true }));
                              }}
                              className={`max-h-full max-w-full object-contain transition-opacity duration-300 ${
                                loadedAssets[asset.key] ? "opacity-100" : "opacity-0"
                              }`}
                            />
                          </div>
                        ) : (
                          <img
                            src={asset.url}
                            alt={asset.key}
                            onLoad={() => setLoadedAssets((prev) => ({ ...prev, [asset.key]: true }))}
                            onError={() => {
                              setLoadedAssets((prev) => ({ ...prev, [asset.key]: true }));
                              setFailedAssets((prev) => ({ ...prev, [asset.key]: true }));
                            }}
                            className={`w-full h-full object-cover group-hover:scale-105 transition-all duration-300 ${
                              loadedAssets[asset.key] ? "opacity-100" : "opacity-0"
                            }`}
                          />
                        )}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 z-20">
                          <ZoomIn className="size-5 text-white drop-shadow" />
                        </div>
                      </div>
                      
                      {/* Asset Title Footer */}
                      <div className="p-2 bg-white border-t border-slate-100 flex flex-col min-w-0">
                        <span className="text-[10px] font-bold text-[#0b1957] truncate capitalize">
                          {asset.key.replace(/_/g, " ")}
                        </span>
                        {asset.context && (
                          <span className="text-[8.5px] text-slate-400 font-medium truncate">
                            {asset.context}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

      </div>

      {/* Bottom Sticky Action Panel */}
      {!hideButtons && (
        <div className="absolute bottom-0 left-0 right-0 w-full flex-shrink-0 flex justify-between pb-5 px-6 pt-3 bg-gradient-to-t from-white via-white/95 to-transparent z-20 gap-3">
          <button
            type="button"
            onClick={() => onNext("Request Changes")}
            className="flex-1 py-3 rounded-full font-bold border border-slate-300 bg-white hover:bg-slate-50 text-[#0b1957] shadow-sm active:scale-95 transition-all text-center cursor-pointer"
          >
            Request Changes
          </button>
          <button
            type="button"
            onClick={() => onNext("Select this & start")}
            className="flex-1 py-3 rounded-full font-bold shadow-lg bg-gradient-to-br from-[#0b1957] to-[#1e293b] text-white hover:shadow-xl hover:shadow-[#0b1957]/10 active:scale-95 transition-all text-center cursor-pointer"
          >
            Select this & start
          </button>
        </div>
      )}

      {/* Asset Zoom Overlay modal */}
      <AnimatePresence>
        {zoomedAsset && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-900/90 backdrop-blur-sm z-50 flex flex-col p-4 select-none"
          >
            {/* Close Overlay btn */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setZoomedAsset(null);
              }}
              className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white/80 hover:text-white transition-all border border-white/10 z-[60] cursor-pointer"
            >
              <X className="size-5" />
            </button>

            {/* Asset Box */}
            <div className="flex-1 flex items-center justify-center p-6 min-h-0 relative">
              {!loadedAssets[zoomedAsset.key] && (
                <div className="absolute inset-0 m-auto w-24 h-24 bg-white/10 rounded-2xl animate-pulse flex flex-col items-center justify-center gap-2">
                  <div className="w-10 h-10 rounded-lg bg-white/20 animate-spin border-2 border-transparent border-t-white" />
                </div>
              )}
              <motion.img
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.95 }}
                src={zoomedAsset.url}
                alt={zoomedAsset.key}
                onLoad={() => setLoadedAssets((prev) => ({ ...prev, [zoomedAsset.key]: true }))}
                className={`max-h-full max-w-full object-contain rounded-lg shadow-2xl border border-white/10 transition-opacity duration-300 ${
                  loadedAssets[zoomedAsset.key] ? "opacity-100" : "opacity-0"
                }`}
                style={checkersStyle}
              />
            </div>

            {/* Bottom Meta */}
            <div className="p-4 bg-white/10 border border-white/10 rounded-2xl text-white space-y-1 mb-8 max-w-md mx-auto w-full">
              <div className="text-[10px] font-bold uppercase tracking-wider text-pink-400">
                {zoomedAsset.category}
              </div>
              <h4 className="text-sm font-bold capitalize">
                {zoomedAsset.key.replace(/_/g, " ")}
              </h4>
              {zoomedAsset.context && (
                <div className="text-xs text-white/70 leading-relaxed font-medium markdown-content">
                  <ReactMarkdown
                    components={{
                      p: ({ ...props }) => <p className="leading-relaxed" {...props} />,
                    }}
                  >
                    {zoomedAsset.context}
                  </ReactMarkdown>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
