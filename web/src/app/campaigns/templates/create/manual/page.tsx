'use client';

import EmailTemplateEditor from '@/components/templates/EmailTemplateEditor';

export default function ManualCreatePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-6">
        <h1 className="text-3xl font-bold text-gray-900">Create Email Template</h1>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-8 py-8">
        <EmailTemplateEditor mode="create" />
      </div>
    </div>
  );
}
