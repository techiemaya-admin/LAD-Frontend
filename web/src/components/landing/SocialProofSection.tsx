'use client';

import { motion } from 'framer-motion';
import { Star, Check } from 'lucide-react';

export default function SocialProofSection() {
  const testimonials = [
    {
      name: 'Sarah Chen',
      title: 'VP Sales',
      company: 'TechCorp',
      quote: 'LAD increased our pipeline by 300% in just 2 months without hiring new sales staff.',
      metric: '300% pipeline growth',
      rating: 5,
      color: 'from-blue-500 to-cyan-500'
    },
    {
      name: 'Raj Patel',
      title: 'Business Owner',
      company: 'Wholesale Traders Inc',
      quote: 'We\'re closing 10x more deals with the same team size. LAD literally multiplied our revenue.',
      metric: '10x deal volume',
      rating: 5,
      color: 'from-green-500 to-emerald-500'
    },
    {
      name: 'Maria Garcia',
      title: 'Sales Director',
      company: 'Global Solutions',
      quote: 'The ROI payback was under 30 days. This is the best investment we\'ve made in our sales team.',
      metric: '<30 days ROI',
      rating: 5,
      color: 'from-purple-500 to-pink-500'
    },
    {
      name: 'James Wilson',
      title: 'Founder',
      company: 'Growth Ventures',
      quote: 'AI agents handling 95% of initial conversations freed up my team for strategic work.',
      metric: '95% automation rate',
      rating: 5,
      color: 'from-orange-500 to-red-500'
    }
  ];

  const caseStudies = [
    {
      title: 'B2B SaaS: 300% Revenue Growth',
      description: 'Startup scaled from $50K to $150K MRR in 90 days using LAD',
      stat1: { label: 'Pipeline Growth', value: '300%' },
      stat2: { label: 'New Team Members', value: 'Zero' },
      stat3: { label: 'Cost Reduction', value: '92%' },
      color: 'from-blue-500 to-cyan-500'
    },
    {
      title: 'Wholesale: 500+ Deals Monthly',
      description: 'Automated bulk negotiations across 50+ suppliers with LAD',
      stat1: { label: 'Monthly Deals', value: '500+' },
      stat2: { label: 'Time Saved', value: '400 hrs/mo' },
      stat3: { label: 'Revenue/Agent', value: '2x' },
      color: 'from-green-500 to-emerald-500'
    },
    {
      title: 'Real Estate: 50+ Viewings Weekly',
      description: 'AI handles buyer qualification and viewing scheduling automatically',
      stat1: { label: 'Weekly Viewings', value: '50+' },
      stat2: { label: 'Conversion Rate', value: '70%' },
      stat3: { label: 'Response Time', value: '< 1min' },
      color: 'from-purple-500 to-pink-500'
    }
  ];

  const features = [
    'SOC 2 Certified',
    'GDPR Compliant',
    '99.9% Uptime SLA',
    'ISO 27001',
    'Enterprise Security',
    'Dedicated Support'
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        delayChildren: 0.2,
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: 'spring',
        stiffness: 100,
        damping: 20
      }
    }
  };

  return (
    <motion.section
      className="py-20 relative bg-gradient-to-b from-white to-gray-50 dark:from-gray-950 dark:to-gray-900"
      id="social-proof"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
      variants={containerVariants}
    >
      <div className="container mx-auto px-4">
        {/* Header */}
        <motion.div
          variants={itemVariants}
          className="text-center mb-16"
        >
          <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            Trusted by <span className="text-[#0b1957]">Hundreds of Businesses</span>
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
            Join successful companies that have already transformed their sales process
          </p>
        </motion.div>

        {/* Testimonials Grid */}
        <motion.div
          className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16"
          variants={containerVariants}
        >
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={index}
              variants={itemVariants}
              whileHover={{ y: -10, scale: 1.05 }}
              className="group"
            >
              <div className={`relative p-6 rounded-xl bg-gradient-to-br ${testimonial.color} opacity-10 group-hover:opacity-20 blur-xl absolute inset-0 transition-opacity`} />

              <div className="relative p-6 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 group-hover:border-gray-300 dark:group-hover:border-gray-600 transition-all h-full flex flex-col">
                {/* Stars */}
                <div className="flex gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, scale: 0 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.1 }}
                    >
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    </motion.div>
                  ))}
                </div>

                {/* Quote */}
                <p className="text-gray-700 dark:text-gray-300 mb-6 flex-grow italic">
                  "{testimonial.quote}"
                </p>

                {/* Metric */}
                <motion.div
                  className="mb-4 p-3 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-gray-700 dark:to-gray-700 rounded-lg"
                  whileInView={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 0.6 }}
                >
                  <p className="text-sm font-bold text-[#0b1957] dark:text-blue-400">
                    📊 {testimonial.metric}
                  </p>
                </motion.div>

                {/* Author */}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                  <p className="font-bold text-gray-900 dark:text-white text-sm">{testimonial.name}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {testimonial.title} @ {testimonial.company}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Case Studies Section */}
        <motion.div
          variants={itemVariants}
          className="mb-16"
        >
          <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-8 text-center">
            Case Studies
          </h3>
          <motion.div
            className="grid md:grid-cols-3 gap-6"
            variants={containerVariants}
          >
            {caseStudies.map((caseStudy, index) => (
              <motion.div
                key={index}
                variants={itemVariants}
                whileHover={{ scale: 1.05 }}
                className="p-6 rounded-xl bg-gradient-to-br from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-shadow"
              >
                {/* Top accent bar */}
                <div className={`w-full h-1 bg-gradient-to-r ${caseStudy.color} rounded-full mb-4`} />

                <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  {caseStudy.title}
                </h4>
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-6">
                  {caseStudy.description}
                </p>

                {/* Stats */}
                <div className="space-y-3">
                  {[caseStudy.stat1, caseStudy.stat2, caseStudy.stat3].map((stat, idx) => (
                    <motion.div
                      key={idx}
                      className="flex justify-between items-center p-3 bg-white/50 dark:bg-gray-700/50 rounded-lg"
                      whileHover={{ backgroundColor: 'rgba(255, 255, 255, 0.7)' }}
                    >
                      <span className="text-gray-600 dark:text-gray-400 text-sm font-medium">
                        {stat.label}
                      </span>
                      <span className="text-xl font-bold text-[#0b1957] dark:text-blue-400">
                        {stat.value}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>

        {/* Trust & Security Badges */}
        <motion.div
          variants={itemVariants}
          className="text-center"
        >
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-8">
            Enterprise Grade Security & Compliance
          </h3>
          <motion.div
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4"
            variants={containerVariants}
          >
            {features.map((feature, index) => (
              <motion.div
                key={index}
                variants={itemVariants}
                whileHover={{ scale: 1.1, y: -5 }}
                className="p-4 rounded-lg bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-gray-800 dark:to-gray-900 border border-blue-200 dark:border-gray-700"
              >
                <div className="flex items-center justify-center mb-2">
                  <Check className="w-6 h-6 text-green-500" />
                </div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white text-center">
                  {feature}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>

        {/* Stats Counter */}
        <motion.div
          variants={itemVariants}
          className="mt-16 grid md:grid-cols-3 gap-6"
        >
          {[
            { number: '500+', label: 'Active Businesses' },
            { number: '95%', label: 'Success Rate' },
            { number: '99.9%', label: 'Platform Uptime' }
          ].map((stat, index) => (
            <motion.div
              key={index}
              whileInView={{ scale: [1, 1.05, 1] }}
              transition={{ delay: index * 0.1 }}
              className="text-center p-6 rounded-xl bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-gray-800 dark:to-gray-900"
            >
              <h4 className="text-4xl lg:text-5xl font-bold text-[#0b1957] dark:text-blue-400 mb-2">
                {stat.number}
              </h4>
              <p className="text-gray-600 dark:text-gray-400 font-medium">{stat.label}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </motion.section>
  );
}
