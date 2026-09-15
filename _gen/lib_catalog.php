<?php
// Shared catalogue logic: 100 built-in rows + _gen/custom.json merged,
// rendered with the same template + JS as _gen/build_index.php.
// Both build_index.php (CLI rebuild) and api/save_prompt.php use this file.

function gp_cat_override() {
    return [
     'lantern-bearer-soul-collector'=>'動作冒險','comet-blacksmith-action'=>'動作冒險',
     'aurora-cartographer-explorer'=>'動作冒險','sock-puppet-space-opera'=>'動作冒險',
     'opera-ghost-stagehand'=>'動作冒險','ferret-postman-stealth'=>'動作冒險',
     'paper-cut-shadow-puppet-adventure'=>'動作冒險','neon-courier-wall-runner'=>'動作冒險',
     'storm-shepherd-flock-flyer'=>'動作冒險','sunken-library-diver'=>'動作冒險',
     'deep-current-diver-explorer'=>'動作冒險','volcano-geologist-survival'=>'動作冒險',
     'aurora-research-station-survival'=>'動作冒險','avalanche-shepherd-rescue'=>'動作冒險',
     'graffiti-golem-street-battler'=>'動作冒險','twin-stick-starfish-ranger'=>'動作冒險',
     'mech-vs-kaiju-city-brawler'=>'動作冒險','sky-pirate-grappling-hook-platformer'=>'動作冒險',
     'side-view-ink-samurai-duelist'=>'動作冒險','glassblower-duelist'=>'動作冒險',
     'ice-sculptor-duelist'=>'動作冒險','cactus-cowboy-duelist'=>'動作冒險',
     'origami-mech-duelist'=>'動作冒險','sandworm-bounty-rider'=>'動作冒險',
     'puppet-knight-stageplay-platformer'=>'動作冒險','spire-chimney-sweep-platformer'=>'動作冒險',
     'clockmaker-mouse-platformer'=>'動作冒險','beacon-tender-coop-climber'=>'動作冒險',
     'isometric-bone-warden-soulslike'=>'Roguelike・RPG','sourdough-dragon-keeper'=>'Roguelike・RPG',
     'candy-golem-match3-battler'=>'Roguelike・RPG',
     'time-capsule-archaeologist'=>'敘事・解謎','midnight-diner-detective-rpg'=>'敘事・解謎',
     'paper-tax-office-rpg'=>'敘事・解謎','coral-court-lawyer-sim'=>'敘事・解謎',
     'harbor-tugboat-puzzler'=>'敘事・解謎','satellite-gardener-puzzler'=>'敘事・解謎',
     'tide-lock-keeper-puzzler'=>'敘事・解謎','starlight-shepherd-constellation-puzzler'=>'敘事・解謎',
     'ink-detective-visual-novel'=>'敘事・解謎',
     'mirror-plague-doctor'=>'恐怖・懸疑','subway-ghost-conductor'=>'恐怖・懸疑',
     'lighthouse-horror-keeper'=>'恐怖・懸疑','cryptid-photography-horror'=>'恐怖・懸疑',
     'ghost-radio-dj-horror'=>'恐怖・懸疑','fog-cartographer-horror'=>'恐怖・懸疑',
     'quilt-witch-crafting-rpg'=>'休閒・療癒','beeper-valley-beekeeper-sim'=>'休閒・療癒',
     'floating-island-tea-garden'=>'休閒・療癒','frog-pond-fishing-sim'=>'休閒・療癒',
     'moss-giant-bonsai-keeper'=>'休閒・療癒','tea-dragon-pet-sim'=>'休閒・療癒',
     'yokai-bathhouse-keeper'=>'休閒・療癒','moss-train-conductor-sim'=>'休閒・療癒',
     'moth-keeper-lamp-sim'=>'休閒・療癒','cloud-whale-sky-safari'=>'休閒・療癒',
     'cozy-ramen-shop-sim'=>'模擬經營','antique-robot-tea-shop'=>'模擬經營',
     'deep-space-noodle-bar'=>'模擬經營','deep-trench-post-office'=>'模擬經營',
     'zero-g-salvage-engineer'=>'模擬經營','lunar-farming-colony'=>'模擬經營',
     'dinosaur-ranch-rustler'=>'模擬經營','vampire-vineyard-keeper'=>'模擬經營',
     'junk-dragon-hoarder-sim'=>'模擬經營','bone-market-tycoon'=>'模擬經營',
     'beetle-sumo-stable-manager'=>'競速・運動','sumo-frog-wrestler'=>'競速・運動',
     'junkyard-mech-wrestler'=>'競速・運動','desert-sail-racer'=>'競速・運動',
     'neon-taxi-driver'=>'競速・運動','ramen-truck-racer'=>'競速・運動',
     'paper-plane-racing-league'=>'競速・運動',
     'capoeira-rhythm-brawler'=>'音樂・節奏','klezmer-golem-rhythm-defense'=>'音樂・節奏',
     'bone-choir-rhythm-horror'=>'音樂・節奏','arcade-exorcist-rhythm'=>'音樂・節奏',
     'mushroom-knight-tactics'=>'策略戰棋','pickle-knight-tactics'=>'策略戰棋',
     'clockwork-tower-defense'=>'策略戰棋','drone-swarm-rts'=>'策略戰棋',
     'storm-lighthouse-rts'=>'策略戰棋','mushroom-subway-builder'=>'策略戰棋',
     'mycelium-city-builder'=>'策略戰棋','algae-factory-automation'=>'策略戰棋',
     'ant-colony-pheromone-strategy'=>'策略戰棋',
    ];
}

function gp_cat_of($slug, $core) {
    $override = gp_cat_override();
    if (isset($override[$slug])) return $override[$slug];
    $c = strtolower($slug . ' ' . $core);
    $has = fn($w) => str_contains($c, $w);
    if ($has('rhythm')) return '音樂・節奏';
    if ($has('horror')) return '恐怖・懸疑';
    if ($has('tactics')||$has('tower-defense')||$has('rts')||$has('automation')||$has('city-builder')||$has('strategy')) return '策略戰棋';
    if ($has('roguelike')||$has('soulslike')||$has('rpg')||$has('tamer')||$has('card-battler')||$has('match3')||$has('deckbuild')||$has('dungeon crawler')) return 'Roguelike・RPG';
    if ($has('racer')||$has('racing')||$has('driver')||$has('wrestler')||$has('sumo')||$has('taxi')) return '競速・運動';
    if ($has('puzzler')||$has('detective')||$has('lawyer')||$has('court')||$has('visual-novel')) return '敘事・解謎';
    if ($has('cozy')||$has('fishing')||$has('pet-sim')||$has('garden')||$has('tea')||$has('bathhouse')||$has('safari')||$has('pond')||$has('moth')||$has('moss')||$has('bonsai')||$has('cloud-whale')||$has('quilt')) return '休閒・療癒';
    if ($has('sim')||$has('shop')||$has('tycoon')||$has('colony')||$has('ranch')||$has('farm')||$has('vineyard')||$has('post-office')||$has('salvage')||$has('keeper')||$has('noodle-bar')) return '模擬經營';
    return '動作冒險';
}

function gp_load_custom($genDir) {
    $p = $genDir . '/custom.json';
    if (!is_file($p)) return [];
    $arr = json_decode(file_get_contents($p) ?: '', true);
    return is_array($arr) ? $arr : [];
}

function gp_collect_items() {
    $genDir = __DIR__;
    $all = [];
    foreach (glob($genDir . '/data_*.php') as $f) foreach (require $f as $r) $all[] = $r;
    usort($all, fn($a,$b) => strcmp($a[0], $b[0]));
    $items = []; $missing = [];
    foreach ($all as $g) {
        [$slug,$core,$hero,$concept,$atmo,$sys,$visuals,$enc,$targets,$system,$reward,$identity,$rule1,$rule2,$world,$themes,$prog,$meta] = $g;
        $p = dirname($genDir) . '/prompts/' . $slug . '.txt';
        if (!is_file($p)) { $missing[] = $slug; continue; }
        $items[] = [
            'slug' => $slug,
            'name' => ucwords(str_replace('-', ' ', $slug)),
            'cat' => gp_cat_of($slug, $core),
            'core' => $core, 'hero' => $hero, 'concept' => $concept,
            'atmo' => $atmo, 'sys' => $sys, 'system' => $system, 'world' => $world,
            'file' => 'prompts/' . $slug . '.txt',
            'prompt' => file_get_contents($p),
        ];
    }
    $seen = [];
    foreach ($items as $it) $seen[$it['slug']] = true;
    $customFiles = [];
    foreach (gp_load_custom($genDir) as $c) {
        if (!is_array($c) || !isset($c['slug'])) continue;
        $slug = $c['slug'];
        if (isset($seen[$slug])) continue;
        $seen[$slug] = true;
        $p = dirname($genDir) . '/prompts/' . $slug . '.txt';
        if (!is_file($p)) { $customFiles[] = $slug; continue; }
        $items[] = [
            'slug' => $slug,
            'name' => $c['name'] ?? ucwords(str_replace('-', ' ', $slug)),
            'cat' => $c['cat'] ?? gp_cat_of($slug, $c['core'] ?? ''),
            'core' => $c['core'] ?? '', 'hero' => $c['hero'] ?? '',
            'concept' => $c['concept'] ?? '', 'atmo' => $c['atmo'] ?? '',
            'sys' => $c['sys'] ?? '', 'system' => $c['system'] ?? '',
            'world' => $c['world'] ?? '',
            'file' => 'prompts/' . $slug . '.txt',
            'prompt' => file_get_contents($p),
            'custom' => true, // 前端據此顯示「自訂」標籤並允許刪除
        ];
    }
    usort($items, fn($a,$b) => strcmp($a['slug'], $b['slug']));
    return [$items, $missing, $customFiles];
}

function gp_render_html($items) {
    $json = json_encode($items, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    $json = str_replace('</', '<\/', $json);
    $total = count($items);
    $date = date('Y-m-d');
    $tpl = file_get_contents(__DIR__ . '/template.html');
    // %%VER%% = app-gen.js 內容雜湊（cache-busting），與 build_index.js 一致
    $assets = dirname(__DIR__) . '/assets/';
    $ver = substr(sha1((string)@file_get_contents($assets . 'app-gen.js') . (string)@file_get_contents($assets . 'i18n.js')), 0, 10);
    return str_replace(['%%DATA%%','%%TOTAL%%','%%DATE%%','%%VER%%'], [$json, $total, $date, $ver], $tpl);
}

function gp_rebuild_index() {
    [$items, $missing, $customFiles] = gp_collect_items();
    $html = gp_render_html($items);
    file_put_contents(dirname(__DIR__) . '/index.html', $html);
    return ['total' => count($items), 'missing' => $missing, 'customFiles' => $customFiles];
}
