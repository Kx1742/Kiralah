type Method = "POST" | "PUT" | "DELETE";

/** Sends a change to the bill. Returns the error code on failure. */
export async function sendBillChange(
  path: string,
  method: Method,
  body: unknown,
  token: string | null,
): Promise<{ ok: true; data: unknown } | { ok: false; error: string }> {
  try {
    const response = await fetch(path, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    });
    if (response.ok) {
      return {
        ok: true,
        data: response.status === 204 ? null : await response.json(),
      };
    }
    const data = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    return { ok: false, error: data?.error ?? "generic" };
  } catch {
    return { ok: false, error: "generic" };
  }
}
