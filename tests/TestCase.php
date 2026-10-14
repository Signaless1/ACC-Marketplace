<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    //

    protected function setUp(): void
    {
        parent::setUp();

        // Pages render the real layout, which asks Vite for built assets.
        // Tests should pass on a fresh checkout without running `npm run build`.
        $this->withoutVite();
    }
}
