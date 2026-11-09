import { Bomb, Box, Gamepad2, Pizza, Youtube, type LucideIcon } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export type Game = {
  id: string;
  title: string;
  icon: LucideIcon;
  gradientClass: string;
  isPrivate: boolean;
};

const ICONS: Record<string, LucideIcon> = { pizza: Pizza, bomb: Bomb, youtube: Youtube, box: Box };

const THEMES: Record<string, string> = {
  pizza: 'bg-gradient-to-br from-amber-300 via-orange-400 to-red-500',
  bomb: 'bg-gradient-to-br from-yellow-300 via-orange-500 to-red-700',
  video: 'bg-gradient-to-br from-sky-300 via-teal-400 to-red-400',
  box: 'bg-gradient-to-br from-emerald-400 via-teal-500 to-sky-600',
};

const FALLBACK_THEME = 'bg-gradient-to-br from-sky-400 via-sky-500 to-indigo-600';

/** Games the current visitor can see: public ones, plus private ones for the admin. */
export async function listGames(): Promise<Game[]> {
  const { data, error } = await supabase
    .from('games')
    .select('id, title, icon, theme, is_private, sort_order')
    .order('sort_order');
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    icon: ICONS[row.icon] ?? Gamepad2,
    gradientClass: THEMES[row.theme] ?? FALLBACK_THEME,
    isPrivate: row.is_private,
  }));
}
