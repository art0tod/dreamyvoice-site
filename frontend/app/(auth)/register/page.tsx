import Link from "next/link";
import { AuthForm } from "../auth-form";

export default function RegisterPage() {
  return (
    <section>
      <h1>Регистрация</h1>
      <AuthForm mode="register" />
      <p>
        Уже есть аккаунт? <Link href="/login">Войдите</Link>
      </p>
    </section>
  );
}
