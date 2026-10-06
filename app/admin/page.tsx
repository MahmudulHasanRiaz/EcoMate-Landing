/**
 * Admin console entry.
 *
 * A Server Component on purpose: the session is read with `auth()` (which reads cookies)
 * and the page is never cached, so an operator's dashboard cannot be served to the next
 * visitor. `redirect` handles the direct-navigation case; `proxy.ts` handles everything
 * else.
 */
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { roleOf } from '@/lib/authz';
import { AdminConsole } from './AdminConsole';

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user) redirect('/admin/login');

  return (
    <AdminConsole
      email={session.user.email ?? ''}
      role={roleOf(session) ?? 'editor'}
      userId={session.user.id ?? ''}
    />
  );
}
