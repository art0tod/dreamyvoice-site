/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { getTitles } from "@/lib/server-api";
import type { Title } from "@/lib/types";
import { buildMediaUrl } from "@/lib/media";

export default async function HomePage() {
  const titles: Title[] = await getTitles();

  return (
    <section>
      <h1>Каталог тайтлов</h1>
      {titles.length === 0 ? (
        <p>Пока ничего нет. Добавьте первый тайтл через админку.</p>
      ) : (
        <ul>
          {titles.map((title) => (
            <li key={title.id}>
              <article>
                {title.coverKey ? (
                  <img
                    src={buildMediaUrl("covers", title.coverKey)!}
                    alt={`Обложка ${title.name}`}
                    width={160}
                    height={220}
                  />
                ) : null}
                <h2>
                  <Link href={`/titles/${title.slug}`}>{title.name}</Link>
                </h2>
                {title.description ? <p>{title.description}</p> : null}
                <p>
                  Серий: {title.episodes.length}{" "}
                  {title.published ? "" : "(черновик)"}
                </p>
              </article>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
