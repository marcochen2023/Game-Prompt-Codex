#!/usr/bin/env node
'use strict';
/* ═════════════════════════════════════════════════════════════
   _gen/build_index.js — 重建 index.html（Node 版）
   與 _gen/lib_catalog.php 邏輯逐行對應：讀 data_*.php 的 100 筆內建資料
   ＋ _gen/custom.json 的自訂條目，套 template.html 輸出到專案根目錄。
   本機沒有 PHP 時用這支：  node _gen/build_index.js
   有 PHP（XAMPP）則兩支等價： php _gen/build_index.php
   ═════════════════════════════════════════════════════════════ */
const fs = require('fs');
const path = require('path');
const GEN = __dirname;
const ROOT = path.resolve(GEN, '..');

/* ─── data_*.php 只用到「return [ [ "…", … ], … ];」這種字面量，做最小 tokenizer ─── */
function parsePhpRows(src){
  const start = src.indexOf('return');
  if (start < 0) throw new Error('找不到 return');
  const rows = []; let row = null, depth = 0, i = start + 6;
  while (i < src.length) {
    const ch = src[i];
    if (ch === '/' && src[i + 1] === '/') { i = src.indexOf('\n', i); if (i < 0) break; continue; }
    if (ch === '[') { depth++; if (depth === 2) row = []; i++; continue; }
    if (ch === ']') { if (depth === 2 && row) { rows.push(row); row = null; } depth--; i++; if (depth === 0) break; continue; }
    if (ch === '"' || ch === "'") {
      const q = ch; let s = ''; i++;
      while (i < src.length && src[i] !== q) {
        if (src[i] === '\\') {
          const n = src[i + 1];
          if (q === '"') { s += n === 'n' ? '\n' : n === 't' ? '\t' : n === 'r' ? '\r' : n; }
          else { s += (n === "'" || n === '\\') ? n : '\\' + n; }
          i += 2; continue;
        }
        s += src[i++];
      }
      i++; if (row) row.push(s); continue;
    }
    i++;
  }
  return rows;
}

/* ─── 分類：與 lib_catalog.php 的 gp_cat_override / gp_cat_of 完全一致 ─── */
const CAT_OVERRIDE = {
  'lantern-bearer-soul-collector':'動作冒險','comet-blacksmith-action':'動作冒險',
  'aurora-cartographer-explorer':'動作冒險','sock-puppet-space-opera':'動作冒險',
  'opera-ghost-stagehand':'動作冒險','ferret-postman-stealth':'動作冒險',
  'paper-cut-shadow-puppet-adventure':'動作冒險','neon-courier-wall-runner':'動作冒險',
  'storm-shepherd-flock-flyer':'動作冒險','sunken-library-diver':'動作冒險',
  'deep-current-diver-explorer':'動作冒險','volcano-geologist-survival':'動作冒險',
  'aurora-research-station-survival':'動作冒險','avalanche-shepherd-rescue':'動作冒險',
  'graffiti-golem-street-battler':'動作冒險','twin-stick-starfish-ranger':'動作冒險',
  'mech-vs-kaiju-city-brawler':'動作冒險','sky-pirate-grappling-hook-platformer':'動作冒險',
  'side-view-ink-samurai-duelist':'動作冒險','glassblower-duelist':'動作冒險',
  'ice-sculptor-duelist':'動作冒險','cactus-cowboy-duelist':'動作冒險',
  'origami-mech-duelist':'動作冒險','sandworm-bounty-rider':'動作冒險',
  'puppet-knight-stageplay-platformer':'動作冒險','spire-chimney-sweep-platformer':'動作冒險',
  'clockmaker-mouse-platformer':'動作冒險','beacon-tender-coop-climber':'動作冒險',
  'isometric-bone-warden-soulslike':'Roguelike・RPG','sourdough-dragon-keeper':'Roguelike・RPG',
  'candy-golem-match3-battler':'Roguelike・RPG',
  'time-capsule-archaeologist':'敘事・解謎','midnight-diner-detective-rpg':'敘事・解謎',
  'paper-tax-office-rpg':'敘事・解謎','coral-court-lawyer-sim':'敘事・解謎',
  'harbor-tugboat-puzzler':'敘事・解謎','satellite-gardener-puzzler':'敘事・解謎',
  'tide-lock-keeper-puzzler':'敘事・解謎','starlight-shepherd-constellation-puzzler':'敘事・解謎',
  'ink-detective-visual-novel':'敘事・解謎',
  'mirror-plague-doctor':'恐怖・懸疑','subway-ghost-conductor':'恐怖・懸疑',
  'lighthouse-horror-keeper':'恐怖・懸疑','cryptid-photography-horror':'恐怖・懸疑',
  'ghost-radio-dj-horror':'恐怖・懸疑','fog-cartographer-horror':'恐怖・懸疑',
  'quilt-witch-crafting-rpg':'休閒・療癒','beeper-valley-beekeeper-sim':'休閒・療癒',
  'floating-island-tea-garden':'休閒・療癒','frog-pond-fishing-sim':'休閒・療癒',
  'moss-giant-bonsai-keeper':'休閒・療癒','tea-dragon-pet-sim':'休閒・療癒',
  'yokai-bathhouse-keeper':'休閒・療癒','moss-train-conductor-sim':'休閒・療癒',
  'moth-keeper-lamp-sim':'休閒・療癒','cloud-whale-sky-safari':'休閒・療癒',
  'cozy-ramen-shop-sim':'模擬經營','antique-robot-tea-shop':'模擬經營',
  'deep-space-noodle-bar':'模擬經營','deep-trench-post-office':'模擬經營',
  'zero-g-salvage-engineer':'模擬經營','lunar-farming-colony':'模擬經營',
  'dinosaur-ranch-rustler':'模擬經營','vampire-vineyard-keeper':'模擬經營',
  'junk-dragon-hoarder-sim':'模擬經營','bone-market-tycoon':'模擬經營',
  'beetle-sumo-stable-manager':'競速・運動','sumo-frog-wrestler':'競速・運動',
  'junkyard-mech-wrestler':'競速・運動','desert-sail-racer':'競速・運動',
  'neon-taxi-driver':'競速・運動','ramen-truck-racer':'競速・運動',
  'paper-plane-racing-league':'競速・運動',
  'capoeira-rhythm-brawler':'音樂・節奏','klezmer-golem-rhythm-defense':'音樂・節奏',
  'bone-choir-rhythm-horror':'音樂・節奏','arcade-exorcist-rhythm':'音樂・節奏',
  'mushroom-knight-tactics':'策略戰棋','pickle-knight-tactics':'策略戰棋',
  'clockwork-tower-defense':'策略戰棋','drone-swarm-rts':'策略戰棋',
  'storm-lighthouse-rts':'策略戰棋','mushroom-subway-builder':'策略戰棋',
  'mycelium-city-builder':'策略戰棋','algae-factory-automation':'策略戰棋',
  'ant-colony-pheromone-strategy':'策略戰棋',
};
function catOf(slug, core){
  if (CAT_OVERRIDE[slug]) return CAT_OVERRIDE[slug];
  const c = (slug + ' ' + core).toLowerCase();
  const has = w => c.includes(w);
  if (has('rhythm')) return '音樂・節奏';
  if (has('horror')) return '恐怖・懸疑';
  if (has('tactics') || has('tower-defense') || has('rts') || has('automation') || has('city-builder') || has('strategy')) return '策略戰棋';
  if (has('roguelike') || has('soulslike') || has('rpg') || has('tamer') || has('card-battler') || has('match3') || has('deckbuild') || has('dungeon crawler')) return 'Roguelike・RPG';
  if (has('racer') || has('racing') || has('driver') || has('wrestler') || has('sumo') || has('taxi')) return '競速・運動';
  if (has('puzzler') || has('detective') || has('lawyer') || has('court') || has('visual-novel')) return '敘事・解謎';
  if (has('cozy') || has('fishing') || has('pet-sim') || has('garden') || has('tea') || has('bathhouse') || has('safari') || has('pond') || has('moth') || has('moss') || has('bonsai') || has('cloud-whale') || has('quilt')) return '休閒・療癒';
  if (has('sim') || has('shop') || has('tycoon') || has('colony') || has('ranch') || has('farm') || has('vineyard') || has('post-office') || has('salvage') || has('keeper') || has('noodle-bar')) return '模擬經營';
  return '動作冒險';
}
const ucwords = slug => slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

function collectItems(){
  const all = [];
  for (const f of fs.readdirSync(GEN).filter(x => /^data_\d+\.php$/.test(x)).sort())
    for (const r of parsePhpRows(fs.readFileSync(path.join(GEN, f), 'utf8'))) all.push(r);
  all.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  const items = [], missing = [], customFiles = [];
  for (const g of all) {
    const [slug, core, hero, concept, atmo, sys, , , , system, , , , , world] = g;
    if (g.length !== 18) throw new Error(`資料欄位數不對（${g.length}）：${slug}`);
    const p = path.join(ROOT, 'prompts', slug + '.txt');
    if (!fs.existsSync(p)) { missing.push(slug); continue; }
    items.push({ slug, name: ucwords(slug), cat: catOf(slug, core), core, hero, concept, atmo, sys, system, world,
      file: 'prompts/' + slug + '.txt', prompt: fs.readFileSync(p, 'utf8') });
  }
  const seen = new Set(items.map(i => i.slug));
  let custom = [];
  const cp = path.join(GEN, 'custom.json');
  if (fs.existsSync(cp)) { try { custom = JSON.parse(fs.readFileSync(cp, 'utf8')); } catch { custom = []; } if (!Array.isArray(custom)) custom = []; }
  for (const c of custom) {
    if (!c || typeof c !== 'object' || !c.slug) continue;
    const slug = String(c.slug);
    if (seen.has(slug)) continue; seen.add(slug);
    const p = path.join(ROOT, 'prompts', slug + '.txt');
    if (!fs.existsSync(p)) { customFiles.push(slug); continue; }
    items.push({ slug, name: c.name || ucwords(slug), cat: c.cat || catOf(slug, c.core || ''),
      core: c.core || '', hero: c.hero || '', concept: c.concept || '', atmo: c.atmo || '', sys: c.sys || '',
      system: c.system || '', world: c.world || '', file: 'prompts/' + slug + '.txt', prompt: fs.readFileSync(p, 'utf8'), custom: true });
  }
  items.sort((a, b) => (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0));
  return { items, missing, customFiles };
}
function renderHtml(items){
  const json = JSON.stringify(items).replace(/<\//g, '<\\/');
  const d = new Date(), pad = n => String(n).padStart(2, '0');
  const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const tpl = fs.readFileSync(path.join(GEN, 'template.html'), 'utf8');
  // %%VER%% 用 app-gen.js 的內容雜湊做 cache-busting，改了 JS 重建後瀏覽器一定拿到新版
  const h = require('crypto').createHash('sha1');
  for (const f of ['app-gen.js', 'i18n.js']) h.update(fs.readFileSync(path.join(ROOT, 'assets', f)));
  const ver = h.digest('hex').slice(0, 10);
  return tpl.split('%%DATA%%').join(json).split('%%TOTAL%%').join(String(items.length)).split('%%DATE%%').join(date).split('%%VER%%').join(ver);
}
function rebuild(){
  const { items, missing, customFiles } = collectItems();
  fs.writeFileSync(path.join(ROOT, 'index.html'), renderHtml(items));
  return { total: items.length, missing, customFiles };
}
module.exports = { parsePhpRows, catOf, collectItems, renderHtml, rebuild };
if (require.main === module) {
  const r = rebuild();
  console.log(`items=${r.total} missing=${r.missing.length}`);
  for (const m of r.missing) console.log('MISS ' + m);
  for (const m of r.customFiles) console.log('MISS-CUSTOM ' + m);
}
