import type { FC, ReactNode } from 'react';
import { useState } from 'react';
import Modal from './Modal';
import AccentButton from './AccentButton';

interface ConfirmDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    /** What will happen, in plain words. Name the blast radius, not the mechanism. */
    description: string;
    /** Label the *action*, never "OK" — "Rotate key", "Archive project". */
    confirmLabel: string;
    cancelLabel?: string;
    /** Red confirm button. Use for anything that destroys or revokes. */
    destructive?: boolean;
    /** May be async; the dialog stays open and locked until it settles. */
    onConfirm: () => void | Promise<void>;
    /**
     * Holds the confirm button closed until the caller says the gate is passed —
     * a typed project name, a checked acknowledgement.
     *
     * Separate from `busy`, which means "in flight". This one means "not yet
     * allowed", and the two want different button labels and different reasons.
     */
    confirmDisabled?: boolean;
    /** Extra context — a consequences list, an affected-rows count. */
    children?: ReactNode;
}

/**
 * The confirmation gate for destructive actions.
 *
 * Required before anything that destroys or revokes — archiving a project,
 * rotating an ingest key, bulk-deleting logs. The rule this primitive exists to
 * enforce is that the *primitive* owns the pattern, so no page has to remember
 * that its delete button needed a confirm step.
 *
 * While `onConfirm` is in flight the dialog becomes non-dismissible and both
 * buttons disable. That is not decoration: without it, ESC during an in-flight
 * archive leaves the user looking at a list that has not updated yet, with no
 * idea whether the thing happened.
 *
 * A rejected `onConfirm` leaves the dialog **open** so the caller can surface the
 * error next to the action that failed. Closing on failure loses the error.
 */
const ConfirmDialog: FC<ConfirmDialogProps> = ({
    open,
    onOpenChange,
    title,
    description,
    confirmLabel,
    cancelLabel = 'Cancel',
    destructive = false,
    onConfirm,
    confirmDisabled = false,
    children,
}) => {
    const [busy, setBusy] = useState(false);

    const handleConfirm = async () => {
        setBusy(true);
        try {
            await onConfirm();
            onOpenChange(false);
        } catch {
            // Left open on purpose — see the note above.
        } finally {
            setBusy(false);
        }
    };

    return (
        <Modal
            open={open}
            onOpenChange={onOpenChange}
            title={title}
            description={description}
            size="sm"
            dismissible={!busy}
            footer={
                <>
                    <AccentButton
                        variant="ghost"
                        size="sm"
                        onClick={() => onOpenChange(false)}
                        disabled={busy}
                    >
                        {cancelLabel}
                    </AccentButton>
                    <AccentButton
                        variant={destructive ? 'dark' : 'accent'}
                        size="sm"
                        onClick={handleConfirm}
                        disabled={busy || confirmDisabled}
                        className={
                            destructive
                                ? 'bg-global-red text-white shadow-md hover:bg-global-red/90'
                                : ''
                        }
                    >
                        {busy ? 'Working…' : confirmLabel}
                    </AccentButton>
                </>
            }
        >
            {children}
        </Modal>
    );
};

export default ConfirmDialog;
