import { supabase } from '@/lib/supabase';

export type ProfileDetails = {
  accountNumber: number;
  createdAt: string;
};

/** Whether the signed-in player's account was banned by an admin. */
export async function isCurrentUserBanned(): Promise<boolean> {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user.id;
  if (!userId) return false;
  const { data, error } = await supabase.from('profiles').select('banned').eq('id', userId).maybeSingle();
  if (error) return false;
  return data?.banned === true;
}

export async function getProfileDetails(): Promise<ProfileDetails | null> {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;

  const userId = sessionData.session?.user.id;
  if (!userId) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('account_number, created_at')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  if (typeof data.account_number !== 'number' || typeof data.created_at !== 'string') {
    throw new Error('Unexpected profile response');
  }
  return { accountNumber: data.account_number, createdAt: data.created_at };
}
