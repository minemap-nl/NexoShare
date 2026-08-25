export type ShareVariant = 'outbound' | 'reverse';

export type ShareTextInput = {
    variant: ShareVariant;
    name?: string;
    /** Optional note / message shown to the recipient */
    description?: string;
    expiresAt?: string | Date | null;
    url: string;
    locale?: string;
};

const DEFAULT_TITLES = new Set(['share', 'reverse share']);

function isDutchLocale(locale?: string): boolean {
    return (locale || '').toLowerCase() === 'nl-nl';
}

function displayTitle(name?: string): string | undefined {
    const n = name?.trim();
    if (!n) return undefined;
    if (DEFAULT_TITLES.has(n.toLowerCase())) return undefined;
    return n;
}

function formatExpiryParts(
    expiresAt: string | Date,
    locale?: string
): { date: string; time: string } | null {
    const d = typeof expiresAt === 'string' ? new Date(expiresAt) : expiresAt;
    if (Number.isNaN(d.getTime())) return null;
    const loc = isDutchLocale(locale) ? 'nl-NL' : 'en-GB';
    return {
        date: d.toLocaleDateString(loc, { dateStyle: 'long' }),
        time: d.toLocaleTimeString(loc, { timeStyle: 'short' }),
    };
}

function expiryLine(
    dutch: boolean,
    expiresAt: string | Date | null | undefined,
    locale?: string,
    mode: 'download' | 'upload' = 'download'
): string {
    if (expiresAt) {
        const parts = formatExpiryParts(expiresAt, locale);
        if (parts) {
            if (mode === 'upload') {
                return dutch
                    ? `Uploaden kan tot ${parts.date} om ${parts.time}.`
                    : `Uploads accepted until ${parts.date} at ${parts.time}.`;
            }
            return dutch
                ? `Downloaden kan tot ${parts.date} om ${parts.time}.`
                : `Available until ${parts.date} at ${parts.time}.`;
        }
    }
    return dutch ? 'Deze link verloopt niet.' : 'This link does not expire.';
}

function joinLines(lines: string[]): string {
    return lines.filter((line) => line.length > 0).join('\n');
}

function buildOutboundText(dutch: boolean, input: ShareTextInput): string {
    const title = displayTitle(input.name);
    const message = input.description?.trim();
    const lines: string[] = [];

    if (title) {
        lines.push(
            dutch
                ? `Ik deel bestanden met je voor ${title} via Nexo Share.`
                : `I'm sharing files with you for ${title} via Nexo Share.`
        );
    } else {
        lines.push(
            dutch
                ? 'Ik deel bestanden met je via Nexo Share.'
                : "I'm sharing files with you via Nexo Share."
        );
    }

    if (message) {
        lines.push(dutch ? `Beschrijving: ${message}` : `Description: ${message}`);
    }

    lines.push(expiryLine(dutch, input.expiresAt, input.locale, 'download'));
    lines.push(dutch ? `Downloadlink: ${input.url}` : `Download link: ${input.url}`);

    return joinLines(lines);
}

function buildReverseText(dutch: boolean, input: ShareTextInput): string {
    const title = displayTitle(input.name);
    const message = input.description?.trim();
    const lines: string[] = [];

    if (title) {
        lines.push(
            dutch
                ? `Je kunt via onderstaande link veilig bestanden naar mij uploaden voor ${title}.`
                : `You can securely upload files to me for ${title} using the link below.`
        );
    } else {
        lines.push(
            dutch
                ? 'Je kunt via onderstaande link veilig bestanden naar mij uploaden.'
                : 'You can securely upload files to me using the link below.'
        );
    }

    if (message) {
        lines.push(dutch ? `Beschrijving: ${message}` : `Description: ${message}`);
    }

    lines.push(expiryLine(dutch, input.expiresAt, input.locale, 'upload'));
    lines.push(dutch ? `Uploadlink: ${input.url}` : `Upload link: ${input.url}`);

    return joinLines(lines);
}

export function buildShareText(input: ShareTextInput): string {
    const dutch = isDutchLocale(input.locale);
    if (input.variant === 'reverse') {
        return buildReverseText(dutch, input);
    }
    return buildOutboundText(dutch, input);
}

export function getShareTitle(input: ShareTextInput): string {
    const dutch = isDutchLocale(input.locale);
    const title = displayTitle(input.name);

    if (input.variant === 'reverse') {
        return dutch
            ? title
                ? `Bestanden uploaden — ${title}`
                : 'Bestanden uploaden'
            : title
              ? `Upload files — ${title}`
              : 'Upload files';
    }

    return dutch
        ? title
            ? `Bestanden gedeeld — ${title}`
            : 'Bestanden gedeeld'
        : title
          ? `Files shared — ${title}`
          : 'Files shared';
}
