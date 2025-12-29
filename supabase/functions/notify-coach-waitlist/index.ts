// supabase/functions/notify-coach-waitlist/index.ts
//
// Sends an email when a new row is inserted into public.leads_coach_waitlist
// Expected caller: Postgres trigger via pg_net (net.http_post)
//
// Security model:
// - config.toml sets verify_jwt = false (public endpoint)
// - we still REQUIRE a shared secret header: x-webhook-secret
//   so random internet traffic can't send emails.

type DenoRuntime = {
  env: { get(name: string): string | undefined };
  serve: (handler: (req: Request) => Response | Promise<Response>) => void;
};

// Editor workaround: avoid direct references to `Deno` so TS doesn't underline it
// when Deno extension isn't active.
const deno = (globalThis as unknown as { Deno?: DenoRuntime }).Deno;

type WebhookPayload = {
  type?: string; // e.g. "INSERT"
  schema?: string; // e.g. "public"
  table?: string; // e.g. "leads_coach_waitlist"
  record?: Record<string, unknown> | null;
  old_record?: Record<string, unknown> | null;
};

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-webhook-secret",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

function getEnv(name: string): string | undefined {
  // Primary: Deno (Supabase Edge Functions)
  const v = deno?.env?.get?.(name);
  if (v !== undefined) return v;

  // Secondary fallback (helps local tooling/tests, if any)
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

function parseEmailList(input: string): string[] {
  const parts = input
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  // Deduplicate case-insensitively
  const seen = new Set<string>();
  const out: string[] = [];
  for (const e of parts) {
    const key = e.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(e);
  }
  return out;
}

function jsonResponse(body: unknown, status = 200, extraHeaders?: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...CORS_HEADERS,
      ...(extraHeaders || {}),
    },
  });
}

function textResponse(body: string, status = 200, extraHeaders?: Record<string, string>): Response {
  return new Response(body, {
    status,
    headers: {
      ...CORS_HEADERS,
      ...(extraHeaders || {}),
    },
  });
}

async function readJsonSafely(req: Request): Promise<unknown | null> {
  try {
    return await req.json();
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

/**
 * Extract a "record" from either:
 *  A) Standard webhook payload { type, schema, table, record }
 *  B) Direct record body (some people choose to POST row_to_json(NEW) only)
 */
function extractRecordAndMeta(body: unknown): {
  meta?: { type?: string; schema?: string; table?: string };
  record: Record<string, unknown> | null;
} {
  if (!body || typeof body !== "object") return { record: null };

  const maybePayload = body as WebhookPayload;

  // Standard webhook shape
  if (maybePayload.record && typeof maybePayload.record === "object") {
    return {
      meta: {
        type: maybePayload.type,
        schema: maybePayload.schema,
        table: maybePayload.table,
      },
      record: maybePayload.record as Record<string, unknown>,
    };
  }

  // Fallback: body itself is the record
  return { record: body as Record<string, unknown> };
}

function nowIso(): string {
  return new Date().toISOString();
}

function maskEmail(e: string): string {
  const s = e.trim();
  const at = s.indexOf("@");
  if (at <= 1) return "***";
  return `${s.slice(0, 1)}***${s.slice(at - 1)}`;
}

// If we're not actually running in Deno, don't register the handler.
if (!deno?.serve) {
  // This is mainly for local tooling/editor situations.
  console.error(
    "[notify-coach-waitlist] Deno runtime not detected (Deno.serve unavailable). " +
      "This function must run in Supabase Edge Functions (Deno).",
  );
} else {
  deno.serve(async (req) => {
    // CORS preflight
    if (req.method === "OPTIONS") return textResponse("", 204);

    // Health check (lets you verify deploy without sending email)
    // If you visit:
    //   https://<PROJECT_REF>.supabase.co/functions/v1/notify-coach-waitlist
    // you should see JSON, not 404.
    if (req.method === "GET") {
      return jsonResponse({
        ok: true,
        function: "notify-coach-waitlist",
        time: nowIso(),
        note:
          "GET is a health check only. POST requires x-webhook-secret and a JSON payload.",
      });
    }

    if (req.method !== "POST") {
      return textResponse("Method Not Allowed", 405);
    }

    const requestId =
      req.headers.get("x-request-id") ||
      req.headers.get("cf-ray") ||
      crypto.randomUUID();

    try {
      // Shared secret header (your pg_net trigger must send this)
      const sharedSecret = mustGetEnv("WAITLIST_WEBHOOK_SECRET");
      const incomingSecret = req.headers.get("x-webhook-secret");

      if (!incomingSecret || incomingSecret !== sharedSecret) {
        console.warn("[notify-coach-waitlist] Unauthorized", { requestId });
        return textResponse("Unauthorized", 401, { "X-Request-Id": requestId });
      }

      // Parse JSON
      const body = await readJsonSafely(req);
      if (!body) {
        console.warn("[notify-coach-waitlist] Invalid JSON", { requestId });
        return textResponse("Bad Request (invalid JSON)", 400, { "X-Request-Id": requestId });
      }

      const { meta, record } = extractRecordAndMeta(body);
      if (!record) {
        console.warn("[notify-coach-waitlist] Missing record", { requestId, meta });
        return textResponse("Bad Request (missing record)", 400, { "X-Request-Id": requestId });
      }

      // If meta exists, enforce that we only react to INSERT on the exact table.
      // (This prevents accidental trigger reuse across tables.)
      if (meta) {
        const t = (meta.type || "").toUpperCase();
        const s = (meta.schema || "").toLowerCase();
        const tb = (meta.table || "").toLowerCase();

        if (t && t !== "INSERT") return jsonResponse({ ok: true, ignored: "not INSERT" }, 202, { "X-Request-Id": requestId });
        if (s && s !== "public") return jsonResponse({ ok: true, ignored: "unexpected schema" }, 202, { "X-Request-Id": requestId });
        if (tb && tb !== "leads_coach_waitlist") {
          return jsonResponse({ ok: true, ignored: "unexpected table", table: tb }, 202, { "X-Request-Id": requestId });
        }
      }

      // Extract fields
      const email = asText(record.email).trim();
      if (!email) return textResponse("Bad Request (missing email)", 400, { "X-Request-Id": requestId });

      const name = asText(record.name).trim();
      const focus = asText(record.primary_focus).trim();
      const clientCount = asText(record.client_count).trim();
      const createdAt = asText(record.created_at).trim();
      const source = asText(record.source).trim();

      // Resend config
      const resendApiKey = mustGetEnv("RESEND_API_KEY");
      const fromEmail = mustGetEnv("WAITLIST_NOTIFY_FROM").trim();

      // Recipients (comma-separated supported)
      const to = parseEmailList(getEnv("WAITLIST_NOTIFY_TO") || "xuru@lungeable.com");
      const bcc = parseEmailList(getEnv("WAITLIST_NOTIFY_BCC") || "xrventuresllc@gmail.com");

      const subjectPrefix = (getEnv("WAITLIST_SUBJECT_PREFIX") || "").trim();
      const subjectBase = `New coach waitlist signup: ${email}`;
      const subject = subjectPrefix ? `${subjectPrefix} ${subjectBase}` : subjectBase;

      const text =
`New coach waitlist signup

Email: ${email}
Name: ${name || "(not provided)"}
Primary focus: ${focus || "(not provided)"}
Client count: ${clientCount || "(not provided)"}
Source: ${source || "(not provided)"}
Created at: ${createdAt || "(not provided)"}

Full record:
${JSON.stringify(record, null, 2)}
`;

      const html =
`<div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial;">
  <h2>New coach waitlist signup</h2>
  <ul>
    <li><b>Email:</b> ${email}</li>
    <li><b>Name:</b> ${name || "(not provided)"}</li>
    <li><b>Primary focus:</b> ${focus || "(not provided)"}</li>
    <li><b>Client count:</b> ${clientCount || "(not provided)"}</li>
    <li><b>Source:</b> ${source || "(not provided)"}</li>
    <li><b>Created at:</b> ${createdAt || "(not provided)"}</li>
  </ul>
  <h3>Full record</h3>
  <pre style="white-space: pre-wrap; background:#f6f6f6; padding:12px; border-radius:8px;">${asText(JSON.stringify(record, null, 2))}</pre>
</div>`;

      const resendBody: Record<string, unknown> = {
        from: fromEmail,
        to,
        subject,
        text,
        html,
      };
      if (bcc.length) resendBody.bcc = bcc;

      console.log("[notify-coach-waitlist] Sending email", {
        requestId,
        to,
        bccCount: bcc.length,
        email: maskEmail(email),
      });

      const r = await fetchWithTimeout(
        "https://api.resend.com/emails",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
            // Optional: some providers support idempotency keys; harmless if ignored.
            "Idempotency-Key": requestId,
          },
          body: JSON.stringify(resendBody),
        },
        12_000,
      );

      if (!r.ok) {
        const respText = await r.text().catch(() => "");
        console.error("[notify-coach-waitlist] Resend failed", {
          requestId,
          status: r.status,
          response: respText,
        });
        return jsonResponse(
          { ok: false, provider: "resend", status: r.status, response: respText },
          502,
          { "X-Request-Id": requestId },
        );
      }

      const respJson = await r.json().catch(() => ({}));
      console.log("[notify-coach-waitlist] Email sent", { requestId, resp: respJson });

      return jsonResponse({ ok: true, requestId, resend: respJson }, 200, { "X-Request-Id": requestId });
    } catch (e) {
      console.error("[notify-coach-waitlist] Internal error", { requestId, error: String(e) });
      return textResponse("Internal Server Error", 500, { "X-Request-Id": requestId });
    }
  });
}
