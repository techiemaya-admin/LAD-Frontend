"use client";

import { Zap, MessageSquare, TrendingUp } from "lucide-react";
import Link from "next/link";
import { CometCard } from "@/components/ui/comet-card";
import { useRef } from "react";

interface Agent {
  id: number;
  name: string;
  role: string;
  description: string;
  videoSrc: string;
  icon: React.ReactNode;
}

function AgentCard({ agent, index }: { agent: Agent; index: number }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleMouseEnter = () => {
    if (videoRef.current) {
      videoRef.current.play();
    }
  };

  const handleMouseLeave = () => {
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  };

  return (
    <CometCard key={agent.id} className="relative hover:z-50 transition-all duration-300">
      <div
        className="group relative h-full"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{
          animation: `slideUp 0.6s ease-out ${index * 0.15}s both`,
        }}
      >
        {/* Glow Effect */}
        <div className="absolute -inset-0.5 bg-primary rounded-3xl blur-lg opacity-0 group-hover:opacity-75 transition duration-300 -z-10" />

        {/* Card */}
        <div className="bg-background border-2 border-primary/20 rounded-3xl overflow-hidden shadow-xl hover:shadow-2xl hover:border-primary/40 transition-all duration-300 flex flex-col h-full backdrop-blur-sm">
          {/* Video Container with Colored Border Frame */}
          <div className="relative h-80 md:h-96 overflow-hidden bg-white dark:bg-gray-900">
            <video
              ref={videoRef}
              loop
              muted
              playsInline
              preload="none"
              poster={agent.videoSrc.replace(/\.mp4$/, "-poster.jpg")}
              className="w-full h-full object-cover object-top transition-transform duration-500"
            >
              <source src={agent.videoSrc} type="video/mp4" />
            </video>

            {/* Premium Badge with Animation */}
            <div className="absolute top-4 right-4 bg-primary rounded-full p-4 text-white shadow-xl hover:shadow-2xl transform transition-all duration-300 border-2 border-white/30">
              <div className="relative">
                {agent.icon}
                <div className="absolute inset-0 bg-primary rounded-full animate-pulse opacity-30" />
              </div>
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
            <Link
              href="/contact"
              className="block w-full text-center bg-primary hover:shadow-lg hover:shadow-primary/50 text-white font-bold py-3 px-4 rounded-xl transition-all duration-300 transform uppercase text-sm tracking-wide border border-white/20"
            >
              See him in action
            </Link>
          </div>
        </div>
      </div>
    </CometCard>
  );
}

export default function MeetOurAgentSection() {
  const agents: Agent[] = [
    {
      id: 1,
      name: "On LinkedIn",
      role: "Prospecting",
      description:
        "He finds your ideal customers across professional networks and opens personalized conversations that get replies.",
      videoSrc: "/agent-maya.mp4",
      icon: <Zap className="w-5 h-5" />,
    },
    {
      id: 2,
      name: "On WhatsApp",
      role: "Conversations",
      description:
        "He chats instantly on WhatsApp, answers questions, qualifies leads, and books meetings around the clock.",
      videoSrc: "/agent-alex.mp4",
      icon: <MessageSquare className="w-5 h-5" />,
    },
    {
      id: 3,
      name: "On Voice",
      role: "Calls",
      description:
        "He makes and takes calls, follows up by phone, and never misses a lead, no matter the timezone.",
      videoSrc: "/agent-max.mp4",
      icon: <TrendingUp className="w-5 h-5" />,
    },
    {
      id: 4,
      name: "On Instagram",
      role: "Social",
      description:
        "He turns Instagram DMs and comments into booked meetings, so no inbound lead ever slips through.",
      videoSrc: "/agent-luna.mp4",
      icon: <Zap className="w-5 h-5" />,
    },
    {
      id: 5,
      name: "On Email",
      role: "Nurture",
      description:
        "He sends timely, personalized follow-ups that nurture every lead until they’re ready to convert.",
      videoSrc: "/agent-ava.mp4",
      icon: <MessageSquare className="w-5 h-5" />,
    },
    {
      id: 6,
      name: "Insights",
      role: "Analytics",
      description:
        "He reads every conversation across channels and shows you what is working, giving you a 360° view of every lead.",
      videoSrc: "/agent-Emma.mp4",
      icon: <TrendingUp className="w-5 h-5" />,
    },
  ];

  return (
    <section className="py-20 relative bg-gradient-to-b from-background via-background to-background">
      {/* Background Blobs */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="container mx-auto px-4 relative z-10">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl lg:text-5xl font-bold text-foreground mb-4">
            One Employee. <span className="text-primary">Every Channel.</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            Mr LAD is one AI Sales Employee, not a team of hires to manage. He prospects, chats, calls, and posts across every channel, doing the work of a whole team.
          </p>
        </div>

        {/* Agents Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-16">
          {agents.map((agent, index) => (
            <AgentCard key={agent.id} agent={agent} index={index} />
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
