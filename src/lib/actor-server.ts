import { redirect } from "next/navigation";

import { getSessionUserEmail } from "@/lib/auth-session";

export async function getServerActorEmail(): Promise<string> {
  const email = await getSessionUserEmail();
  if (!email) {
    redirect("/login");
  }
  return email;
}
