import { useClerk, useUser } from '@clerk/react';
import { LogOut } from 'lucide-react';
import { basePath } from '@/lib/base-path';

export function AccountBadge() {
  const { user } = useUser();
  const { signOut } = useClerk();

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-muted-foreground hidden md:inline">
        {user?.primaryEmailAddress?.emailAddress ?? user?.fullName}
      </span>
      <button
        onClick={() => signOut({ redirectUrl: basePath || '/' })}
        className="flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-destructive transition-colors"
        title="Se déconnecter"
      >
        <LogOut className="w-4 h-4" />
        <span className="hidden md:inline">Déconnexion</span>
      </button>
    </div>
  );
}
