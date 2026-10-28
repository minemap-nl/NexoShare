import { useCallback, useRef, useState } from 'react';
import { isIOSDevice } from '../lib/deviceShare';

const STORAGE_KEY = 'nexoshare.iosPickerNotice.ack';

/** In-memory fallback when sessionStorage is unavailable. */
let memoryAck = false;

function readAck(): boolean {
    if (memoryAck) return true;
    try {
        if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem(STORAGE_KEY) === '1') {
            memoryAck = true;
            return true;
        }
    } catch {
        /* private mode / blocked storage */
    }
    return false;
}

function writeAck(): void {
    memoryAck = true;
    try {
        if (typeof sessionStorage !== 'undefined') {
            sessionStorage.setItem(STORAGE_KEY, '1');
        }
    } catch {
        /* keep memoryAck only */
    }
}

export type IosPickerNoticeIntent = 'pick' | 'upload';

/**
 * iOS Photos/Files handoff can take tens of seconds with no progress UI.
 * Gate file-pick and upload behind a once-per-session confirm notice.
 */
export function useIosPickerNotice() {
    const isIOS = typeof navigator !== 'undefined' ? isIOSDevice() : false;
    const [acknowledged, setAcknowledged] = useState(() => !isIOS || readAck());
    const [open, setOpen] = useState(false);
    const [intent, setIntent] = useState<IosPickerNoticeIntent>('pick');
    const pendingRef = useRef<(() => void) | null>(null);

    const requestAction = useCallback(
        (action: () => void, nextIntent: IosPickerNoticeIntent = 'pick') => {
            if (!isIOS || acknowledged) {
                action();
                return;
            }
            pendingRef.current = action;
            setIntent(nextIntent);
            setOpen(true);
        },
        [isIOS, acknowledged]
    );

    const confirmNotice = useCallback(() => {
        writeAck();
        setAcknowledged(true);
        setOpen(false);
        const action = pendingRef.current;
        pendingRef.current = null;
        // Run synchronously so fileInput.click() stays inside the user gesture.
        action?.();
    }, []);

    const dismissNotice = useCallback(() => {
        pendingRef.current = null;
        setOpen(false);
    }, []);

    return {
        isIOS,
        acknowledged: !isIOS || acknowledged,
        canProceed: !isIOS || acknowledged,
        noticeOpen: open,
        intent,
        requestAction,
        confirmNotice,
        dismissNotice,
    };
}
