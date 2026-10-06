'use client';

import { useRouter } from 'next/navigation';
import { AdminPanel } from '@/src/components/admin/AdminPanel';

/**
 * Client shell for the legacy `AdminPanel`. It is a fixed, full-screen overlay with its own
 * header, so the only adaptation needed is routing its close button back to the console
 * instead of unmounting a modal on the landing page.
 */
export function CmsView() {
  const router = useRouter();
  return (
    <AdminPanel
      onClose={() => {
        router.push('/admin');
      }}
      locale="en"
      theme="light"
    />
  );
}
