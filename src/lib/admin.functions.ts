import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Admin-only: deletes a player's account (and, through cascades, their profile and inventory). */
export const deletePlayerAccount = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { playerId: string }) => {
    if (typeof input?.playerId !== 'string' || !UUID_PATTERN.test(input.playerId)) {
      throw new Error('invalid_player');
    }
    return { playerId: input.playerId };
  })
  .handler(async ({ data, context }) => {
    const { data: isAdmin, error: roleError } = await context.supabase.rpc('has_role', {
      _user_id: context.userId,
      _role: 'admin',
    });
    if (roleError || isAdmin !== true) return { ok: false as const, error: 'forbidden' as const };

    const { data: targetIsAdmin } = await context.supabase.rpc('has_role', {
      _user_id: data.playerId,
      _role: 'admin',
    });
    if (targetIsAdmin === true || data.playerId === context.userId) {
      return { ok: false as const, error: 'cannot_delete_admin' as const };
    }

    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.playerId);
    if (error) {
      console.error('deletePlayerAccount failed', error.message);
      return { ok: false as const, error: 'failed' as const };
    }
    return { ok: true as const };
  });
