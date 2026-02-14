const DEFAULT_DEMO_USER_EMAIL = "owner@acme.example";

export function getActorEmailFromRequest(request: Request): string {
  const headerValue = request.headers.get("x-user-email");
  if (headerValue) {
    return headerValue.toLowerCase();
  }

  return (process.env.DEMO_USER_EMAIL ?? DEFAULT_DEMO_USER_EMAIL).toLowerCase();
}

export function getServerActorEmail(): string {
  return (process.env.DEMO_USER_EMAIL ?? DEFAULT_DEMO_USER_EMAIL).toLowerCase();
}
