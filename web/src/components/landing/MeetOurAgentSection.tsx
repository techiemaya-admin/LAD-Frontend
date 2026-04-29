"use client";

import { Zap, MessageSquare, TrendingUp } from "lucide-react";
import { CometCard } from "@/components/ui/comet-card";

interface Agent {
  id: number;
  name: string;
  role: string;
  description: string;
  videoSrc: string;
  icon: React.ReactNode;
}

export default function MeetOurAgentSection() {
  const agents: Agent[] = [
    {
      id: 1,
      name: "Alex",
      role: "Sales Agent",
      description:
        "Expert sales closer who transforms leads into revenue. Handles negotiations, objection handling, and seals deals with AI-powered sales intelligence.",
      videoSrc: "/agent-alex.mp4",
      icon: <Zap className="w-5 h-5" />,
    },
    {
      id: 2,
      name: "Maya",
      role: "Lead Generation Agent",
      description:
        "Master prospector who identifies high-value leads and initiates meaningful conversations. Builds targeted lists and warms up prospects for sales.",
      videoSrc: "/agent-maya.mp4",
      icon: <MessageSquare className="w-5 h-5" />,
    },
    {
      id: 3,
      name: "Travel",
      role: "Campaign Manager Agent",
      description:
        "Orchestrates multi-channel campaigns with precision. Manages outreach timing, sequences, and channels across LinkedIn, email, WhatsApp and SMS for maximum conversions.",
      videoSrc: "/agent-luna.mp4",
      icon: <TrendingUp className="w-5 h-5" />,
    },
  ];

  return (
    <section className="relative py-16 md:py-20 overflow-hidden bg-white dark:bg-[#0B1957]">
      {/* Background Blobs */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="container mx-auto px-4 relative z-10">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl lg:text-5xl font-bold text-foreground mb-4">
            Meet Our <span className="text-primary">AI Agents</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            Meet the specialized AI agents that work 24/7 to grow your business through intelligent automation
          </p>
        </div>

        {/* Agents Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {agents.map((agent, index) => (
            <CometCard key={agent.id}>
              <div
                className="group relative"
                style={{
                  animation: `slideUp 0.6s ease-out ${index * 0.15}s both`,
                }}
              >
              {/* Glow Effect */}
              <div className="absolute -inset-0.5 bg-primary rounded-3xl blur-lg opacity-0 group-hover:opacity-75 transition duration-300 -z-10" />

              {/* Card */}
              <div className="bg-background border-2 border-primary/20 rounded-3xl overflow-hidden shadow-xl hover:shadow-2xl hover:border-primary/40 transition-all duration-300 hover:scale-105 flex flex-col h-full backdrop-blur-sm">
                {/* Video Container with Colored Border Frame */}
                <div className="relative h-80 md:h-96 overflow-hidden bg-white dark:bg-gray-900 flex items-center justify-center">
                  {/* Colored Border Frame - Top and Left Accent */}
      
                  <video
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="object-contain group-hover:scale-105 transition-transform duration-500"
                  >
                    <source src={agent.videoSrc} type="video/mp4" />
                  </video>

                  {/* Premium Badge with Animation */}
                  <div className="absolute top-4 right-4 bg-primary rounded-full p-4 text-white shadow-xl hover:shadow-2xl transform group-hover:scale-125 transition-all duration-300 border-2 border-white/30">
                    <div className="relative">
                      {agent.icon}
                      <div className="absolute inset-0 bg-primary rounded-full animate-pulse opacity-30" />
                    </div>
                  </div>

                  {/* Level Badge */}
                  <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-md rounded-full px-4 py-2 border border-white/20">
                    <span className="text-xs font-bold text-white">LEVEL {agent.id}</span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6 flex flex-col flex-grow bg-gradient-to-b from-background/80 to-background/60 backdrop-blur-sm">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-2xl font-bold text-primary">
                      {agent.name}
                    </h3>
                  </div>
                  <p className="text-xs font-bold text-primary uppercase tracking-widest mb-3 bg-primary/10 inline-block px-3 py-1 rounded-full w-fit">
                    {agent.role}
                  </p>
                  <p className="text-sm text-muted-foreground flex-grow mb-4 leading-relaxed">
                    {agent.description}
                  </p>

                  {/* Action Button with Glow */}
                  <button className="w-full bg-primary hover:shadow-lg hover:shadow-primary/50 text-white font-bold py-3 px-4 rounded-xl transition-all duration-300 transform hover:scale-105 active:scale-95 uppercase text-sm tracking-wide border border-white/20">
                    Unlock Agent
                  </button>
                </div>
              </div>
              </div>
            </CometCard>
          ))}
        </div>

        <style jsx>{`
          @keyframes slideUp {
            from {
              opacity: 0;
              transform: translateY(30px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}</style>
      </div>
    </section>
  );
}
