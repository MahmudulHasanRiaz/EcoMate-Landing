'use client';

import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AdminPanel, type AdminTab } from '@/src/components/admin/AdminPanel';

const VALID_TABS: AdminTab[] = [
  'dashboard',
  'leads',
  'sections',
  'content',
  'pricing',
  'testimonials',
  'blog',
  'media',
  'settings',
  'integrations',
];

function CmsViewInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab') as AdminTab | null;
  const initialTab = tabParam && VALID_TABS.includes(tabParam) ? tabParam : 'dashboard';

  return (
    <AdminPanel
      onClose={() => {
        router.push('/admin');
      }}
      locale="en"
      theme="light"
      initialTab={initialTab}
    />
  );
}

/**
 * Client shell for AdminPanel. Wrapped in Suspense because `useSearchParams`
 * opts into client-side navigation.
 */
export function CmsView() {
  return (
    <Suspense
      fallback={
        <div className="fixed inset-0 flex items-center justify-center bg-slate-900 text-sm text-slate-400">
          Loading Control Center...
        </div>
      }
    >
      <CmsViewInner />
    </Suspense>
  );
}
