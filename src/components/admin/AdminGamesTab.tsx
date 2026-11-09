import { useMemo, useState } from 'react';
import AdminCommand from '@/components/admin/AdminCommand';
import AdminSearch from '@/components/admin/AdminSearch';
import { adminDeleteGame, adminSetGamePrivate, AdminError } from '@/lib/admin';
import type { Game } from '@/lib/games';
import { usePreferences } from '@/lib/preferences-context';
import type { TranslationKey } from '@/lib/translations';

type AdminGamesTabProps = {
  games: Game[];
  onGamesChanged: () => Promise<void> | void;
};

type Notice = { tone: 'ok' | 'error' | 'info'; text: string } | null;

export default function AdminGamesTab({ games, onGamesChanged }: AdminGamesTabProps) {
  const { t } = usePreferences();
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return term ? games.filter((game) => game.title.toLowerCase().includes(term)) : games;
  }, [games, search]);

  const selected = games.find((game) => game.id === selectedId) ?? null;

  const run = async (action: () => Promise<void>, success: string) => {
    setIsBusy(true);
    setNotice(null);
    try {
      await action();
      await onGamesChanged();
      setNotice({ tone: 'ok', text: success });
    } catch (error) {
      const key: TranslationKey = error instanceof AdminError ? error.key : 'adminActionError';
      setNotice({ tone: 'error', text: t(key) });
    } finally {
      setIsBusy(false);
      setConfirmDelete(false);
    }
  };

  const select = (id: string) => {
    setSelectedId((current) => (current === id ? null : id));
    setConfirmDelete(false);
    setNotice(null);
  };

  return (
    <div className="flex flex-col gap-4">
      <AdminSearch value={search} onChange={setSearch} placeholder={t('adminSearchGames')} />

      <ul className="flex max-h-56 flex-col gap-2 overflow-y-auto pr-1">
        {filtered.length === 0 && <li className="py-6 text-center text-sm text-slate-400">{t('adminNoGames')}</li>}
        {filtered.map((game) => {
          const Icon = game.icon;
          const isSelected = game.id === selectedId;
          return (
            <li key={game.id}>
              <button
                type="button"
                onClick={() => select(game.id)}
                aria-pressed={isSelected}
                className={`flex w-full items-center gap-3 rounded-xl border p-2 text-left transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 ${
                  isSelected ? 'border-sky-400/70 bg-sky-500/15' : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.07]'
                }`}
              >
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${game.gradientClass}`}>
                  <Icon className="h-5 w-5 text-white" />
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-white">{game.title}</span>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ${
                    game.isPrivate ? 'bg-yellow-400/15 text-yellow-300' : 'bg-emerald-400/15 text-emerald-300'
                  }`}
                >
                  {game.isPrivate ? t('adminPrivate') : t('adminPublic')}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <div className="border-t border-white/10 pt-4">
        <p className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-400">
          {t('adminCommands')}
          {selected && <span className="ml-2 normal-case tracking-normal text-sky-300">· {selected.title}</span>}
        </p>

        {!selected ? (
          <p className="rounded-xl border border-dashed border-white/15 px-4 py-6 text-center text-sm text-slate-400">
            {t('adminSelectGame')}
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            <AdminCommand
              tone="red"
              label={t('adminDeleteGame')}
              disabled={isBusy}
              active={confirmDelete}
              onClick={() => setConfirmDelete((open) => !open)}
            >
              {confirmDelete && (
                <div className="flex flex-wrap items-center gap-2">
                  <p className="w-full text-sm text-red-200">{t('adminConfirmDeleteGame', { name: selected.title })}</p>
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() =>
                      run(async () => {
                        await adminDeleteGame(selected.id);
                        setSelectedId(null);
                      }, t('adminGameDeleted', { name: selected.title }))
                    }
                    className="rounded-lg bg-red-500 px-3 py-1.5 text-sm font-bold text-white transition-colors hover:bg-red-400 disabled:opacity-50"
                  >
                    {t('adminConfirmDelete')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-300 transition-colors hover:bg-white/10"
                  >
                    {t('adminCancel')}
                  </button>
                </div>
              )}
            </AdminCommand>
            <AdminCommand
              tone="yellow"
              label={selected.isPrivate ? t('adminMakePublic') : t('adminMakePrivate')}
              disabled={isBusy}
              onClick={() =>
                run(
                  () => adminSetGamePrivate(selected.id, !selected.isPrivate),
                  t(selected.isPrivate ? 'adminPublicDone' : 'adminPrivateDone', { name: selected.title }),
                )
              }
            />
            <AdminCommand
              tone="cyan"
              label={t('adminOpenStudio')}
              disabled={isBusy}
              onClick={() => setNotice({ tone: 'info', text: t('adminStudioSoon') })}
            />
          </div>
        )}

        {notice && <NoticeLine notice={notice} />}
      </div>
    </div>
  );
}

export function NoticeLine({ notice }: { notice: NonNullable<Notice> }) {
  const tone =
    notice.tone === 'ok'
      ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-200'
      : notice.tone === 'error'
        ? 'border-red-400/40 bg-red-500/10 text-red-200'
        : 'border-cyan-400/40 bg-cyan-400/10 text-cyan-100';
  return (
    <p role="status" className={`mt-3 rounded-lg border px-3 py-2 text-sm ${tone}`}>
      {notice.text}
    </p>
  );
}
