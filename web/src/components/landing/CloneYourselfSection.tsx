"use client";

import { CheckCircle2 } from "lucide-react";

export default function CloneYourselfSection() {
  const steps = [
    {
      title: "Build Linkedin Outreach Campaigns in 3 simple steps",
      description:
        "Either yourself or with our proven templates.",
    },
    {
      title: "Create multi channel outreach campaigns",
      description:
        "Or create stand-alone email sequences (incl. warm-up).",
    },
    {
      title: "100% Linkedin Safe",
      description:
        "Our algorithm mimics human behavior with random daily volume, speed & breaks.",
    },
  ];

  return (
    <section className="relative py-8 md:py-8 overflow-hidden bg-background/50 dark:bg-background/30">
      <div className="container mx-auto px-4 relative z-10">
        {/* Centered Title */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4 leading-tight">
            Clone yourself and let your clone do your complete{" "}
            <span className="text-primary">LinkedIn outreach</span>
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
                autoPlay
                loop
                muted
                playsInline
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
