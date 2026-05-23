<?php

/** Quick DB persistence check (no HTTP). Run: php scripts/db-smoke-test.php */

require __DIR__ . '/../vendor/autoload.php';
$app = require __DIR__ . '/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\Promotion;

$db = config('database.connections.mysql.database');
echo "Database: {$db}\n";

$p = Promotion::create([
    'promo_code' => 'SMOKE-' . time(),
    'name' => 'DB smoke test',
    'start_date' => '2026-06-01',
    'end_date' => '2026-07-06',
    'status' => 'Active',
]);
echo "CREATE OK id={$p->id}\n";

$p->update(['name' => 'DB smoke renamed']);
$p->refresh();
if ($p->name !== 'DB smoke renamed') {
    fwrite(STDERR, "UPDATE failed\n");
    exit(1);
}
echo "UPDATE OK\n";

$p->delete();
if (! Promotion::withTrashed()->find($p->id)?->trashed()) {
    fwrite(STDERR, "SOFT DELETE failed\n");
    exit(1);
}
echo "SOFT DELETE OK\n";

$p->restore();
if ($p->fresh()->trashed()) {
    fwrite(STDERR, "RESTORE failed\n");
    exit(1);
}
echo "RESTORE OK\n";

$p->forceDelete();
echo "ALL_DB_SMOKE_TESTS_PASSED\n";
