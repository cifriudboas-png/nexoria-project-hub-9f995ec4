import type { ReactNode } from 'react';

export type CommandTone = 'red' | 'yellow' | 'cyan' | 'green' | 'orange';

const DOT: Record<CommandTone, string> = {
  red: 'bg-red-500 shadow-red-500/60',
  yellow: 'bg-yellow-400 shadow-yellow-400/60',
  cyan: 'bg-cyan-400 shadow-cyan-400/60',
  green: 'bg-emerald-400 shadow-emerald-400/60',
  orange: 'bg-orange-500 shadow-orange-500/60',
};

const HOVER: Record<CommandTone, string> = {
  red: 'hover:border-red-400/60 hover:bg-red-500/10',
  yellow: 'hover:border-yellow-300/60 hover:bg-yellow-400/10',
  cyan: 'hover:border-cyan-300/60 hover:bg-cyan-400/10',
  green: 'hover:border-emerald-300/60 hover:bg-emerald-400/10',
  orange: 'hover:border-orange-400/60 hover:bg-orange-500/10',
};

type AdminCommandProps = {
  tone: CommandTone;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  children?: ReactNode;
};

/** One command row in the Admin panel: a label with a glowing colored dot. */
export default function AdminCommand({ tone, label, onClick, disabled, active, children }: AdminCommandProps) {
  return (
    <div
      className={`rounded-xl border transition-colors duration-200 ${
        active ? 'border-white/25 bg-white/10' : 'border-white/10 bg-white/[0.04]'
      }`}
    >
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={`flex w-full items-center justify-between gap-3 rounded-xl px-4 py-3 text-left text-sm font-semibold text-white transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 disabled:cursor-not-allowed disabled:opacity-40 ${
          disabled ? '' : HOVER[tone]
        }`}
      >
        <span>{label}</span>
        <span className={`h-3.5 w-3.5 shrink-0 rounded-full shadow-[0_0_10px] ring-2 ring-black/30 ${DOT[tone]}`} />
      </button>
      {children && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}
