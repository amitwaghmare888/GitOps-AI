import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createLogger } from '@/lib/logger';

const log = createLogger('DashboardLayout');

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    log.info('No authenticated user in dashboard layout, redirecting to /login');
    redirect('/login');
  }

  return <>{children}</>;
}

