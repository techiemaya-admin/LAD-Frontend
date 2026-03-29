'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import EmailTemplateEditor from '@/components/templates/EmailTemplateEditor';
import { Suspense } from 'react';

function CreateTemplateContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const type = searchParams.get('type') || 'email';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="text-gray-600 hover:text-gray-900"
          >
            ← Back
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Create New Template</h1>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-8 py-8">
        {type === 'email' && <EmailTemplateEditor mode="create" />}
        {type === 'whatsapp' && (
          <div className="text-center py-12">
            <p className="text-gray-500">WhatsApp templates coming soon</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CreateTemplatePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CreateTemplateContent />
    </Suspense>
  );
}
