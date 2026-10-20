<?php

use App\Support\MessagePurger;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Messages deleted "for everyone" keep their content on file for a limited time
// so a dispute cannot be erased (see config/marketplace.php), then this removes
// it for good. Content is never purged while a report between the two people is
// still open. Needs the scheduler: * * * * * php artisan schedule:run
Artisan::command('messages:purge-deleted', function () {
    $count = MessagePurger::run();

    $this->info("Purged the content of {$count} deleted message(s).");
})->purpose('Permanently remove the content of messages deleted for everyone once the retention period is over');

Schedule::command('messages:purge-deleted')->daily();
