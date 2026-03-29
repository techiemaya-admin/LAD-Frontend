'use client';

import { useState } from 'react';

interface Template {
  id: string;
  name: string;
  subject: string;
  body: string;
  category: string;
  description: string;
}

const READY_TO_USE_TEMPLATES: Template[] = [
  {
    id: 'welcome-1',
    name: 'Welcome Email',
    category: 'Onboarding',
    subject: 'Welcome to {{company_name}}!',
    description: 'A friendly welcome email for new customers',
    body: `Hi {{first_name}},

Welcome to {{company_name}}! We're thrilled to have you on board.

Here's what you can do next:
1. Complete your profile
2. Explore our features
3. Join our community

If you have any questions, feel free to reach out to our support team at support@{{company_domain}}.

Best regards,
The {{company_name}} Team`,
  },
  {
    id: 'confirmation-1',
    name: 'Order Confirmation',
    category: 'Transactional',
    subject: 'Your Order #{{order_id}} is Confirmed',
    description: 'Send order confirmation details to customers',
    body: `Dear {{first_name}},

Thank you for your order! Here are your order details:

Order ID: {{order_id}}
Order Date: {{order_date}}
Total Amount: {{order_total}}

Items:
{{order_items}}

Estimated Delivery: {{delivery_date}}

You can track your order here: {{tracking_link}}

If you have any questions, reply to this email or contact us at support@{{company_domain}}.

Thank you for shopping with us!

Best regards,
{{company_name}} Team`,
  },
  {
    id: 'feedback-1',
    name: 'Customer Feedback Request',
    category: 'Engagement',
    subject: 'We'd Love Your Feedback!',
    description: 'Request feedback from your customers',
    body: `Hi {{first_name}},

We hope you're enjoying your experience with {{company_name}}! Your feedback is incredibly valuable to us.

Could you take a moment to share your thoughts? Your responses help us improve our service.

{{feedback_link}}

Thank you for being a valued customer!

Best regards,
{{company_name}} Team`,
  },
  {
    id: 'reset-password-1',
    name: 'Password Reset',
    category: 'Security',
    subject: 'Reset Your {{company_name}} Password',
    description: 'Send password reset instructions',
    body: `Hi {{first_name}},

We received a request to reset your password. If you didn't make this request, please ignore this email.

To reset your password, click the link below:
{{reset_link}}

This link will expire in 24 hours.

If you need help, contact us at support@{{company_domain}}.

Best regards,
{{company_name}} Team`,
  },
  {
    id: 'reminder-1',
    name: 'Appointment Reminder',
    category: 'Reminders',
    subject: 'Reminder: Your appointment on {{appointment_date}}',
    description: 'Remind customers about upcoming appointments',
    body: `Hi {{first_name}},

This is a friendly reminder about your upcoming appointment.

📅 Date: {{appointment_date}}
⏰ Time: {{appointment_time}}
📍 Location: {{location}}

Please let us know if you need to reschedule or cancel.

{{reschedule_link}}

See you soon!

Best regards,
{{company_name}} Team`,
  },
  {
    id: 'newsletter-1',
    name: 'Monthly Newsletter',
    category: 'Marketing',
    subject: '{{month}} Newsletter - What\'s New at {{company_name}}',
    description: 'Share updates and news with your subscribers',
    body: `Hi {{first_name}},

Here's what happened at {{company_name}} this month:

📰 Featured Article
{{featured_article_title}}
{{featured_article_excerpt}}

🎉 Latest Updates
{{update_1}}
{{update_2}}
{{update_3}}

📚 Resources
{{resource_1}}
{{resource_2}}

Have questions? Reply to this email!

Best regards,
{{company_name}} Team`,
  },
];

interface ReadyToUseTemplatesProps {
  onSelectTemplate: (template: Template) => void;
}

export default function ReadyToUseTemplates({
  onSelectTemplate,
}: ReadyToUseTemplatesProps) {
  const [selectedCategory, setSelectedCategory] = useState('All');

  const categories = [
    'All',
    ...new Set(READY_TO_USE_TEMPLATES.map((t) => t.category)),
  ];

  const filteredTemplates =
    selectedCategory === 'All'
      ? READY_TO_USE_TEMPLATES
      : READY_TO_USE_TEMPLATES.filter((t) => t.category === selectedCategory);

  return (
    <div className="space-y-6">
      {/* Category Filter */}
      <div className="flex flex-wrap gap-2">
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              selectedCategory === category
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredTemplates.map((template) => (
          <div
            key={template.id}
            className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow"
          >
            <div className="mb-4">
              <h3 className="font-semibold text-lg text-gray-900 mb-2">
                {template.name}
              </h3>
              <p className="text-xs text-gray-500 bg-gray-100 inline-block px-2 py-1 rounded mb-3">
                {template.category}
              </p>
              <p className="text-sm text-gray-600">{template.description}</p>
            </div>

            <div className="bg-gray-50 rounded p-3 mb-4 max-h-32 overflow-hidden">
              <p className="text-xs font-mono text-gray-700 line-clamp-4">
                <strong>Subject:</strong> {template.subject}
              </p>
              <p className="text-xs font-mono text-gray-600 mt-2 line-clamp-2">
                {template.body.substring(0, 150)}...
              </p>
            </div>

            <button
              onClick={() => onSelectTemplate(template)}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm"
            >
              Use This Template
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
