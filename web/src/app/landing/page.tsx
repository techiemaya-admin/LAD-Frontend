"use client";
import HeroSection from "@/components/landing/HeroSection";
import FeaturesSection from "@/components/landing/FeaturesSection";
import HowItWorksSection from "@/components/landing/HowItWorksSection";
import ValuePropositionSection from "@/components/landing/ValuePropositionSection";
import SocialProofSection from "@/components/landing/SocialProofSection";
import PricingHero from "@/components/landing/PricingHero";
import StandardPlans from "@/components/landing/StandardPlans";
import EnterprisePlans from "@/components/landing/EnterprisePlans";
import PricingBreakdown from "@/components/landing/PricingBreakdown";
import InteractivePricingCalculator from "@/components/landing/InteractivePricingCalculator";
import PricingCTA from "@/components/landing/PricingCTA";
import CTASection from "@/components/landing/CTASection";

export default function LAD3DShowcase() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-white dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">

      {/* Hero Section */}
      <HeroSection />

      {/* Features Section */}
      <FeaturesSection />

      {/* How It Works Section */}
      <HowItWorksSection />

      {/* Value Proposition Section */}
      <ValuePropositionSection />

      {/* Social Proof Section */}
      <SocialProofSection />

      {/* Pricing Section */}
      <section>
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