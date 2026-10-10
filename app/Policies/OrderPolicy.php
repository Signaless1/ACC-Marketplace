<?php

namespace App\Policies;

use App\Models\Order;
use App\Models\User;

class OrderPolicy
{
    private function isParty(User $user, Order $order): bool
    {
        return $order->buyer_id === $user->id
            || $order->seller_id === $user->id;
    }

    public function confirm(User $user, Order $order): bool
    {
        return $order->seller_id === $user->id;
    }

    public function complete(User $user, Order $order): bool
    {
        return $this->isParty($user, $order);
    }

    public function cancel(User $user, Order $order): bool
    {
        return $this->isParty($user, $order);
    }

    public function message(User $user, Order $order): bool
    {
        return $this->isParty($user, $order);
    }

    /**
     * Only the buyer of an order may review it.
     */
    public function review(User $user, Order $order): bool
    {
        return $order->buyer_id === $user->id;
    }
}
