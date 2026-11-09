import { useEffect, useState } from 'react';
import { Ban } from 'lucide-react';
import HomeScreen from '@/components/home/HomeScreen';
import SignupScreen from '@/components/SignupScreen';
import { getCurrentUsername, signOutUser } from '@/lib/auth';
import type { Account } from '@/lib/account';
import { usePreferences } from '@/lib/preferences-context';
import { isCurrentUserBanned } from '@/lib/profile';

function App() {
  const [account, setAccount] = useState<Account | null>(null);
  const [isRestoring, setIsRestoring] = useState(true);
  const [isBanned, setIsBanned] = useState(false);

  useEffect(() => {
    let isActive = true;
    getCurrentUsername()
      .catch(() => null)
      .then((username) => {
        if (!isActive) return;
        setAccount(username ? { displayName: username, isGuest: false } : null);
        setIsRestoring(false);
      });
    return () => {
      isActive = false;
    };
  }, []);

  // Banned players are stopped as soon as their account is known.
  useEffect(() => {
    if (!account || account.isGuest) {
      setIsBanned(false);
      return;
    }
    let isActive = true;
    isCurrentUserBanned().then((banned) => {
      if (isActive) setIsBanned(banned);
    });
    return () => {
      isActive = false;
    };
  }, [account]);

  const handleSignOut = async () => {
    await signOutUser();
    setAccount(null);
  };

  if (isRestoring) return <div className="min-h-screen bg-stone-50" />;
  if (!account) return <SignupScreen onEnter={setAccount} />;
  if (isBanned) return <BannedScreen onSignOut={handleSignOut} />;
  return <HomeScreen account={account} onSignOut={handleSignOut} />;
}

function BannedScreen({ onSignOut }: { onSignOut: () => void }) {
  const { t } = usePreferences();
  return (
    <div className="flex min-h-screen items-center justify-center bg-stone-200 px-4 dark:bg-stone-950">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 text-center shadow-xl ring-1 ring-stone-900/5 dark:bg-stone-900 dark:ring-white/10">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-400">
          <Ban className="h-7 w-7" />
        </span>
        <h1 className="mt-4 text-2xl font-black text-stone-900 dark:text-stone-100">{t('bannedTitle')}</h1>
        <p className="mt-2 text-sm text-stone-600 dark:text-stone-400">{t('bannedText')}</p>
        <button
          type="button"
          onClick={onSignOut}
          className="mt-6 w-full rounded-lg bg-sky-700 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-sky-600"
        >
          {t('signOut')}
        </button>
      </div>
    </div>
  );
}

export default App;
