'use client';

import { motion } from 'framer-motion';
import { Star } from 'lucide-react';

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
