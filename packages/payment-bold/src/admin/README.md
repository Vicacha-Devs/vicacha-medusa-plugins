# Medusa v2 Bold Payment Admin Module

This module injects an interactive Payment Operations Widget directly into the Medusa v2 Admin Panel under the **Order Details** screen (`order.details.after`).

---

## Features

1. **Smart POS Terminal Push (`bold-terminal`)**:
   - Dispatch checkout requests directly to physical Bold Smart Dataphones using serial numbers.
   - Live transaction status sync via Medusa Payment Module sessions.

2. **Payment Link & QR Generator (`bold-link` & `bold-online`)**:
   - Generate secure Bold online payment links on demand for phone/chat orders.
   - Automatic copy-to-clipboard functionality for customer sharing.

3. **HMAC Signature & Webhook Verification**:
   - Built-in signature validation ensuring payment state transitions are authenticated.

---

## How It Works

1. **Widget Mounting**:
   - The widget binds to `order.details.after` using `defineWidgetConfig`.
   - It retrieves the active `payment_collection_id` associated with the target order.

2. **API Communication**:
   - Operations hit custom admin routes under `/admin/bold/*` (e.g., `/admin/bold/pos-push`, `/admin/bold/payment-link`).
   - The API routes delegate execution directly to Medusa's native `Modules.PAYMENT` service rather than issuing detached external HTTP calls.

3. **State Management**:
   - Payment states update asynchronously via native Medusa webhook receivers (`/hooks/payment/bold-online`, `/hooks/payment/bold-terminal`).

---

## Usage Guide

### Pushing a Payment to a Physical POS Dataphone

1. Open any pending order in the **Medusa Admin Panel**.
2. Scroll to the **Bold Payment Actions** widget at the bottom of the order details page.
3. Select the terminal model (e.g., `Smart POS` or `Bold Neo`).
4. Enter the physical Dataphone's **Serial Number (S/N)**.
5. Click **Push to Dataphone**. The terminal will prompt the customer for card tap/chip/PIN insertion immediately.

### Generating a Payment Link

1. Click **Generate Link** inside the **Payment Link & QR** section of the widget.
2. Once generated, click the **Copy Icon** to copy the URL to your clipboard.
3. Send the link to the customer via WhatsApp, Email, or SMS.
