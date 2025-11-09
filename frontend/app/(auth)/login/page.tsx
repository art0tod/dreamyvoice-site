import Link from "next/link";
import { AuthForm } from "../auth-form";

export default function LoginPage() {
  return (
    <section>
      <h1>Вход</h1>
      <AuthForm mode="login" />
      <p>
        Нет аккаунта? <Link href="/register">Зарегистрируйтесь</Link>
      </p>
    </section>
  );
}
