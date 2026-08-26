'use client';

import { useRouter } from 'next/navigation';
import EmailTemplateEditor from '@/components/templates/EmailTemplateEditor';

export default function ManualCreatePage() {
  const router = useRouter();

  return <EmailTemplateEditor mode="create" onBack={() => router.back()} />;
}
