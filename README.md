# 遊戲生成提示詞圖鑑 game-prompts

> 100 組「AI 遊戲生成提示詞」的靜態圖鑑，每組固定 9 段
> （概念圖 → 原型關卡 → 操作手感 → 經驗值 → 辨識配件 → 規則一 → 規則二 → 七區擴展 → 收藏系統），
> 可整份或逐段複製、下載純文字檔，並能用自己的遊戲文檔或小說專案 JSON 透過 LLM 生成新的一組。

🌐 [English](README.en.md) · [简体中文](README.zh-CN.md) · [日本語](README.ja.md) · [한국어](README.ko.md)

![遊戲生成提示詞圖鑑主視覺](images/Pages.jpg)

## 目錄

- [線上試用](#線上試用)
- [功能一覽](#功能一覽)
- [怎麼開](#怎麼開)
- [小說 JSON → 遊戲提示詞](#小說-json--遊戲提示詞)
- [用自己的文檔生成新提示詞](#用自己的文檔生成新提示詞)
- [模型與 Key 設定](#模型與-key-設定)
- [專案結構](#專案結構)
- [改了模板或資料之後重建](#改了模板或資料之後重建)
- [分類一覽](#分類一覽)
- [部署到 GitHub Pages](#部署到-github-pages)
- [授權](#授權)

## 線上試用

- 直接開啟 `index.html` 即可瀏覽（純前端模式，免安裝）。
- 部署到 GitHub Pages 後，別人點連結就能用（同樣是純前端模式）。

## 功能一覽

- **搜尋**：多個關鍵字用空格分隔（AND），會搜到全文；結果高亮。`/` 或 `Ctrl+K` 聚焦搜尋。
- **篩選／排序／檢視**：分類 chips、收藏 chip、排序下拉（也可點表頭）、表格／卡片切換（手機自動用卡片）。
- **抽屜**：分段檢視（每段可單獨複製、勾選「已貼上」追蹤進度）／原文檢視；`←` `→` 切換上一組／下一組、`c` 複製全文、`f` 收藏。
- **可分享網址**：`#cat=分類&q=關鍵字&p=slug`，重新整理或貼給別人都會還原同樣的畫面。
- **主題**：深色／淺色，預設跟隨系統，右上角 🌙／☀️ 切換。
- **介面語言**：繁體中文／English／简体中文／日本語／한국어，右上角下拉切換，預設跟隨瀏覽器語言並記在本機。只翻譯介面與分類顯示名稱；100 組提示詞內容、slug 與分類鍵值維持原樣，網址 `#cat=` 也用原鍵值，換語言不會壞掉連結。
- **輸入文檔生成**：貼上設計文檔（或上傳 JSON，如 `docs/example-novel.json`），選模型 → 產生 9 段 → **預覽並可修改** → 儲存到圖鑑。表單會自動存草稿；生成中可中止；4 分鐘沒回應自動逾時。
- **模型／Key 設定**：多供應商（OpenRouter、OpenAI、Anthropic、Gemini、Meta、自訂 OpenAI 相容端點）。Key 只存瀏覽器 localStorage，鍵名與 Omni Code 共用。
- **資料管理**：列出／刪除自訂條目、匯出匯入自訂條目 JSON、匯出目前篩選結果為 Markdown、匯出全部圖鑑 JSON、清除進度與收藏。

## 怎麼開

| 方式 | 能做什麼 |
| --- | --- |
| 直接雙擊 `index.html`（file://）或 GitHub Pages | 瀏覽、搜尋、收藏、複製、下載；LLM 生成結果存在瀏覽器並自動下載 `.txt` |
| XAMPP／Apache + PHP 開啟 | 以上全部，加上：生成結果真正寫入 `prompts/*.txt`、刪除自訂條目、瀏覽器直連被擋時由本機 `api/relay.php` 轉送 |

## 小說 JSON → 遊戲提示詞

想把自己寫的小說世界觀變成遊戲企劃嗎？流程分三步：

1. **生成小說**：到 [omnipd.cloud/app](https://omnipd.cloud/app) 註冊帳號，用它生成一本完整故事小說（角色、世界觀、章節大綱都會幫你建好）。
2. **匯出 JSON**：在 omnipd 把小說專案匯出成 JSON 檔（內含故事、角色設定、章節等文字欄位）。
3. **轉成遊戲提示詞**：回到本圖鑑，點「生成」→ 上傳剛才的 JSON 檔（可參考 `docs/example-novel.json` 的格式）→ 選模型 → 產生 9 段遊戲製作提示詞 → 預覽修改 → 儲存。

原理：上傳的 JSON 會先經過文字抽取（只取文字欄位，自動略過 base64 圖片；見 `assets/app-gen.js` 的 `gpExtractJsonText`），
再附上 3 組同類型參考範例（其中 1 組必為同類別，`gpPickRefs`）一起送給 LLM ，
LLM 回傳的欄位再由 `gpBuildPrompt` 按 9 段模板組裝成全文，格式由程式保證。

## 用自己的文檔生成新提示詞

1. 點「生成」，貼上遊戲設計文檔（玩法、角色、世界觀……寫得越具體越好），或直接上傳 JSON。
2. 選模型（第一次用要先到 Key 設定填 API Key）。
3. 按生成 → 等 LLM 回傳 → 在預覽頁修改標題、分類、各欄位與全文。
4. 按儲存：有 PHP 後端就寫入 `prompts/<slug>.txt` 並重建圖鑑；純前端模式則存瀏覽器＋自動下載 `.txt`。

## 模型與 Key 設定

- 支援 OpenRouter、OpenAI、Anthropic、Gemini、Meta AI，以及自訂 OpenAI 相容端點。
- Key 只存在你自己瀏覽器的 localStorage，不會上傳到任何伺服器（鍵名與 Omni Code 共用，兩邊填一次就好）。
- 前端優先直連供應商；直連被瀏覽器 CORS 擋下時，有 PHP 後端會自動改走 `api/relay.php` 轉送（白名單四家供應商＋Meta 網域，Key 不落地）。

## 專案結構

```
index.html            產物：由 _gen/template.html + 資料組出來，不要手改
assets/app-gen.js     LLM 生成、模型／Key 設定、資料管理（依賴頁內 window.GP）
assets/i18n.js        五語系介面字典（dict）＋分類顯示名稱（cats）；新增語言＝加一個 langs 項目與同鍵集的 dict
prompts/*.txt         100 組原文，檔名＝slug
docs/example-novel.json  小說 JSON 範例（可直接上傳測試生成流程）
api/ping.php          後端偵測
api/relay.php         AI 中繼（白名單供應商網域；Key 不落地）
api/save_prompt.php   寫入 prompts/<slug>.txt + _gen/custom.json，重建 index.html
api/delete_prompt.php 只刪 custom.json 內的條目，重建 index.html
_gen/template.html    頁面模板（設計系統＋主程式）
_gen/data_1..4.php    100 組內建資料（每筆 18 欄）
_gen/lib_catalog.php  PHP 版：合併內建＋自訂並套模板
_gen/build_index.js   Node 版：與 lib_catalog.php 等價，沒有 PHP 時用
_gen/build_index.php  PHP CLI 重建入口
_gen/custom.json      自訂條目清單（後端模式；已加入 .gitignore）
_gen/gen.php          由 data_*.php 重新產生 prompts/*.txt
```

## 改了模板或資料之後重建

```bash
node _gen/build_index.js
```

或有 PHP 時：

```bash
php _gen/build_index.php
```

兩者輸出一致（內建 100 組 + `_gen/custom.json`）。`index.html` 引用的 `assets/*.js` 會帶內容雜湊做 cache-busting，改了 JS 也要重建。若重新調整了 `data_*.php` 的內容，先 `php _gen/gen.php` 重產 `prompts/*.txt` 再重建。

![九大分類代表作九宮格](images/3X3.jpg)

## 分類一覽

| 分類 | 數量 |
| --- | --- |
| 動作冒險 | 28 |
| Roguelike・RPG | 17 |
| 模擬經營 | 10 |
| 休閒・療癒 | 10 |
| 策略戰棋 | 9 |
| 敘事・解謎 | 9 |
| 競速・運動 | 7 |
| 恐怖・懸疑 | 6 |
| 音樂・節奏 | 4 |
| **合計** | **100** |

## 部署到 GitHub Pages

1. 把本目錄推到 GitHub 倉庫。
2. 倉庫 Settings → Pages → Source 選 `Deploy from a branch`，分支選 `main`、目錄 `/ (root)`。
3. 等幾分鐘，`https://<帳號>.github.io/<倉庫>/` 就能開啟圖鑑。
4. 注意：GitHub Pages 是純靜態空間，`api/*.php` 不會執行——等同上表的「純前端模式」：瀏覽、搜尋、生成（直連 LLM）、下載都正常；自訂條目存在瀏覽器 localStorage，不會寫回倉庫。`_gen/custom.json` 已加入 `.gitignore`，不會誤推個人資料。

## 授權

MIT License，見 [LICENSE](LICENSE)。
