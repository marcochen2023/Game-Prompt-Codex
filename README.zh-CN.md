# 游戏生成提示词图鉴 game-prompts

> 100 组「AI 游戏生成提示词」的静态图鉴，每组固定 9 段
> （概念图 → 原型关卡 → 操作手感 → 经验值 → 辨识配件 → 规则一 → 规则二 → 七区扩展 → 收藏系统），
> 可整份或逐段复制、下载纯文本文件，并能用自己的游戏文档或小说项目 JSON 通过 LLM 生成新的一组。

🌐 [繁體中文](README.md) · [English](README.en.md) · [日本語](README.ja.md) · [한국어](README.ko.md)

![游戏生成提示词图鉴主视觉](images/Pages.jpg)

## 目录

- [在线试用](#在线试用)
- [功能一览](#功能一览)
- [打开方式](#打开方式)
- [小说 JSON → 游戏提示词](#小说-json--游戏提示词)
- [用自己的文档生成新提示词](#用自己的文档生成新提示词)
- [模型与 Key 设置](#模型与-key-设置)
- [项目结构](#项目结构)
- [改了模板或数据之后重建](#改了模板或数据之后重建)
- [分类一览](#分类一览)
- [部署到 GitHub Pages](#部署到-github-pages)
- [授权](#授权)

## 在线试用

- 直接打开 `index.html` 即可浏览（纯前端模式，免安装）。
- 部署到 GitHub Pages 后，别人点链接就能用（同样是纯前端模式）。

## 功能一览

- **搜索**：多个关键字用空格分隔（AND），会搜到全文；结果高亮。`/` 或 `Ctrl+K` 聚焦搜索。
- **筛选／排序／检视**：分类 chips、收藏 chip、排序下拉（也可点表头）、表格／卡片切换（手机自动用卡片）。
- **抽屉**：分段检视（每段可单独复制、勾选「已粘贴」跟踪进度）／原文检视；`←` `→` 切换上一组／下一组、`c` 复制全文、`f` 收藏。
- **可分享网址**：`#cat=分类&q=关键字&p=slug`，刷新或贴给别人都会还原同样的画面。
- **主题**：深色／浅色，默认跟随系统，右上角 🌙／☀️ 切换。
- **界面语言**：繁体中文／English／简体中文／日本語／한국어，右上角下拉切换，默认跟随浏览器语言并记在本地。只翻译界面与分类显示名称；100 组提示词内容、slug 与分类键值维持原样，网址 `#cat=` 也用原键值，换语言不会坏掉链接。
- **输入文档生成**：粘贴设计文档（或上传 JSON，如 `docs/example-novel.json`），选模型 → 产生 9 段 → **预览并可修改** → 保存到图鉴。表单会自动存草稿；生成中可中止；4 分钟没回应自动超时。
- **模型／Key 设置**：多供应商（OpenRouter、OpenAI、Anthropic、Gemini、Meta、自定 OpenAI 兼容端点）。Key 只存浏览器 localStorage，键名与 Omni Code 共用。
- **数据管理**：列出／删除自定条目、导出导入自定条目 JSON、导出当前筛选结果为 Markdown、导出全部图鉴 JSON、清除进度与收藏。

## 打开方式

| 方式 | 能做什么 |
| --- | --- |
| 直接双击 `index.html`（file://）或 GitHub Pages | 浏览、搜索、收藏、复制、下载；LLM 生成结果存在浏览器并自动下载 `.txt` |
| XAMPP／Apache + PHP 打开 | 以上全部，加上：生成结果真正写入 `prompts/*.txt`、删除自定条目、浏览器直连被挡时由本机 `api/relay.php` 转送 |

## 小说 JSON → 游戏提示词

想把自己写的小说世界观变成游戏企划吗？流程分三步：

1. **生成小说**：到 [omnipd.cloud/app](https://omnipd.cloud/app) 注册账号，用它生成一本完整故事小说（角色、世界观、章节大纲都会帮你建好）。
2. **导出 JSON**：在 omnipd 把小说项目导出成 JSON 文件（内含故事、角色设定、章节等文字字段）。
3. **转成游戏提示词**：回到本图鉴，点「生成」→ 上传刚才的 JSON 文件（可参考 `docs/example-novel.json` 的格式）→ 选模型 → 产生 9 段游戏制作提示词 → 预览修改 → 保存。

原理：上传的 JSON 会先经过文本抽取（只取文本字段，自动略过 base64 图片；见 `assets/app-gen.js` 的 `gpExtractJsonText`），
再附上 3 组同类型参考范例（其中 1 组必为同类别，`gpPickRefs`）一起送给 LLM，
LLM 返回的字段再由 `gpBuildPrompt` 按 9 段模板组装成全文，格式由程序保证。

## 用自己的文档生成新提示词

1. 点「生成」，粘贴游戏设计文档（玩法、角色、世界观……写得越具体越好），或直接上传 JSON。
2. 选模型（第一次用要先到 Key 设置填 API Key）。
3. 按生成 → 等 LLM 返回 → 在预览页修改标题、分类、各字段与全文。
4. 按保存：有 PHP 后端就写入 `prompts/<slug>.txt` 并重建图鉴；纯前端模式则存浏览器＋自动下载 `.txt`。

## 模型与 Key 设置

- 支持 OpenRouter、OpenAI、Anthropic、Gemini、Meta AI，以及自定 OpenAI 兼容端点。
- Key 只存在你自己浏览器的 localStorage，不会上传到任何服务器（键名与 Omni Code 共用，两边填一次就好）。
- 前端优先直连供应商；直连被浏览器 CORS 挡下时，有 PHP 后端会自动改走 `api/relay.php` 转送（白名单供应商域名，Key 不落地）。

## 项目结构

```
index.html            产物：由 _gen/template.html + 数据组出来，不要手改
assets/app-gen.js     LLM 生成、模型／Key 设置、数据管理（依赖页内 window.GP）
assets/i18n.js        五语系界面字典（dict）＋分类显示名称（cats）；新增语言＝加一个 langs 项目与同键集的 dict
prompts/*.txt         100 组原文，文件名＝slug
docs/example-novel.json  小说 JSON 范例（可直接上传测试生成流程）
api/ping.php          后端侦测
api/relay.php         AI 中继（白名单供应商域名；Key 不落地）
api/save_prompt.php   写入 prompts/<slug>.txt + _gen/custom.json，重建 index.html
api/delete_prompt.php 只删 custom.json 内的条目，重建 index.html
_gen/template.html    页面模板（设计系统＋主程序）
_gen/data_1..4.php    100 组内置数据（每笔 18 栏）
_gen/lib_catalog.php  PHP 版：合并内置＋自定并套模板
_gen/build_index.js   Node 版：与 lib_catalog.php 等价，没有 PHP 时用
_gen/build_index.php  PHP CLI 重建入口
_gen/custom.json      自定条目清单（后端模式；已加入 .gitignore）
_gen/gen.php          由 data_*.php 重新产生 prompts/*.txt
```

## 改了模板或数据之后重建

```bash
node _gen/build_index.js
```

或有 PHP 时：

```bash
php _gen/build_index.php
```

两者输出一致（内置 100 组 + `_gen/custom.json`）。`index.html` 引用的 `assets/*.js` 会带内容哈希做 cache-busting，改了 JS 也要重建。若重新调整了 `data_*.php` 的内容，先 `php _gen/gen.php` 重产 `prompts/*.txt` 再重建。

![九大分类代表作九宫格](images/3X3.jpg)

## 分类一览

| 分类 | 数量 |
| --- | --- |
| 动作冒险 | 28 |
| Roguelike・RPG | 17 |
| 模拟经营 | 10 |
| 休闲・疗愈 | 10 |
| 策略战棋 | 9 |
| 叙事・解谜 | 9 |
| 竞速・运动 | 7 |
| 恐怖・悬疑 | 6 |
| 音乐・节奏 | 4 |
| **合计** | **100** |

## 部署到 GitHub Pages

1. 把本目录推到 GitHub 仓库。
2. 仓库 Settings → Pages → Source 选 `Deploy from a branch`，分支选 `main`、目录 `/ (root)`。
3. 等几分钟，`https://<账号>.github.io/<仓库>/` 就能打开图鉴。
4. 注意：GitHub Pages 是纯静态空间，`api/*.php` 不会执行——等同上表的「纯前端模式」：浏览、搜索、生成（直连 LLM）、下载都正常；自定条目存在浏览器 localStorage，不会写回仓库。`_gen/custom.json` 已加入 `.gitignore`，不会误推个人数据。

## 授权

MIT License，见 [LICENSE](LICENSE)。
