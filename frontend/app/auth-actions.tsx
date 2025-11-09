'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { clientConfig } from '@/lib/client-config';
import type { PublicUser } from '@/lib/types';

type Props = {
  currentUser: PublicUser | null;
};

export function AuthActions({ currentUser }: Props) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!currentUser) {
    return (
      <div>
        <Link href="/login">Войти</Link>
        {' / '}
        <Link href="/register">Регистрация</Link>
      </div>
    );
  }

  async function handleLogout() {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${clientConfig.apiProxyBasePath}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Не удалось выйти');
      }

      router.refresh();
    } catch (logoutError) {
      setError((logoutError as Error).message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div>
      <span>
        Привет, <Link href="/profile">{currentUser.username}</Link>
      </span>
      <button onClick={handleLogout} disabled={isLoading}>
        Выйти
      </button>
      {error ? <p>{error}</p> : null}
    </div>
  );
}
