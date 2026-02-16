import { ZodError } from "zod";

export interface ApiErrorPayload {
  error: string;
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof ZodError) {
    return error.issues[0]?.message ?? "Invalid request body.";
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Unexpected error.";
}
