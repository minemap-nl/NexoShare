/**
 * Light-mode Nexo Share email shell (table-based, email-client safe).
 * Intentionally no prefers-color-scheme:dark — clients often invert dark templates.
 */

const FONT_STACK = "'Plus Jakarta Sans', 'Segoe UI', Helvetica, Arial, sans-serif";

const COLORS = {
    pageBg: '#f0fdfa',
    cardBg: '#ffffff',
    cardBorder: '#e2e8f0',
    primary: '#0d9488',
    primaryDark: '#0f766e',
    accentMid: '#14a789',
    text: '#0f172a',
    muted: '#475569',
    footer: '#94a3b8',
    messageBg: '#f8fafc',
    messageBorder: '#14b8a6',
} as const;

export const EMAIL_MESSAGE_BOX_STYLE =
    `background: ${COLORS.messageBg}; padding: 15px; border-radius: 8px; margin: 20px 0; color: ${COLORS.muted}; border-left: 4px solid ${COLORS.messageBorder};`;

export const DEFAULT_EMAIL_LOGO_PATH = '/logo-email.png';

function escapeHtml(unsafe: string | unknown): string {
    if (!unsafe || typeof unsafe !== 'string') return '';
    return unsafe
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function escapeAttr(unsafe: string): string {
    return escapeHtml(unsafe);
}

/** Resolve logo src for email clients (absolute http(s) URLs only work reliably). */
export function resolveEmailLogoSrc(logoUrl: string | undefined | null, baseUrl: string): string {
    const base = (baseUrl || '').replace(/\/$/, '');
    const custom = typeof logoUrl === 'string' ? logoUrl.trim() : '';

    if (custom) {
        if (/^https?:\/\//i.test(custom)) return custom;
        if (custom.startsWith('/')) return `${base}${custom}`;
        return `${base}/${custom}`;
    }

    return `${base}${DEFAULT_EMAIL_LOGO_PATH}`;
}

export type BuildEmailHtmlOptions = {
    appName: string;
    subject: string;
    bodyHtml: string;
    ctaLink?: string;
    ctaText?: string;
    /** Already-resolved absolute logo URL */
    logoSrc: string;
};

export function buildEmailHtml(opts: BuildEmailHtmlOptions): string {
    const safeAppName = escapeHtml(opts.appName || 'Nexo Share');
    const safeSubject = escapeHtml(opts.subject);
    const safeLogoSrc = escapeAttr(opts.logoSrc);
    const bodyHtml = opts.bodyHtml || '';

    let safeLink = '#';
    if (opts.ctaLink && (opts.ctaLink.startsWith('http://') || opts.ctaLink.startsWith('https://'))) {
        safeLink = opts.ctaLink;
    }

    const logoHtml = `<img src="${safeLogoSrc}" alt="${safeAppName}" style="display: block; margin: 0 auto; max-height: 48px; max-width: 220px; width: auto; height: auto; border: 0; outline: none; text-decoration: none;">`;

    const buttonHtml = opts.ctaLink
        ? `
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin-top: 28px; width: 100%; border-collapse: separate;">
              <tbody><tr><td align="center">
                <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="border-collapse: separate;">
                  <tbody><tr>
                    <td align="center" bgcolor="${COLORS.primary}" style="background-color: ${COLORS.primary}; border-radius: 8px; mso-padding-alt: 12px 28px;">
                      <a href="${escapeAttr(safeLink)}" target="_blank" style="background-color: ${COLORS.primary}; border: solid 1px ${COLORS.primaryDark}; border-radius: 8px; box-sizing: border-box; color: #ffffff; cursor: pointer; display: inline-block; font-family: ${FONT_STACK}; font-size: 15px; font-weight: 700; margin: 0; padding: 12px 28px; text-decoration: none;">${escapeHtml(opts.ctaText || 'View')}</a>
                    </td>
                  </tr></tbody>
                </table>
              </td></tr></tbody>
            </table>`
        : '';

    return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light">
<title>${safeSubject}</title>
<style>
  :root { color-scheme: light only; supported-color-schemes: light; }
  html, body { color-scheme: light only; }
  @media only screen and (max-width: 620px) {
    table.body .container { width: 100% !important; max-width: 100% !important; padding: 0 !important; }
    table.body .wrapper { padding: 28px 20px !important; }
    table.body h1, table.body h2 { font-size: 22px !important; }
  }
</style>
<!--[if mso]>
<style type="text/css">
  body, table, td { font-family: Arial, Helvetica, sans-serif !important; }
</style>
<![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: ${COLORS.pageBg}; color: ${COLORS.text}; font-family: ${FONT_STACK}; -webkit-font-smoothing: antialiased; font-size: 15px; line-height: 1.55; -ms-text-size-adjust: 100%; -webkit-text-size-adjust: 100%;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" class="body" width="100%" style="border-collapse: separate; mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: ${COLORS.pageBg}; width: 100%;">
    <tr>
      <td>&nbsp;</td>
      <td class="container" style="display: block; margin: 0 auto !important; max-width: 580px; padding: 24px 12px; width: 580px;">
        <div style="box-sizing: border-box; display: block; margin: 0 auto; max-width: 580px;">
          <table role="presentation" class="main email-container" width="100%" style="border-collapse: separate; mso-table-lspace: 0pt; mso-table-rspace: 0pt; background: ${COLORS.cardBg}; border: 1px solid ${COLORS.cardBorder}; border-radius: 12px; width: 100%; overflow: hidden;">
            <tr>
              <td style="padding: 0; font-size: 0; line-height: 0;">
                <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
                  <tr>
                    <td bgcolor="${COLORS.primary}" style="background-color: ${COLORS.primary}; background-image: linear-gradient(135deg, #23736b 0%, #0ba07d 27%, #14a789 46%, #047a83 100%); height: 4px; font-size: 0; line-height: 0;">&nbsp;</td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td class="wrapper" style="font-family: ${FONT_STACK}; font-size: 15px; vertical-align: top; box-sizing: border-box; padding: 36px 40px 40px;">
                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse: separate; width: 100%;">
                  <tr>
                    <td style="font-family: ${FONT_STACK}; font-size: 15px; vertical-align: top; text-align: center;">
                      ${logoHtml}
                      <h1 style="color: ${COLORS.text}; margin: 20px 0 8px 0; font-size: 22px; font-weight: 700; line-height: 1.3; letter-spacing: -0.02em;">${safeSubject}</h1>
                      <div style="text-align: left; width: 100%; color: ${COLORS.muted}; font-size: 15px; line-height: 1.6;">
                        ${bodyHtml}
                      </div>
                      ${buttonHtml}
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse: separate; width: 100%; margin-top: 16px;">
            <tr>
              <td style="font-family: ${FONT_STACK}; color: ${COLORS.footer}; font-size: 12px; text-align: center; padding: 4px 0 8px;">
                Sent via ${safeAppName}
              </td>
            </tr>
          </table>
        </div>
      </td>
      <td>&nbsp;</td>
    </tr>
  </table>
</body>
</html>`;
}
