import { redirect } from "next/navigation";

import { LoginForm } from "@/components/login-form";
import { getSessionUserEmail } from "@/lib/auth-session";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const existingEmail = await getSessionUserEmail();
  if (existingEmail) {
    redirect("/");
  }

  return (
    <main className="page stack">
      <section className="card stack">
        <h1 style={{ margin: 0 }}>Sign in</h1>
        <p className="muted" style={{ margin: 0 }}>
          Sign in with your Supabase Auth user. Access is authorized via tenant memberships.
        </p>
        <LoginForm />
      </section>
    </main>
  );
}
