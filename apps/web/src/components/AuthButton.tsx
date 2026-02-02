'use client';

import { useSession, signIn, signOut } from 'next-auth/react';

export function AuthButton() {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return (
      <button className="btn-secondary" disabled>
        Loading...
      </button>
    );
  }

  if (session) {
    return (
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-600 dark:text-gray-300">
          @{session.user.xUsername || session.user.name}
        </span>
        <button onClick={() => signOut()} className="btn-secondary">
          Sign Out
        </button>
      </div>
    );
  }

  return (
    <button onClick={() => signIn('twitter')} className="btn-primary">
      Sign In with X
    </button>
  );
}
