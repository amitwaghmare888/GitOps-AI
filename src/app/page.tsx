import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ConfigError } from '@/lib/env';

export default async function Home() {
  let user = null;
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch (error) {
    if (!(error instanceof ConfigError)) {
      throw error;
    }
  }

  if (user) {
    redirect('/dashboard');
  } else {
    redirect('/login');
  }
}
