"use client";
import React from "react";
import { HeroParallax } from "@/components/ui/hero-parallax";

export default function HeroParallaxSection() {
  return <HeroParallax products={products} />;
}

export const products = [
  {
    title: "Mr LAD Prospects",
    link: "#",
    thumbnail: "/Linkedin Sales Automation_05.jpg",
  },
  {
    title: "Your AI Sales Employee",
    link: "#",
    thumbnail: "/Ai sales Agent_04.jpg",
  },
  {
    title: "Every Channel, One Employee",
    link: "#",
    thumbnail: "/Multi-Channel Outreach_03.jpg",
  },
  {
    title: "Qualifies Every Lead",
    link: "#",
    thumbnail: "/Lead Qualification_02.jpg",
  },
  {
    title: "Books the Meeting",
    link: "#",
    thumbnail: "/Deal Closing_01.jpg",
  },
  {
    title: "Mr LAD Nurtures",
    link: "#",
    thumbnail: "/Email Campaigns_06.jpg",
  },
  {
    title: "Mr LAD on WhatsApp",
    link: "#",
    thumbnail: "/WhatsApp Integration_7.jpg",
  },
  {
    title: "Follows Up Instantly",
    link: "#",
    thumbnail: "/SMS Automation_08.jpg",
  },
  {
    title: "Mr LAD Reports",
    link: "#",
    thumbnail: "/Analytics Dashboard_09.jpg",
  },
  {
    title: "Real-time Tracking",
    link: "#",
    thumbnail: "/Real-Time Tracking_10.jpg",
  },
  {
    title: "Personalized Research",
    link: "#",
    thumbnail: "/Personalization Engine_15.jpg",
  },
  {
    title: "Holds Real Conversations",
    link: "#",
    thumbnail: "/Conversation_Ai_14.jpg",
  },
  {
    title: "Works With Your Team",
    link: "#",
    thumbnail: "/Team Collebration_13.jpg",
  },
  {
    title: "Trained On Your Business",
    link: "#",
    thumbnail: "/custom workflows_12.jpg",
  },
  {
    title: "Syncs With Your CRM",
    link: "#",
    thumbnail: "/API Integration_11.jpg",
  },
];
