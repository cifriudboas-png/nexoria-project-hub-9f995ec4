import { useCallback, useEffect, useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { Shield } from 'lucide-react';
import AdminCommand from '@/components/admin/AdminCommand';
import { NoticeLine } from '@/components/admin/AdminGamesTab';
import AdminSearch from '@/components/admin/AdminSearch';
import CharacterViewer from '@/components/avatar/CharacterViewer';
import {
  AdminError,
  adminGiveItem,
  adminGiveNexos,
  adminListPlayers,
  adminPlayerItems,
  adminSetBanned,
  GIFTABLE_ITEMS,
  isValidGiftAmount,
  type AdminPlayer,
} from '@/lib/admin';
import { deletePlayerAccount } from '@/lib/admin.functions';
import { getHairItem, getShirtItem, type HairId } from '@/lib/avatar';
import { usePreferences } from '@/lib/preferences-context';
import type { TranslationKey } from '@/lib/translations';

type AdminPlayersTabProps = {
  onPlayerChanged: () => void;
};

type Notice = { tone: 'ok' | 'error' | 'info'; text: string } | null;
type OpenCommand = 'delete' | 'nexos' | 'item' | 'access' | null;

export default function AdminPlayersTab({ onPlayerChanged }: AdminPlayersTabProps) {
  const { t, language } = usePreferences();
  const deleteAccount = useServerFn(deletePlayerAccount);
  const [search, setSearch] = useState('');
  const [players, setPlayers] = useState<AdminPlayer[]>([]);
  const [loadFailed, setLoadFailed] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [openCommand, setOpenCommand] = useState<OpenCommand>(null);
  const [amount, setAmount] = useState('100');
  const [giftItem, setGiftItem] = useState<HairId>(GIFTABLE_ITEMS[0]?.id ?? 'cool_blond_hair');
  const [items, setItems] = useState<string[] | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);

  const load = useCallback(async (term: string) => {
    try {
      const result = await adminListPlayers(term);
      setPlayers(result);
      setLoadFailed(false);
    } catch {
      setLoadFailed(true);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => void load(search), 250);
    return () => clearTimeout(timer);
  }, [search, load]);

  const selected = players.find((player) => player.id === selectedId) ?? null;

  const select = (id: string) => {
    setSelectedId((current) => (current === id ? null : id));
    setOpenCommand(null);
    setItems(null);
    setNotice(null);
  };

  const toggle = (command: OpenCommand) => {
    setNotice(null);
    setOpenCommand((current) => (current === command ? null : command));
    if (command === 'access' && selected) {
      setItems(null);
      adminPlayerItems(selected.id)
        .then(setItems)
        .catch(() => setItems([]));
    }
  };

  const run = async (action: () => Promise<void>, success: string) => {
    setIsBusy(true);
    setNotice(null);
    try {
      await action();
      await load(search);
      onPlayerChanged();
      setNotice({ tone: 'ok', text: success });
      setOpenCommand(null);
    } catch (error) {
      const key: TranslationKey = error instanceof AdminError ? error.key : 'adminActionError';
      setNotice({ tone: 'error', text: t(key) });
    } finally {
      setIsBusy(false);
    }
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(language === 'pt' ? 'pt-BR' : 'en-US', { day: '2-digit', month: 'short', year: 'numeric' });

  const itemName = (id: string) => {
    const hair = getHairItem(id as HairId);
    return hair ? t(hair.name) : id;
  };

  return (
    <div className="flex flex-col gap-4">
      <AdminSearch value={search} onChange={setSearch} placeholder={t('adminSearchPlayers')} />

      <ul className="flex max-h-48 flex-col gap-2 overflow-y-auto pr-1">
        {loadFailed && <li className="py-6 text-center text-sm text-red-300">{t('adminLoadError')}</li>}
        {!loadFailed && players.length === 0 && (
          <li className="py-6 text-center text-sm text-slate-400">{t('adminNoPlayers')}</li>
        )}
        {players.map((player) => {
          const isSelected = player.id === selectedId;
          return (
            <li key={player.id}>
              <button
                type="button"
                onClick={() => select(player.id)}
                aria-pressed={isSelected}
                className={`flex w-full items-center gap-3 rounded-xl border p-2 text-left transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 ${
                  isSelected ? 'border-sky-400/70 bg-sky-500/15' : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.07]'
                }`}
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-sky-700 text-sm font-black uppercase text-white">
                  {player.username.slice(0, 2)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-white">{player.username}</span>
                  <span className="block text-xs text-slate-400">
                    #{player.accountNumber} · {player.nexos} {t('nexos')}
                  </span>
                </span>
                {player.isAdmin && (
                  <span className="flex shrink-0 items-center gap-1 rounded-full bg-sky-400/15 px-2 py-0.5 text-[11px] font-bold uppercase text-sky-200">
                    <Shield className="h-3 w-3" />
                    {t('adminAdminBadge')}
                  </span>
                )}
                {player.banned && (
                  <span className="shrink-0 rounded-full bg-red-500/15 px-2 py-0.5 text-[11px] font-bold uppercase text-red-300">
                    {t('adminBannedBadge')}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>

      <div className="border-t border-white/10 pt-4">
        <p className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-400">
          {t('adminCommands')}
          {selected && <span className="ml-2 normal-case tracking-normal text-sky-300">· {selected.username}</span>}
        </p>

        {!selected ? (
          <p className="rounded-xl border border-dashed border-white/15 px-4 py-6 text-center text-sm text-slate-400">
            {t('adminSelectPlayer')}
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            <AdminCommand
              tone="red"
              label={t('adminDeleteAccount')}
              disabled={isBusy || selected.isAdmin}
              active={openCommand === 'delete'}
              onClick={() => toggle('delete')}
            >
              {openCommand === 'delete' && (
                <div className="flex flex-wrap items-center gap-2">
                  <p className="w-full text-sm text-red-200">{t('adminConfirmDeleteAccount', { name: selected.username })}</p>
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() =>
                      run(async () => {
                        const result = await deleteAccount({ data: { playerId: selected.id } });
                        if (!result.ok) {
                          throw new AdminError(result.error === 'cannot_delete_admin' ? 'adminAdminProtected' : 'adminActionError');
                        }
                        setSelectedId(null);
                      }, t('adminAccountDeleted', { name: selected.username }))
                    }
                    className="rounded-lg bg-red-500 px-3 py-1.5 text-sm font-bold text-white transition-colors hover:bg-red-400 disabled:opacity-50"
                  >
                    {t('adminConfirmDelete')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setOpenCommand(null)}
                    className="rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-300 transition-colors hover:bg-white/10"
                  >
                    {t('adminCancel')}
                  </button>
                </div>
              )}
            </AdminCommand>

            <AdminCommand
              tone="green"
              label={t('adminGiveNexos')}
              disabled={isBusy}
              active={openCommand === 'nexos'}
              onClick={() => toggle('nexos')}
            >
              {openCommand === 'nexos' && (
                <form
                  className="flex items-end gap-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    const value = Number(amount);
                    if (!isValidGiftAmount(value)) {
                      setNotice({ tone: 'error', text: t('adminInvalidAmount') });
                      return;
                    }
                    void run(
                      () => adminGiveNexos(selected.id, value),
                      t('adminNexosGiven', { amount: value, name: selected.username }),
                    );
                  }}
                >
                  <label className="flex-1">
                    <span className="mb-1 block text-xs font-semibold text-slate-300">{t('adminAmount')}</span>
                    <input
                      type="number"
                      min={1}
                      max={1000000}
                      step={1}
                      value={amount}
                      onChange={(event) => setAmount(event.target.value)}
                      className="h-10 w-full rounded-lg border border-white/15 bg-black/30 px-3 text-sm text-white focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/30"
                    />
                  </label>
                  <button
                    type="submit"
                    disabled={isBusy}
                    className="h-10 rounded-lg bg-emerald-500 px-4 text-sm font-bold text-white transition-colors hover:bg-emerald-400 disabled:opacity-50"
                  >
                    {t('adminGive')}
                  </button>
                </form>
              )}
            </AdminCommand>

            <AdminCommand
              tone="yellow"
              label={t('adminGiveItem')}
              disabled={isBusy}
              active={openCommand === 'item'}
              onClick={() => toggle('item')}
            >
              {openCommand === 'item' && (
                <div className="flex items-end gap-2">
                  <label className="flex-1">
                    <span className="sr-only">{t('adminGiveItem')}</span>
                    <select
                      value={giftItem}
                      onChange={(event) => setGiftItem(event.target.value as HairId)}
                      className="h-10 w-full rounded-lg border border-white/15 bg-slate-900 px-3 text-sm text-white focus:border-yellow-300 focus:outline-none focus:ring-2 focus:ring-yellow-300/30"
                    >
                      {GIFTABLE_ITEMS.map((item) => (
                        <option key={item.id} value={item.id}>
                          {t(item.name)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() =>
                      run(
                        () => adminGiveItem(selected.id, giftItem),
                        t('adminItemGiven', { item: itemName(giftItem), name: selected.username }),
                      )
                    }
                    className="h-10 rounded-lg bg-yellow-400 px-4 text-sm font-bold text-slate-900 transition-colors hover:bg-yellow-300 disabled:opacity-50"
                  >
                    {t('adminGive')}
                  </button>
                </div>
              )}
            </AdminCommand>

            <AdminCommand
              tone="cyan"
              label={t('adminAccessAccount')}
              disabled={isBusy}
              active={openCommand === 'access'}
              onClick={() => toggle('access')}
            >
              {openCommand === 'access' && (
                <div className="flex gap-4">
                  <div className="h-24 w-24 shrink-0 overflow-hidden rounded-full border-2 border-cyan-300/60 bg-gradient-to-br from-sky-300 to-sky-500">
                    <CharacterViewer
                      className="h-full w-full rounded-full"
                      framing="bust"
                      look="starter"
                      shirt={getShirtItem(selected.shirt as never)?.id ?? null}
                      hair={getHairItem(selected.hair as never)?.id ?? null}
                    />
                  </div>
                  <dl className="grid min-w-0 flex-1 grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                    <dt className="text-slate-400">{t('accountIdLabel')}</dt>
                    <dd className="font-mono font-semibold text-white">#{selected.accountNumber}</dd>
                    <dt className="text-slate-400">{t('memberSince')}</dt>
                    <dd className="font-semibold text-white">{formatDate(selected.createdAt)}</dd>
                    <dt className="text-slate-400">{t('nexos')}</dt>
                    <dd className="font-semibold text-white">{selected.nexos}</dd>
                    <dt className="text-slate-400">{t('adminStatus')}</dt>
                    <dd className={`font-semibold ${selected.banned ? 'text-red-300' : 'text-emerald-300'}`}>
                      {selected.banned ? t('adminBannedBadge') : t('adminActive')}
                    </dd>
                    <dt className="text-slate-400">{t('adminItemsLabel')}</dt>
                    <dd className="font-semibold text-white">
                      {items === null ? t('loading') : items.length === 0 ? t('adminNoItems') : items.map(itemName).join(', ')}
                    </dd>
                  </dl>
                </div>
              )}
            </AdminCommand>

            <AdminCommand
              tone="orange"
              label={selected.banned ? t('adminUnban') : t('adminBan')}
              disabled={isBusy || selected.isAdmin}
              onClick={() =>
                run(
                  () => adminSetBanned(selected.id, !selected.banned),
                  t(selected.banned ? 'adminUnbannedDone' : 'adminBannedDone', { name: selected.username }),
                )
              }
            />
          </div>
        )}

        {notice && <NoticeLine notice={notice} />}
      </div>
    </div>
  );
}
