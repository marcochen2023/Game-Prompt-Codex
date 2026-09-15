<?php
// Builds index.html (workspace root): searchable catalogue of all prompts.
// Catalogue logic (override + merge with _gen/custom.json + template) lives in
// lib_catalog.php so api/save_prompt.php rebuilds with the identical pipeline.
require __DIR__ . '/lib_catalog.php';
$r = gp_rebuild_index();
echo "items={$r['total']} missing=" . count($r['missing']) . PHP_EOL;
foreach ($r['missing'] as $m) echo "MISS $m\n";
foreach ($r['customFiles'] as $m) echo "MISS-CUSTOM $m\n";
