import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser, getTitle } from "@/lib/server-api";
import { EditTitleForm } from "./edit-title-form";
import { AddEpisodeForm } from "./add-episode-form";
import { createEpisodeAction, updateTitleAction } from "./actions";

type Props = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function AdminTitlePage({ params }: Props) {
  const { slug } = await params;
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect(`/login?redirect=/admin/${slug}`);
  }

  if (currentUser.role !== "ADMIN") {
    redirect("/");
  }

  const title = await getTitle(slug);

  if (!title) {
    notFound();
  }

  const updateAction = updateTitleAction.bind(null, slug);
  const addEpisodeAction = createEpisodeAction.bind(null, slug);

  return (
    <section>
      <p>
        <Link href="/admin">← Назад к списку</Link>
      </p>
      <h1>Редактирование: {title.name}</h1>

      <EditTitleForm
        action={updateAction}
        initialValues={{
          name: title.name,
          description: title.description ?? "",
          coverKey: title.coverKey ?? "",
          published: title.published,
        }}
      />

      <h2>Серии ({title.episodes.length})</h2>
      <AddEpisodeForm action={addEpisodeAction} />

      {title.episodes.length === 0 ? (
        <p>Серий пока нет.</p>
      ) : (
        <ul>
          {title.episodes
            .slice()
            .sort((a, b) => a.number - b.number)
            .map((episode) => (
              <li key={episode.id}>
                <article>
                  <header>
                    <strong>
                      {episode.number}. {episode.name}
                    </strong>{" "}
                    <span>{episode.published ? "Опубликована" : "Черновик"}</span>
                  </header>
                  {episode.durationMinutes ? <p>Длительность: {episode.durationMinutes} мин</p> : null}
                  <p>
                    Плеер:{" "}
                    {episode.playerSrc ? (
                      <a href={episode.playerSrc} target="_blank" rel="noreferrer">
                        {episode.playerSrc}
                      </a>
                    ) : (
                      "не указан"
                    )}
                  </p>
                </article>
              </li>
            ))}
        </ul>
      )}
    </section>
  );
}
