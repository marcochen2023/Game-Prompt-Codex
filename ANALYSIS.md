# 專案檢查分析報告 — game-prompts（遊戲生成提示詞圖鑑）

> 檢查日期：2026-09-15 ｜ 對象：`github/game-prompts/`（GitHub 發布包）
> 驗證方式：PHP CLI 實跑建置管線、Node 語法檢查、PHP lint、成品 HTML 佔位符檢查

## 1. 結論

- **發布包可用**：PHP 與 Node 兩條建置管線各自獨立實跑，皆輸出 `items=100 missing=0`；重建後的 `index.html` 無殘留模板佔位符。
- **100 組資料完整**：`prompts/*.txt` 共 100 檔，與 `data_1..4.php` 內建 100 筆一一對應；分類統計加總 100（動作冒險 28、Roguelike・RPG 17、模擬經營 10、休閒・療癒 10、策略戰棋 9、敘事・解謎 9、競速・運動 7、恐怖・懸疑 6、音樂・節奏 4）。
- **全部 PHP 零語法錯誤**：`api/relay.php`、`api/save_prompt.php`、`api/delete_prompt.php`、`api/ping.php` 經 `php -l` 全過；`assets/app-gen.js`、`assets/i18n.js` 經 `node --check` 全過。
- **範例 JSON 有效**：`docs/example-novel.json` 經 `json_decode` 確認可解析，可直接上傳測試生成流程。

## 2. 驗證證據（實跑輸出）

```
items=100 missing=0            ← lib_catalog.php 直接呼叫 gp_collect_items()
items=100 missing=0            ← php _gen/build_index.php
NODE-APPGEN-OK                 ← node --check assets/app-gen.js
NODE-I18N-OK                   ← node --check assets/i18n.js
items=100 missing=0            ← node _gen/build_index.js
No syntax errors ...           ← 4 支 api/*.php 經 php -l
example-novel.json valid: YES  ← json_decode 確認
bytes=364709 / placeholders-replaced-YES / stat-block-YES  ← 重建後 index.html 檢查
```

## 3. 架構摘要

- **類型**：靜態站點＋可選 PHP 後端的混合式專案。`index.html` 是唯一使用者入口，由 `_gen/template.html`＋資料組出的產物（禁手改）。
- **資料流**：`data_1..4.php`（18 欄 × 100 筆）→ `prompts/*.txt`（`gen.php` 渲染 9 段）→ 合併 `_gen/custom.json` → 套 `template.html` → `index.html`。
- **生成流**：`app-gen.js` 的 `gpRun` 讀文檔／上傳 JSON → `gpExtractJsonText` 抽文字（略過 base64 圖）→ `gpPickRefs` 附 3 組參考（1 組必同類）→ `gpCallLLM` 直連優先、CORS 失敗降級 `api/relay.php?action=json` → `gpExtractJsonObject` 解析 → `gpBuildPrompt` 按 9 段模板組裝 → 預覽 → `api/save_prompt.php` 或本機下載。
- **邊界**：展示層（`template.html`／`index.html`／`i18n.js` 五語字典）、應用層（`app-gen.js` 601 行 11 區塊＋分類規則 `lib_catalog.php:gp_cat_of`）、持久層（`prompts/*.txt`、`custom.json`、localStorage 六組鍵）、橫切（slug 格式閘門、內建不可刪、中繼網域白名單 5 域、4 分鐘逾時）。

## 4. 發現的問題與處置

| # | 問題 | 嚴重度 | 處置 |
|---|------|--------|------|
| 1 | `_gen/build_index_legacy.php`（299 行）與 `_gen/build_index_new.php` 為已棄用殘留，舊 README 仍引用 `docs/omnicode/`（實際不存在） | 低 | 發布包已刪除兩檔；README 重寫時移除失效引用 |
| 2 | 根目錄 `_*check.cjs`、`_*mod.cjs`、`_e2e_shim.php` 等 10 個 dev-only stub，會污染 GitHub 倉庫 | 低 | 發布包未收錄，工作區原檔保留不動 |
| 3 | `_novel_out/`（30 章小說＋12 張圖）與 `docs/暮年化龍決.json`（12.7MB 含 base64）不屬於圖鑑本體，放進倉庫又肥又離題 | 低 | 發布包未收錄；另建 `docs/example-novel.json`（1.7KB 手寫範例）供上傳測試 |
| 4 | GitHub Pages 為純靜態，`api/*.php` 不執行 | 資訊 | README 五語皆載明等同「純前端模式」；`_gen/custom.json` 已入 `.gitignore`；附 `.nojekyll` 防 `_gen/` 被 Jekyll 忽略 |
| 5 | 日韓 README 初稿各 1 處筆誤（日：多餘 `(ms)`；韓：`全文` 未譯） | 低 | 已修正並重新確認 |

## 5. 未驗證事項（誠實聲明）

- **瀏覽器實際渲染**：未開預覽截圖，`index.html` 僅做靜態檢查（佔位符已替換、統計區塊存在）。建議 push 後開 Pages 連結目測一次。
- **LLM 真實呼叫**：未花費額度打真實 API；`gpBuildRequest` 四種格式（openai／anthropic／gemini／responses）僅經程式碼閱讀確認，未實測（Meta responses 串流格式原作者亦註明未實測）。
- **PHP 後端寫入路徑**：`save_prompt.php`／`delete_prompt.php` 的寫檔＋重建邏輯僅經閱讀確認，未在本機起 server 實測（無破壞性操作需求，故未測）。
- **授權**：`LICENSE` 採用 MIT（發布包新建），原工作區無授權聲明；若 100 組提示詞內容另有授權考量，請自行調整。

## 6. 發布包檔案清單

```
github/game-prompts/
├── .gitignore / .nojekyll / LICENSE
├── README.md（繁中主版）/ README.en.md / README.zh-CN.md / README.ja.md / README.ko.md
├── index.html（已重建，100 組內嵌）
├── api/（4 支：ping、relay、save_prompt、delete_prompt）
├── assets/（app-gen.js、i18n.js）
├── prompts/（100 個 .txt）
├── _gen/（template.html、data_1..4.php、lib_catalog.php、build_index.js/php、gen.php、custom.json=[]）
├── docs/example-novel.json（上傳測試用範例）
└── ANALYSIS.md（本檔案）
```

## 7. 上傳步驟

```bash
cd github/game-prompts
git init -b main
git add .
git commit -m "game-prompts: 100 game-generation prompts codex (5-language README)"
git remote add origin https://github.com/<帳號>/<倉庫>.git
git push -u origin main
```

推完到倉庫 Settings → Pages → Source 選 `Deploy from a branch`（`main`／`/ root`），數分鐘後即可用
`https://<帳號>.github.io/<倉庫>/` 開啟。
