// Cloudflare Worker：室內配線刷題 App 的雲端同步 proxy
// 作用：把 Turso 的讀寫 token 藏在伺服器端(機密)，前端只跟本 Worker 講話，看不到 token。
//
// 需要兩個機密(用 wrangler secret put 設定，不要寫進程式)：
//   TURSO_URL        例：libsql://xxx.turso.io  或 https://xxx.turso.io
//   TURSO_AUTH_TOKEN Turso 的讀寫 token
//
// 前端呼叫：POST，body = { op:"load"|"save", key:"<你的同步碼>", state:{...} }
//   - key 是使用者端產生的長亂數，等於「那一列資料的鑰匙」；沒有它就讀不到那列。
//   - Turso token 只在 Worker 內，不外流。

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};
const j = (o, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { ...CORS, "Content-Type": "application/json" } });

export default {
  async fetch(req, env) {
    if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
    if (req.method !== "POST") return j({ error: "POST only" }, 405);

    let body;
    try { body = await req.json(); } catch { return j({ error: "bad json" }, 400); }
    const { op, key, state } = body || {};
    if (!key || typeof key !== "string" || key.length < 16) return j({ error: "bad key（同步碼太短）" }, 400);

    const base = env.TURSO_URL.replace(/^libsql:\/\//, "https://").replace(/\/$/, "");
    const run = async (sql, args = []) => {
      const r = await fetch(base + "/v2/pipeline", {
        method: "POST",
        headers: { Authorization: "Bearer " + env.TURSO_AUTH_TOKEN, "Content-Type": "application/json" },
        body: JSON.stringify({
          requests: [
            { type: "execute", stmt: { sql, args: args.map((v) => ({ type: "text", value: String(v) })) } },
            { type: "close" },
          ],
        }),
      });
      const d = await r.json();
      const res = d?.results?.[0];
      if (!r.ok || !res || res.type === "error") throw new Error(JSON.stringify(res?.error || d).slice(0, 300));
      return res.response.result;
    };

    try {
      await run("CREATE TABLE IF NOT EXISTS kv(k TEXT PRIMARY KEY, v TEXT, updated INTEGER)");
      if (op === "load") {
        const result = await run("SELECT v FROM kv WHERE k=?", [key]);
        const rows = result.rows || [];
        const v = rows.length ? rows[0][0].value : null;
        return j({ state: v ? JSON.parse(v) : null });
      }
      if (op === "save") {
        const now = Date.now();
        await run(
          "INSERT INTO kv(k,v,updated) VALUES(?,?,?) ON CONFLICT(k) DO UPDATE SET v=excluded.v, updated=excluded.updated",
          [key, JSON.stringify(state ?? {}), now]
        );
        return j({ ok: true, updated: now });
      }
      return j({ error: "bad op" }, 400);
    } catch (e) {
      return j({ error: String(e).slice(0, 300) }, 500);
    }
  },
};
