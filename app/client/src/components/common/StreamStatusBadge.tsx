import type { FC } from 'react';
import { Badge } from '@/components/design-system';
import type { StreamStatus } from '@/lib/issueStream';

/**
 * Says whether the live feed is actually live (R-D5).
 *
 * Three states, not a boolean, because "nothing is happening" and "this page
 * stopped listening" look identical on a quiet monitoring view and only one of
 * them is fine. The badge is driven by transport events only — it is never set
 * optimistically — so it cannot read `live` over a dead socket.
 *
 * The dot is decorative; the word carries the meaning, and `role="status"` makes
 * a change to it reach a screen reader without stealing focus.
 */
const LABELS: Record<StreamStatus, { text: string; tone: 'success' | 'warning' | 'danger'; title: string }> = {
    live: {
        text: 'Live',
        tone: 'success',
        title: 'Connected — new errors appear here as they are reported',
    },
    reconnecting: {
        text: 'Reconnecting',
        tone: 'warning',
        title: 'The connection dropped. This list may be behind until it comes back.',
    },
    offline: {
        text: 'Offline',
        tone: 'danger',
        title: 'Not connected. This list is a snapshot and is not updating.',
    },
};

const StreamStatusBadge: FC<{ status: StreamStatus }> = ({ status }) => {
    const { text, tone, title } = LABELS[status];
    return (
        <span role="status" aria-live="polite" title={title}>
            <Badge
                tone={tone}
                icon={
                    <span
                        className={[
                            'inline-block h-1.5 w-1.5 rounded-full bg-current',
                            // Motion only while something is genuinely in flight, and
                            // never for a user who asked for less of it.
                            status === 'reconnecting' ? 'motion-safe:animate-pulse' : '',
                        ].filter(Boolean).join(' ')}
                    />
                }
            >
                {text}
            </Badge>
        </span>
    );
};

export default StreamStatusBadge;
