import { AppError } from "@/lib/app-error";
import { getSessionUserEmail } from "@/lib/auth-session";

export async function getActorEmailFromRequest(_request: Request): Promise<string> {
  const email = await getSessionUserEmail();
  if (!email) {
    throw new AppError(401, "Unauthorized.");
  }
  return email;
}
