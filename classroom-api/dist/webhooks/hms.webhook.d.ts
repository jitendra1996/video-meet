import type { Request, Response } from "express";
/**
 * 100ms sends webhooks for session events, recording status, etc.
 * Configure the webhook URL in the 100ms dashboard to point to POST /webhooks/hms
 *
 * Signature verification: if HMS_WEBHOOK_SECRET is set, we expect
 * header `X-100ms-Signature` = HMAC-SHA256(rawBody, secret) in hex (adjust to match dashboard format).
 */
export declare function hmsWebhookHandler(req: Request, res: Response): Promise<void>;
//# sourceMappingURL=hms.webhook.d.ts.map