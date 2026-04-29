"use client";
import NewHeroSection from "@/components/landing/NewHeroSection";
import MRLadsSection from "@/components/landing/MRLadsSection";
import HeroParallaxSection from "@/components/landing/HeroParallaxSection";
import CloneYourselfSection from "@/components/landing/CloneYourselfSection";
import MeetOurAgentSection from "@/components/landing/MeetOurAgentSection";
import HowItWorksSection from "@/components/landing/HowItWorksSection";
import ParallaxFeaturesSection from "@/components/landing/ParallaxFeaturesSection";
import SocialProofSection from "@/components/landing/SocialProofSection";
import PricingHero from "@/components/landing/PricingHero";
import StandardPlans from "@/components/landing/StandardPlans";
import EnterprisePlans from "@/components/landing/EnterprisePlans";
import PricingBreakdown from "@/components/landing/PricingBreakdown";
import InteractivePricingCalculator from "@/components/landing/InteractivePricingCalculator";
import PricingCTA from "@/components/landing/PricingCTA";
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

      {/* Pricing Section */}
      <section className="bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-[#1a2f6b]">
        {/* Pricing Hero */}
        <PricingHero />

        {/* Standard Plans */}
        <StandardPlans />

        {/* Interactive Pricing Calculator */}
        <div className="container mx-auto px-4">
          <InteractivePricingCalculator />
        </div>

        {/* Pricing Breakdown */}
        <PricingBreakdown />

        {/* Pricing CTA */}
        <PricingCTA />
      </section>

      {/* CTA Section */}
      <CTASection />
    </div>
  );
}