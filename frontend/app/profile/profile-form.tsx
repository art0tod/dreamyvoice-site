"use client";

/* eslint-disable @next/next/no-img-element */

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { PublicUser } from "@/lib/types";
import { clientConfig } from "@/lib/client-config";
import { buildMediaUrl } from "@/lib/media";

type Props = {
  user: PublicUser;
};

export function ProfileForm({ user }: Props) {
  const router = useRouter();
  const [username, setUsername] = useState(user.username);
  const [avatarPreview, setAvatarPreview] = useState(
    user.avatarKey ? buildMediaUrl("avatars", user.avatarKey) : null,
  );
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleAvatarChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      setAvatarFile(null);
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Файл больше 5 МБ");
      return;
    }

    setAvatarFile(file);
    setError(null);
    setAvatarPreview(URL.createObjectURL(file));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setStatus(null);

    const formData = new FormData();
    formData.append("username", username);
    if (avatarFile) {
      formData.append("avatar", avatarFile);
    }

    const response = await fetch(`${clientConfig.apiProxyBasePath}/profile`, {
      method: "PATCH",
      credentials: "include",
      body: formData,
    });

    setIsSubmitting(false);

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      setError(payload?.message ?? "Не удалось обновить профиль");
      return;
    }

    setStatus("Сохранено");
    router.refresh();
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
        Аватар (PNG/JPEG/WEBP, до 5 МБ)
        <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleAvatarChange} />
      </label>
      {avatarPreview ? <img src={avatarPreview} alt="Текущий аватар" width={96} height={96} /> : null}
      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Сохраняем..." : "Сохранить"}
      </button>
      {status ? <p>{status}</p> : null}
      {error ? <p role="alert">{error}</p> : null}
    </form>
  );
}
