'use client';
import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

// Deep links to a single prospect now open the /crm detail panel via the
// ?selected=<id> query param.
export default function ProspectDetailRedirect() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  useEffect(() => {
    const id = params?.id;
    router.replace(id ? `/crm/${id}` : '/crm');
  }, [params, router]);
  return null;
}
