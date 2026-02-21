import { useState, useMemo } from 'react';
import type { FC } from 'react';
import { useNavigate } from 'react-router-dom';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar';
import { PickersDay } from '@mui/x-date-pickers/PickersDay';
import type { PickersDayProps } from '@mui/x-date-pickers/PickersDay';
import {
    ThemeProvider,
    createTheme,
    TextField,
    Button,
    Switch,
    Slider,
    IconButton,
    ToggleButtonGroup,
    ToggleButton,
    Box,
    Typography,
    InputAdornment,
    Badge,
} from '@mui/material';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';

import type { } from '@mui/x-date-pickers/themeAugmentation';

import { useCalendarEvents } from '../hooks/useCalendarEvents';

// Template colors from docs/templase/Calendar.html
const TEMPLATE = {
    primary: '#5e72e4',
    primaryGlow: 'rgba(94, 114, 228, 0.5)',
    secondary: '#2dcecc',
    tertiary: '#f5365c',
    quaternary: '#fb6340',
    backgroundDark: '#17181c',
    surfaceDark: '#212329',
    surfaceDarkAlt: '#1a1c22',
    surfaceDarkCard: '#252830',
    borderDark: '#2d2f36',
    headerBg: '#1f2026',
};

// MUI theme matching Calendar.html template
const calendarTheme = createTheme({
    palette: {
        mode: 'dark',
        primary: { main: TEMPLATE.primary },
        secondary: { main: TEMPLATE.secondary },
        error: { main: TEMPLATE.tertiary },
        warning: { main: TEMPLATE.quaternary },
        background: {
            default: TEMPLATE.backgroundDark,
            paper: TEMPLATE.surfaceDark,
        },
    },
    typography: {
        fontFamily: 'Inter, sans-serif',
        h1: { fontWeight: 700 },
        h2: { fontWeight: 700 },
        body1: { fontSize: '0.875rem' },
    },
    shape: { borderRadius: 12 },
    components: {
        MuiPickersDay: {
            styleOverrides: {
                root: {
                    color: '#9ca3af',
                    fontSize: '12px',
                    margin: '2px',
                    '&:hover': {
                        backgroundColor: 'rgba(94, 114, 228, 0.15)',
                    },
                    '&.Mui-selected': {
                        backgroundColor: `${TEMPLATE.primary} !important`,
                        color: '#fff',
                        fontWeight: 700,
                        boxShadow: `0 0 15px ${TEMPLATE.primaryGlow}`,
                    },
                    '&.MuiPickersDay-today': {
                        borderColor: TEMPLATE.primary,
                        borderWidth: '1px',
                    },
                },
            },
        },
        MuiDayCalendar: {
            styleOverrides: {
                weekDayLabel: {
                    color: '#9ca3af',
                    fontSize: '10px',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                },
            },
        },
        MuiPickersCalendarHeader: {
            styleOverrides: {
                label: { fontSize: '0.875rem', fontWeight: 700, color: '#fff' },
                switchViewButton: { color: '#9ca3af' },
            },
        },
        MuiTextField: {
            styleOverrides: {
                root: {
                    '& .MuiOutlinedInput-root': {
                        backgroundColor: TEMPLATE.surfaceDarkAlt,
                        borderRadius: '10px',
                        '& fieldset': { borderColor: TEMPLATE.borderDark },
                        '&:hover fieldset': { borderColor: TEMPLATE.borderDark },
                        '&.Mui-focused fieldset': {
                            borderColor: TEMPLATE.primary,
                            borderWidth: '2px',
                            boxShadow: `0 0 0 2px ${TEMPLATE.primaryGlow}`,
                        },
                    },
                },
            },
        },
        MuiButton: {
            styleOverrides: {
                containedPrimary: {
                    boxShadow: `0 0 15px ${TEMPLATE.primaryGlow}`,
                    '&:hover': {
                        boxShadow: `0 0 25px rgba(94, 114, 228, 0.65)`,
                        transform: 'translateY(-2px)',
                    },
                },
            },
        },
        MuiSwitch: {
            styleOverrides: {
                switchBase: {
                    '&.Mui-checked': { color: TEMPLATE.primary },
                    '&.Mui-checked + .MuiSwitch-track': { backgroundColor: TEMPLATE.primary },
                },
            },
        },
        MuiSlider: {
            styleOverrides: {
                colorPrimary: { color: TEMPLATE.primary },
                thumb: { color: TEMPLATE.primary },
                track: { color: TEMPLATE.primary },
            },
        },
        MuiToggleButtonGroup: {
            styleOverrides: {
                root: { gap: 12, flexWrap: 'wrap' },
            },
        },
        MuiToggleButton: {
            styleOverrides: {
                root: {
                    borderRadius: '9999px !important',
                    border: '1px solid',
                    textTransform: 'none',
                    fontWeight: 500,
                    fontSize: '0.875rem',
                },
            },
        },
    } as any,
});

// ── Types ────────────────────────────────────────────────────
interface CalendarNote {
    id: number;
    title: string;
    type: string;
    createdAt: string;
    updatedAt: string;
}

interface NotesByDay {
    [day: string]: CalendarNote[];
}

// ── Components ───────────────────────────────────────────────

const HighlightedDay: FC<PickersDayProps & { notesByDay?: NotesByDay }> = (props) => {
    const { notesByDay = {}, day, outsideCurrentMonth, ...other } = props;
    const dayStr = day.date().toString();
    const hasNotes = !outsideCurrentMonth && notesByDay[dayStr] && notesByDay[dayStr].length > 0;
    const noteCount = hasNotes ? notesByDay[dayStr].length : 0;

    return (
        <Badge
            overlap="circular"
            variant="dot"
            invisible={!hasNotes}
            sx={{
                '& .MuiBadge-badge': {
                    backgroundColor: noteCount > 2 ? TEMPLATE.quaternary : TEMPLATE.primary,
                    width: 6,
                    height: 6,
                    minWidth: 6,
                    bottom: 4,
                    boxShadow: `0 0 8px ${noteCount > 2 ? 'rgba(251,99,64,0.5)' : TEMPLATE.primaryGlow}`,
                },
            }}
        >
            <PickersDay outsideCurrentMonth={outsideCurrentMonth} day={day} {...other} />
        </Badge>
    );
};

const InsightCard: FC<{ day: string; title: string; category: string; time: string; color: string; icon: string; onClick?: () => void }> = ({ day, title, category, time, color, icon, onClick }) => (
    <Box
        onClick={onClick}
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
            '& .icon-bg': { position: 'absolute', right: -16, top: -16, opacity: 0.1, fontSize: 56 },
        }}
    >
        <span className="material-icons-round icon-bg">{icon}</span>
        <Box display="flex" gap={2} alignItems="center">
            <Typography variant="h4" fontWeight={800} sx={{ opacity: 0.9, minWidth: 48, textAlign: 'center' }}>
                {day.padStart(2, '0')}
            </Typography>
            <Box flex={1} minWidth={0}>
                <Typography variant="caption" fontWeight={700} textTransform="uppercase" letterSpacing="0.05em" display="block" sx={{ opacity: 0.9 }}>
                    {category}
                </Typography>
                <Typography variant="body2" fontWeight={700} noWrap>{title}</Typography>
                <Typography variant="caption" sx={{ opacity: 0.8, display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                    <span className="material-icons-round" style={{ fontSize: 14 }}>schedule</span>
                    {time}
                </Typography>
            </Box>
        </Box>
    </Box>
);

const CATEGORIES = [
    { value: 'development', label: 'Development', color: TEMPLATE.primary },
    { value: 'server', label: 'Server Maint.', color: TEMPLATE.secondary },
    { value: 'client', label: 'Client Meeting', color: TEMPLATE.tertiary },
    { value: 'marketing', label: 'Marketing', color: TEMPLATE.quaternary },
] as const;

const ScheduleModal: FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    const [category, setCategory] = useState<string>('development');
    const [pushNotif, setPushNotif] = useState(false);
    const [emailReminder, setEmailReminder] = useState(true);
    const [duration, setDuration] = useState(90); // minutes
    const [hour, setHour] = useState(9);
    const [minute, setMinute] = useState(30);
    const [amPm, setAmPm] = useState<'AM' | 'PM'>('AM');

    if (!isOpen) return null;

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
                onClick={onClose}
            />
            <Box
                sx={{
                    position: 'relative',
                    width: '100%',
                    maxWidth: 896,
                    bgcolor: TEMPLATE.surfaceDark,
                    borderRadius: 2,
                    boxShadow: 24,
                    border: '1px solid',
                    borderColor: TEMPLATE.borderDark,
                    overflow: 'hidden',
                    animation: 'fadeIn 0.3s ease-out',
                    '@keyframes fadeIn': {
                        from: { opacity: 0, transform: 'translateY(10px)' },
                        to: { opacity: 1, transform: 'translateY(0)' },
                    },
                }}
            >
                {/* Header - matches template */}
                <Box
                    sx={{
                        px: 3,
                        py: 2,
                        borderBottom: '1px solid',
                        borderColor: TEMPLATE.borderDark,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        bgcolor: TEMPLATE.headerBg,
                    }}
                >
                    <Box>
                        <Typography variant="h6" fontWeight={700} color="white">
                            Schedule New Tech Activity
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                            Create a new event, meeting, or maintenance window.
                        </Typography>
                    </Box>
                    <IconButton onClick={onClose} sx={{ color: 'grey.400' }} size="small">
                        <span className="material-icons-round">close</span>
                    </IconButton>
                </Box>

                <Box sx={{ display: 'flex', flexDirection: { xs: 'column', lg: 'row' } }}>
                    {/* Left: Form - matches template */}
                    <Box
                        sx={{
                            flex: 1,
                            p: 3,
                            spaceY: 3,
                            overflowY: 'auto',
                            maxHeight: '70vh',
                        }}
                    >
                        <TextField
                            fullWidth
                            label="Activity Title"
                            placeholder="e.g. Q4 Server Migration"
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <span className="material-icons-round" style={{ color: '#9ca3af', fontSize: 20 }}>edit</span>
                                    </InputAdornment>
                                ),
                            }}
                            sx={{ '& .MuiInputLabel-root': { textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.05em' } }}
                        />
                        <Box>
                            <Typography variant="caption" sx={{ textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em', color: 'text.secondary', display: 'block', mb: 1 }}>
                                Description
                            </Typography>
                            <TextField
                                fullWidth
                                multiline
                                rows={4}
                                placeholder="Add detailed notes regarding this activity..."
                                sx={{
                                    '& .MuiOutlinedInput-root': {
                                        bgcolor: TEMPLATE.surfaceDarkAlt,
                                        borderRadius: '10px',
                                        '& fieldset': { borderColor: TEMPLATE.borderDark },
                                    },
                                }}
                            />
                        </Box>
                        <Box>
                            <Typography variant="caption" sx={{ textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em', color: 'text.secondary', display: 'block', mb: 1.5 }}>
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
                                        key={c.value}
                                        value={c.value}
                                        sx={{
                                            borderRadius: '9999px !important',
                                            border: `1px solid ${c.color}4D`,
                                            color: c.color,
                                            bgcolor: `${c.color}1A`,
                                            '&.Mui-selected': {
                                                bgcolor: c.color,
                                                color: 'white',
                                                boxShadow: `0 0 15px ${c.color}66`,
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
                        <Box sx={{ pt: 2, borderTop: '1px solid', borderColor: TEMPLATE.borderDark }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                    <Box sx={{ p: 1, borderRadius: 1, bgcolor: 'primary.main', color: 'primary.contrastText', '& .material-icons-round': { fontSize: 20 } }}>
                                        <span className="material-icons-round">notifications_active</span>
                                    </Box>
                                    <Box>
                                        <Typography variant="body2" fontWeight={500} color="white">Push Notification</Typography>
                                        <Typography variant="caption" color="text.secondary">Alert 15 mins before</Typography>
                                    </Box>
                                </Box>
                                <Switch checked={pushNotif} onChange={(e) => setPushNotif(e.target.checked)} color="primary" />
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                    <Box sx={{ p: 1, borderRadius: 1, bgcolor: 'secondary.main', color: 'secondary.contrastText', '& .material-icons-round': { fontSize: 20 } }}>
                                        <span className="material-icons-round">email</span>
                                    </Box>
                                    <Box>
                                        <Typography variant="body2" fontWeight={500} color="white">Email Reminder</Typography>
                                        <Typography variant="caption" color="text.secondary">Send to attendees</Typography>
                                    </Box>
                                </Box>
                                <Switch checked={emailReminder} onChange={(e) => setEmailReminder(e.target.checked)} color="primary" />
                            </Box>
                        </Box>
                    </Box>

                    {/* Right: Date & Time - matches template */}
                    <Box
                        sx={{
                            width: { xs: '100%', lg: 384 },
                            bgcolor: TEMPLATE.surfaceDarkAlt,
                            borderLeft: { lg: '1px solid' },
                            borderColor: TEMPLATE.borderDark,
                            p: 3,
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                        }}
                    >
                        <Box>
                            <Typography variant="caption" sx={{ textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em', color: 'text.secondary', display: 'block', mb: 2 }}>
                                Select Date & Time
                            </Typography>
                            <Box
                                sx={{
                                    bgcolor: TEMPLATE.surfaceDarkCard,
                                    borderRadius: 2,
                                    p: 2,
                                    mb: 2,
                                    border: '1px solid',
                                    borderColor: TEMPLATE.borderDark,
                                }}
                            >
                                <ThemeProvider theme={calendarTheme}>
                                    <DateCalendar sx={{ width: '100%', '& .MuiPickersCalendarHeader-root': { padding: 0 } }} />
                                </ThemeProvider>
                            </Box>
                            <Box
                                sx={{
                                    bgcolor: TEMPLATE.surfaceDarkCard,
                                    borderRadius: 2,
                                    p: 2,
                                    border: '1px solid',
                                    borderColor: TEMPLATE.borderDark,
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    gap: 2,
                                    fontFamily: 'JetBrains Mono, monospace',
                                }}
                            >
                                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                    <IconButton size="small" onClick={() => setHour((h) => Math.min(12, h + 1))}><span className="material-icons-round" style={{ fontSize: 16 }}>expand_less</span></IconButton>
                                    <Box sx={{ width: 64, height: 56, borderRadius: 1, bgcolor: 'grey.800', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 700, color: 'white' }}>
                                        {String(hour).padStart(2, '0')}
                                    </Box>
                                    <IconButton size="small" onClick={() => setHour((h) => Math.max(1, h - 1))}><span className="material-icons-round" style={{ fontSize: 16 }}>expand_more</span></IconButton>
                                </Box>
                                <Typography variant="h5" fontWeight={700} color="text.secondary">:</Typography>
                                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                    <IconButton size="small" onClick={() => setMinute((m) => (m === 59 ? 0 : m + 1))}><span className="material-icons-round" style={{ fontSize: 16 }}>expand_less</span></IconButton>
                                    <Box sx={{ width: 64, height: 56, borderRadius: 1, bgcolor: 'grey.800', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 700, color: 'white' }}>
                                        {String(minute).padStart(2, '0')}
                                    </Box>
                                    <IconButton size="small" onClick={() => setMinute((m) => (m === 0 ? 59 : m - 1))}><span className="material-icons-round" style={{ fontSize: 16 }}>expand_more</span></IconButton>
                                </Box>
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, ml: 1 }}>
                                    <Button size="small" variant={amPm === 'AM' ? 'contained' : 'outlined'} onClick={() => setAmPm('AM')} sx={{ minWidth: 0, px: 1, py: 0.5, fontSize: '0.75rem' }}>AM</Button>
                                    <Button size="small" variant={amPm === 'PM' ? 'contained' : 'outlined'} onClick={() => setAmPm('PM')} sx={{ minWidth: 0, px: 1, py: 0.5, fontSize: '0.75rem' }}>PM</Button>
                                </Box>
                            </Box>
                            <Box sx={{ mt: 2 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                    <Typography variant="caption" color="text.secondary">Duration</Typography>
                                    <Typography variant="caption" fontWeight={700} color="primary.main">
                                        {Math.floor(duration / 60)}h {duration % 60 > 0 ? `${duration % 60}m` : ''}
                                    </Typography>
                                </Box>
                                <Slider
                                    value={duration}
                                    onChange={(_, v) => setDuration(v as number)}
                                    min={15}
                                    max={240}
                                    step={15}
                                    valueLabelDisplay="auto"
                                    valueLabelFormat={(v) => `${Math.floor(v / 60)}h ${v % 60}m`}
                                    sx={{ color: TEMPLATE.primary }}
                                />
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                                    <Typography variant="caption" color="text.secondary" fontFamily="monospace">15m</Typography>
                                    <Typography variant="caption" color="text.secondary" fontFamily="monospace">4h</Typography>
                                </Box>
                            </Box>
                        </Box>
                    </Box>
                </Box>

                {/* Footer - matches template */}
                <Box
                    sx={{
                        px: 3,
                        py: 2,
                        borderTop: '1px solid',
                        borderColor: TEMPLATE.borderDark,
                        bgcolor: TEMPLATE.headerBg,
                        display: 'flex',
                        justifyContent: 'flex-end',
                        alignItems: 'center',
                        gap: 2,
                    }}
                >
                    <Button variant="outlined" onClick={onClose} sx={{ borderColor: 'grey.600', color: 'grey.300' }}>
                        Cancel
                    </Button>
                    <Button
                        variant="contained"
                        startIcon={<span className="material-icons-round" style={{ fontSize: 18 }}>calendar_today</span>}
                        sx={{
                            bgcolor: TEMPLATE.primary,
                            boxShadow: `0 0 15px ${TEMPLATE.primaryGlow}`,
                            '&:hover': {
                                boxShadow: '0 0 25px rgba(94, 114, 228, 0.65)',
                                transform: 'translateY(-2px)',
                            },
                        }}
                    >
                        Create Activity
                    </Button>
                </Box>
            </Box>

            {/* Blur orbs like template */}
            <Box sx={{ position: 'fixed', top: 80, left: 80, width: 288, height: 288, bgcolor: TEMPLATE.primary, opacity: 0.1, filter: 'blur(100px)', borderRadius: '50%', pointerEvents: 'none' }} />
            <Box sx={{ position: 'fixed', bottom: 80, right: 80, width: 384, height: 384, bgcolor: TEMPLATE.tertiary, opacity: 0.1, filter: 'blur(120px)', borderRadius: '50%', pointerEvents: 'none' }} />
        </Box>
    );
};

// ── Main Page Component ──────────────────────────────────────

const Calendar: FC = () => {
    const navigate = useNavigate();
    const [selectedDate, setSelectedDate] = useState<Dayjs>(dayjs());
    const [showModal, setShowModal] = useState(false);
    const { notesByDay, totalNotes, loading } = useCalendarEvents(selectedDate);

    const insightNotes = useMemo(() => {
        return Object.entries(notesByDay)
            .flatMap(([day, notes]) => notes.map(n => ({ ...n, day })))
            .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
            .slice(0, 5);
    }, [notesByDay]);

    const getInsightColor = (index: number) => {
        const colors = [TEMPLATE.primary, TEMPLATE.secondary, TEMPLATE.primary, TEMPLATE.quaternary, TEMPLATE.tertiary];
        return colors[index % colors.length];
    };

    const getInsightIcon = (type: string) => {
        const icons: Record<string, string> = { text: 'description', list: 'format_list_bulleted', image: 'image', link: 'link' };
        return icons[type] || 'event';
    };

    return (
        <ThemeProvider theme={calendarTheme}>
            <LocalizationProvider dateAdapter={AdapterDayjs}>
                <Box
                    className="calendar-page"
                    sx={{
                        minHeight: '100vh',
                        bgcolor: TEMPLATE.backgroundDark,
                        color: '#e5e7eb',
                        p: 3,
                        fontFamily: 'Inter, sans-serif',
                        '& .scrollbar': {
                            width: 8,
                            '&::-webkit-scrollbar-thumb': { background: '#374151', borderRadius: 1 },
                            '&::-webkit-scrollbar-track': { background: 'transparent' },
                        },
                    }}
                >
                    <Box component="main" sx={{ maxWidth: 1400, margin: '0 auto', display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'repeat(12, 1fr)' }, gap: 3 }}>
                        <Box sx={{ gridColumn: { lg: '1 / 9' }, display: 'flex', flexDirection: 'column', gap: 3 }}>
                            <Box
                                sx={{
                                    bgcolor: TEMPLATE.surfaceDark,
                                    border: '1px solid',
                                    borderColor: TEMPLATE.borderDark,
                                    borderRadius: 2,
                                    overflow: 'hidden',
                                    p: 3,
                                }}
                            >
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                                    <Box>
                                        <Typography variant="h5" fontWeight={800} color="white">
                                            {selectedDate.format('MMMM YYYY')}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                            System activity and deployment schedule
                                        </Typography>
                                    </Box>
                                    <Button
                                        variant="contained"
                                        startIcon={<span className="material-icons-round">add</span>}
                                        onClick={() => setShowModal(true)}
                                        sx={{
                                            bgcolor: TEMPLATE.primary,
                                            boxShadow: `0 0 15px ${TEMPLATE.primaryGlow}`,
                                            '&:hover': { bgcolor: '#4d5fd6', boxShadow: `0 0 25px ${TEMPLATE.primaryGlow}` },
                                        }}
                                    >
                                        SCHEDULE
                                    </Button>
                                </Box>

                                <Box
                                    sx={{
                                        borderRadius: 2,
                                        p: 1,
                                        bgcolor: 'rgba(255,255,255,0.02)',
                                        border: '1px solid',
                                        borderColor: 'rgba(255,255,255,0.05)',
                                    }}
                                >
                                    <DateCalendar
                                        value={selectedDate}
                                        onChange={(val) => val && setSelectedDate(val)}
                                        loading={loading}
                                        slots={{ day: HighlightedDay }}
                                        slotProps={{ day: { notesByDay } as any }}
                                        sx={{
                                            width: '100%',
                                            maxHeight: 'none',
                                            '& .MuiPickersCalendarHeader-root': { paddingLeft: 2, paddingRight: 2 },
                                            '& .MuiDayCalendar-slideTransition': { minHeight: 350 },
                                            '& .MuiPickersDay-root': { width: 36, height: 36, fontSize: '12px' },
                                            '& .MuiDayCalendar-weekContainer': { justifyContent: 'space-between' },
                                            '& .MuiDayCalendar-header': { justifyContent: 'space-between' },
                                        }}
                                    />
                                </Box>
                            </Box>

                            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
                                <Box
                                    sx={{
                                        bgcolor: TEMPLATE.surfaceDark,
                                        border: '1px solid',
                                        borderColor: TEMPLATE.borderDark,
                                        borderRadius: 2,
                                        p: 3,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 2,
                                    }}
                                >
                                    <Box sx={{ width: 48, height: 48, borderRadius: 2, bgcolor: `${TEMPLATE.primary}1A`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <span className="material-icons-round" style={{ color: TEMPLATE.primary, fontSize: 28 }}>analytics</span>
                                    </Box>
                                    <Box>
                                        <Typography fontWeight={700} variant="h6" color="white">{totalNotes} Logs</Typography>
                                        <Typography variant="caption" color="text.secondary">Detected this month</Typography>
                                    </Box>
                                </Box>
                                <Box
                                    sx={{
                                        bgcolor: TEMPLATE.surfaceDark,
                                        border: '1px solid',
                                        borderColor: TEMPLATE.borderDark,
                                        borderRadius: 2,
                                        p: 3,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 2,
                                    }}
                                >
                                    <Box sx={{ width: 48, height: 48, borderRadius: 2, bgcolor: `${TEMPLATE.secondary}1A`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <span className="material-icons-round" style={{ color: TEMPLATE.secondary, fontSize: 28 }}>check_circle</span>
                                    </Box>
                                    <Box>
                                        <Typography fontWeight={700} variant="h6" color="white">Daily Goal</Typography>
                                        <Typography variant="caption" color="text.secondary">85% Consistency reached</Typography>
                                    </Box>
                                </Box>
                            </Box>
                        </Box>

                        <Box sx={{ gridColumn: { lg: '9 / 13' }, display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.2em', px: 1, mb: 1 }}>
                                Live Event Insight
                            </Typography>
                            {insightNotes.length > 0 ? (
                                insightNotes.map((note, idx) => (
                                    <InsightCard
                                        key={note.id}
                                        day={note.day}
                                        title={note.title || 'Untitled Activity'}
                                        category={note.type}
                                        time={dayjs(note.createdAt).format('h:mm A')}
                                        color={getInsightColor(idx)}
                                        icon={getInsightIcon(note.type)}
                                        onClick={() => navigate(`/note-editor?id=${note.id}`)}
                                    />
                                ))
                            ) : (
                                <Box
                                    sx={{
                                        bgcolor: 'rgba(255,255,255,0.05)',
                                        border: '1px dashed',
                                        borderColor: TEMPLATE.borderDark,
                                        borderRadius: 2,
                                        p: 4,
                                        textAlign: 'center',
                                    }}
                                >
                                    <span className="material-icons-round" style={{ fontSize: 40, color: '#6b7280' }}>event_busy</span>
                                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>No activity scheduled</Typography>
                                </Box>
                            )}
                            <Box
                                sx={{
                                    mt: 2,
                                    bgcolor: 'rgba(0,0,0,0.2)',
                                    border: '1px solid',
                                    borderColor: TEMPLATE.borderDark,
                                    borderRadius: 2,
                                    p: 2,
                                }}
                            >
                                <Typography variant="caption" fontWeight={800} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.1em', mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Box component="span" sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: TEMPLATE.secondary, animation: 'pulse 1.5s ease-in-out infinite', '@keyframes pulse': { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.5 } }} } />
                                    Recent Deployments
                                </Typography>
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                    {[
                                        { code: 200, path: '/api/v1/auth/login', time: '142ms', color: TEMPLATE.secondary },
                                        { code: 404, path: '/api/static/logo.png', time: '1ms', color: TEMPLATE.quaternary },
                                        { code: 200, path: '/api/v1/user/profile', time: '22ms', color: TEMPLATE.secondary },
                                    ].map((log, i) => (
                                        <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, fontSize: 11, fontFamily: 'monospace', pb: 1, borderBottom: '1px solid', borderColor: 'rgba(255,255,255,0.05)', '&:last-child': { borderBottom: 0, pb: 0 } }}>
                                            <Typography component="span" fontWeight={700} sx={{ color: log.color }}>{log.code}</Typography>
                                            <Typography component="span" color="text.secondary" noWrap sx={{ flex: 1 }}>{log.path}</Typography>
                                            <Typography component="span" color="text.secondary">{log.time}</Typography>
                                        </Box>
                                    ))}
                                </Box>
                            </Box>
                        </Box>
                    </Box>

                    <ScheduleModal isOpen={showModal} onClose={() => setShowModal(false)} />
                </Box>
            </LocalizationProvider>
        </ThemeProvider>
    );
};

export default Calendar;
