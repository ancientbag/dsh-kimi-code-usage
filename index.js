export const name = "kimi-coding-usage";
export const inject = ["connection"];

// Row config (cordis.patch.yml): apiKey, baseUrl, cacheSeconds.
// baseUrl defaults to the overseas Kimi Code endpoint; use
// https://api.kimi.com/coding for China accounts.
// Key precedence: config.apiKey, then the credential store / launch
// environment / .env fallbacks resolved as MOONSHOT_API_KEY.

const ROUTE_PATH = "/api/kimi.balance";
const KEY_REF = "MOONSHOT_API_KEY";
const DEFAULT_BASE_URL = "https://api.kimi.ai/coding";
const CN_BASE_URL = "https://api.kimi.com/coding";

function regionOf(url) {
  return url.includes("kimi.com") ? "cn" : "oversea";
}

export function apply(ctx, config = {}) {
  const baseUrl = String(config.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
  // Hard debounce: at most one upstream call per cacheSeconds, no matter
  // how often clients ask. Defaults to one request per minute.
  const cacheMs = Math.max(30, Number(config.cacheSeconds ?? 60)) * 1000;
  const configKey = String(config.apiKey ?? "");
  const credentials = ctx.get("credentials");

  let cache = { at: 0, key: null, payload: null };
  let profile = { at: 0, key: null, data: null };

  function json(data, status = 200) {
    return new Response(JSON.stringify(data), {
      status,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store",
      },
    });
  }

  async function resolveKey() {
    if (configKey) return { key: configKey, source: "config" };
    if (credentials) {
      const resolved = await credentials.resolve(KEY_REF).catch(() => undefined);
      if (resolved) return { key: resolved.value, source: resolved.source ?? "store" };
    }
    return { key: "", source: null };
  }

  async function keyStatus() {
    const { key, source } = await resolveKey();
    let writable = false;
    if (credentials) {
      const info = await credentials.describe(KEY_REF).catch(() => undefined);
      writable = info?.writable ?? false;
    }
    return { configured: Boolean(key), source, writable };
  }

  async function fetchJson(key, path) {
    const response = await fetch(`${baseUrl}${path}`, {
      headers: { authorization: `Bearer ${key}`, accept: "application/json" },
    });
    const body = await response.json().catch(() => null);
    if (!response.ok) {
      const message = String(body?.error?.message ?? body?.message ?? "");
      return { ok: false, status: response.status, message };
    }
    return { ok: true, body };
  }

  function parseWindow(entry) {
    if (!entry) return null;
    return {
      ratio: Number(entry.used_ratio ?? 0),
      reset: String(entry.reset_time ?? ""),
    };
  }

  function parseCounts(detail) {
    if (!detail) return null;
    return {
      limit: Number(detail.limit ?? 0),
      used: Number(detail.used ?? 0),
      remaining: Number(detail.remaining ?? 0),
      reset: String(detail.resetTime ?? ""),
    };
  }

  async function loadProfile(key) {
    const now = Date.now();
    if (profile.data && profile.key === key && now - profile.at < 3600000) return profile.data;
    const result = await fetchJson(key, "/v1/me");
    if (result.ok) {
      profile = {
        at: now,
        key,
        data: {
          nickname: String(result.body?.nickname ?? ""),
          level: String(result.body?.user_level_name ?? ""),
        },
      };
    }
    return profile.data;
  }

  async function loadUsage() {
    const { key } = await resolveKey();
    if (!key) return { ok: false, reason: "no-key" };
    const now = Date.now();
    if (cache.payload && cache.key === key && now - cache.at < cacheMs) return cache.payload;
    let payload;
    try {
      const result = await fetchJson(key, "/v1/usages");
      if (!result.ok) {
        payload = { ok: false, reason: "http", status: result.status, message: result.message };
      } else {
        const body = result.body ?? {};
        payload = {
          ok: true,
          h5: parseWindow(body?.usages?.limit_5h),
          d7: parseWindow(body?.usages?.limit_7d),
          h5Counts: parseCounts(body?.limits?.[0]?.detail),
          d7Counts: parseCounts(body?.usage),
          user: await loadProfile(key),
          raw: body,
        };
      }
    } catch (error) {
      payload = { ok: false, reason: "network", message: String(error?.message ?? error) };
    }
    cache = { at: now, key, payload };
    return payload;
  }

  async function saveSettings(request) {
    let body;
    try {
      body = await request.json();
    } catch {
      return json({ ok: false, reason: "bad-json" }, 400);
    }

    const nextBase = typeof body?.baseUrl === "string" ? body.baseUrl.trim().replace(/\/+$/, "") : "";
    if (nextBase && nextBase !== baseUrl) {
      const editor = ctx.get("configEditor");
      const entry = ctx.fiber?.entry;
      if (!editor || !entry) return json({ ok: false, reason: "no-config-editor" }, 501);
      try {
        await editor.edit(entry, (current) => ({ ...current, baseUrl: nextBase }));
      } catch (error) {
        return json({ ok: false, reason: "config-rejected", message: String(error?.message ?? error) }, 500);
      }
      // The config write restarts this plugin; the client refetches shortly.
      return json({ ok: true, restarting: true, region: regionOf(nextBase), baseUrl: nextBase, key: await keyStatus() });
    }

    if (!credentials) return json({ ok: false, reason: "no-store" }, 501);
    const value = String(body?.apiKey ?? "").trim();
    try {
      if (value) await credentials.set(KEY_REF, value);
      else await credentials.unset(KEY_REF);
    } catch (error) {
      return json({ ok: false, reason: "store-error", message: String(error?.message ?? error) }, 500);
    }
    cache = { at: 0, key: null, payload: null };
    profile = { at: 0, key: null, data: null };
    const payload = await loadUsage();
    return json({ ...payload, region: regionOf(baseUrl), baseUrl, key: await keyStatus(), updatedAt: new Date().toISOString() });
  }

  ctx.connection.fetch.register({
    path: ROUTE_PATH,
    methods: ["GET", "POST"],
    requestBody: "buffered",
    fetch: async (request) => {
      if (request.method === "POST") return saveSettings(request);
      const payload = await loadUsage();
      return json({ ...payload, region: regionOf(baseUrl), baseUrl, key: await keyStatus(), updatedAt: new Date().toISOString() });
    },
  });
}
