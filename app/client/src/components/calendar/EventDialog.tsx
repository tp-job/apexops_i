import type { FC } from 'react';
import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { AccentButton, ConfirmDialog, Field, Input, Modal, Switch } from '@/components/design-system';
import type { CalendarEvent } from '@/services/day';

/**
 * Create or edit one appointment (blueprint US-07 / F009).
 *
 * On the design system's `Modal`, so Radix owns focus trapping and Escape, and
 * deletion goes through `ConfirmDialog` — the house rule for anything
 * destructive.
 *
 * **Times are entered in the browser's own zone and converted at the edge.**
 * `<input type="datetime-local">` has no timezone, so its value is read as local
 * and sent as an instant. Doing that conversion anywhere other than here would
 * mean two places deciding what "14:00" means.
 */
export interface EventDialogProps {
    open: boolean;
    dayKey: string;
    /** Null when creating. */
    event: CalendarEvent | null;
    saving: boolean;
    onClose: () => void;
    onSave: (input: {
        title: string;
        startAt: string;
        endAt: string;
        isAllDay: boolean;
        location: string | null;
    }) => Promise<void>;
    onDelete: () => Promise<void>;
}

/** `YYYY-MM-DDTHH:mm` in local time, which is what the input expects. */
const toLocalInput = (iso: string): string => dayjs(iso).format('YYYY-MM-DDTHH:mm');

const EventDialog: FC<EventDialogProps> = ({ open, dayKey, event, saving, onClose, onSave, onDelete }) => {
    const [title, setTitle] = useState('');
    const [location, setLocation] = useState('');
    const [isAllDay, setIsAllDay] = useState(false);
    const [startAt, setStartAt] = useState('');
    const [endAt, setEndAt] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [confirmingDelete, setConfirmingDelete] = useState(false);

    // Reset whenever the dialog opens on a different target, so an edit never
    // starts from the previous event's values.
    useEffect(() => {
        if (!open) return;
        setError(null);
        setConfirmingDelete(false);
        if (event) {
            setTitle(event.title);
            setLocation(event.location ?? '');
            setIsAllDay(event.isAllDay);
            setStartAt(toLocalInput(event.startAt));
            setEndAt(toLocalInput(event.endAt));
        } else {
            // A sensible default beats an empty field: most appointments are an
            // hour, in working hours, on the day you clicked.
            setTitle('');
            setLocation('');
            setIsAllDay(false);
            setStartAt(`${dayKey}T09:00`);
            setEndAt(`${dayKey}T10:00`);
        }
    }, [open, event, dayKey]);

    const submit = async () => {
        if (!title.trim()) {
            setError('Give the event a title.');
            return;
        }
        // All-day still carries a real span so one range query serves both kinds.
        const start = isAllDay ? dayjs(`${dayKey}T00:00`) : dayjs(startAt);
        const end = isAllDay ? dayjs(`${dayKey}T00:00`).add(1, 'day') : dayjs(endAt);

        if (!start.isValid() || !end.isValid()) {
            setError('Those times are not valid.');
            return;
        }
        // Checked here as well as on the server: the user should find out before
        // the round trip, and the server must not trust the client either.
        if (end.isBefore(start)) {
            setError('The end time cannot be before the start time.');
            return;
        }

        setError(null);
        try {
            await onSave({
                title: title.trim(),
                startAt: start.toISOString(),
                endAt: end.toISOString(),
                isAllDay,
                location: location.trim() || null,
            });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not save that event.');
        }
    };

    return (
        <>
            <Modal
                open={open}
                onOpenChange={(next) => { if (!next) onClose(); }}
                title={event ? 'Edit event' : 'New event'}
                description={dayjs(dayKey).format('dddd, D MMMM YYYY')}
                dismissible={!saving}
            >
                <div className="flex flex-col gap-4">
                    <Field label="Title" error={error && !title.trim() ? error : undefined}>
                        <Input
                            autoFocus
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="What is happening?"
                            aria-label="Event title"
                        />
                    </Field>

                    <Switch
                        label="All day"
                        checked={isAllDay}
                        onChange={(e) => setIsAllDay(e.target.checked)}
                    />

                    {!isAllDay && (
                        <div className="flex flex-wrap gap-3">
                            <Field label="Starts" className="min-w-[12rem] flex-1">
                                <input
                                    type="datetime-local"
                                    value={startAt}
                                    onChange={(e) => setStartAt(e.target.value)}
                                    aria-label="Start time"
                                    className="w-full rounded-xl border border-gray-200 bg-white/70 px-3 py-2 text-sm text-brand-dark outline-none focus-visible:ring-2 focus-visible:ring-brand-dark/25 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus-visible:ring-brand-accent/30"
                                />
                            </Field>
                            <Field label="Ends" className="min-w-[12rem] flex-1">
                                <input
                                    type="datetime-local"
                                    value={endAt}
                                    onChange={(e) => setEndAt(e.target.value)}
                                    aria-label="End time"
                                    className="w-full rounded-xl border border-gray-200 bg-white/70 px-3 py-2 text-sm text-brand-dark outline-none focus-visible:ring-2 focus-visible:ring-brand-dark/25 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus-visible:ring-brand-accent/30"
                                />
                            </Field>
                        </div>
                    )}

                    <Field label="Location">
                        <Input
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                            placeholder="Optional"
                            aria-label="Location"
                        />
                    </Field>

                    {error && title.trim() && (
                        <p role="alert" className="text-xs font-medium text-global-red">
                            {error}
                        </p>
                    )}

                    <div className="flex flex-wrap items-center gap-2">
                        <AccentButton size="sm" onClick={() => void submit()} disabled={saving}>
                            {saving ? 'Saving…' : event ? 'Save changes' : 'Add event'}
                        </AccentButton>
                        <AccentButton variant="ghost" size="sm" onClick={onClose} disabled={saving}>
                            Cancel
                        </AccentButton>
                        {event && (
                            <AccentButton
                                variant="ghost"
                                size="sm"
                                className="ml-auto text-global-red"
                                onClick={() => setConfirmingDelete(true)}
                                disabled={saving}
                            >
                                Delete
                            </AccentButton>
                        )}
                    </div>
                </div>
            </Modal>

            <ConfirmDialog
                open={confirmingDelete}
                onOpenChange={setConfirmingDelete}
                onConfirm={async () => { await onDelete(); }}
                title="Delete this event?"
                description={`"${event?.title ?? ''}" will be removed from this day. This cannot be undone from here.`}
                confirmLabel="Delete event"
                destructive
            />
        </>
    );
};

export default EventDialog;
