"use client";

import { CheckCircle2 } from "lucide-react";
import { useEffect, useRef } from "react";

export default function CloneYourselfSection() {
  // The demo clip sits below the fold. Only start fetching/playing it once it
  // scrolls into view (preload="none" + IntersectionObserver) so it never
  // competes with the hero on initial load.
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            vid.play().catch(() => {});
          } else {
            vid.pause();
          }
        });
      },
      { threshold: 0.25 },
    );
    io.observe(vid);
    return () => io.disconnect();
  }, []);
  const steps = [
    {
      title: "Train Mr LAD in 3 simple steps",
      description:
        "On your own, or with our proven playbooks.",
    },
    {
      title: "He works every channel at once",
      description:
        "LinkedIn, WhatsApp, Instagram, email, and voice. Coordinated as one team.",
    },
    {
      title: "On brand, every time",
      description:
        "Mr LAD learns your offers and brand voice, so every conversation sounds like you.",
    },
  ];

  return (
    <section className="relative py-8 md:py-8 overflow-hidden bg-background/50 dark:bg-background/30">
      <div className="container mx-auto px-4 relative z-10">
        {/* Centered Title */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4 leading-tight">
            Clone your best rep and let Mr LAD run your{" "}
            <span className="text-primary">entire outreach</span>
          </h2>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center">
          {/* Left: Text Content */}
          <div className="space-y-6">
            {/* Features List */}
            <div className="space-y-4">
              {steps.map((step, i) => (
                <div key={i} className="flex gap-4">
                  <CheckCircle2 className="w-6 h-6 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">
                      {step.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {step.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Video Container with Monitor Frame */}
          <div className="space-y-3">
            {/* Monitor Frame */}
            <div className="rounded-3xl overflow-hidden shadow-2xl border-8 border-foreground/10 bg-foreground/5">
              <video
                ref={videoRef}
                loop
                muted
                playsInline
                preload="none"
                poster="/clone-yourself-poster.jpg"
                className="w-full h-auto object-cover"
              >
                <source src="/clone-yourself.mp4" type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            </div>
            {/* Monitor Stand */}
            <div className="flex justify-center">
              <div className="w-24 h-3 bg-foreground/20 rounded-full blur-sm" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
