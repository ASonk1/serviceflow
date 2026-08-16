import "server-only";

import { z } from "zod";

import { getPublicEnvironment } from "./public";

const serverEnvironmentSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
});

export type ServerEnvironment = ReturnType<typeof getServerEnvironment>;

export function getServerEnvironment() {
  const publicEnvironment = getPublicEnvironment();
  const result = serverEnvironmentSchema.safeParse({
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  });

  if (!result.success) {
    const names = result.error.issues
      .map((issue) => issue.path.join("."))
      .filter(Boolean)
      .join(", ");

    throw new Error(`Invalid server environment variables: ${names}`);
  }

  return { ...publicEnvironment, ...result.data };
}
