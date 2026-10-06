import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { CmsView } from './CmsView';

/** The existing full-screen AdminPanel lives on its own route so it keeps its layout. */
export default async function AdminCmsPage() {
  const session = await auth();
  if (!session?.user) redirect('/admin/login');

  return <CmsView />;
}
