'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { clientConfig } from '@/lib/client-config';

type Props = {
  mode: 'login' | 'register';
};

export function AuthForm({ mode }: Props) {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(
        `${clientConfig.apiProxyBasePath}/auth/${mode === 'login' ? 'login' : 'register'}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ username, password }),
        },
      );

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.message ?? 'Ошибка авторизации');
      }

      router.push('/');
      router.refresh();
    } catch (submitError) {
      setError((submitError as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <label>
        Никнейм
        <input
          type="text"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          minLength={3}
          maxLength={32}
          required
        />
      </label>
      <label>
        Пароль
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          minLength={6}
          maxLength={128}
          required
        />
      </label>
      <button type="submit" disabled={isSubmitting}>
        {mode === 'login' ? 'Войти' : 'Создать аккаунт'}
      </button>
      {error ? <p>{error}</p> : null}
    </form>
  );
}
