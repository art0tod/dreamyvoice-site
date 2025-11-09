'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { clientConfig } from '@/lib/client-config';

type Props = {
  titleSlug: string;
  isAuthenticated: boolean;
};

export function CommentForm({ titleSlug, isAuthenticated }: Props) {
  const router = useRouter();
  const [body, setBody] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isAuthenticated) {
    return <p>Войдите, чтобы оставить комментарий.</p>;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!body.trim()) {
      return;
    }

    setIsSubmitting(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch(
        `${clientConfig.apiProxyBasePath}/titles/${titleSlug}/comments`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({ body }),
        },
      );

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.message ?? 'Не удалось отправить комментарий');
      }

      setBody('');
      setMessage('Комментарий отправлен на модерацию.');
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
        Сообщение
        <textarea
          name="comment"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          minLength={3}
          maxLength={2000}
          required
        />
      </label>
      <button type="submit" disabled={isSubmitting}>
        Отправить
      </button>
      {message ? <p>{message}</p> : null}
      {error ? <p>{error}</p> : null}
    </form>
  );
}
