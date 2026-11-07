import type { z } from "zod";
import { ActionError } from "./actionError";

const MAX_BODY_BYTES = 1_000_000;

export function bearerToken(request: Request): string | null {
  const header = request.headers.get("authorization") ?? "";
  return /^Bearer ([\w-]{20,100})$/.exec(header)?.[1] ?? null;
}

export async function readBody<Schema extends z.ZodType>(
  request: Request,
  schema: Schema,
): Promise<z.infer<Schema>> {
  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) throw new ActionError("invalid");
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new ActionError("invalid");
  }
  const parsed = schema.safeParse(json);
  if (!parsed.success) throw new ActionError("invalid");
  return parsed.data;
}

/** Turns expected failures into small JSON errors; anything else is a real 500. */
export async function handle(run: () => Promise<Response>): Promise<Response> {
  try {
    return await run();
  } catch (error) {
    if (error instanceof ActionError) {
      return Response.json({ error: error.code }, { status: error.status });
    }
    throw error;
  }
}
