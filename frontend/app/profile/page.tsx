import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/server-api";
import { ProfileForm } from "./profile-form";

export default async function ProfilePage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login?redirect=/profile");
  }

  return (
    <section>
      <h1>Профиль</h1>
      <ProfileForm user={currentUser} />
    </section>
  );
}
