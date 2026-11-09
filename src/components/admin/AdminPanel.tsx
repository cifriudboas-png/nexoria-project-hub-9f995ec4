import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { Gamepad2, Shield, Users, X } from 'lucide-react';
import AdminGamesTab from '@/components/admin/AdminGamesTab';
import AdminPlayersTab from '@/components/admin/AdminPlayersTab';
import type { Game } from '@/lib/games';
import { usePreferences } from '@/lib/preferences-context';

type AdminPanelProps = {
  games: Game[];
  onGamesChanged: () => Promise<void> | void;
  onPlayerChanged: () => void;
};

type Tab = 'players' | 'games';

const BUTTON_SIZE = 56;
const EDGE = 12;
const DRAG_THRESHOLD = 5;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

/** Admin-only floating square: drag it around the screen, tap it to open the command window. */
export default function AdminPanel({ games, onGamesChanged, onPlayerChanged }: AdminPanelProps) {
  const { t } = usePreferences();
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('players');
  const drag = useRef<{ startX: number; startY: number; originX: number; originY: number; moved: boolean } | null>(null);

  // Start near the bottom-right corner once the screen size is known.
  useEffect(() => {
    setPosition({
      x: window.innerWidth - BUTTON_SIZE - EDGE * 2,
      y: window.innerHeight - BUTTON_SIZE - EDGE * 6,
    });
    const keepInside = () =>
      setPosition((current) =>
        current
          ? {
              x: clamp(current.x, EDGE, window.innerWidth - BUTTON_SIZE - EDGE),
              y: clamp(current.y, EDGE, window.innerHeight - BUTTON_SIZE - EDGE),
            }
          : current,
      );
    window.addEventListener('resize', keepInside);
    return () => window.removeEventListener('resize', keepInside);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen]);

  const onPointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!position) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { startX: event.clientX, startY: event.clientY, originX: position.x, originY: position.y, moved: false };
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const state = drag.current;
    if (!state) return;
    const dx = event.clientX - state.startX;
    const dy = event.clientY - state.startY;
    if (!state.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
    if (!state.moved) {
      state.moved = true;
      setIsDragging(true);
    }
    setPosition({
      x: clamp(state.originX + dx, EDGE, window.innerWidth - BUTTON_SIZE - EDGE),
      y: clamp(state.originY + dy, EDGE, window.innerHeight - BUTTON_SIZE - EDGE),
    });
  };

  const onPointerUp = () => {
    const state = drag.current;
    drag.current = null;
    setIsDragging(false);
    if (state && !state.moved) setIsOpen(true);
  };

  if (!position) return null;

  const tabs: { id: Tab; label: string; icon: typeof Users }[] = [
    { id: 'players', label: t('adminTabPlayers'), icon: Users },
    { id: 'games', label: t('adminTabGames'), icon: Gamepad2 },
  ];

  return (
    <>
      {!isOpen && (
        <button
          type="button"
          aria-label={t('adminOpen')}
          title={t('adminDragHint')}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={() => {
            drag.current = null;
            setIsDragging(false);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              setIsOpen(true);
            }
          }}
          style={{ left: position.x, top: position.y, width: BUTTON_SIZE, height: BUTTON_SIZE, touchAction: 'none' }}
          className={`fixed z-40 flex select-none items-center justify-center rounded-2xl border border-white/20 bg-gradient-to-br from-sky-500 via-sky-700 to-slate-900 text-white shadow-xl shadow-sky-950/40 ring-1 ring-black/20 transition-[transform,box-shadow] duration-200 focus:outline-none focus-visible:ring-4 focus-visible:ring-sky-300 ${
            isDragging ? 'scale-110 cursor-grabbing shadow-2xl' : 'cursor-grab hover:scale-105'
          }`}
        >
          <Shield className="h-6 w-6 drop-shadow" />
          <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-cyan-300 shadow-[0_0_8px] shadow-cyan-300 ring-2 ring-slate-900" />
        </button>
      )}

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
          <button
            type="button"
            aria-label={t('adminClose')}
            onClick={() => setIsOpen(false)}
            className="absolute inset-0 cursor-default bg-slate-950/60 backdrop-blur-sm"
          />
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-panel-title"
            className="relative flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-slate-900 text-white shadow-2xl shadow-black/50"
          >
            <header className="flex items-center gap-3 border-b border-white/10 bg-gradient-to-r from-sky-700 via-sky-800 to-slate-900 px-5 py-4">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15">
                <Shield className="h-5 w-5" />
              </span>
              <h2 id="admin-panel-title" className="flex-1 text-lg font-black tracking-tight sm:text-xl">
                {t('adminTitle')} <span className="text-sky-200">— NEXORIA</span>
              </h2>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label={t('adminClose')}
                className="rounded-lg p-1.5 text-sky-100 transition-colors hover:bg-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <X className="h-5 w-5" />
              </button>
            </header>

            <div className="flex min-h-0 flex-1 flex-col sm:flex-row">
              <nav
                aria-label={t('adminTitle')}
                className="flex shrink-0 gap-1 border-b border-white/10 bg-black/20 p-2 sm:w-44 sm:flex-col sm:border-b-0 sm:border-r sm:p-3"
              >
                {tabs.map(({ id, label, icon: Icon }) => {
                  const isActive = tab === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setTab(id)}
                      aria-current={isActive ? 'page' : undefined}
                      className={`relative flex flex-1 items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-bold transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 sm:flex-none ${
                        isActive ? 'bg-sky-500/20 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {label}
                      {isActive && (
                        <span className="absolute inset-x-3 bottom-1 h-0.5 rounded-full bg-sky-400 sm:inset-x-auto sm:bottom-auto sm:left-0 sm:top-2.5 sm:h-5 sm:w-1" />
                      )}
                    </button>
                  );
                })}
              </nav>

              <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
                {tab === 'players' ? (
                  <AdminPlayersTab onPlayerChanged={onPlayerChanged} />
                ) : (
                  <AdminGamesTab games={games} onGamesChanged={onGamesChanged} />
                )}
              </div>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
