"use client";
import NewHeroSection from "@/components/landing/NewHeroSection";
import MRLadsSection from "@/components/landing/MRLadsSection";
import HeroParallaxSection from "@/components/landing/HeroParallaxSection";
import CloneYourselfSection from "@/components/landing/CloneYourselfSection";
import MeetOurAgentSection from "@/components/landing/MeetOurAgentSection";
import HowItWorksSection from "@/components/landing/HowItWorksSection";
import ParallaxFeaturesSection from "@/components/landing/ParallaxFeaturesSection";
import SocialProofSection from "@/components/landing/SocialProofSection";
// Pricing components removed from the home page - see the dedicated /pricing
// route. PricingHero / StandardPlans / EnterprisePlans / PricingBreakdown /
// InteractivePricingCalculator / PricingCTA imports dropped with them.
import CTASection from "@/components/landing/CTASection";
import AgentGuide from "@/components/landing/AgentGuide";

export default function LAD3DShowcase() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* <AgentGuide /> */}

      {/* Hero Section */}
      <NewHeroSection />

      {/* MR LADS Section */}
      <MRLadsSection />

      {/* 24/7 AI Sales Automation Section */}
      <HeroParallaxSection />

      {/* Clone Yourself Section */}
      <CloneYourselfSection />

      {/* How It Works Section */}
      <HowItWorksSection />

      {/* Meet Our Agent Section */}
      <MeetOurAgentSection />
      
      {/* Parallax Features Section */}
      <ParallaxFeaturesSection />

      {/* Social Proof Section */}
      <SocialProofSection />

      {/* Pricing section removed - lives on the dedicated /pricing route. */}

      {/* CTA Section */}
      <CTASection />
    </div>
  );
}