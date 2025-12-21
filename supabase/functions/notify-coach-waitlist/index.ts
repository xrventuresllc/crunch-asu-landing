// supabase/functions/notify-coach-waitlist/index.ts
//
// Sends an email when a new row is inserted into public.leads_coach_waitlist
// Expected caller: Postgres trigger via pg_net (net.http_post)

/**
 * IMPORTANT (editor workaround):
 * VS Code/tsserver will underline `Deno` when the Deno extension isn't active for this file.
 * To avoid that entirely, we DO NOT reference the `Deno` symbol directly.
 * We access it via `globalThis` instead.
 */
type DenoRuntime = {
  env: { get(name: string): string | undefined };
  serve: (handler: (req: Request) => Response | Promise<Response>) => void;
};

const deno = (globalThis as unknown as { Deno?: DenoRuntime }).Deno;

type WebhookPayload = {
  type?: string; // e.g. "INSERT"
  schema?: string; // e.g. "public"
  table?: string; // e.g. "leads_coach_waitlist"
  record?: Record<string, unknown>;
  old_record?: Record<string, unknown>;
};

function getEnv(name: string): string | undefined {
  // Primary: Deno (Supabase Edge Functions)
  const v = deno?.env?.get?.(name);
  if (v !== undefined) return v;

  // Secondary fallback (helps local Node tooling/tests, if any)
  const p = (globalThis as unknown as { process?: { env?: Record<string, string | undefined> } }).process;
  return p?.env?.[name];
}

function mustGetEnv(name: string): string {
  const v = getEnv(name);
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

function asText(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function readJsonSafely(req: Request): Promise<WebhookPayload | null> {
  try {
    // pg_net typically sends application/json; still be defensive.
    // Some callers omit content-type; we still attempt req.json().
    return (await req.json()) as WebhookPayload;
  } catch {
    return null;
  }
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(t);
  }
}

// If we're not actually running in Deno, don't register the handler.
// (This avoids runtime crashes if some tool accidentally executes this file in Node.)
if (!deno?.serve) {
  console.error(
    "[notify-coach-waitlist] Deno runtime not detected (Deno.serve unavailable). " +
      "This function must run in Supabase Edge Functions (Deno).",
  );
} else {
  deno.serve(async (req) => {
    // DB trigger calls won't use CORS, but OPTIONS is harmless.
    if (req.method === "OPTIONS") return new Response(null, { status: 204 });

    if (req.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    try {
      // Defense-in-depth: shared secret header (set this in pg_net call)
      const sharedSecret = mustGetEnv("WAITLIST_WEBHOOK_SECRET");
      const incomingSecret = req.headers.get("x-webhook-secret");
      if (!incomingSecret || incomingSecret !== sharedSecret) {
        return new Response("Unauthorized", { status: 401 });
      }

      // Parse payload
      const payload = await readJsonSafely(req);
      if (!payload) return new Response("Bad Request (invalid JSON)", { status: 400 });

      // Validate the event is exactly what we expect (avoid accidental reuse / abuse)
      if ((payload.type || "").toUpperCase() !== "INSERT") {
        return new Response("Ignored (not INSERT)", { status: 202 });
      }
      if ((payload.schema || "").toLowerCase() !== "public") {
        return new Response("Ignored (unexpected schema)", { status: 202 });
      }
      if ((payload.table || "").toLowerCase() !== "leads_coach_waitlist") {
        return new Response("Ignored (unexpected table)", { status: 202 });
      }

      const record = payload.record;
      if (!record) return new Response("Bad Request (missing record)", { status: 400 });

      const email = asText(record.email).trim();
      if (!email) return new Response("Bad Request (missing email)", { status: 400 });

      const name = asText(record.name).trim();
      const focus = asText(record.primary_focus).trim();
      const clientCount = asText(record.client_count).trim();
      const createdAt = asText(record.created_at).trim();

      // Email provider config (Resend)
      const resendApiKey = mustGetEnv("RESEND_API_KEY");

      // Recipient (you)
      const toEmail = (getEnv("WAITLIST_NOTIFY_TO") || "xuru@lungeable.com").trim();

      // Sender (should be verified in Resend for best deliverability)
      const fromEmail = mustGetEnv("WAITLIST_NOTIFY_FROM").trim();

      const subject = `New coach waitlist signup: ${email}`;

      const text =
`New coach waitlist signup

Email: ${email}
Name: ${name || "(not provided)"}
Primary focus: ${focus || "(not provided)"}
Client count: ${clientCount || "(not provided)"}
Created at: ${createdAt || "(not provided)"}

Full record:
${JSON.stringify(record, null, 2)}
`;

      // Call Resend API
      const r = await fetchWithTimeout(
        "https://api.resend.com/emails",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: fromEmail,
            to: [toEmail],
            subject,
            text,
          }),
        },
        12_000, // 12s timeout
      );

      if (!r.ok) {
        const body = await r.text().catch(() => "");
        console.error("Resend failed", {
          status: r.status,
          body,
          email,
        });
        return new Response("Email provider error", { status: 502 });
      }

      return jsonResponse({ ok: true });
    } catch (e) {
      console.error("notify-coach-waitlist error", e);
      return new Response("Internal Server Error", { status: 500 });
    }
  });
}
