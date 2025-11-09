import Link from "next/link";
import { redirect } from "next/navigation";
import { CreateTitleForm } from "./create-title-form";
import { getCurrentUser, getTitles } from "@/lib/server-api";
import type { Title } from "@/lib/types";

export default async function AdminPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login?redirect=/admin");
  }

  if (currentUser.role !== "ADMIN") {
    return (
      <section>
        <h1>Требуются права администратора</h1>
        <p>
          Вы вошли как {currentUser.username}, но ваша роль не позволяет
          работать с админкой.
        </p>
        <p>
          Вернуться к <Link href="/">каталогу</Link>.
        </p>
      </section>
    );
  }

  const titles: Title[] = await getTitles({ includeDrafts: true });

  return (
    <section>
      <h1>Управление контентом</h1>
      <p>
        Добавляйте новые тайтлы и следите за черновиками. Эпизоды и комментарии
        появятся в следующих задачах.
      </p>

      <CreateTitleForm />

      <h2>Все тайтлы ({titles.length})</h2>
      {titles.length === 0 ? (
        <p>Здесь появятся первые релизы после создания.</p>
      ) : (
        <ul>
          {titles.map((title) => (
            <li key={title.id}>
              <article>
                <header>
                  <strong>{title.name}</strong>{" "}
                  <span>{title.published ? "Опубликован" : "Черновик"}</span>
                </header>
                <p>Slug: {title.slug}</p>
                {title.description ? <p>{title.description}</p> : null}
                <p>Серий: {title.episodes.length}</p>
                <p>
                  Обновлён:{" "}
                  {new Date(title.updatedAt).toLocaleString("ru-RU", {
                    dateStyle: "short",
                    timeStyle: "short",
                  })}
                </p>
                <p>
                  <Link href={`/admin/${title.slug}`}>Редактировать</Link>
                </p>
              </article>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
