import type { MailMessage } from './mail';

/**
 * Message bodies (spec E-D4).
 *
 * Plain text plus a minimal HTML part, and nothing resembling a template engine.
 * A template system is a project of its own — layouts, partials, previewing,
 * inlining CSS for mail clients that stopped at 2003 — and this sprint sends two
 * kinds of message.
 *
 * The text part is not a fallback. It is the message; the HTML part is the same
 * words with a link styled. That ordering keeps every message readable in a
 * terminal, in the console driver's log, and in a client with images off.
 *
 * **The URL is always present as text, never only inside an anchor.** A link
 * someone cannot copy out of a mail client that ate the markup is not a delivery
 * mechanism.
 */

const escapeHtml = (s: string): string =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function wrap(title: string, bodyHtml: string): string {
    return [
        '<div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;line-height:1.55;color:#1a1a1a">',
        `<h2 style="font-size:18px;margin:0 0 12px">${escapeHtml(title)}</h2>`,
        bodyHtml,
        '</div>',
    ].join('');
}

export interface InviteMailInput {
    to: string;
    projectName: string;
    inviterEmail: string;
    role: string;
    inviteUrl: string;
    expiresAt: Date;
}

export function inviteEmail(input: InviteMailInput): MailMessage {
    const { to, projectName, inviterEmail, role, inviteUrl, expiresAt } = input;
    const expires = expiresAt.toISOString().slice(0, 10);

    const text = [
        `${inviterEmail} invited you to join "${projectName}" on ApexOps as ${role}.`,
        '',
        'Accept the invitation:',
        inviteUrl,
        '',
        `This link expires on ${expires}.`,
        'If you did not expect this, you can ignore this message — nothing happens until you open the link.',
    ].join('\n');

    const html = wrap(
        `You were invited to ${projectName}`,
        [
            `<p>${escapeHtml(inviterEmail)} invited you to join <strong>${escapeHtml(projectName)}</strong> as ${escapeHtml(role)}.</p>`,
            `<p><a href="${escapeHtml(inviteUrl)}" style="display:inline-block;padding:10px 18px;background:#1a1a1a;color:#fff;border-radius:8px;text-decoration:none">Accept invitation</a></p>`,
            // Also as plain text, deliberately — see the module note.
            `<p style="font-size:12px;color:#666">Or paste this link: ${escapeHtml(inviteUrl)}</p>`,
            `<p style="font-size:12px;color:#666">Expires ${escapeHtml(expires)}. If you did not expect this, ignore it — nothing happens until you open the link.</p>`,
        ].join(''),
    );

    return { to, subject: `You were invited to ${projectName} on ApexOps`, text, html };
}

export interface RegressionMailInput {
    to: string;
    projectName: string;
    issueTitle: string;
    culprit: string | null;
    reopenCount: number;
    issueUrl?: string;
}

export function regressionEmail(input: RegressionMailInput): MailMessage {
    const { to, projectName, issueTitle, culprit, reopenCount, issueUrl } = input;

    // Singular and plural spelled out rather than "time(s)". This lands during an
    // incident; it should read like a person wrote it.
    const times = reopenCount === 1 ? 'once' : `${reopenCount} times`;

    const text = [
        `An issue you resolved in "${projectName}" has come back.`,
        '',
        issueTitle,
        culprit ? `at ${culprit}` : '',
        `Reopened ${times}.`,
        '',
        ...(issueUrl ? ['View the issue:', issueUrl, ''] : []),
        'You are receiving this because regression alerts are on for this project.',
        'Turn them off in the project settings.',
    ]
        .filter((line, i, all) => !(line === '' && all[i - 1] === ''))
        .join('\n');

    const html = wrap(
        `Regression in ${projectName}`,
        [
            `<p>An issue you resolved has come back.</p>`,
            `<p style="padding:12px;background:#f6f6f6;border-radius:8px"><strong>${escapeHtml(issueTitle)}</strong>`,
            culprit ? `<br><span style="font-family:ui-monospace,monospace;font-size:12px;color:#666">${escapeHtml(culprit)}</span>` : '',
            `<br><span style="font-size:12px;color:#666">Reopened ${escapeHtml(times)}.</span></p>`,
            issueUrl ? `<p><a href="${escapeHtml(issueUrl)}">View the issue</a><br><span style="font-size:12px;color:#666">${escapeHtml(issueUrl)}</span></p>` : '',
            `<p style="font-size:12px;color:#666">You are receiving this because regression alerts are on for this project. Turn them off in the project settings.</p>`,
        ].join(''),
    );

    return { to, subject: `Regression: ${issueTitle}`.slice(0, 160), text, html };
}

export interface SessionReuseMailInput {
    to: string;
    /** When the affected session was originally created — the account holder's
     *  own anchor point for "was this me?", since the attacker's IP/UA are not
     *  reliably useful to show a non-technical reader. */
    sessionCreatedAt: Date;
}

/**
 * Sent when `/refresh` detects a refresh token presented a second time (phase
 * 3, A4) — the signal that it was copied and the copy is now racing the
 * original device. The whole session family is already revoked by the time
 * this is sent; the email is a notification, not a request for action beyond
 * "sign in again, and change your password if this was not you".
 */
export function sessionReuseEmail(input: SessionReuseMailInput): MailMessage {
    const { to, sessionCreatedAt } = input;
    const created = sessionCreatedAt.toISOString().slice(0, 16).replace('T', ' ') + ' UTC';

    const text = [
        'ApexOps signed you out of every device.',
        '',
        `A sign-in session created ${created} was used from two places at once — ` +
            'the sign of a copied credential, not an ordinary reconnect.',
        '',
        'As a precaution, every device using that session has been signed out. ' +
            'Sign in again to continue.',
        '',
        'If this was not you, change your password now.',
    ].join('\n');

    const html = wrap('You were signed out of every device', [
        `<p>A sign-in session created <strong>${escapeHtml(created)}</strong> was used from two places at ` +
            'once — the sign of a copied credential, not an ordinary reconnect.</p>',
        '<p>As a precaution, every device using that session has been signed out. Sign in again to continue.</p>',
        '<p style="font-size:12px;color:#666">If this was not you, change your password now.</p>',
    ].join(''));

    return { to, subject: 'ApexOps: you were signed out of every device', text, html };
}
