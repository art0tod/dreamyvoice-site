/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser, getTitle, getTitleComments } from "@/lib/server-api";
import type { Comment } from "@/lib/types";
import { EpisodePlayer } from "./episode-player";
import { CommentForm } from "./comment-form";
import { buildMediaUrl } from "@/lib/media";

type Props = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function TitlePage({ params }: Props) {
  const { slug } = await params;
  const [title, comments, currentUser] = await Promise.all([
    getTitle(slug),
    getTitleComments(slug),
    getCurrentUser(),
  ]);

  if (!title) {
    notFound();
  }

  return (
    <article>
      <Link href="/">← Назад к списку</Link>
      <header>
        <h1>{title.name}</h1>
        {title.coverKey ? (
          <img
            src={buildMediaUrl("covers", title.coverKey)!}
            alt={`Обложка ${title.name}`}
            width={240}
            height={320}
          />
        ) : null}
        {title.description ? <p>{title.description}</p> : null}
      </header>

      <EpisodePlayer episodes={title.episodes} />

      <section>
        <h2>Комментарии</h2>
        {comments.length === 0 ? (
          <p>Комментариев пока нет.</p>
        ) : (
          <ul>
            {comments.map((comment) => (
              <li key={comment.id}>
                <CommentBlock comment={comment} />
              </li>
            ))}
          </ul>
        )}

        <CommentForm
          titleSlug={title.slug}
          isAuthenticated={Boolean(currentUser)}
        />
      </section>
    </article>
  );
}

function CommentBlock({ comment }: { comment: Comment }) {
  const avatarUrl = comment.author.avatarKey
    ? buildMediaUrl("avatars", comment.author.avatarKey)
    : null;

  return (
    <article>
      <header>
        {avatarUrl ? (
          <img src={avatarUrl} alt={comment.author.username} width={48} height={48} />
        ) : (
          <span>{comment.author.username.charAt(0).toUpperCase()}</span>
        )}
        <strong>{comment.author.username}</strong>{" "}
        <small>{new Date(comment.createdAt).toLocaleString("ru-RU")}</small>
      </header>
      <p>{comment.body}</p>
      {comment.status && comment.status !== "APPROVED" ? (
        <p>Статус: {comment.status}</p>
      ) : null}
    </article>
  );
}
