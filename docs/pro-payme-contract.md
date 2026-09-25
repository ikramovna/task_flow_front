# Pro and Payme backend contract needed for launch

The profile now advertises Pro and clearly says checkout is not available yet. No frontend state can prove that a payment succeeded. The backend must own orders, payment verification, and access to both Tiko AI and Telegram integration.

Suggested authenticated endpoints (final paths and payloads must be agreed with the backend):

- `GET /api/v1/me/pro/` → `{ "is_pro": false, "expires_at": null }`. This is the only source of Pro access for the web client. Refresh it after returning from checkout and on account load.
- `POST /api/v1/billing/payme/checkout/` → `{ "checkout_url": "https://checkout.paycom.uz/...", "order_id": "..." }`. The backend creates a unique order, selects the server-configured price and period, and generates the checkout URL. The client opens only the returned Payme URL.
- A backend Payme Merchant API endpoint processes payment state changes and cancellations. It verifies the merchant request, amount, order, and transaction identity before granting Pro. Repeated callbacks must not grant duplicate periods.
- The backend rejects `POST /api/v1/ai/tasks/` and Telegram connect or bot task actions when the account has no active Pro entitlement. Disconnecting Telegram should remain available. Provide a stable error code such as `pro_required` so the frontend can show the upgrade route.

The checkout return URL is a navigation event, not proof of payment. The frontend must call `GET /api/v1/me/pro/` after the user returns. Merchant credentials, payment amounts, and entitlement changes stay on the backend. The Pro price, billing period, refund behavior, and merchant configuration are still unspecified.

References: [Payme checkout URL format](https://developer.help.paycom.uz/initsializatsiya-platezhey/otpravka-cheka-po-metodu-get/), [Merchant API](https://developer.help.paycom.uz/protokol-merchant-api/), [PerformTransaction](https://developer.help.paycom.uz/metody-merchant-api/performtransaction/).
