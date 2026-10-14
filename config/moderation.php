<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Automatic suspension
    |--------------------------------------------------------------------------
    |
    | A user is suspended automatically once this many DIFFERENT people have an
    | open report against them. The floor is 2 so that a single person can
    | never get an account suspended on their own, whatever the .env says.
    |
    */

    'auto_suspend_reports' => max(2, (int) env('AUTO_SUSPEND_REPORTS', 2)),

];
