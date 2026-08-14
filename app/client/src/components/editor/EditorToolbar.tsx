import type { FC, ReactNode } from 'react';
import { useState } from 'react';
import { useEditorState, type Editor } from '@tiptap/react';
import {
    FiAlignCenter,
    FiAlignLeft,
    FiAlignRight,
    FiBold,
    FiImage,
    FiItalic,
    FiLink,
    FiMaximize2,
    FiMinimize2,
    FiUnderline,
} from 'react-icons/fi';
import { AccentButton, Input, Modal, Select } from '@/components/design-system';
import { FONT_FAMILIES, FONT_SIZES, TEXT_COLORS, sanitizeImageSrc } from '@/lib/richText';
import { sanitizeHref } from '@/lib/docsMarkdown';

/**
 * The formatting toolbar.
 *
 * Every control is a real `<button>` with `aria-pressed`, not a styled `<div>`:
 * the state of a formatting toggle is the one thing a screen-reader user cannot
 * infer from the surrounding text, so it has to be announced. The selects are
 * native, for the same reason `design-system/Select` is.
 *
 * Font, size and colour are **fixed vocabularies** from `lib/richText`, not free
 * inputs. A px spinner and a hex picker are how a document ends up with three
 * almost-identical greys and a red that fails contrast in dark mode.
 *
 * The toolbar reads editor state through `useEditorState` rather than on every
 * transaction — v3 does not re-render on transactions by default, and a toolbar
 * that re-renders on each keystroke is a visible cost on a long document.
 */

interface EditorToolbarProps {
    editor: Editor | null;
    disabled?: boolean;
    fullscreen: boolean;
    onToggleFullscreen: () => void;
}

// ── One button ────────────────────────────────────────────────

const ToolButton: FC<{
    label: string;
    icon: ReactNode;
    active?: boolean;
    disabled?: boolean;
    onClick: () => void;
}> = ({ label, icon, active = false, disabled = false, onClick }) => (
    <button
        type="button"
        title={label}
        aria-label={label}
        aria-pressed={active}
        disabled={disabled}
        // `onMouseDown` prevented so the click never steals the selection the
        // command is about to act on — the classic toolbar bug where pressing
        // Bold with text selected bolds nothing.
        onMouseDown={(e) => e.preventDefault()}
        onClick={onClick}
        className={[
            'rounded-lg p-2 transition-colors disabled:cursor-not-allowed disabled:opacity-40',
            active
                ? 'bg-brand-dark text-white dark:bg-white dark:text-brand-dark'
                : 'text-gray-500 hover:bg-black/5 hover:text-brand-dark dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-white',
        ].join(' ')}
    >
        {icon}
    </button>
);

const Divider: FC = () => <span aria-hidden className="mx-1 h-5 w-px bg-gray-200 dark:bg-white/10" />;

// ── Toolbar ───────────────────────────────────────────────────

const EditorToolbar: FC<EditorToolbarProps> = ({ editor, disabled = false, fullscreen, onToggleFullscreen }) => {
    const [linkOpen, setLinkOpen] = useState(false);
    const [linkDraft, setLinkDraft] = useState('');
    const [linkError, setLinkError] = useState<string | null>(null);

    const [imageOpen, setImageOpen] = useState(false);
    const [imageSrc, setImageSrc] = useState('');
    const [imageAlt, setImageAlt] = useState('');
    const [imageError, setImageError] = useState<string | null>(null);

    const state = useEditorState({
        editor,
        selector: ({ editor: ed }) => {
            if (!ed) return null;
            return {
                bold: ed.isActive('bold'),
                italic: ed.isActive('italic'),
                underline: ed.isActive('underline'),
                link: ed.isActive('link'),
                alignLeft: ed.isActive({ textAlign: 'left' }),
                alignCenter: ed.isActive({ textAlign: 'center' }),
                alignRight: ed.isActive({ textAlign: 'right' }),
                fontFamily: (ed.getAttributes('textStyle').fontFamily as string) ?? '',
                fontSize: (ed.getAttributes('textStyle').fontSize as string) ?? '',
                color: (ed.getAttributes('textStyle').color as string) ?? '',
            };
        },
    });

    const off = disabled || !editor || !state;
    const chain = () => editor!.chain().focus();

    // ── Link ──

    const openLink = () => {
        setLinkDraft((editor?.getAttributes('link').href as string) ?? '');
        setLinkError(null);
        setLinkOpen(true);
    };

    const applyLink = () => {
        const raw = linkDraft.trim();
        if (!raw) {
            // An emptied field means "remove the link", which is the only sensible
            // reading and saves a second button.
            chain().extendMarkRange('link').unsetLink().run();
            setLinkOpen(false);
            return;
        }
        // Same allowlist the docs renderer uses — `javascript:` is the reason it
        // exists, and having two different answers to "is this href safe" is how
        // one of them ends up wrong.
        const href = sanitizeHref(raw);
        if (!href) {
            setLinkError('Use an http, https or mailto address.');
            return;
        }
        chain().extendMarkRange('link').setLink({ href }).run();
        setLinkOpen(false);
    };

    // ── Image ──

    const applyImage = () => {
        const src = sanitizeImageSrc(imageSrc);
        if (!src) {
            setImageError('Use a full http or https image address.');
            return;
        }
        chain().setImage({ src, alt: imageAlt.trim() || undefined }).run();
        setImageOpen(false);
        setImageSrc('');
        setImageAlt('');
        setImageError(null);
    };

    return (
        <>
            <div
                role="toolbar"
                aria-label="Formatting"
                aria-disabled={off}
                className="sticky top-0 z-10 flex flex-wrap items-center gap-1 border-b border-gray-200 bg-white/80 px-2 py-2 backdrop-blur dark:border-white/10 dark:bg-brand-nearBlack2/80"
            >
                <div className="w-[8.5rem]">
                    <Select
                        size="sm"
                        aria-label="Font"
                        disabled={off}
                        options={FONT_FAMILIES}
                        value={state?.fontFamily ?? ''}
                        onChange={(e) => {
                            const v = e.target.value;
                            if (v) chain().setFontFamily(v).run();
                            else chain().unsetFontFamily().run();
                        }}
                    />
                </div>

                <div className="w-[6rem]">
                    <Select
                        size="sm"
                        aria-label="Font size"
                        disabled={off}
                        options={FONT_SIZES}
                        value={state?.fontSize ?? ''}
                        onChange={(e) => {
                            const v = e.target.value;
                            if (v) chain().setFontSize(v).run();
                            else chain().unsetFontSize().run();
                        }}
                    />
                </div>

                <Divider />

                <ToolButton
                    label="Bold"
                    icon={<FiBold size={15} />}
                    active={state?.bold}
                    disabled={off}
                    onClick={() => chain().toggleBold().run()}
                />
                <ToolButton
                    label="Italic"
                    icon={<FiItalic size={15} />}
                    active={state?.italic}
                    disabled={off}
                    onClick={() => chain().toggleItalic().run()}
                />
                <ToolButton
                    label="Underline"
                    icon={<FiUnderline size={15} />}
                    active={state?.underline}
                    disabled={off}
                    onClick={() => chain().toggleUnderline().run()}
                />

                <Divider />

                <div className="w-[7.5rem]">
                    <Select
                        size="sm"
                        aria-label="Text colour"
                        disabled={off}
                        options={TEXT_COLORS}
                        value={state?.color ?? ''}
                        onChange={(e) => {
                            const v = e.target.value;
                            if (v) chain().setColor(v).run();
                            else chain().unsetColor().run();
                        }}
                    />
                </div>
                <span
                    aria-hidden
                    className="h-5 w-5 shrink-0 rounded-full border border-gray-300 dark:border-white/20"
                    style={{ background: state?.color || 'currentColor' }}
                />

                <Divider />

                <ToolButton
                    label="Align left"
                    icon={<FiAlignLeft size={15} />}
                    active={state?.alignLeft}
                    disabled={off}
                    onClick={() => chain().setTextAlign('left').run()}
                />
                <ToolButton
                    label="Align centre"
                    icon={<FiAlignCenter size={15} />}
                    active={state?.alignCenter}
                    disabled={off}
                    onClick={() => chain().setTextAlign('center').run()}
                />
                <ToolButton
                    label="Align right"
                    icon={<FiAlignRight size={15} />}
                    active={state?.alignRight}
                    disabled={off}
                    onClick={() => chain().setTextAlign('right').run()}
                />

                <Divider />

                <ToolButton
                    label="Link"
                    icon={<FiLink size={15} />}
                    active={state?.link}
                    disabled={off}
                    onClick={openLink}
                />
                <ToolButton
                    label="Image"
                    icon={<FiImage size={15} />}
                    disabled={off}
                    onClick={() => { setImageError(null); setImageOpen(true); }}
                />

                <div className="ml-auto">
                    <ToolButton
                        label={fullscreen ? 'Exit full screen' : 'Full screen'}
                        icon={fullscreen ? <FiMinimize2 size={15} /> : <FiMaximize2 size={15} />}
                        active={fullscreen}
                        onClick={onToggleFullscreen}
                    />
                </div>
            </div>

            <Modal
                open={linkOpen}
                onOpenChange={setLinkOpen}
                title="Link"
                description="Clear the field to remove the link."
                size="sm"
                footer={
                    <>
                        <AccentButton variant="ghost" size="sm" onClick={() => setLinkOpen(false)}>Cancel</AccentButton>
                        <AccentButton size="sm" onClick={applyLink}>Apply</AccentButton>
                    </>
                }
            >
                <Input
                    autoFocus
                    value={linkDraft}
                    onChange={(e) => { setLinkDraft(e.target.value); setLinkError(null); }}
                    onKeyDown={(e) => e.key === 'Enter' && applyLink()}
                    placeholder="https://example.com"
                    aria-label="Link address"
                />
                {linkError && <p className="mt-2 text-xs text-global-red">{linkError}</p>}
            </Modal>

            <Modal
                open={imageOpen}
                onOpenChange={setImageOpen}
                title="Image"
                description="Paste the address of an image on the web."
                size="sm"
                footer={
                    <>
                        <AccentButton variant="ghost" size="sm" onClick={() => setImageOpen(false)}>Cancel</AccentButton>
                        <AccentButton size="sm" onClick={applyImage} disabled={!imageSrc.trim()}>Insert</AccentButton>
                    </>
                }
            >
                <div className="flex flex-col gap-3">
                    <Input
                        autoFocus
                        value={imageSrc}
                        onChange={(e) => { setImageSrc(e.target.value); setImageError(null); }}
                        placeholder="https://example.com/photo.jpg"
                        aria-label="Image address"
                    />
                    <Input
                        value={imageAlt}
                        onChange={(e) => setImageAlt(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && applyImage()}
                        placeholder="Describe the image (recommended)"
                        aria-label="Image description"
                    />
                    {imageError && <p className="text-xs text-global-red">{imageError}</p>}
                </div>
            </Modal>
        </>
    );
};

export default EditorToolbar;
