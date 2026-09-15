<?php
// Combines _gen/data_*.php and renders 100 prompt txt files into prompts/.
$all = [];
foreach (glob(__DIR__ . '/data_*.php') as $f) {
    $rows = require $f;
    foreach ($rows as $r) $all[] = $r;
}
@mkdir(__DIR__ . '/../prompts', 0777, true);
$seen = [];
$n = 0;
foreach ($all as $g) {
    [$slug,$core,$hero,$concept,$atmo,$sys,$visuals,$enc,$targets,$system,$reward,$identity,$rule1,$rule2,$world,$themes,$prog,$meta] = $g;
    $art = preg_match('/^[aeiou]/i', trim($identity)) ? 'an' : 'a';
    $cart = preg_match('/^[aeiou]/i', trim($core)) ? 'an' : 'a';
    $file = $slug;
    if (isset($seen[$file])) $file .= '-' . (++$seen[$slug]);
    $seen[$slug] = ($seen[$slug] ?? 1);
    $seen[$file] = 1;
    $txt = "打造一款{$core}，細節如下：\n\n"
    . "1.Generate five concept images for {$cart} {$core}. Keep characters, props, and creatures simple and readable. Explore distinct environments with {$visuals}. Aim for the atmosphere of {$atmo} and the systemic variety of {$sys}.\n\n"
    . "2.Build a short, polished {$enc} from the attached {$concept} concept. Draw the graphics in code and make the character controllable, with {$targets}. Put {$system} at the center of the {$enc}, and make the lighting and {$system} effects match the selected visual direction.\n\n"
    . "3.Play through the first {$enc} and identify where movement or interactions feel awkward. Improve the {$hero}'s movement and action animations so actions feel responsive and are easy to follow. Test the {$enc} again while preserving the existing {$system} interactions.\n\n"
    . "4.Add experience points to the playable prototype. Award experience for {$reward}, track the total, and show progress clearly in the interface. Play through the {$enc} to check that rewards are recorded correctly.\n\n"
    . "5.Give the {$hero} {$art} clearly readable {$identity}. Adjust the {$hero}'s facing and gear layering for each movement direction, especially when facing upward, so the {$identity} sits correctly behind the character. Check the result while moving and interacting.\n\n"
    . "6.{$rule1}\n\n"
    . "7.{$rule2}\n\n"
    . "8.Expand the playable {$world} into seven distinct {$themes}. Give each theme its own environment and atmosphere while preserving the established movement, interaction, and {$system} rules. Connect the {$themes} into a {$prog} that the player can progress through.\n\n"
    . "9.Add {$meta} for what is earned in the {$world}. Let players inspect, store, and swap items, and show how equipped choices affect character stats. Check that collecting and changing loadout works during a run.\n";
    file_put_contents(__DIR__ . '/../prompts/' . $file . '.txt', $txt);
    $n++;
}
echo "wrote $n files\n";
