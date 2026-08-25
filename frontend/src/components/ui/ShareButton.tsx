import { Share2 } from 'lucide-react';
import { shareOrCopy } from '../../lib/deviceShare';
import { buildShareText, getShareTitle, type ShareTextInput } from '../../lib/shareText';

type ShareButtonProps = ShareTextInput & {
    onCopied: () => void;
    className?: string;
    /** Icon-only, fits beside copy buttons in lists */
    compact?: boolean;
    /** Show "Share" label (default: true unless compact) */
    showLabel?: boolean;
    /** Match height of p-2 icon buttons in action rows (e.g. reverse share list) */
    iconRow?: boolean;
};

export function ShareButton({
    onCopied,
    className = '',
    compact = false,
    showLabel,
    iconRow = false,
    ...input
}: ShareButtonProps) {
    const labelVisible = showLabel ?? !compact;
    const handleShare = async () => {
        const text = buildShareText(input);
        try {
            await shareOrCopy({
                text,
                url: input.url,
                title: getShareTitle(input),
                onCopied,
            });
        } catch {
            onCopied();
        }
    };

    const sizeClass = iconRow
        ? 'h-8 min-h-8 px-2.5 rounded text-xs gap-1 shrink-0 shadow-md shadow-primary-950/20'
        : compact
          ? labelVisible
              ? 'px-2 py-1 rounded text-xs shadow-md shadow-primary-950/20'
              : 'p-1.5 rounded-md shadow-md shadow-primary-950/20'
          : 'px-4 py-2.5 rounded-lg text-sm shadow-lg shadow-primary-950/25';

    return (
        <button
            type="button"
            onClick={handleShare}
            title="Share"
            aria-label="Share"
            className={`inline-flex items-center justify-center gap-1.5 bg-gradient-brand font-bold text-white transition btn-press hover:brightness-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400/50 ${sizeClass} ${className}`}
        >
            <Share2 className={compact ? 'h-4 w-4' : 'h-4 w-4'} aria-hidden />
            {labelVisible ? <span>Share</span> : null}
        </button>
    );
}
