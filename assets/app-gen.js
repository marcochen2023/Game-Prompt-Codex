'use strict';
/* ═════════════════════════════════════════════════════════════
   game-prompts — 輸入文檔生成 + LLM 串接（移植自 docs/omnicode）
   ─────────────────────────────────────────────────────────────
   依賴：index.html 內建的 window.GP（資料、抽屜、toast、confirm、modal、i18n）。
   區塊：1 供應商/模型  2 Key  3 模型清單  4 後端偵測  5 API 層
         6 文件抽取/參考抽選/全文組裝  7 生成流程  8 模型 Modal
         9 Key Modal  10 資料管理 + 本機自訂條目  11 語言切換
   外部串接（不可改語意）：
   - localStorage 鍵名 oc_*_key 與 Omni Code 共用；gp_text_models／gp_custom_items 沿用舊版
   - api/ping.php、api/relay.php?action=json、api/save_prompt.php、api/delete_prompt.php
   ═════════════════════════════════════════════════════════════ */
// 整支包在 IIFE 裡：index.html 的主程式已在全域宣告 const $ / esc 等，
// 同名頂層 const 會讓整支檔案 SyntaxError；對外只掛 window.GPGen。
(function(){

/* ═══ 1. 供應商 / 內建模型 ═══ */
const GP_PROVIDERS = {
  openrouter: { label: 'OpenRouter', keyName: 'oc_openrouter_key',
    keyUrl: 'https://openrouter.ai/keys', keyUrlText: 'openrouter.ai/keys',
    keyPlaceholder: 'sk-or-v1-...',
    format: 'openai', endpoint: () => 'https://openrouter.ai/api/v1/chat/completions' },
  openai: { label: 'OpenAI ChatGPT', keyName: 'oc_openai_key',
    keyUrl: 'https://platform.openai.com/api-keys', keyUrlText: 'platform.openai.com/api-keys',
    keyPlaceholder: 'sk-proj-...',
    format: 'openai', endpoint: () => 'https://api.openai.com/v1/chat/completions' },
  anthropic: { label: 'Anthropic Claude', keyName: 'oc_anthropic_key',
    keyUrl: 'https://console.anthropic.com/settings/keys', keyUrlText: 'console.anthropic.com',
    keyPlaceholder: 'sk-ant-...',
    format: 'anthropic', endpoint: () => 'https://api.anthropic.com/v1/messages', apiVersion: '2023-06-01' },
  gemini: { label: 'Google Gemini', keyName: 'oc_gemini_key',
    keyUrl: 'https://aistudio.google.com/app/apikey', keyUrlText: 'aistudio.google.com',
    keyPlaceholder: 'AIzaSy...',
    format: 'gemini', endpoint: (m) => `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent` },
  custom: { label: null /* i18n prov.custom */, keyName: 'gp_custom_key',
    keyUrl: '', keyUrlText: '', keyPlaceholder: null /* i18n prov.ph.custom */,
    format: 'openai', endpoint: null },
  meta: { label: 'Meta AI', keyName: 'oc_meta_key',
    keyUrl: 'https://ai.meta.com/', keyUrlText: 'ai.meta.com',
    keyPlaceholder: 'sk-meta-...',
    format: 'responses', endpoint: () => 'https://api.meta.ai/v1/responses', supportsStream: false },
};
const GP_BUILTIN_MODELS = [
  { id: 'anthropic/claude-sonnet-4-5', displayName: 'Claude Sonnet 4.5 (OR)', provider: 'openrouter' },
  { id: 'openai/gpt-5-mini', displayName: 'GPT-5 Mini (OR)', provider: 'openrouter' },
  { id: 'google/gemini-2.5-flash', displayName: 'Gemini 2.5 Flash (OR)', provider: 'openrouter' },
  { id: 'claude-sonnet-4-5', displayName: 'Claude Sonnet 4.5 (direct)', provider: 'anthropic' },
  { id: 'gpt-5-mini', displayName: 'GPT-5 Mini (direct)', provider: 'openai' },
  { id: 'gemini-2.5-flash', displayName: 'Gemini 2.5 Flash (direct)', provider: 'gemini' },
  { id: 'muse-spark-1.2-contributor', displayName: 'Muse Spark 1.2', provider: 'meta' },
  { id: 'muse-spark-1.3-contributor', displayName: 'Muse Spark 1.3', provider: 'meta' },
];
const GP_MODEL_LS = 'gp_text_models';
const GP_CUSTOM_LS = 'gp_custom_items';
const GP_DRAFT_LS = 'gp_gen_draft';
const GP_LAST_MODEL_LS = 'gp_last_model';
const GP_TIMEOUT_MS = 240000;
const GP_CATS_FALLBACK = ['Roguelike・RPG', '休閒・療癒', '動作冒險', '恐怖・懸疑', '敘事・解謎', '模擬經營', '競速・運動', '策略戰棋', '音樂・節奏'];
const $ = id => document.getElementById(id);
const esc = GP.esc, t = GP.t;
const provLabel = pid => GP_PROVIDERS[pid]?.label || (pid === 'custom' ? t('prov.custom') : pid);

/* ═══ 2. Key 存取（鍵名與 Omni Code 共用）═══ */
function gpGetKey(provider){ const p = GP_PROVIDERS[provider]; if (!p) return ''; try { return localStorage.getItem(p.keyName) || ''; } catch { return ''; } }
function gpSetKey(provider, key){
  const p = GP_PROVIDERS[provider]; if (!p) return;
  try { if (key) localStorage.setItem(p.keyName, key); else localStorage.removeItem(p.keyName); }
  catch { GP.toast(t('k.saveFail'), 'err'); }
}

/* ═══ 3. 模型清單（完整清單存本機；出廠值只是種子）═══ */
function gpModels(){
  const arr = GP.store.get(GP_MODEL_LS, null);
  if (Array.isArray(arr)) return arr.filter(m => m && typeof m.id === 'string' && m.id);
  return GP_BUILTIN_MODELS.map(m => ({ ...m }));
}
function gpSaveModels(list){ GP.store.set(GP_MODEL_LS, list); }
function gpProviderOf(modelId){
  const found = gpModels().find(m => m.id === modelId);
  if (found?.provider) return found.provider;
  if (modelId.includes('/')) return 'openrouter';
  if (/^gpt-/i.test(modelId) || /^o\d/i.test(modelId)) return 'openai';
  if (/^claude-/i.test(modelId)) return 'anthropic';
  if (/^muse-/i.test(modelId)) return 'meta';
  return 'gemini';
}
function gpModelRec(modelId){ return gpModels().find(m => m.id === modelId) || { id: modelId, provider: gpProviderOf(modelId) }; }

/* ═══ 4. 後端偵測（file:// 直接視為無後端，避免 console 嚇人）═══ */
function gpBeHint(){
  const el = $('beHint'); if (!el) return;
  el.classList.toggle('warn', !GP.backend.ok);
  el.textContent = t(GP.backend.ok ? 'be.ok' : 'be.no');
  const mh = $('manHint'); if (mh) mh.textContent = t(GP.backend.ok ? 'man.hintBe' : 'man.hintNoBe');
}
if (location.protocol.startsWith('http')) {
  fetch('api/ping.php', { cache: 'no-store' })
    .then(r => r.ok ? r.json() : Promise.reject(new Error('HTTP ' + r.status)))
    .then(j => { GP.backend.ok = !!(j && j.ok); gpBeHint(); })
    .catch(() => gpBeHint());
} else gpBeHint();

/* ═══ 5. API 層（純文字生成；direct 優先 → 本機 relay 降級）═══ */
function gpBuildRequest(provider, customEndpoint, { model, system, userText, key }){
  const fmt = (GP_PROVIDERS[provider] || {}).format || 'openai';
  if (fmt === 'anthropic') {
    return { format: fmt, url: GP_PROVIDERS.anthropic.endpoint(),
      headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': GP_PROVIDERS.anthropic.apiVersion, 'anthropic-dangerous-direct-browser-access': 'true' },
      body: { model, max_tokens: 8192, ...(system ? { system } : {}), messages: [{ role: 'user', content: userText }] } };
  }
  if (fmt === 'responses') {
    // Responses API（Meta AI）：input 配 input_text、system 放 instructions、stream:false（串流事件格式未實測）。
    return { format: fmt, url: GP_PROVIDERS.meta.endpoint(model),
      headers: { 'content-type': 'application/json', authorization: 'Bearer ' + key },
      body: { model, input: [{ role: 'user', content: [{ type: 'input_text', text: userText }] }], stream: false, ...(system ? { instructions: system } : {}) } };
  }
  if (fmt === 'gemini') {
    return { format: fmt, url: GP_PROVIDERS.gemini.endpoint(model),
      headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
      body: { ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
        contents: [{ role: 'user', parts: [{ text: userText }] }], generationConfig: { temperature: 0.7, maxOutputTokens: 8192 } } };
  }
  const url = provider === 'custom' ? customEndpoint : GP_PROVIDERS[provider].endpoint(model);
  const headers = { 'content-type': 'application/json', authorization: 'Bearer ' + key };
  if (provider === 'openrouter') { headers['HTTP-Referer'] = location.origin; headers['X-Title'] = 'game-prompts'; }
  return { format: 'openai', url, headers,
    body: { model, messages: [...(system ? [{ role: 'system', content: system }] : []), { role: 'user', content: userText }], temperature: 0.7, max_tokens: 8192 } };
}
function gpHttpError(status, detail, provider){
  const label = provLabel(provider);
  const short = (detail || '').replace(/\s+/g, ' ').slice(0, 240);
  let msg;
  if (status === 401 || status === 403) msg = t('err.http401', { label, status });
  else if (status === 404) msg = t('err.http404');
  else if (status === 429) msg = t('err.http429', { label });
  else if (status >= 500) msg = t('err.http5xx', { label, status });
  else msg = t('err.httpOther', { label, status });
  const e = new Error(msg + (short ? t('err.detail', { d: short }) : ''));
  e.status = status; e.needsKey = status === 401 || status === 403;
  return e;
}
async function gpCallLLM({ modelId, system, userText, signal, onStatus = () => {} }){
  const rec = gpModelRec(modelId);
  const provider = rec.provider;
  const key = gpGetKey(provider);
  if (!key) { const e = new Error(t('err.noKey', { provider: provLabel(provider) })); e.needsKey = true; throw e; }
  if (provider === 'custom' && !/^https?:\/\//i.test(rec.endpoint || '')) throw new Error(t('err.customEp'));
  const req = gpBuildRequest(provider, rec.endpoint, { model: modelId, system, userText, key });
  let res;
  try {
    onStatus(t('st.calling', { model: modelId }));
    res = await fetch(req.url, { method: 'POST', headers: req.headers, body: JSON.stringify(req.body), signal });
  } catch (e) {
    if (signal?.aborted) throw e;
    // 直連丟例外 = 網路或 CORS 被擋；能到達供應商的 4xx/5xx 不會走到這裡。
    if (!GP.backend.ok) throw new Error(t('err.cors'));
    if (provider === 'custom') throw new Error(t('err.corsCustom'));
    onStatus(t('st.relay'));
    res = await fetch('api/relay.php?action=json', { method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ url: req.url, headers: req.headers, body: req.body }), signal });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      if (j && j.error && !j.detail && typeof j.error === 'string' && res.status < 500 && res.status !== 400) throw gpHttpError(res.status, j.error, provider);
      throw new Error(t('err.relay', { status: res.status, msg: j?.error?.message || j?.error || (await res.text().catch(() => '')).slice(0, 200) }));
    }
    return gpParseJson(await res.json(), req.format);
  }
  if (!res.ok) throw gpHttpError(res.status, await res.text().catch(() => ''), provider);
  return gpParseJson(await res.json(), req.format);
}
function gpParseJson(data, format){
  let hard = null;
  try {
    if (data?.error && format !== 'gemini') {
      hard = new Error(t('err.provider', { m: data.error.message || data.error.type || JSON.stringify(data.error) })); throw hard;
    }
    if (format === 'responses') {
      let s = '';
      for (const item of (data?.output || [])) {
        if (!item || typeof item !== 'object') continue;
        if (item.type === 'message' || item.role === 'assistant') for (const c of (item.content || [])) if (c?.type === 'output_text' && c.text) s += c.text;
      }
      if (!s && typeof data?.output_text === 'string') s = data.output_text;
      if (s) return s;
    } else if (format === 'anthropic') {
      const s = (data.content || []).filter(b => b.type === 'text').map(b => b.text || '').join('\n');
      if (s) return s;
    } else if (format === 'gemini') {
      const cand = data.candidates?.[0];
      const s = (cand?.content?.parts || []).map(p => p.text || '').join('\n');
      if (s) return s;
      if (cand?.finishReason && cand.finishReason !== 'STOP') { hard = new Error(t('err.geminiStop', { r: cand.finishReason })); throw hard; }
      if (data.promptFeedback?.blockReason) { hard = new Error(t('err.geminiBlock', { r: data.promptFeedback.blockReason })); throw hard; }
    } else {
      const s = data.choices?.[0]?.message?.content || '';
      if (s) return s;
    }
  } catch (e) { if (e === hard) throw e; }
  throw new Error(t('err.empty', { head: JSON.stringify(data).slice(0, 300) }));
}
function gpExtractJsonObject(out){
  const s = String(out || '');
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) { try { return JSON.parse(fence[1].trim()); } catch {} }
  const a = s.indexOf('{'), b = s.lastIndexOf('}');
  if (a >= 0 && b > a) { try { return JSON.parse(s.slice(a, b + 1)); } catch {} }
  return JSON.parse(s.trim());
}

/* ═══ 6. 文件抽取 / 參考抽選 / 全文組裝 ═══ */
// JSON 文件文字抽取（參考 docs/暮年化龍決.json：只取文字欄位，略過 base64 圖片）
function gpExtractJsonText(obj, depth = 0){
  if (obj == null) return '';
  if (typeof obj === 'string') {
    if (obj.length > 500 && (/^data:image\//.test(obj) || /^[A-Za-z0-9+/=]{2000,}$/.test(obj.slice(0, 2000)))) return '';
    return obj.length > 20000 ? obj.slice(0, 20000) + '…' : obj;
  }
  if (typeof obj === 'number' || typeof obj === 'boolean') return String(obj);
  if (typeof obj !== 'object' || depth > 6) return '';
  const parts = [];
  const entries = Array.isArray(obj) ? obj.map((v, i) => [i, v]) : Object.entries(obj);
  for (const [k, v] of entries) {
    if (/^(data|image|cover|img|avatar|picture|sheets?|illust)/i.test(String(k)) && typeof v === 'string' && v.length > 2000) continue;
    const s = gpExtractJsonText(v, depth + 1);
    if (s) parts.push(Array.isArray(obj) ? s : `${k}: ${s}`);
    if (parts.join('\n').length > 120000) { parts.push('…'); break; }
  }
  return parts.join('\n');
}
// 提示庫抽選：3 組，其中 1 組必為同類別
function gpPickRefs(cat){
  const pool = GP.DATA.filter(d => d.prompt);
  const take = (arr, n) => { const a = [...arr], out = []; while (a.length && out.length < n) out.push(a.splice(Math.floor(Math.random() * a.length), 1)[0]); return out; };
  if (cat === 'other' || !pool.some(d => d.cat === cat)) return { refs: take(pool, 3), note: t('refs.other') };
  const same = pool.filter(d => d.cat === cat), other = pool.filter(d => d.cat !== cat);
  return { refs: [...take(same, 1), ...take(other, 2)], note: t('refs.same', { cat: GP.catLabel(cat) }) };
}
function gpRefText(d){ return `[${d.name} | genre: ${d.cat} | hero: ${d.hero} | core system: ${d.system} | inspiration: ${d.atmo} × ${d.sys}]\n${d.prompt}`; }
// 組裝 9 段全文（與 _gen/gen.php 同一模板，格式由程式保證）
function gpBuildPrompt(f){
  const art = /^[aeiou]/i.test((f.identity || '').trim()) ? 'an' : 'a';
  const cart = /^[aeiou]/i.test((f.core || '').trim()) ? 'an' : 'a';
  return `打造一款${f.core}，細節如下：\n\n` +
    `1.Generate five concept images for ${cart} ${f.core}. Keep characters, props, and creatures simple and readable. Explore distinct environments with ${f.visuals}. Aim for the atmosphere of ${f.atmo} and the systemic variety of ${f.sys}.\n\n` +
    `2.Build a short, polished ${f.enc} from the attached ${f.concept} concept. Draw the graphics in code and make the character controllable, with ${f.targets}. Put ${f.system} at the center of the ${f.enc}, and make the lighting and ${f.system} effects match the selected visual direction.\n\n` +
    `3.Play through the first ${f.enc} and identify where movement or interactions feel awkward. Improve the ${f.hero}'s movement and action animations so actions feel responsive and are easy to follow. Test the ${f.enc} again while preserving the existing ${f.system} interactions.\n\n` +
    `4.Add experience points to the playable prototype. Award experience for ${f.reward}, track the total, and show progress clearly in the interface. Play through the ${f.enc} to check that rewards are recorded correctly.\n\n` +
    `5.Give the ${f.hero} ${art} clearly readable ${f.identity}. Adjust the ${f.hero}'s facing and gear layering for each movement direction, especially when facing upward, so the ${f.identity} sits correctly behind the character. Check the result while moving and interacting.\n\n` +
    `6.${f.rule1}\n\n` +
    `7.${f.rule2}\n\n` +
    `8.Expand the playable ${f.world} into seven distinct ${f.themes}. Give each theme its own environment and atmosphere while preserving the established movement, interaction, and ${f.system} rules. Connect the ${f.themes} into a ${f.prog} that the player can progress through.\n\n` +
    `9.Add ${f.meta} for what is earned in the ${f.world}. Let players inspect, store, and swap items, and show how equipped choices affect character stats. Check that collecting and changing loadout works during a run.\n`;
}
const GP_FIELD_DEFAULTS = { visuals: 'varied props, readable landmarks, ambient motion', enc: 'first quest', targets: 'rival encounters', reward: 'completing objectives',
  identity: 'signature gear', rule1: 'Keep the central loop tight and readable.', rule2: 'Reward mastery with visible progression.', themes: 'distinct zones', prog: 'campaign', meta: 'a collection log and gear set' };
function gpSlugify(s){
  return (s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'custom-game';
}
function gpCats(){ const c = GP.cats(); return c.length ? c : [...GP_CATS_FALLBACK]; }
function gpFillSelect(sel, opts, value){
  sel.innerHTML = opts.map(o => `<option value="${esc(o.value ?? o)}">${esc(o.label ?? o)}</option>`).join('');
  if (value != null && [...sel.options].some(o => o.value === value)) sel.value = value;
}
// 分類下拉：value 用中文鍵（資料層），label 用目前語言
function gpCatOptions(withOther){
  const list = gpCats().map(c => ({ value: c, label: GP.catLabel(c) }));
  return withOther ? [...list, { value: 'other', label: t('cat.other') }] : list;
}

/* ═══ 7. 生成流程（① 輸入 → ② 預覽修改 → 儲存）═══ */
let genCtrl = null, genPhase = 'form', genLog = { key: 'g.idle', vars: null, raw: null, busy: false }, refsNote = null;
function gpLog(key, vars, busy = false){ genLog = { key, vars, raw: null, busy }; gpPaintLog(); }
function gpLogRaw(text, busy = false){ genLog = { key: null, vars: null, raw: text, busy }; gpPaintLog(); }
function gpPaintLog(){ const el = $('gLog'); el.textContent = genLog.raw != null ? genLog.raw : t(genLog.key, genLog.vars); el.classList.toggle('busy', genLog.busy); }
function gpPaintRefs(){ $('gRefs').textContent = refsNote ? refsNote.note + '\n\n' + refsNote.list : t('g.refsNone'); }
function gpSetPhase(phase){
  genPhase = phase;
  $('gForm').hidden = phase === 'preview'; $('gPreview').hidden = phase !== 'preview';
  $('gGo').hidden = phase === 'preview'; $('gGo').disabled = phase === 'busy';
  $('gCancel').hidden = phase !== 'busy'; $('gBack').hidden = phase !== 'preview'; $('gSave').hidden = phase !== 'preview';
  $('gPhase').textContent = t(phase === 'preview' ? 'g.phase2' : 'g.phase1');
  const body = document.querySelector('#mGen .m-body'); if (body) body.scrollTop = 0;
}
function gpRenderGenModels(){
  const list = gpModels();
  const keep = $('gModel').value;
  gpFillSelect($('gModel'), list.map(m => ({ value: m.id, label: `${m.displayName || m.id} (${provLabel(m.provider)}${gpGetKey(m.provider) ? ' 🔑' : ''})` })));
  const last = keep || GP.store.get(GP_LAST_MODEL_LS, '');
  if (last && list.some(m => m.id === last)) $('gModel').value = last;
  gpSyncKeyState();
}
function gpSyncKeyState(){
  const id = $('gModel').value; const el = $('gKeyState'); if (!id) { el.textContent = t('g.noModelList'); return; }
  const p = gpProviderOf(id);
  el.innerHTML = `<span class="dot${gpGetKey(p) ? ' ok' : ''}"></span>${esc(t(gpGetKey(p) ? 'g.keySet' : 'g.keyUnset', { label: provLabel(p) }))}`;
}
const gpSaveDraft = (() => { let tm; return () => { clearTimeout(tm); tm = setTimeout(() => {
  GP.store.set(GP_DRAFT_LS, { title: $('gTitle').value, cat: $('gCat').value, doc: $('gDoc').value, at: Date.now() });
}, 400); }; })();
function gpRestoreDraft(){
  const d = GP.store.get(GP_DRAFT_LS, null);
  if (!d || (!d.title && !d.doc)) return;
  if (!$('gTitle').value) $('gTitle').value = d.title || '';
  if (!$('gDoc').value) $('gDoc').value = d.doc || '';
  if (d.cat && [...$('gCat').options].some(o => o.value === d.cat)) $('gCat').value = d.cat;
  gpDocCount(); GP.toast(t('g.draftRestored'), 'ok');
}
function gpDocCount(){ const n = $('gDoc').value.length; $('gDocCount').textContent = n ? t('g.docCount', { n: n.toLocaleString() }) : ''; }
$('gDoc').addEventListener('input', () => { gpDocCount(); gpSaveDraft(); });
$('gTitle').addEventListener('input', gpSaveDraft);
$('gCat').addEventListener('change', gpSaveDraft);
$('gModel').addEventListener('change', () => { GP.store.set(GP_LAST_MODEL_LS, $('gModel').value); gpSyncKeyState(); });
$('gOpenKeys').addEventListener('click', () => { gpRenderKeys(); GP.openModal('mKeys'); });
$('btnGen').addEventListener('click', () => {
  gpFillSelect($('gCat'), gpCatOptions(true), $('gCat').value || undefined);
  gpRenderGenModels(); gpBeHint(); gpPaintRefs(); gpPaintLog();
  if (genPhase !== 'preview') { gpSetPhase('form'); gpRestoreDraft(); }
  GP.openModal('mGen');
});
// 檔案：點選或拖曳
let genFile = null;
function gpSetFile(f){
  genFile = f || null;
  $('gFileHint').textContent = f ? t('g.fileSel', { name: f.name, kb: (f.size / 1024).toFixed(1) }) : t('g.fileHint');
}
$('gFile').addEventListener('change', e => gpSetFile(e.target.files[0]));
const drop = $('gDrop');
['dragenter', 'dragover'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('over'); }));
['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('over'); }));
drop.addEventListener('drop', e => { const f = e.dataTransfer?.files?.[0]; if (f) gpSetFile(f); });

$('gGo').addEventListener('click', gpRun);
$('gCancel').addEventListener('click', () => genCtrl?.abort('user'));
$('gBack').addEventListener('click', () => gpSetPhase('form'));
$('gSave').addEventListener('click', gpSaveGenerated);

// LLM 指令用英文（輸出欄位本來就是英文；對各家模型最穩定），與介面語言無關。
function gpSystemPrompt(){
  return 'You design game-generation prompts. Every prompt in the codex has the same 9-step structure ' +
    '(concept art → prototype level → game feel → experience points → signature gear → rule 1 → rule 2 → seven zones → collection system). ' +
    'Return ONLY one JSON object (no markdown fences, no commentary) with these fields, all in short English phrases in the style of the 3 attached examples: ' +
    `slug (kebab-case), name (English title), cat (must be exactly one of these genre keys: ${gpCats().join(' | ')}; if the user chose "Other", pick the best fit), ` +
    'core (one-sentence game core), hero (hero name), concept (concept scene name), atmo (reference game for atmosphere), sys (reference game for systems), ' +
    'visuals (concept-art environment details), enc (first level/encounter name), targets (first-level enemies or challenges), system (core system name), reward (what earns experience), ' +
    'identity (hero\'s signature readable gear), rule1 (full sentence for rule one), rule2 (full sentence for rule two), world (world name), themes (plural noun for the seven zones), prog (progression name), meta (collection system name).';
}
async function gpRun(){
  const title = $('gTitle').value.trim(), cat = $('gCat').value, modelId = $('gModel').value;
  let doc = $('gDoc').value.trim();
  if (!title) { GP.toast(t('g.noTitle'), 'err'); $('gTitle').focus(); return; }
  if (!modelId) { GP.toast(t('g.noModels'), 'err'); return; }
  genCtrl = new AbortController();
  const timer = setTimeout(() => genCtrl?.abort('timeout'), GP_TIMEOUT_MS);
  gpSetPhase('busy');
  try {
    if (genFile) {
      gpLog('st.readJson', null, true);
      let obj; try { obj = JSON.parse(await genFile.text()); } catch { throw new Error(t('err.badJson')); }
      doc += (doc ? '\n\n' : '') + `[Text extracted from uploaded JSON: ${genFile.name}]\n` + gpExtractJsonText(obj);
    }
    if (!doc) throw new Error(t('err.noDoc'));
    gpLog('st.pickRefs', null, true);
    const { refs, note } = gpPickRefs(cat);
    refsNote = { note, list: refs.map((d, i) => `${i + 1}. ${d.name} (${GP.catLabel(d.cat)} | ${d.slug}.txt)`).join('\n') };
    gpPaintRefs();
    const userText = `Game title: ${title}\nGenre: ${cat === 'other' ? 'Other (choose the best fit)' : cat}\n\nGame document:\n${doc}\n\n` +
      `Reference examples (3; the first shares the target genre — follow its structure and phrasing most closely):\n\n${refs.map(gpRefText).join('\n\n───\n\n')}`;
    const out = await gpCallLLM({ modelId, system: gpSystemPrompt(), userText, signal: genCtrl.signal, onStatus: s => gpLogRaw(s, true) });
    let fields;
    try { fields = gpExtractJsonObject(out); } catch { throw new Error(t('err.notJson', { head: String(out).slice(0, 300) })); }
    if (!fields || typeof fields !== 'object') throw new Error(t('err.notObj'));
    const missing = ['core', 'hero', 'concept', 'atmo', 'sys', 'system', 'world'].filter(k => !String(fields[k] ?? '').trim());
    if (missing.length) throw new Error(t('err.missing', { fields: missing.join(', ') }));
    for (const k of Object.keys(fields)) if (typeof fields[k] === 'string') fields[k] = fields[k].trim();
    const cats = gpCats();
    const finalCat = cat !== 'other' ? cat : (cats.includes(fields.cat) ? fields.cat : cats[0]);
    const slug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(fields.slug || '') ? fields.slug : gpSlugify(fields.name || title);
    const prompt = gpBuildPrompt({ ...GP_FIELD_DEFAULTS, ...fields });
    gpFillSelect($('pCat'), gpCatOptions(false), finalCat);
    $('pName').value = fields.name || title; $('pSlug').value = slug; $('pHero').value = fields.hero; $('pCore').value = fields.core;
    $('pConcept').value = fields.concept; $('pSystem').value = fields.system; $('pWorld').value = fields.world;
    $('pAtmo').value = fields.atmo; $('pSys').value = fields.sys; $('pPrompt').value = prompt;
    gpSetPhase('preview');
    gpLog('g.done');
  } catch (e) {
    if (genCtrl?.signal.aborted) gpLog(genCtrl.signal.reason === 'timeout' ? 'g.timeout' : 'g.aborted', { min: GP_TIMEOUT_MS / 60000 });
    else { gpLogRaw('❌ ' + e.message); if (e.needsKey) GP.toast(t('g.needKeyToast'), 'err'); }
    gpSetPhase('form');
  } finally { clearTimeout(timer); genCtrl = null; }
}
async function gpSaveGenerated(){
  const v = id => $(id).value.trim();
  const slug = v('pSlug');
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) { GP.toast(t('s.badSlug'), 'err'); $('pSlug').focus(); return; }
  if (GP.DATA.some(d => d.slug === slug)) { GP.toast(t('s.dup', { slug }), 'err'); $('pSlug').focus(); return; }
  const item = { slug, name: v('pName'), cat: $('pCat').value, core: v('pCore'), hero: v('pHero'), concept: v('pConcept'),
    atmo: v('pAtmo'), sys: v('pSys'), system: v('pSystem'), world: v('pWorld'), prompt: $('pPrompt').value.trim() + '\n', file: 'prompts/' + slug + '.txt' };
  const empty = Object.entries(item).filter(([, val]) => !String(val).trim()).map(([k]) => k);
  if (empty.length) { GP.toast(t('s.emptyFields', { fields: empty.join(', ') }), 'err'); return; }
  const btn = $('gSave'); btn.disabled = true;
  try {
    if (GP.backend.ok) {
      gpLog('st.saving', null, true);
      const res = await fetch('api/save_prompt.php', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ slug, item }) });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j.ok) throw new Error(t('err.saveFail', { msg: j.error || ('HTTP ' + res.status) }));
      GP.store.del(GP_DRAFT_LS);
      gpLog('s.savedBe', { file: j.file, total: j.total });
      GP.toast(t('s.savedToast'), 'ok');
      setTimeout(() => { location.hash = '#p=' + slug; location.reload(); }, 900);
      return;
    }
    const added = GP.add({ ...item, local: true });
    if (!added) throw new Error(t('s.addFail'));
    const arr = gpLocalItems(); arr.push({ ...item });
    GP.store.set(GP_CUSTOM_LS, arr);
    GP.download(slug + '.txt', item.prompt);
    GP.store.del(GP_DRAFT_LS);
    gpLog('s.savedLocal', { name: item.name, slug });
    GP.toast(t('s.savedLocalToast'), 'ok');
    gpSetPhase('form'); $('gTitle').value = ''; $('gDoc').value = ''; gpSetFile(null); $('gFile').value = ''; gpDocCount();
    GP.closeModal('mGen'); GP.open(slug);
  } catch (e) { gpLogRaw('❌ ' + e.message); GP.toast(e.message, 'err'); }
  finally { btn.disabled = false; }
}

/* ═══ 8. 模型 Modal ═══ */
let gpEditId = null;
function gpModelForm(reset){
  if (reset) { gpEditId = null; $('mId').value = ''; $('mName').value = ''; $('mEp').value = ''; }
  $('mFormTitle').textContent = gpEditId ? t('mm.edit', { id: gpEditId }) : t('mm.add');
  $('mAdd').textContent = t(gpEditId ? 'mm.saveBtn' : 'mm.addBtn');
  $('mCancel').hidden = !gpEditId;
}
function gpRenderModels(){
  const box = $('modelList'); const list = gpModels();
  box.innerHTML = list.length ? list.map(m =>
    `<div class="modelrow"><span class="nm" title="${esc(m.id)}">${esc(m.displayName || m.id)}<span style="color:var(--mut)"> · ${esc(m.id)}</span></span>` +
    `<span class="pv">${esc(provLabel(m.provider))}${gpGetKey(m.provider) ? ' 🔑' : ''}</span>` +
    `<button class="iconbtn" data-edit="${esc(m.id)}">${esc(t('edit'))}</button><button class="iconbtn danger" data-del="${esc(m.id)}">${esc(t('delete'))}</button></div>`).join('')
    : `<div class="m-hint">${esc(t('mm.empty'))}</div>`;
  gpRenderGenModels();
}
$('modelList').addEventListener('click', async e => {
  const del = e.target.closest('[data-del]'), ed = e.target.closest('[data-edit]');
  if (del) {
    if (!await GP.confirm(t('mm.confirmDel', { id: del.dataset.del }), { ok: t('delete'), danger: true })) return;
    gpSaveModels(gpModels().filter(m => m.id !== del.dataset.del)); if (gpEditId === del.dataset.del) gpModelForm(true); gpRenderModels(); GP.toast(t('mm.deleted'), 'ok');
  } else if (ed) {
    const m = gpModels().find(x => x.id === ed.dataset.edit); if (!m) return;
    gpEditId = m.id; $('mId').value = m.id; $('mName').value = m.displayName || ''; $('mProv').value = m.provider || 'openrouter'; $('mEp').value = m.endpoint || '';
    gpModelForm(false); $('mId').focus();
  }
});
$('mAdd').addEventListener('click', () => {
  const id = $('mId').value.trim(), name = $('mName').value.trim(), prov = $('mProv').value, ep = $('mEp').value.trim();
  if (!id) { GP.toast(t('mm.needId'), 'err'); $('mId').focus(); return; }
  if (prov === 'custom' && !/^https?:\/\//i.test(ep)) { GP.toast(t('mm.needEp'), 'err'); $('mEp').focus(); return; }
  let list = gpModels();
  if (gpEditId && gpEditId !== id) list = list.filter(m => m.id !== gpEditId);
  const rec = { id, displayName: name || id, provider: prov }; if (prov === 'custom') rec.endpoint = ep;
  const i = list.findIndex(m => m.id === id); if (i >= 0) list[i] = rec; else list.push(rec);
  gpSaveModels(list); GP.toast(t(gpEditId ? 'mm.updated' : 'mm.added'), 'ok'); gpModelForm(true); gpRenderModels();
});
$('mCancel').addEventListener('click', () => gpModelForm(true));
$('mReset').addEventListener('click', async () => {
  if (!await GP.confirm(t('mm.confirmReset'), { ok: t('mm.resetBtn'), danger: true })) return;
  GP.store.del(GP_MODEL_LS); gpModelForm(true); gpRenderModels(); GP.toast(t('mm.resetDone'), 'ok');
});
$('btnModels').addEventListener('click', () => { gpModelForm(true); gpRenderModels(); GP.openModal('mModels'); });

/* ═══ 9. Key Modal ═══ */
function gpRenderKeys(){
  const box = $('keyList'); box.innerHTML = '';
  for (const [pid, p] of Object.entries(GP_PROVIDERS)) {
    const saved = gpGetKey(pid);
    const fld = document.createElement('div'); fld.className = 'fld';
    fld.innerHTML = `<label for="k-${pid}"><span class="dot${saved ? ' ok' : ''}"></span>${esc(provLabel(pid))} <span class="hint-inline">(${esc(t('prov.note.' + pid))})</span></label>` +
      `<div class="keyrow"><input type="password" id="k-${pid}" placeholder="${esc(p.keyPlaceholder || t('prov.ph.custom'))}" autocomplete="off" spellcheck="false"><button class="iconbtn" type="button" data-eye="k-${pid}" aria-label="${esc(t('mk.eye'))}">👁</button></div>` +
      (p.keyUrl ? `<div class="hint">${esc(t('mk.apply'))}<a href="${esc(p.keyUrl)}" target="_blank" rel="noopener">${esc(p.keyUrlText)}</a></div>` : '');
    fld.querySelector('input').value = saved;
    box.appendChild(fld);
  }
}
$('keyList').addEventListener('click', e => { const b = e.target.closest('[data-eye]'); if (!b) return; const i = $(b.dataset.eye); i.type = i.type === 'password' ? 'text' : 'password'; });
$('kSave').addEventListener('click', () => {
  for (const pid of Object.keys(GP_PROVIDERS)) gpSetKey(pid, $('k-' + pid)?.value?.trim() || '');
  GP.closeModal('mKeys'); GP.toast(t('mk.saved'), 'ok');
  if ($('modelList').children.length) gpRenderModels(); else gpRenderGenModels();
});
$('btnKeys').addEventListener('click', () => { gpRenderKeys(); GP.openModal('mKeys'); });

/* ═══ 10. 資料管理 + 自訂條目（磁碟 custom.json / 瀏覽器暫存）═══ */
function gpLocalItems(){ const a = GP.store.get(GP_CUSTOM_LS, []); return Array.isArray(a) ? a.filter(x => x && x.slug) : []; }
function gpRenderCustoms(){
  const list = GP.DATA.filter(d => d.custom || d.local);
  $('manCount').textContent = list.length ? `(${list.length})` : '';
  $('customList').innerHTML = list.length ? list.map(d =>
    `<div class="modelrow"><span class="nm" title="${esc(d.slug)}">${esc(d.name)}<span style="color:var(--mut)"> · ${esc(GP.catLabel(d.cat))}</span></span>` +
    `<span class="pv">${esc(t(d.local ? 'src.local' : 'src.disk'))}</span>` +
    `<button class="iconbtn" data-open="${esc(d.slug)}">${esc(t('open'))}</button><button class="iconbtn danger" data-del="${esc(d.slug)}">${esc(t('delete'))}</button></div>`).join('')
    : `<div class="m-hint">${esc(t('man.empty'))}</div>`;
}
async function gpDeleteCustom(slug){
  const d = GP.DATA.find(x => x.slug === slug); if (!d) return;
  if (!(d.custom || d.local)) { GP.toast(t('man.builtinNoDel'), 'err'); return; }
  if (!d.local && !GP.backend.ok) { GP.toast(t('man.needBackend'), 'err'); return; }
  if (!await GP.confirm(t('man.confirmDel', { name: d.name }) + (d.local ? '' : ' ' + t('man.confirmDelFile', { slug })), { ok: t('delete'), danger: true })) return;
  if (d.local) {
    GP.store.set(GP_CUSTOM_LS, gpLocalItems().filter(x => x.slug !== slug));
    GP.remove(slug); gpRenderCustoms(); GP.toast(t('man.deleted'), 'ok'); return;
  }
  try {
    const res = await fetch('api/delete_prompt.php', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ slug }) });
    const j = await res.json().catch(() => ({}));
    if (!res.ok || !j.ok) throw new Error(j.error || ('HTTP ' + res.status));
    GP.toast(t('man.deletedReload'), 'ok');
    setTimeout(() => { location.hash = ''; location.reload(); }, 700);
  } catch (e) { GP.toast(t('man.delFail', { msg: e.message }), 'err'); }
}
$('customList').addEventListener('click', e => {
  const del = e.target.closest('[data-del]'), op = e.target.closest('[data-open]');
  if (del) gpDeleteCustom(del.dataset.del);
  else if (op) { GP.closeModal('mManage'); GP.open(op.dataset.open); }
});
$('dDel').addEventListener('click', () => { const c = GP.current(); if (c) gpDeleteCustom(c.slug); });
$('btnManage').addEventListener('click', () => { gpRenderCustoms(); gpBeHint(); GP.openModal('mManage'); });
const gpStamp = () => new Date().toISOString().slice(0, 10);
$('manExportCustom').addEventListener('click', () => {
  const list = GP.DATA.filter(d => d.custom || d.local).map(({ hay, custom, local, ...rest }) => rest);
  if (!list.length) return GP.toast(t('man.noCustomExport'), 'err');
  GP.download(`game-prompts-custom-${gpStamp()}.json`, JSON.stringify(list, null, 2), 'application/json');
});
$('manExportAll').addEventListener('click', () => {
  GP.download(`game-prompts-all-${gpStamp()}.json`, JSON.stringify(GP.DATA.map(({ hay, ...rest }) => rest), null, 2), 'application/json');
});
$('manExportMd').addEventListener('click', () => {
  const list = GP.filtered(); if (!list.length) return GP.toast(t('man.noFiltered'), 'err');
  const st = GP.state;
  const md = t('md.title', { date: gpStamp() }) + '\n\n' + t('md.filter', { cat: GP.catLabel(st.cat), q: st.q ? t('md.keyword', { q: st.q }) : '', n: list.length }) + '\n\n' +
    list.map((d, i) => `## ${i + 1}. ${d.name} (${GP.catLabel(d.cat)})\n\n- ${t('md.file')}: ${d.slug}.txt\n- ${t('m.hero')}: ${d.hero}\n- ${t('m.core')}: ${d.core}\n- ${t('m.concept')}: ${d.concept}\n- ${t('m.system')}: ${d.system}\n- ${t('m.world')}: ${d.world}\n- ${t('m.insp')}: ${d.atmo} × ${d.sys}\n\n\`\`\`\n${d.prompt.trim()}\n\`\`\`\n`).join('\n');
  GP.download(`game-prompts-${gpStamp()}.md`, md, 'text/markdown;charset=utf-8');
});
$('manImport').addEventListener('change', async e => {
  const f = e.target.files[0]; e.target.value = ''; if (!f) return;
  let arr; try { arr = JSON.parse(await f.text()); } catch { return GP.toast(t('man.importBadJson'), 'err'); }
  if (arr && !Array.isArray(arr) && Array.isArray(arr.items)) arr = arr.items;
  if (!Array.isArray(arr)) return GP.toast(t('man.importNotArray'), 'err');
  const need = ['name', 'cat', 'core', 'hero', 'concept', 'atmo', 'sys', 'system', 'world', 'prompt'];
  const items = arr.map(GP.normalize).filter(d => need.every(k => String(d[k]).trim()));
  const fresh = items.filter(d => !GP.DATA.some(x => x.slug === d.slug));
  if (!fresh.length) return GP.toast(t('man.importNone', { n: items.length }), 'err');
  if (!await GP.confirm(t('man.importConfirm', { n: fresh.length, skip: items.length - fresh.length, mode: t(GP.backend.ok ? 'man.importBe' : 'man.importLocal') }), { ok: t('man.importBtn') })) return;
  if (GP.backend.ok) {
    let ok = 0, fail = [];
    for (const d of fresh) {
      const item = { slug: d.slug, name: d.name, cat: d.cat, core: d.core, hero: d.hero, concept: d.concept, atmo: d.atmo, sys: d.sys, system: d.system, world: d.world, prompt: d.prompt, file: d.file };
      try {
        const res = await fetch('api/save_prompt.php', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ slug: d.slug, item }) });
        const j = await res.json().catch(() => ({})); if (!res.ok || !j.ok) throw new Error(j.error || res.status); ok++;
      } catch (err) { fail.push(`${d.slug}: ${err.message}`); }
    }
    GP.toast(t('man.imported', { ok, fail: fail.length ? t('man.importFail', { n: fail.length }) : '' }), fail.length ? 'err' : 'ok');
    if (fail.length) console.warn('import failed', fail);
    setTimeout(() => location.reload(), 1200);
    return;
  }
  const local = gpLocalItems();
  for (const d of fresh) { const { hay, custom, local: _l, ...rest } = d; local.push(rest); GP.add({ ...rest, local: true }); }
  GP.store.set(GP_CUSTOM_LS, local); gpRenderCustoms(); GP.toast(t('man.importedLocal', { n: fresh.length }), 'ok');
});
$('manClearProg').addEventListener('click', async () => { if (await GP.confirm(t('man.confirmClearProg'), { ok: t('man.clearBtn'), danger: true })) { GP.clearProgress(); GP.toast(t('man.progCleared'), 'ok'); } });
$('manClearFav').addEventListener('click', async () => { if (await GP.confirm(t('man.confirmClearFav'), { ok: t('man.clearBtn'), danger: true })) { GP.clearFavs(); GP.toast(t('man.favCleared'), 'ok'); } });

/* ═══ 11. 語言切換：重繪本模組產生的動態文字 ═══ */
function gpApplyLang(){
  gpBeHint(); gpPaintLog(); gpPaintRefs(); gpSetPhase(genPhase); gpModelForm(false);
  if (!genFile) gpSetFile(null);
  gpFillSelect($('gCat'), gpCatOptions(true), $('gCat').value || undefined);
  if ($('pCat').options.length) gpFillSelect($('pCat'), gpCatOptions(false), $('pCat').value);
  gpRenderGenModels(); gpDocCount();
  if ($('mModels').classList.contains('open')) gpRenderModels();
  if ($('mKeys').classList.contains('open')) gpRenderKeys();
  if ($('mManage').classList.contains('open')) gpRenderCustoms();
}
window.addEventListener('gp:lang', gpApplyLang);
gpApplyLang();

// 啟動：把瀏覽器暫存的自訂條目併入本頁（磁碟上已有同名者以磁碟為準）
(function gpLoadLocal(){
  const arr = gpLocalItems(); if (!arr.length) return;
  let n = 0; for (const it of arr) if (GP.add({ ...it, local: true })) n++;
  if (n) GP.refresh();
  const p = new URLSearchParams(location.hash.slice(1)).get('p');
  if (p && !GP.current() && GP.DATA.some(d => d.slug === p)) GP.open(p);
})();

// 除錯／測試用入口（console 可呼叫）
window.GPGen = { providers: GP_PROVIDERS, models: gpModels, callLLM: gpCallLLM, buildPrompt: gpBuildPrompt,
  defaults: GP_FIELD_DEFAULTS, cats: gpCats, fillSelect: gpFillSelect, catOptions: gpCatOptions, setPhase: gpSetPhase, run: gpRun, save: gpSaveGenerated, deleteCustom: gpDeleteCustom };
})();
