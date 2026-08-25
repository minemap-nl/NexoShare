/**
 * One-off generator for local email-preview.html (gitignored).
 * Run: bun scripts/generate-email-preview.ts
 */
import fs from 'fs';
import path from 'path';
import {
    buildEmailHtml,
    resolveEmailLogoSrc,
    EMAIL_MESSAGE_BOX_STYLE,
} from '../src/lib/emailTemplate';

const root = path.resolve(import.meta.dir, '../..');
const outPath = path.join(root, 'email-preview.html');
const logoDefault = 'frontend/public/logo-email.png';
const logoCustom = 'https://placehold.co/400x80/0d9488/ffffff?text=Acme+Corp';

function wrap(title: string, note: string, html: string): string {
    return `<section class="preview-card">
    <header class="preview-meta">
      <h2>${title}</h2>
      <p>${note}</p>
    </header>
    <div class="preview-frame">${html}</div>
  </section>`;
}

function msgBox(text: string): string {
    return `<div class="message-box" style="${EMAIL_MESSAGE_BOX_STYLE}">${text}</div>`;
}

const examples = [
    wrap(
        'Password reset',
        'Default Nexo Share logo',
        buildEmailHtml({
            appName: 'Nexo Share',
            subject: 'Reset Password',
            bodyHtml:
                '<p>Hello Alex,</p><p>You have requested a password reset. Click the button below to proceed.</p><p>This link is valid for 1 hour.</p>',
            ctaLink: 'https://example.com/reset-password?token=demo',
            ctaText: 'Reset Password',
            logoSrc: logoDefault,
        })
    ),
    wrap(
        'Files received',
        'Default logo + message box',
        buildEmailHtml({
            appName: 'Nexo Share',
            subject: 'Files received',
            bodyHtml:
                '<p><strong>admin@nexoshare.nl</strong> shared files with you.</p>' +
                msgBox('Here are the project assets for Q3. Please download within 7 days.'),
            ctaLink: 'https://example.com/s/abc123',
            ctaText: 'Download Files',
            logoSrc: logoDefault,
        })
    ),
    wrap(
        'Reminder: Files received',
        'Default logo',
        buildEmailHtml({
            appName: 'Nexo Share',
            subject: 'Reminder: Files received',
            bodyHtml:
                '<p><strong>admin@nexoshare.nl</strong> sent the link again.</p>' +
                msgBox('Here is the link.'),
            ctaLink: 'https://example.com/s/abc123',
            ctaText: 'Download Files',
            logoSrc: logoDefault,
        })
    ),
    wrap(
        'Upload request',
        'Default logo',
        buildEmailHtml({
            appName: 'Nexo Share',
            subject: 'Upload Request',
            bodyHtml: '<p><strong>admin@nexoshare.nl</strong> invited you to upload files.</p>',
            ctaLink: 'https://example.com/r/xyz789',
            ctaText: 'Upload Files',
            logoSrc: logoDefault,
        })
    ),
    wrap(
        'New upload notification',
        'Default logo',
        buildEmailHtml({
            appName: 'Nexo Share',
            subject: 'New Upload in "Client intake"',
            bodyHtml: '<p>There are 3 new files uploaded via your public link.</p>',
            ctaLink: 'https://example.com/reverse',
            ctaText: 'View Dashboard',
            logoSrc: logoDefault,
        })
    ),
    wrap(
        'SMTP test',
        'Default logo, no CTA',
        buildEmailHtml({
            appName: 'Nexo Share',
            subject: 'Test Email from Nexo Share',
            bodyHtml:
                '<p style="margin: 0 0 12px 0; color: #475569;">Your SMTP settings are correct. This message uses the same template as other Nexo Share emails.</p>',
            logoSrc: logoDefault,
        })
    ),
    wrap(
        'Custom logo (wide)',
        'resolveEmailLogoSrc with absolute custom URL — max 220×48 constraints',
        buildEmailHtml({
            appName: 'Acme Share',
            subject: 'Files received',
            bodyHtml:
                '<p><strong>you@acme.com</strong> shared files with you.</p>' +
                msgBox(
                    'Custom branding logo should stay within max-height 48px / max-width 220px.'
                ),
            ctaLink: 'https://example.com/s/custom',
            ctaText: 'Download Files',
            logoSrc: resolveEmailLogoSrc(logoCustom, 'https://example.com'),
        })
    ),
    wrap(
        'Relative custom logo path',
        'Shows how /api/uploads/system/... becomes absolute (preview uses default image; resolved URL shown in body)',
        buildEmailHtml({
            appName: 'Nexo Share',
            subject: 'Upload Request',
            bodyHtml:
                '<p><strong>admin@nexoshare.nl</strong> invited you to upload files.</p><p style="font-size:12px;color:#94a3b8">Logo src would resolve to: ' +
                resolveEmailLogoSrc(
                    '/api/uploads/system/logo-demo.png',
                    'https://share.example.com'
                ) +
                '</p>',
            ctaLink: 'https://share.example.com/r/rel',
            ctaText: 'Upload Files',
            logoSrc: logoDefault,
        })
    ),
];

const page = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="color-scheme" content="light only">
<title>Nexo Share — Email template preview</title>
<style>
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: 'Plus Jakarta Sans', 'Segoe UI', Helvetica, Arial, sans-serif;
    background: #e2e8f0;
    color: #0f172a;
  }
  .page-header {
    max-width: 960px;
    margin: 0 auto;
    padding: 32px 20px 8px;
  }
  .page-header h1 { margin: 0 0 8px; font-size: 28px; letter-spacing: -0.02em; }
  .page-header p { margin: 0; color: #475569; max-width: 60ch; line-height: 1.5; }
  .grid {
    max-width: 960px;
    margin: 0 auto;
    padding: 24px 20px 64px;
    display: flex;
    flex-direction: column;
    gap: 28px;
  }
  .preview-card {
    background: #fff;
    border: 1px solid #cbd5e1;
    border-radius: 16px;
    overflow: hidden;
  }
  .preview-meta {
    padding: 16px 20px;
    border-bottom: 1px solid #e2e8f0;
    background: #f8fafc;
  }
  .preview-meta h2 { margin: 0 0 4px; font-size: 16px; }
  .preview-meta p { margin: 0; font-size: 13px; color: #64748b; }
  .preview-frame { background: #f0fdfa; }
  .preview-frame > table { margin: 0 auto; }
</style>
</head>
<body>
  <header class="page-header">
    <h1>Nexo Share email templates</h1>
    <p>Local preview only (gitignored). Rate each variant. Light mode only — matches production shell from <code>backend/src/lib/emailTemplate.ts</code>.</p>
  </header>
  <main class="grid">
${examples.join('\n')}
  </main>
</body>
</html>
`;

fs.writeFileSync(outPath, page);
console.log('Wrote', outPath);
