import { Search } from 'lucide-react';

type AdminSearchProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
};

export default function AdminSearch({ value, onChange, placeholder }: AdminSearchProps) {
  return (
    <label className="relative block">
      <span className="sr-only">{placeholder}</span>
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-12 w-full rounded-xl border border-white/15 bg-black/30 pl-4 pr-11 text-sm font-medium text-white placeholder:text-slate-400 transition-colors duration-200 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/30"
      />
      <Search className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-300" />
    </label>
  );
}
