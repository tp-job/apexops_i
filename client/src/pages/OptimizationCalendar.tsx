import {
    useState,
    useMemo,
    useCallback,
    useEffect,
    type FC,
    type FormEvent,
} from 'react';
import {
    ThemeProvider,
    createTheme,
    Box,
    Typography,
    Button,
    TextField,
    InputAdornment,
    IconButton,
    Switch,
    Slider,
    ToggleButtonGroup,
    ToggleButton,
    Menu,
    MenuItem,
    ListItemIcon,
    ListItemText,
} from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { type Dayjs } from 'dayjs';
import {
    MdAdd,
    MdCalendarToday,
    MdChevronLeft,
    MdChevronRight,
    MdClose,
    MdCloudDone,
    MdDelete,
    MdEdit,
    MdEvent,
    MdEventBusy,
    MdExpandLess,
    MdExpandMore,
    MdMoreVert,
    MdNotificationsActive,
    MdSchedule,
    MdWarning,
} from 'react-icons/md';

import { useOptimizationCalendarEvents } from '../hooks/useOptimizationCalendarEvents';
import { getCalendarGridCells } from '../utils/calendarGrid';
import { generateId, defaultFormState } from '../utils/optimizationCalendar';
import type { CalendarEvent, CategoryId } from '@/types/calendar';

// ── Design tokens (from attached images) ─────────────────────
const PALETTE = {
    background: '#1E1E1E',
    surface: '#1E2024',
    surfaceAlt: '#2C2F36',
    surfaceCard: '#252830',
    border: '#2d2f36',
    headerBg: '#1f2026',
    text: '#ffffff',
    textSecondary: 'rgba(255,255,255,0.7)',
    textMuted: 'rgba(255,255,255,0.5)',
    // Category / accent
    development: '#7B68EE',
    server: '#20B2AA',
    client: '#DC143C',
    marketing: '#FF8C00',
    // Calendar pills (image 2)
    pillPurple: '#8A2BE2',
    pillBlue: '#42A5F5',
    pillOrange: '#FFA726',
    pillPink: '#FF4081',
    // Insight cards
    insightPurple: '#7B42F5',
    insightGreen: '#33C769',
    insightBlue: '#4275F5',
    insightPink: '#FF4081',
    insightOrange: '#FF9800',
    highlightBorder: '#FF4081',
};

// ── Categories ─────────────────────────────────────────────────
const CATEGORIES: { id: CategoryId; label: string; color: string }[] = [
    { id: 'development', label: 'Development', color: PALETTE.development },
    { id: 'server', label: 'Server Maint.', color: PALETTE.server },
    { id: 'client', label: 'Client Meeting', color: PALETTE.client },
    { id: 'marketing', label: 'Marketing', color: PALETTE.marketing },
];

const CATEGORY_COLORS: Record<CategoryId, string> = {
    development: PALETTE.pillPurple,
    server: PALETTE.pillBlue,
    client: PALETTE.pillOrange,
    marketing: PALETTE.pillPink,
};

const INSIGHT_COLORS = [
    PALETTE.insightPurple,
    PALETTE.insightGreen,
    PALETTE.insightBlue,
    PALETTE.insightPink,
    PALETTE.insightOrange,
];

// ── MUI theme (dark) ─────────────────────────────────────────
const darkTheme = createTheme({
    palette: {
        mode: 'dark',
        primary: { main: PALETTE.development },
        background: { default: PALETTE.background, paper: PALETTE.surface },
    },
    typography: { fontFamily: 'Inter, sans-serif' },
    shape: { borderRadius: 12 },
    components: {
        MuiTextField: {
            styleOverrides: {
                root: {
                    '& .MuiOutlinedInput-root': {
                        backgroundColor: PALETTE.surfaceAlt,
                        borderRadius: '10px',
                        '& fieldset': { borderColor: PALETTE.border },
                        '&:hover fieldset': { borderColor: PALETTE.border },
                        '&.Mui-focused fieldset': {
                            borderColor: PALETTE.development,
                            borderWidth: '2px',
                        },
                    },
                },
            },
        },
        MuiButton: {
            styleOverrides: {
                containedPrimary: {
                    backgroundColor: PALETTE.development,
                    '&:hover': { backgroundColor: '#6a5ac9' },
                },
            },
        },
        MuiSwitch: {
            styleOverrides: {
                switchBase: {
                    '&.Mui-checked': { color: PALETTE.development },
                    '&.Mui-checked + .MuiSwitch-track': { backgroundColor: PALETTE.development },
                },
            },
        },
        MuiSlider: {
            styleOverrides: {
                colorPrimary: { color: PALETTE.development },
                thumb: { color: PALETTE.development },
                track: { color: PALETTE.development },
            },
        },
    } as any,
});

// ── Schedule Modal (Create / Edit) ─────────────────────────────
interface ScheduleModalProps {
    open: boolean;
    onClose: () => void;
    initialEvent: CalendarEvent | null;
    currentDate: Dayjs;
    onSave: (event: CalendarEvent) => void;
}

const ScheduleModal: FC<ScheduleModalProps> = ({
    open,
    onClose,
    initialEvent,
    currentDate,
    onSave,
}) => {
    const isEdit = !!initialEvent;
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState<CategoryId>('development');
    const [date, setDate] = useState<Dayjs>(currentDate);
    const [hour, setHour] = useState(9);
    const [minute, setMinute] = useState(30);
    const [amPm, setAmPm] = useState<'AM' | 'PM'>('AM');
    const [durationMinutes, setDurationMinutes] = useState(90);
    const [pushNotification, setPushNotification] = useState(false);

    const resetForm = useCallback(() => {
        if (initialEvent) {
            setTitle(initialEvent.title);
            setDescription(initialEvent.description);
            setCategory(initialEvent.category);
            setDate(dayjs(initialEvent.date));
            setHour(initialEvent.hour);
            setMinute(initialEvent.minute);
            setAmPm(initialEvent.amPm);
            setDurationMinutes(initialEvent.durationMinutes);
            setPushNotification(initialEvent.pushNotification);
        } else {
            const def = defaultFormState(currentDate);
            setTitle(def.title);
            setDescription(def.description);
            setCategory(def.category);
            setDate(dayjs(def.date));
            setHour(def.hour);
            setMinute(def.minute);
            setAmPm(def.amPm);
            setDurationMinutes(def.durationMinutes);
            setPushNotification(def.pushNotification);
        }
    }, [initialEvent, currentDate]);

    useEffect(() => {
        if (!open) return;
        if (initialEvent) {
            setTitle(initialEvent.title);
            setDescription(initialEvent.description);
            setCategory(initialEvent.category);
            setDate(dayjs(initialEvent.date));
            setHour(initialEvent.hour);
            setMinute(initialEvent.minute);
            setAmPm(initialEvent.amPm);
            setDurationMinutes(initialEvent.durationMinutes);
            setPushNotification(initialEvent.pushNotification);
        } else {
            const def = defaultFormState(currentDate);
            setTitle(def.title);
            setDescription(def.description);
            setCategory(def.category);
            setDate(dayjs(def.date));
            setHour(def.hour);
            setMinute(def.minute);
            setAmPm(def.amPm);
            setDurationMinutes(def.durationMinutes);
            setPushNotification(def.pushNotification);
        }
    }, [open, initialEvent?.id, initialEvent?.date, currentDate]);

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        const payload: CalendarEvent = {
            id: initialEvent?.id ?? generateId(),
            title: title.trim() || 'Untitled Activity',
            description: description.trim(),
            category,
            date: date.format('YYYY-MM-DD'),
            hour,
            minute,
            amPm,
            durationMinutes,
            pushNotification,
        };
        onSave(payload);
        resetForm();
        onClose();
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    if (!open) return null;

    return (
        <Box
            sx={{
                position: 'fixed',
                inset: 0,
                zIndex: 1300,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                p: 2,
            }}
        >
            <Box
                sx={{
                    position: 'absolute',
                    inset: 0,
                    bgcolor: 'rgba(0,0,0,0.7)',
                    backdropFilter: 'blur(4px)',
                }}
                onClick={handleClose}
            />
            <Box
                component="form"
                onSubmit={handleSubmit}
                sx={{
                    position: 'relative',
                    width: '100%',
                    maxWidth: 896,
                    maxHeight: '90vh',
                    overflow: 'auto',
                    bgcolor: PALETTE.surface,
                    borderRadius: 2,
                    boxShadow: 24,
                    border: '1px solid',
                    borderColor: PALETTE.border,
                }}
            >
                <Box
                    sx={{
                        px: 3,
                        py: 2,
                        borderBottom: '1px solid',
                        borderColor: PALETTE.border,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        bgcolor: PALETTE.headerBg,
                    }}
                >
                    <Box>
                        <Typography variant="h6" fontWeight={700} color={PALETTE.text}>
                            {isEdit ? 'Edit Tech Activity' : 'Schedule New Tech Activity'}
                        </Typography>
                        <Typography variant="body2" sx={{ color: PALETTE.textSecondary, mt: 0.5 }}>
                            {isEdit
                                ? 'Update event details.'
                                : 'Create a new event, meeting, or maintenance window.'}
                        </Typography>
                    </Box>
                    <IconButton onClick={handleClose} sx={{ color: PALETTE.textMuted }} size="small">
                        <MdClose />
                    </IconButton>
                </Box>

                <Box sx={{ display: 'flex', flexDirection: { xs: 'column', lg: 'row' } }}>
                    <Box sx={{ flex: 1, p: 3, overflowY: 'auto' }}>
                        <Box sx={{ mb: 3 }}>
                            <Typography
                                variant="caption"
                                sx={{
                                    textTransform: 'uppercase',
                                    fontWeight: 600,
                                    letterSpacing: '0.05em',
                                    color: PALETTE.textSecondary,
                                    display: 'block',
                                    mb: 1,
                                }}
                            >
                                Activity Title
                            </Typography>
                            <TextField
                                fullWidth
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="e.g. Q4 Server Migration"
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <MdEdit style={{ color: PALETTE.textMuted, fontSize: 20 }} />
                                        </InputAdornment>
                                    ),
                                }}
                            />
                        </Box>
                        <Box sx={{ mb: 3 }}>
                            <Typography
                                variant="caption"
                                sx={{
                                    textTransform: 'uppercase',
                                    fontWeight: 600,
                                    letterSpacing: '0.05em',
                                    color: PALETTE.textSecondary,
                                    display: 'block',
                                    mb: 1,
                                }}
                            >
                                Description
                            </Typography>
                            <TextField
                                fullWidth
                                multiline
                                rows={4}
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Add detailed notes regarding this activity..."
                                sx={{
                                    '& .MuiOutlinedInput-root': {
                                        bgcolor: PALETTE.surfaceAlt,
                                        borderRadius: '10px',
                                        '& fieldset': { borderColor: PALETTE.border },
                                    },
                                }}
                            />
                        </Box>
                        <Box sx={{ mb: 3 }}>
                            <Typography
                                variant="caption"
                                sx={{
                                    textTransform: 'uppercase',
                                    fontWeight: 600,
                                    letterSpacing: '0.05em',
                                    color: PALETTE.textSecondary,
                                    display: 'block',
                                    mb: 1.5,
                                }}
                            >
                                Categorization
                            </Typography>
                            <ToggleButtonGroup
                                value={category}
                                exclusive
                                onChange={(_, v) => v != null && setCategory(v)}
                                sx={{ gap: 1, flexWrap: 'wrap' }}
                            >
                                {CATEGORIES.map((c) => (
                                    <ToggleButton
                                        key={c.id}
                                        value={c.id}
                                        sx={{
                                            borderRadius: '9999px !important',
                                            border: `1px solid ${c.color}4D`,
                                            color: c.color,
                                            bgcolor: `${c.color}1A`,
                                            '&.Mui-selected': {
                                                bgcolor: c.color,
                                                color: 'white',
                                                '&:hover': { bgcolor: c.color },
                                            },
                                        }}
                                    >
                                        <Box component="span" sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'currentColor', mr: 1 }} />
                                        {c.label}
                                    </ToggleButton>
                                ))}
                            </ToggleButtonGroup>
                        </Box>
                        <Box sx={{ pt: 2, borderTop: '1px solid', borderColor: PALETTE.border }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                    <MdNotificationsActive style={{ color: PALETTE.textMuted, fontSize: 20 }} />
                                    <Typography variant="body2" fontWeight={500} color={PALETTE.text}>
                                        Push Notification
                                    </Typography>
                                </Box>
                                <Switch
                                    checked={pushNotification}
                                    onChange={(e) => setPushNotification(e.target.checked)}
                                    color="primary"
                                />
                            </Box>
                        </Box>
                    </Box>

                    <Box
                        sx={{
                            width: { xs: '100%', lg: 384 },
                            bgcolor: PALETTE.surfaceAlt,
                            borderLeft: { lg: '1px solid' },
                            borderColor: PALETTE.border,
                            p: 3,
                        }}
                    >
                        <Typography
                            variant="caption"
                            sx={{
                                textTransform: 'uppercase',
                                fontWeight: 600,
                                letterSpacing: '0.05em',
                                color: PALETTE.textSecondary,
                                display: 'block',
                                mb: 2,
                            }}
                        >
                            Select Date & Time
                        </Typography>
                        <Box
                            sx={{
                                bgcolor: PALETTE.surfaceCard,
                                borderRadius: 2,
                                p: 2,
                                mb: 2,
                                border: '1px solid',
                                borderColor: PALETTE.border,
                            }}
                        >
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                                <IconButton size="small" onClick={() => setDate(date.subtract(1, 'month'))} sx={{ color: PALETTE.textMuted }}>
                                    <MdChevronLeft />
                                </IconButton>
                                <Typography variant="body2" fontWeight={700} color={PALETTE.text}>
                                    {date.format('MMMM YYYY').toUpperCase()}
                                </Typography>
                                <IconButton size="small" onClick={() => setDate(date.add(1, 'month'))} sx={{ color: PALETTE.textMuted }}>
                                    <MdChevronRight />
                                </IconButton>
                            </Box>
                            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.5, textAlign: 'center' }}>
                                {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
                                    <Typography key={i} variant="caption" sx={{ color: PALETTE.textMuted, fontWeight: 600 }}>
                                        {d}
                                    </Typography>
                                ))}
                                {(() => {
                                    const start = date.startOf('month');
                                    const startWeekday = start.day();
                                    const offset = startWeekday === 0 ? 6 : startWeekday - 1;
                                    const daysInMonth = date.daysInMonth();
                                    const prevMonth = date.subtract(1, 'month');
                                    const prevDays = prevMonth.daysInMonth();
                                    const cells: { day: number; current: boolean; dayDate: Dayjs }[] = [];
                                    for (let i = 0; i < offset; i++) {
                                        const d = prevDays - offset + 1 + i;
                                        cells.push({ day: d, current: false, dayDate: prevMonth.date(d) });
                                    }
                                    for (let i = 1; i <= daysInMonth; i++) {
                                        cells.push({ day: i, current: true, dayDate: date.date(i) });
                                    }
                                    const remaining = 42 - cells.length;
                                    const nextMonth = date.add(1, 'month');
                                    for (let i = 1; i <= remaining; i++) {
                                        cells.push({ day: i, current: false, dayDate: nextMonth.date(i) });
                                    }
                                    return cells.slice(0, 42).map((cell, idx) => {
                                        const isChosen = cell.dayDate.format('YYYY-MM-DD') === date.format('YYYY-MM-DD');
                                        return (
                                            <Box
                                                key={idx}
                                                onClick={() => setDate(cell.dayDate)}
                                                sx={{
                                                    py: 1,
                                                    borderRadius: 1,
                                                    cursor: 'pointer',
                                                    color: cell.current ? PALETTE.text : PALETTE.textMuted,
                                                    bgcolor: isChosen ? PALETTE.development : 'transparent',
                                                    fontWeight: isChosen ? 700 : 400,
                                                    '&:hover': {
                                                        bgcolor: isChosen ? PALETTE.development : 'rgba(255,255,255,0.08)',
                                                    },
                                                }}
                                            >
                                                {cell.day}
                                            </Box>
                                        );
                                    });
                                })()}
                            </Box>
                        </Box>
                        <Box
                            sx={{
                                bgcolor: PALETTE.surfaceCard,
                                borderRadius: 2,
                                p: 2,
                                border: '1px solid',
                                borderColor: PALETTE.border,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 2,
                                fontFamily: 'monospace',
                            }}
                        >
                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <IconButton size="small" onClick={() => setHour((h) => Math.min(12, h + 1))} sx={{ color: PALETTE.textMuted }}>
                                    <MdExpandLess style={{ fontSize: 16 }} />
                                </IconButton>
                                <Box
                                    sx={{
                                        width: 64,
                                        height: 56,
                                        borderRadius: 1,
                                        bgcolor: PALETTE.surfaceAlt,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '1.5rem',
                                        fontWeight: 700,
                                        color: PALETTE.text,
                                    }}
                                >
                                    {String(hour).padStart(2, '0')}
                                </Box>
                                <IconButton size="small" onClick={() => setHour((h) => Math.max(1, h - 1))} sx={{ color: PALETTE.textMuted }}>
                                    <MdExpandMore style={{ fontSize: 16 }} />
                                </IconButton>
                            </Box>
                            <Typography variant="h5" fontWeight={700} sx={{ color: PALETTE.textSecondary }}>:</Typography>
                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <IconButton size="small" onClick={() => setMinute((m) => (m === 59 ? 0 : m + 1))} sx={{ color: PALETTE.textMuted }}>
                                    <MdExpandLess style={{ fontSize: 16 }} />
                                </IconButton>
                                <Box
                                    sx={{
                                        width: 64,
                                        height: 56,
                                        borderRadius: 1,
                                        bgcolor: PALETTE.surfaceAlt,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '1.5rem',
                                        fontWeight: 700,
                                        color: PALETTE.text,
                                    }}
                                >
                                    {String(minute).padStart(2, '0')}
                                </Box>
                                <IconButton size="small" onClick={() => setMinute((m) => (m === 0 ? 59 : m - 1))} sx={{ color: PALETTE.textMuted }}>
                                    <MdExpandMore style={{ fontSize: 16 }} />
                                </IconButton>
                            </Box>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, ml: 1 }}>
                                <Button
                                    size="small"
                                    variant={amPm === 'AM' ? 'contained' : 'outlined'}
                                    onClick={() => setAmPm('AM')}
                                    sx={{
                                        minWidth: 0,
                                        px: 1,
                                        py: 0.5,
                                        fontSize: '0.75rem',
                                        bgcolor: amPm === 'AM' ? PALETTE.development : 'transparent',
                                        borderColor: PALETTE.border,
                                        color: amPm === 'AM' ? '#fff' : PALETTE.textMuted,
                                    }}
                                >
                                    AM
                                </Button>
                                <Button
                                    size="small"
                                    variant={amPm === 'PM' ? 'contained' : 'outlined'}
                                    onClick={() => setAmPm('PM')}
                                    sx={{
                                        minWidth: 0,
                                        px: 1,
                                        py: 0.5,
                                        fontSize: '0.75rem',
                                        bgcolor: amPm === 'PM' ? PALETTE.development : 'transparent',
                                        borderColor: PALETTE.border,
                                        color: amPm === 'PM' ? '#fff' : PALETTE.textMuted,
                                    }}
                                >
                                    PM
                                </Button>
                            </Box>
                        </Box>
                        <Box sx={{ mt: 2 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                <Typography variant="caption" sx={{ color: PALETTE.textSecondary }}>Duration</Typography>
                                <Typography variant="caption" fontWeight={700} sx={{ color: PALETTE.development }}>
                                    {Math.floor(durationMinutes / 60)}h {durationMinutes % 60 > 0 ? `${durationMinutes % 60}m` : ''}
                                </Typography>
                            </Box>
                            <Slider
                                value={durationMinutes}
                                onChange={(_, v) => setDurationMinutes(v as number)}
                                min={15}
                                max={240}
                                step={15}
                                valueLabelDisplay="auto"
                                valueLabelFormat={(v) => `${Math.floor(v / 60)}h ${v % 60}m`}
                                sx={{ color: PALETTE.development }}
                            />
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                                <Typography variant="caption" sx={{ color: PALETTE.textMuted, fontFamily: 'monospace' }}>15m</Typography>
                                <Typography variant="caption" sx={{ color: PALETTE.textMuted, fontFamily: 'monospace' }}>4h</Typography>
                            </Box>
                        </Box>
                    </Box>
                </Box>

                <Box
                    sx={{
                        px: 3,
                        py: 2,
                        borderTop: '1px solid',
                        borderColor: PALETTE.border,
                        bgcolor: PALETTE.headerBg,
                        display: 'flex',
                        justifyContent: 'flex-end',
                        alignItems: 'center',
                        gap: 2,
                    }}
                >
                    <Button variant="outlined" onClick={handleClose} sx={{ borderColor: PALETTE.border, color: PALETTE.textSecondary }}>
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        variant="contained"
                        startIcon={<MdCalendarToday style={{ fontSize: 18 }} />}
                        sx={{
                            bgcolor: PALETTE.development,
                            '&:hover': { bgcolor: '#6a5ac9' },
                        }}
                    >
                        {isEdit ? 'Update Activity' : 'Create Activity'}
                    </Button>
                </Box>
            </Box>
        </Box>
    );
};

// ── Live Event Insight card ────────────────────────────────────
interface InsightCardProps {
    event: CalendarEvent;
    color: string;
    onEdit: () => void;
    onDelete: () => void;
}

const InsightCard: FC<InsightCardProps> = ({ event, color, onEdit, onDelete }) => {
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const open = Boolean(anchorEl);
    const day = dayjs(event.date).format('DD');
    const fullDate = dayjs(event.date).format('dddd, D MMMM, YYYY');
    const timeStr = `${event.hour}:${String(event.minute).padStart(2, '0')} ${event.amPm}`;
    const categoryLabel = CATEGORIES.find((c) => c.id === event.category)?.label ?? event.category;

    const categoryIcon =
        event.category === 'client' ? (
            <MdWarning style={{ fontSize: 20, opacity: 0.8 }} />
        ) : event.category === 'server' ? (
            <MdCloudDone style={{ fontSize: 20, opacity: 0.8 }} />
        ) : (
            <MdEvent style={{ fontSize: 20, opacity: 0.8 }} />
        );

    return (
        <>
            <Box
                onClick={onEdit}
                sx={{
                    background: color,
                    p: 2.5,
                    borderRadius: 2,
                    color: 'white',
                    boxShadow: 2,
                    position: 'relative',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    '&:hover': { transform: 'translateY(-4px)', boxShadow: 4 },
                }}
            >
                <IconButton
                    size="small"
                    sx={{ position: 'absolute', top: 8, right: 8, color: 'rgba(255,255,255,0.9)' }}
                    onClick={(e) => {
                        e.stopPropagation();
                        setAnchorEl(e.currentTarget);
                    }}
                >
                    <MdMoreVert />
                </IconButton>
                <Box display="flex" gap={2} alignItems="center">
                    <Typography variant="h4" fontWeight={800} sx={{ opacity: 0.9, minWidth: 48, textAlign: 'center' }}>
                        {day}
                    </Typography>
                    <Box flex={1} minWidth={0}>
                        <Typography variant="caption" fontWeight={700} textTransform="uppercase" letterSpacing="0.05em" display="block" sx={{ opacity: 0.9 }}>
                            {categoryLabel}
                        </Typography>
                        <Typography variant="body2" fontWeight={700} noWrap>{event.title || 'Untitled'}</Typography>
                        <Typography variant="caption" sx={{ opacity: 0.8, display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                            <MdSchedule style={{ fontSize: 14 }} />
                            {fullDate} · {timeStr}
                        </Typography>
                        {event.description ? (
                            <Typography variant="caption" noWrap sx={{ opacity: 0.8, display: 'block', mt: 0.5 }}>
                                {event.description}
                            </Typography>
                        ) : null}
                    </Box>
                    {categoryIcon}
                </Box>
            </Box>
            <Menu
                anchorEl={anchorEl}
                open={open}
                onClose={() => setAnchorEl(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                PaperProps={{
                    sx: {
                        bgcolor: PALETTE.surfaceCard,
                        border: '1px solid',
                        borderColor: PALETTE.border,
                        minWidth: 160,
                    },
                }}
            >
                <MenuItem
                    onClick={() => {
                        setAnchorEl(null);
                        onEdit();
                    }}
                >
                    <ListItemIcon>
                        <MdEdit style={{ fontSize: 18, color: PALETTE.textSecondary }} />
                    </ListItemIcon>
                    <ListItemText primary="Edit" primaryTypographyProps={{ fontSize: '0.875rem' }} />
                </MenuItem>
                <MenuItem
                    onClick={() => {
                        setAnchorEl(null);
                        onDelete();
                    }}
                    sx={{ color: PALETTE.client }}
                >
                    <ListItemIcon>
                        <MdDelete style={{ fontSize: 18 }} />
                    </ListItemIcon>
                    <ListItemText primary="Delete" primaryTypographyProps={{ fontSize: '0.875rem' }} />
                </MenuItem>
            </Menu>
        </>
    );
};

// ── Main page ─────────────────────────────────────────────────

const OptimizationCalendar: FC = () => {
    const [view, setView] = useState<'month' | 'year'>('month');
    const [currentMonth, setCurrentMonth] = useState<Dayjs>(() => dayjs());
    const [selectedDate, setSelectedDate] = useState<Dayjs | null>(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);

    const { events, dispatch, eventsByDay, loading } = useOptimizationCalendarEvents(currentMonth);
    const calendarGrid = useMemo(() => getCalendarGridCells(currentMonth), [currentMonth]);

    const handleSave = useCallback((event: CalendarEvent) => {
        if (events.some((e) => e.id === event.id)) {
            dispatch({ type: 'UPDATE', payload: event });
        } else {
            dispatch({ type: 'ADD', payload: event });
        }
        setEditingEvent(null);
    }, [events, dispatch]);

    const handleDelete = useCallback((id: string) => {
        if (window.confirm('Delete this event?')) {
            dispatch({ type: 'DELETE', payload: id });
            setEditingEvent(null);
        }
    }, [dispatch]);

    const openCreate = () => {
        setEditingEvent(null);
        setModalOpen(true);
    };

    const openEdit = (event: CalendarEvent) => {
        setEditingEvent(event);
        setModalOpen(true);
    };

    const closeModal = () => {
        setModalOpen(false);
        setEditingEvent(null);
    };

    const handleDayClick = useCallback((dateKey: string) => {
        setSelectedDate(dayjs(dateKey));
    }, []);

    const handleEventClick = useCallback(
        (evt: CalendarEvent, e: React.MouseEvent) => {
            e.stopPropagation();
            openEdit(evt);
        },
        [openEdit]
    );

    const insightEvents = useMemo(() => {
        return [...events].sort((a, b) => {
            const da = dayjs(a.date).valueOf();
            const db = dayjs(b.date).valueOf();
            if (da !== db) return da - db;
            const ta = a.hour * 60 + a.minute + (a.amPm === 'PM' && a.hour !== 12 ? 720 : 0);
            const tb = b.hour * 60 + b.minute + (b.amPm === 'PM' && b.hour !== 12 ? 720 : 0);
            return ta - tb;
        });
    }, [events]);

    const todayKey = dayjs().format('YYYY-MM-DD');

    return (
        <ThemeProvider theme={darkTheme}>
            <LocalizationProvider dateAdapter={AdapterDayjs}>
                <Box
                    className="calendar-page optimization-calendar"
                    sx={{
                        minHeight: '100vh',
                        bgcolor: PALETTE.background,
                        color: PALETTE.text,
                        p: { xs: 2, sm: 3 },
                        fontFamily: 'Inter, sans-serif',
                    }}
                >
                    <Box sx={{ maxWidth: 1400, margin: '0 auto', display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 380px' }, gap: 3 }}>
                        <Box>
                            <Box
                                sx={{
                                    bgcolor: PALETTE.surface,
                                    border: '1px solid',
                                    borderColor: PALETTE.border,
                                    borderRadius: 2,
                                    overflow: 'hidden',
                                    p: 3,
                                }}
                            >
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2, mb: 3 }}>
                                    <Box>
                                        <Typography variant="h5" fontWeight={800} color={PALETTE.text}>
                                            {currentMonth.format('MMMM YYYY')}
                                        </Typography>
                                        <Typography variant="body2" sx={{ color: PALETTE.textSecondary, mt: 0.5 }}>
                                            System activity and deployment schedule
                                        </Typography>
                                    </Box>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <ToggleButtonGroup
                                            value={view}
                                            exclusive
                                            onChange={(_, v) => v != null && setView(v)}
                                            size="small"
                                            sx={{
                                                '& .MuiToggleButton-root': {
                                                    textTransform: 'uppercase',
                                                    fontSize: '0.75rem',
                                                    fontWeight: 600,
                                                    py: 1,
                                                    px: 2,
                                                    borderColor: PALETTE.border,
                                                    color: PALETTE.textSecondary,
                                                    '&.Mui-selected': {
                                                        bgcolor: PALETTE.pillBlue,
                                                        color: '#fff',
                                                        borderColor: PALETTE.pillBlue,
                                                        '&:hover': { bgcolor: PALETTE.pillBlue },
                                                    },
                                                },
                                            }}
                                        >
                                            <ToggleButton value="month">Month</ToggleButton>
                                            <ToggleButton value="year">Year</ToggleButton>
                                        </ToggleButtonGroup>
                                        <Button
                                            variant="contained"
                                            startIcon={<MdAdd />}
                                            onClick={openCreate}
                                            sx={{
                                                bgcolor: PALETTE.development,
                                                '&:hover': { bgcolor: '#6a5ac9' },
                                            }}
                                        >
                                            Schedule
                                        </Button>
                                    </Box>
                                </Box>

                                {view === 'month' && (
                                    <Box sx={{ border: '1px solid', borderColor: PALETTE.border, borderRadius: 2, overflow: 'hidden' }}>
                                        <Box
                                            sx={{
                                                display: 'grid',
                                                gridTemplateColumns: 'repeat(7, 1fr)',
                                                borderBottom: '1px solid',
                                                borderColor: PALETTE.border,
                                                bgcolor: 'rgba(255,255,255,0.02)',
                                            }}
                                        >
                                            {['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'].map((d) => (
                                                <Typography
                                                    key={d}
                                                    variant="caption"
                                                    sx={{
                                                        py: 1.5,
                                                        textAlign: 'center',
                                                        color: PALETTE.textSecondary,
                                                        fontWeight: 600,
                                                        textTransform: 'uppercase',
                                                    }}
                                                >
                                                    {d.slice(0, 3)}
                                                </Typography>
                                            ))}
                                        </Box>
                                        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gridAutoRows: 'minmax(100px, auto)' }}>
                                            {calendarGrid.map((cell, idx) => {
                                                const dayEvents = eventsByDay[cell.dateKey] ?? [];
                                                const isHighlight = cell.dateKey === (selectedDate?.format('YYYY-MM-DD') ?? todayKey);
                                                return (
                                                    <Box
                                                        key={idx}
                                                        onClick={() => handleDayClick(cell.dateKey)}
                                                        sx={{
                                                            minHeight: 100,
                                                            border: '1px solid',
                                                            borderColor: PALETTE.border,
                                                            p: 1,
                                                            cursor: 'pointer',
                                                            bgcolor: isHighlight ? 'rgba(255,64,129,0.08)' : 'transparent',
                                                            outline: isHighlight ? `2px solid ${PALETTE.highlightBorder}` : 'none',
                                                            outlineOffset: -1,
                                                            '&:hover': { bgcolor: 'rgba(255,255,255,0.04)' },
                                                        }}
                                                    >
                                                        <Typography
                                                            variant="body2"
                                                            sx={{
                                                                color: cell.current ? PALETTE.text : PALETTE.textMuted,
                                                                fontWeight: 500,
                                                                mb: 0.5,
                                                            }}
                                                        >
                                                            {cell.day}
                                                        </Typography>
                                                        {dayEvents.map((evt) => (
                                                            <Box
                                                                key={evt.id}
                                                                onClick={(e) => handleEventClick(evt, e)}
                                                                sx={{
                                                                    borderRadius: 1,
                                                                    px: 1,
                                                                    py: 0.5,
                                                                    mb: 0.5,
                                                                    bgcolor: CATEGORY_COLORS[evt.category],
                                                                    color: '#fff',
                                                                    fontSize: '0.7rem',
                                                                    fontWeight: 600,
                                                                    overflow: 'hidden',
                                                                    textOverflow: 'ellipsis',
                                                                    whiteSpace: 'nowrap',
                                                                    '&:hover': { opacity: 0.9 },
                                                                }}
                                                            >
                                                                {evt.title || 'Untitled'}
                                                            </Box>
                                                        ))}
                                                    </Box>
                                                );
                                            })}
                                        </Box>
                                    </Box>
                                )}

                                {view === 'year' && (
                                    <Box sx={{ py: 4, textAlign: 'center' }}>
                                        <Typography variant="body2" color={PALETTE.textSecondary}>
                                            Year view: navigate by month using arrows below (optional enhancement).
                                        </Typography>
                                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, mt: 2 }}>
                                            <IconButton onClick={() => setCurrentMonth((m) => m.subtract(1, 'month'))} sx={{ color: PALETTE.textMuted }}>
                                                <MdChevronLeft />
                                            </IconButton>
                                            <Typography variant="h6" color={PALETTE.text}>
                                                {currentMonth.format('MMMM YYYY')}
                                            </Typography>
                                            <IconButton onClick={() => setCurrentMonth((m) => m.add(1, 'month'))} sx={{ color: PALETTE.textMuted }}>
                                                <MdChevronRight />
                                            </IconButton>
                                        </Box>
                                    </Box>
                                )}
                            </Box>

                            {view === 'month' && (
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 2 }}>
                                    <IconButton onClick={() => setCurrentMonth((m) => m.subtract(1, 'month'))} sx={{ color: PALETTE.textMuted }}>
                                        <MdChevronLeft />
                                    </IconButton>
                                    <Typography variant="body2" color={PALETTE.textSecondary}>
                                        {currentMonth.format('MMMM YYYY')}
                                    </Typography>
                                    <IconButton onClick={() => setCurrentMonth((m) => m.add(1, 'month'))} sx={{ color: PALETTE.textMuted }}>
                                        <MdChevronRight />
                                    </IconButton>
                                </Box>
                            )}
                        </Box>

                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <Typography
                                variant="caption"
                                fontWeight={700}
                                sx={{
                                    color: PALETTE.textSecondary,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.2em',
                                    px: 1,
                                    mb: 1,
                                }}
                            >
                                Live Event Insight
                            </Typography>
                            {insightEvents.length > 0 ? (
                                insightEvents.map((evt, idx) => (
                                    <InsightCard
                                        key={evt.id}
                                        event={evt}
                                        color={INSIGHT_COLORS[idx % INSIGHT_COLORS.length]}
                                        onEdit={() => openEdit(evt)}
                                        onDelete={() => handleDelete(evt.id)}
                                    />
                                ))
                            ) : (
                                <Box
                                    sx={{
                                        bgcolor: 'rgba(255,255,255,0.05)',
                                        border: '1px dashed',
                                        borderColor: PALETTE.border,
                                        borderRadius: 2,
                                        p: 4,
                                        textAlign: 'center',
                                    }}
                                >
                                    <MdEventBusy style={{ fontSize: 40, color: PALETTE.textMuted }} />
                                    <Typography variant="body2" sx={{ color: PALETTE.textSecondary, mt: 1 }}>No activity scheduled</Typography>
                                </Box>
                            )}
                        </Box>
                    </Box>

                    <ScheduleModal
                        open={modalOpen}
                        onClose={closeModal}
                        initialEvent={editingEvent}
                        currentDate={selectedDate ?? currentMonth}
                        onSave={handleSave}
                    />
                </Box>
            </LocalizationProvider>
        </ThemeProvider>
    );
};

export default OptimizationCalendar;
