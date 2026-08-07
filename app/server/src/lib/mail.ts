import nodemailer, { type Transporter } from 'nodemailer';

/**
 * Outbound email (spec E-D4).
 *
 * ## Why a driver, and why "not configured" is a real state
 *
 * The sprint plan named this sprint's blocking question as *mail infrastructure —
 * a sending domain and SPF/DKIM, not an afternoon*. That is true, and it blocks
 * **delivery to real inboxes**. It does not block the feature: SMTP against a
 * local catcher is real SMTP, and production becomes an env change.
 *
 * So the driver is explicit and the effective driver is reported. This is
 * deliberately **not** the decorative-toggle pattern Sprint 5 spent itself
 * removing, and the difference is worth stating because it looks similar from a
 * distance: a decorative toggle claims an effect it does not have and gives the
 * user no way to tell. This reports exactly what it will do, refuses to claim a
 * message was sent when it was not, and changes behaviour the moment it is
 * configured. `SendResult.sent` is the whole point — callers must not assume.
 *
 * ## Never on the request path
 *
 * `sendMail` is called from invite creation and from regression alerting, and
 * regression alerting runs **inside the ingest request**. A slow or unreachable
 * mail server must never turn someone's error report into a 500 or a 30-second
 * hang. Everything here is bounded by a timeout and every failure is swallowed
 * after logging — the same rule `lib/alerts.ts` already applies to webhooks.
 */

export type MailDriver = 'console' | 'smtp' | 'noop';

export interface MailMessage {
    to: string;
    subject: string;
    text: string;
    html?: string;
}

export interface SendResult {
    /** True ONLY when a transport accepted the message. `console` is always false. */
    sent: boolean;
    driver: MailDriver;
    /** Present on failure. Safe to log; never contains credentials. */
    error?: string;
}

const VALID_DRIVERS: MailDriver[] = ['console', 'smtp', 'noop'];

/**
 * Read per call rather than captured at import.
 *
 * Same reasoning as `api/ai.ts`'s API key: a value captured at module load makes
 * the status endpoint report the state at boot, which is a status endpoint that
 * can be confidently wrong. It also makes the module untestable without module
 * cache surgery.
 */
export function currentDriver(): MailDriver {
    const raw = (process.env.MAIL_DRIVER || 'console').toLowerCase() as MailDriver;
    // An unrecognised value falls back to `console` rather than throwing at boot.
    // A typo'd MAIL_DRIVER should degrade to "logs instead of sends", not "the
    // API will not start".
    return VALID_DRIVERS.includes(raw) ? raw : 'console';
}

export function mailFrom(): string {
    return process.env.MAIL_FROM || 'ApexOps <no-reply@localhost>';
}

const SEND_TIMEOUT_MS = parseInt(process.env.MAIL_TIMEOUT_MS || '10000', 10);

let cached: Transporter | null = null;
let cachedFor: string | null = null;

function smtpTransport(): Transporter {
    const host = process.env.SMTP_HOST || 'localhost';
    const port = parseInt(process.env.SMTP_PORT || '1025', 10);
    const secure = process.env.SMTP_SECURE === 'true';
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    // Keyed on the settings so a changed env produces a new transport rather than
    // a stale connection pool pointed at the old host.
    const key = `${host}:${port}:${secure}:${user ?? ''}`;
    if (cached && cachedFor === key) return cached;

    cached = nodemailer.createTransport({
        host,
        port,
        secure,
        // Omitted ENTIRELY when unset, not passed as empty strings: Mailpit and
        // most dev catchers accept no auth, and offering `{ user: '', pass: '' }`
        // makes nodemailer attempt AUTH and the connection fail with an error
        // that reads like a credential problem.
        ...(user && pass ? { auth: { user, pass } } : {}),
        connectionTimeout: SEND_TIMEOUT_MS,
        greetingTimeout: SEND_TIMEOUT_MS,
        socketTimeout: SEND_TIMEOUT_MS,
    });
    cachedFor = key;
    return cached;
}

/** Test seam — drops the cached transport so a changed env is picked up. */
export function resetMailTransport(): void {
    cached = null;
    cachedFor = null;
}

/**
 * Send a message. **Never throws, never blocks longer than the timeout.**
 *
 * Returns `sent: false` rather than raising, because every caller is on a path
 * where failing the surrounding operation would be worse than not sending: an
 * invite that was created should still be usable via its URL, and an ingested
 * error should still be recorded.
 */
export async function sendMail(message: MailMessage): Promise<SendResult> {
    const driver = currentDriver();

    if (driver === 'noop') return { sent: false, driver };

    if (driver === 'console') {
        // Rendered in full so the development path is genuinely useful — the
        // point is to be able to read the message and click the link, not to see
        // that a function was called.
        console.log(
            [
                '───────────── mail (console driver — NOT sent) ─────────────',
                `from:    ${mailFrom()}`,
                `to:      ${message.to}`,
                `subject: ${message.subject}`,
                '',
                message.text,
                '────────────────────────────────────────────────────────────',
            ].join('\n'),
        );
        return { sent: false, driver };
    }

    try {
        const transport = smtpTransport();
        await withTimeout(
            transport.sendMail({
                from: mailFrom(),
                to: message.to,
                subject: message.subject,
                text: message.text,
                ...(message.html ? { html: message.html } : {}),
            }),
            SEND_TIMEOUT_MS,
        );
        return { sent: true, driver };
    } catch (err) {
        // Logged, never rethrown, and never echoed to a caller: a transport error
        // can name the host and, with some providers, the username.
        const detail = err instanceof Error ? err.message : String(err);
        console.error(`[mail] send failed (${driver}):`, detail);
        return { sent: false, driver, error: 'Mail delivery failed' };
    }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return Promise.race([
        promise,
        new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error(`Timed out after ${ms}ms`)), ms).unref?.(),
        ),
    ]);
}

/** Fire and forget, for paths that must not wait — see the module note. */
export function sendMailDetached(message: MailMessage): void {
    void sendMail(message).catch(() => undefined);
}

/** What `/api/mail/status` reports. Never includes credentials. */
export function mailStatus() {
    const driver = currentDriver();
    return {
        driver,
        from: mailFrom(),
        // `configured` means "will attempt real delivery", which is the only
        // question anyone is actually asking.
        configured: driver === 'smtp',
        ...(driver === 'smtp'
            ? {
                host: process.env.SMTP_HOST || 'localhost',
                port: parseInt(process.env.SMTP_PORT || '1025', 10),
                // Whether auth is in use, never the credentials themselves.
                auth: Boolean(process.env.SMTP_USER && process.env.SMTP_PASS),
            }
            : {}),
        message:
            driver === 'smtp'
                ? 'Email will be delivered over SMTP'
                : driver === 'console'
                    ? 'Email is not configured — messages are logged, not sent'
                    : 'Email is disabled',
    };
}
