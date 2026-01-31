"use client";

import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import HeroSection from "@/components/landing/HeroSection";
import FeaturesSection from "@/components/landing/FeaturesSection";
import PricingHero from "@/components/landing/PricingHero";
import StandardPlans from "@/components/landing/StandardPlans";
import EnterprisePlans from "@/components/landing/EnterprisePlans";
import PricingBreakdown from "@/components/landing/PricingBreakdown";
import PricingCTA from "@/components/landing/PricingCTA";
import CTASection from "@/components/landing/CTASection";

export default function LAD3DShowcase() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-blue-50 dark:from-[#0b1957] dark:via-[#0b1957] dark:to-[#0b1957]">

      {/* Hero Section */}
      <HeroSection />

      {/* Features Section */}
      <FeaturesSection />

      {/* Pricing Section */}
      <section>
        {/* Pricing Hero */}
        <PricingHero />
        
        {/* Standard Plans */}
        <StandardPlans />

        {/* Enterprise Plans */}
        <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8">
          <EnterprisePlans />
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