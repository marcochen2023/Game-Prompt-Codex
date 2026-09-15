<?php
// Backend ping: lets index.html detect whether the PHP backend is reachable.
// (file:// has no backend; XAMPP/Apache does.)
header('Content-Type: application/json; charset=utf-8');
echo json_encode(['ok' => true, 'backend' => 'php', 'time' => date('c')]);
