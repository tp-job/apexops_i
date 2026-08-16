import type { FC } from 'react';
import { useEffect, useState } from 'react';
import { FiExternalLink, FiKey, FiTrash2 } from 'react-icons/fi';
import { AccentButton, Badge, ConfirmDialog, Field, Input, Modal } from '@/components/design-system';
import type { AssistantError, StoredKeyInfo } from '@/types/assistant';

/**
 * Add, replace, or remove the user's provider key (spec F012).
 *
 * ## What this component is careful about
 *
 * **The plaintext key lives in state for as long as it takes to submit, and not
 * one render longer.** It is cleared on success, on close, and on unmount. The
 * field is `type="password"` so a screen share or a shoulder does not leak it,
 * and `revealable` lets the user check a paste — their choice, not the default.
 *
 * **Nothing here can read back a stored key**, because the API cannot return
 * one. All this ever shows is the mask the server sends, which is why replacing
 * a key means typing a new one rather than editing the old.
 *
 * Delete goes through `ConfirmDialog` — the design system requires it before any
 * destructive action, and this one is destructive in a way that is easy to
 * underestimate: the key cannot be recovered from here, only re-pasted.
 */

interface KeyDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    storedKey: StoredKeyInfo | null;
    busy: boolean;
    error: AssistantError | null;
    onSubmit: (apiKey: string) => Promise<void>;
    onRemove: () => Promise<void>;
}

const KeyDialog: FC<KeyDialogProps> = ({ open, onOpenChange, storedKey, busy, error, onSubmit, onRemove }) => {
    const [value, setValue] = useState('');
    const [localError, setLocalError] = useState<string | null>(null);
    const [confirmOpen, setConfirmOpen] = useState(false);

    // Never let a typed key survive the dialog closing.
    useEffect(() => {
        if (!open) {
            setValue('');
            setLocalError(null);
        }
    }, [open]);

    const save = async () => {
        const key = value.trim();
        if (!key) {
            setLocalError('Paste your API key first');
            return;
        }
        setLocalError(null);
        try {
            await onSubmit(key);
            // Cleared the moment it is stored — on failure it stays, so the user
            // can fix a typo instead of re-pasting from wherever it came from.
            setValue('');
        } catch {
            /* `error` prop carries the reason; the dialog stays open */
        }
    };

    const shownError = localError ?? (error && (error.code === 'INVALID_KEY' || error.code === 'UNKNOWN') ? error.message : undefined);

    return (
        <>
            <Modal
                open={open}
                onOpenChange={onOpenChange}
                title="AI provider key"
                description="Your key is encrypted before it is stored and is never shown again."
                size="sm"
                footer={
                    <>
                        {storedKey && (
                            <AccentButton
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setConfirmOpen(true)}
                                disabled={busy}
                                icon={<FiTrash2 size={14} />}
                            >
                                Remove
                            </AccentButton>
                        )}
                        <AccentButton type="button" size="sm" onClick={() => void save()} disabled={busy || !value.trim()}>
                            {busy ? 'Checking…' : storedKey ? 'Replace key' : 'Save key'}
                        </AccentButton>
                    </>
                }
            >
                <div className="flex flex-col gap-4">
                    {storedKey && (
                        <div className="flex items-center justify-between rounded-xl bg-light-surface-2 px-3 py-2.5 dark:bg-dark-surface-2">
                            <div className="flex min-w-0 flex-col">
                                <span className="font-mono text-[13px] text-light-text dark:text-dark-text">
                                    {storedKey.maskedKey}
                                </span>
                                <span className="text-[11px] text-light-text-secondary dark:text-dark-text-secondary">
                                    {storedKey.verifiedAt
                                        ? `Verified ${storedKey.verifiedAt.toLocaleDateString()}`
                                        : 'Stored'}
                                </span>
                            </div>
                            {storedKey.verifiedAt && <Badge tone="success">Active</Badge>}
                        </div>
                    )}

                    <Field
                        label={storedKey ? 'Replace with a new key' : 'Gemini API key'}
                        hint="Checked against the provider before it is saved."
                        error={shownError}
                    >
                        <Input
                            type="password"
                            revealable
                            autoComplete="off"
                            spellCheck={false}
                            value={value}
                            onChange={(e) => setValue(e.target.value)}
                            placeholder="AIza…"
                            icon={<FiKey size={15} />}
                            disabled={busy}
                        />
                    </Field>

                    <a
                        href="https://aistudio.google.com/apikey"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-[12px] text-light-text-secondary underline underline-offset-2 hover:text-brand-dark dark:text-dark-text-secondary dark:hover:text-white"
                    >
                        Get a key from Google AI Studio
                        <FiExternalLink size={11} />
                    </a>
                </div>
            </Modal>

            <ConfirmDialog
                open={confirmOpen}
                onOpenChange={setConfirmOpen}
                title="Remove your API key?"
                description="The assistant will stop using your key. You can add it again at any time, but this copy cannot be recovered."
                confirmLabel="Remove key"
                destructive
                onConfirm={async () => {
                    await onRemove();
                    setConfirmOpen(false);
                }}
            />
        </>
    );
};

export default KeyDialog;
