import { supabase } from '@/lib/supabase';
import { HAIR_ITEMS, type HairId } from '@/lib/avatar';

export type AdminPlayer = {
  id: string;
  username: string;
  accountNumber: number;
  createdAt: string;
  nexos: number;
  banned: boolean;
  isAdmin: boolean;
  shirt: string | null;
  hair: string | null;
};

export type AdminErrorKey = 'adminActionError' | 'adminItemOwned' | 'adminInvalidAmount' | 'adminAdminProtected';

export class AdminError extends Error {
  readonly key: AdminErrorKey;

  constructor(key: AdminErrorKey) {
    super(key);
    this.key = key;
  }
}

export const MAX_GIFT_NEXOS = 1_000_000;

/** A gift amount must be a whole number from 1 to 1,000,000. */
export function isValidGiftAmount(amount: number): boolean {
  return Number.isInteger(amount) && amount >= 1 && amount <= MAX_GIFT_NEXOS;
}

function toAdminError(message: string | undefined): AdminError {
  const text = message ?? '';
  if (text.includes('already_owned')) return new AdminError('adminItemOwned');
  if (text.includes('invalid_amount')) return new AdminError('adminInvalidAmount');
  if (text.includes('cannot_ban_admin') || text.includes('cannot_delete_admin')) return new AdminError('adminAdminProtected');
  return new AdminError('adminActionError');
}

/** Asks the database whether the signed-in player is an admin. */
export async function isCurrentUserAdmin(): Promise<boolean> {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user.id;
  if (!userId) return false;
  const { data, error } = await supabase.rpc('has_role', { _user_id: userId, _role: 'admin' });
  if (error) return false;
  return data === true;
}

export async function adminDeleteGame(gameId: string): Promise<void> {
  const { error } = await supabase.rpc('admin_delete_game', { _game: gameId });
  if (error) throw toAdminError(error.message);
}

export async function adminSetGamePrivate(gameId: string, isPrivate: boolean): Promise<void> {
  const { error } = await supabase.rpc('admin_set_game_private', { _game: gameId, _private: isPrivate });
  if (error) throw toAdminError(error.message);
}

export async function adminListPlayers(search: string): Promise<AdminPlayer[]> {
  const { data, error } = await supabase.rpc('admin_list_players', { _search: search.trim() });
  if (error) throw toAdminError(error.message);
  return (data ?? []).map((row) => ({
    id: row.id,
    username: row.username,
    accountNumber: Number(row.account_number),
    createdAt: row.created_at,
    nexos: Number(row.nexos),
    banned: row.banned,
    isAdmin: row.is_admin,
    shirt: row.equipped_shirt,
    hair: row.equipped_hair,
  }));
}

export async function adminPlayerItems(playerId: string): Promise<string[]> {
  const { data, error } = await supabase.rpc('admin_player_items', { _player: playerId });
  if (error) throw toAdminError(error.message);
  return (data ?? []) as string[];
}

export async function adminGiveNexos(playerId: string, amount: number): Promise<void> {
  if (!isValidGiftAmount(amount)) throw new AdminError('adminInvalidAmount');
  const { error } = await supabase.rpc('admin_give_nexos', { _player: playerId, _amount: amount });
  if (error) throw toAdminError(error.message);
}

export async function adminGiveItem(playerId: string, item: HairId): Promise<void> {
  const { error } = await supabase.rpc('admin_give_item', { _player: playerId, _item: item });
  if (error) throw toAdminError(error.message);
}

export async function adminSetBanned(playerId: string, banned: boolean): Promise<void> {
  const { error } = await supabase.rpc('admin_set_banned', { _player: playerId, _banned: banned });
  if (error) throw toAdminError(error.message);
}

export const GIFTABLE_ITEMS = HAIR_ITEMS;
