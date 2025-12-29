/* eslint-disable import/no-unresolved */
/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-explicit-any */

// supabase/functions/coach-waitlist-signup/index.ts
//
// Public signup endpoint for the coach waitlist.
// Browser calls this function; function inserts into public.leads_coach_waitlist
// using the SERVICE ROLE key (server-side only).
//
// Security model:
// - config.toml sets verify_jwt = false
// - CORS restricts allowed origins (browser protection)
// - Honeypot field drops obvious bots
// - Optional Cloudflare Turnstile verification (recommended once you have traffic)
// - Optional DB-backed rate limiting via RPC waitlist_rate_limit_allow()
//
// Required env in Supabase Edge Functions (usually present automatically):
// - SUPABASE_URL
// - SUPABASE_SERVICE_ROLE_KEY
//
// Optional env (set via `npx supabase secrets set ...`):
// - TURNSTILE_SECRET_KEY
//
// NOTE: This file intentionally avoids direct references to the `Deno` global
// so TS/VSCode doesn't underline it when the Deno extension isn't active.

type DenoRuntime = {
  env: { get(name: string): string | undefined };
  serve: (handler: (req: Request) => Response | Promise<Response>) => void;
};

const deno = (globalThis as unknown as { Deno?: DenoRuntime }).Deno;

type SignupBody = {
  email?: string;
  name?: string | null;
  primary_focus?: string | null;
  client_count?: string | null;
  coach_intents?: string[];
  presence?: string | null;
  notes?: string | null;
  source?: string;
  site_version?: string;
  utm?: unknown;
  user_agent?: string | null;
  referer?: string | null;

  // Anti-spam:
  company?: string; // honeypot (should be empty)
  turnstileToken?: string; // Cloudflare Turnstile token
};

const ALLOWED_ORIGINS = new Set<string>([
  "https://lungeable.com",
  "https://www.lungeable.com",
  "http://localhost:5173",
]);

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

function isAllowedOrigin(origin?: string): origin is string {
  return !!origin && ALLOWED_ORIGINS.has(origin);
}

function json(body: unknown, status = 200, origin?: string): Response {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  // Only reflect allowed origins (don’t leak CORS to random sites)
  if (isAllowedOrigin(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Vary"] = "Origin";
  }

  return new Response(JSON.stringify(body), { status, headers });
}

function text(body: string, status = 200, origin?: string): Response {
  const headers: Record<string, string> = {};

  if (isAllowedOrigin(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Vary"] = "Origin";
  }

  return new Response(body, { status, headers });
}

function corsPreflight(origin?: string): Response {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "POST,OPTIONS",
    "Access-Control-Allow-Headers": "content-type, authorization, apikey, x-client-info",
    "Access-Control-Max-Age": "86400",
  };

  if (isAllowedOrigin(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Vary"] = "Origin";
  }

  return new Response(null, { status: 204, headers });
}

function getClientIp(headers: Headers): string | null {
  // Best-effort. Different CDNs use different headers.
  const xff = headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();

  const real = headers.get("x-real-ip");
  if (real) return real.trim();

  const cf = headers.get("cf-connecting-ip");
  if (cf) return cf.trim();

  return null;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Cache the createClient function (dynamic import avoids local TS “URL import” issues)
let _createClient: null | ((...args: any[]) => any) = null;

async function getCreateClient(): Promise<(...args: any[]) => any> {
  if (_createClient) return _createClient;

  // @ts-ignore - Deno URL imports are valid in Supabase Edge Functions; VS Code TS can't resolve them locally.
  const mod = await import("https://esm.sh/@supabase/supabase-js@2");

  _createClient = (mod as any).createClient;
  return _createClient!;
}

if (!deno?.serve) {
  console.error(
    "[coach-waitlist-signup] Deno runtime not detected (Deno.serve unavailable). " +
      "This function must run in Supabase Edge Functions (Deno).",
  );
} else {
  deno.serve(async (req) => {
    const origin = req.headers.get("origin") ?? undefined;

    // CORS preflight
    if (req.method === "OPTIONS") {
      return corsPreflight(origin);
    }

    if (req.method !== "POST") {
      return text("Method Not Allowed", 405, origin);
    }

    // Browser-origin restriction (helps prevent other websites from using your endpoint in-browser)
    if (origin && !isAllowedOrigin(origin)) {
      return text("Forbidden", 403);
    }

    // Parse JSON
    let body: SignupBody | null = null;
    try {
      body = (await req.json()) as SignupBody;
    } catch {
      return json({ ok: false, error: "invalid_json" }, 400, origin);
    }

    // Honeypot: if filled, pretend success but do nothing
    if ((body.company ?? "").trim().length > 0) {
      return json({ ok: true, dropped: true }, 200, origin);
    }

    const email = (body.email ?? "").trim().toLowerCase();
    if (!email || !isValidEmail(email)) {
      return json({ ok: false, error: "invalid_email" }, 400, origin);
    }

    // ---- Turnstile verification (optional but recommended) ----
    // If TURNSTILE_SECRET_KEY is set, we require a token and verify it.
    const turnstileSecret = getEnv("TURNSTILE_SECRET_KEY");
    if (turnstileSecret) {
      const token = (body.turnstileToken ?? "").trim();
      if (!token) {
        return json({ ok: false, error: "missing_turnstile_token" }, 400, origin);
      }

      const ip = getClientIp(req.headers);
      const form = new FormData();
      form.append("secret", turnstileSecret);
      form.append("response", token);
      if (ip) form.append("remoteip", ip);

      const resp = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
        method: "POST",
        body: form,
      });

      const result = (await resp.json().catch(() => null)) as
        | { success?: boolean; ["error-codes"]?: string[] }
        | null;

      if (!result?.success) {
        return json(
          { ok: false, error: "turnstile_failed", details: result?.["error-codes"] ?? [] },
          400,
          origin,
        );
      }
    }

    // Create admin client using service role (server-side only!)
    const supabaseUrl = mustGetEnv("SUPABASE_URL");
    const serviceKey = mustGetEnv("SUPABASE_SERVICE_ROLE_KEY");
    const createClient = await getCreateClient();
    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    // ---- Rate limit (optional) ----
    // Requires you to create the RPC function waitlist_rate_limit_allow in SQL.
    // Fail-open: if rate limit infra fails, we do NOT block legit signups.
    const ip = getClientIp(req.headers);
    if (ip) {
      try {
        const key = `coach_waitlist:${ip}`;
        const { data: rl, error: rlErr } = await admin.rpc("waitlist_rate_limit_allow", {
          p_key: key,
          p_limit: 10,
          p_window_seconds: 3600,
        });

        if (!rlErr) {
          const row = Array.isArray(rl) ? rl[0] : rl;
          if (row && row.allowed === false) {
            return json({ ok: false, error: "rate_limited", reset_at: row.reset_at }, 429, origin);
          }
        }
      } catch (e) {
        console.error("[coach-waitlist-signup] rate limit check failed (fail-open)", e);
      }
    }

    // Insert (service role bypasses RLS)
    const payload = {
      email,
      name: body.name ?? null,
      primary_focus: body.primary_focus ?? null,
      client_count: body.client_count ?? null,
      coach_intents: Array.isArray(body.coach_intents) ? body.coach_intents : [],
      presence: body.presence ?? null,
      notes: body.notes ?? null,
      source: body.source ?? "coach-landing",
      site_version: body.site_version ?? null,
      utm: body.utm ?? {},
      user_agent: body.user_agent ?? req.headers.get("user-agent"),
      referer: body.referer ?? req.headers.get("referer"),
    };

    const { error: insErr } = await admin.from("leads_coach_waitlist").insert(payload);

    // If email already exists, treat as soft success
    if (insErr?.code === "23505") {
      return json({ ok: true, alreadyOnList: true }, 200, origin);
    }

    if (insErr) {
      console.error("[coach-waitlist-signup] insert error", insErr);
      return json({ ok: false, error: "db_insert_failed" }, 500, origin);
    }

    return json({ ok: true, alreadyOnList: false }, 200, origin);
  });
}
