# 雲端同步（Turso）

進度與每日錯題存到你的 Turso 資料庫，跨裝置同步。

## 預設用法：前端直連 Turso（免部署，最簡單）

Turso 允許瀏覽器直接連（CORS 全開），所以不需要任何伺服器。

1. 開 App → 🛠 工具 → **☁️ 雲端同步**
2. 填 **Turso 資料庫網址**：`libsql://electronic-lin0603.aws-ap-northeast-1.turso.io`
3. 貼 **Turso Token**
4. 按「🔑 產生同步碼」→「💾 儲存」→「⬆️ 立即上傳」
5. 換手機時：填同一網址＋token＋**同一組同步碼** →「⬇️ 從雲端下載」

> URL / Token / 同步碼只存在**該裝置的瀏覽器 localStorage**，不會上傳、不進 repo、不在公開原始碼裡。
> 每台裝置各貼一次即可。

資料表（第一次上傳自動建立）：
```sql
CREATE TABLE IF NOT EXISTS kv(k TEXT PRIMARY KEY, v TEXT, updated INTEGER);
```
`k` = 同步碼；`v` = 整包進度 JSON（含每題對錯、精熟度、每日錯題）；`updated` = 毫秒時間戳。

## 選用：Worker proxy（想把 token 完全藏起來時）

直連模式下，token 存在你自己的瀏覽器，不會外流到公開網頁——對單人使用已足夠。
若你希望前端連 token 都碰不到（例如多人共用、或想公開分享 App），可改用 `worker.js`（Cloudflare Worker），
把 Turso token 放在 Worker secret，前端只跟 Worker 講話：

```bash
npm i -g wrangler
cd sync
wrangler login
wrangler secret put TURSO_URL
wrangler secret put TURSO_AUTH_TOKEN
wrangler deploy
```

（要走這條路的話再跟我說，我把前端切回呼叫 Worker 的版本。）
