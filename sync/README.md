# 雲端同步 Worker（Turso proxy）

把讀寫進度存到你的 Turso 資料庫，並跨裝置同步。Turso 的 token 藏在 Worker（伺服器端機密），
**不會**出現在公開的前端網頁裡。

## ⚠️ 先做這件事
你先前貼在對話裡的 Turso token 已經外流，**請到 Turso 後台把它撤銷、重新產生一個**，
然後用「新的」token 設定下面的 secret。

```bash
turso db tokens revoke <舊token的id>     # 或在後台撤銷
turso db tokens create electronic         # 產生新的
```

## 部署（Cloudflare Workers，免費）

```bash
npm i -g wrangler
cd sync
wrangler login                            # 用你的 Cloudflare 帳號登入（免費註冊）
wrangler secret put TURSO_URL             # 貼： libsql://electronic-lin0603.aws-ap-northeast-1.turso.io
wrangler secret put TURSO_AUTH_TOKEN      # 貼：你「新產生」的 Turso token
wrangler deploy
```

部署完會得到一個網址，例如 `https://wiring-sync.<你的帳號>.workers.dev`。

## 在 App 裡啟用
1. 開 App → 🛠 工具 → **☁️ 雲端同步**。
2. 貼上剛剛的 Worker 網址。
3. 按「產生同步碼」會給你一組長亂數（這就是你資料的鑰匙，請自己記著）。
4. 按「立即上傳」。之後每次作答會自動存雲端。
5. 換手機時：填同一個 Worker 網址 + 同一組同步碼 → 按「從雲端下載」，進度就回來了。

## 資料表
Worker 第一次 save 會自動建表：

```sql
CREATE TABLE IF NOT EXISTS kv(k TEXT PRIMARY KEY, v TEXT, updated INTEGER);
```

`k` = 你的同步碼；`v` = 整包進度 JSON（含每題對錯、精熟度、每日錯題紀錄）；`updated` = 毫秒時間戳。

## 安全說明
- Turso token 只存在 Worker secret，不進 repo、不進前端。
- 每個人的資料躲在「不可猜的同步碼」後面；請把同步碼當密碼保管。
- 其他 serverless（Deno Deploy / Vercel / Netlify Functions）也能跑這段 `fetch` handler，稍改匯出格式即可。
