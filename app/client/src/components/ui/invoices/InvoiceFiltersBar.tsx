import type { FC } from 'react';
import { FiSearch } from 'react-icons/fi';
import Select, { type SelectChangeEvent } from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs, { type Dayjs } from 'dayjs';

interface InvoiceFiltersBarProps {
    activeFilterCount: number;
    customer: string;
    onCustomerChange: (customer: string) => void;
    status: string;
    onStatusChange: (status: string) => void;
    dateFrom: string;
    dateTo: string;
    onDateFromChange: (value: string) => void;
    onDateToChange: (value: string) => void;
    search: string;
    onSearchChange: (value: string) => void;
}

const STATUS_OPTIONS = ['All statuses', 'Unsent', 'Viewed', 'Due', 'Overdue', 'Paid'];
const CUSTOMER_OPTIONS = ['All customers', 'Northwind Traders', 'Lumen Studio', 'Atlas & Co', 'Harbor Digital'];

const pillSelectSx = {
    minWidth: 150,
    borderRadius: '9999px',
    backgroundColor: 'rgba(255,255,255,0.5)',
    fontSize: '0.75rem',
    '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgb(229 231 235)' },
    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgb(34 34 34)' },
    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: 'rgb(34 34 34)', borderWidth: 1 },
    '& .MuiSelect-select': { paddingTop: '8px', paddingBottom: '8px', paddingLeft: '16px' },
};

const pillDateSx = {
    minWidth: 170,
    '& .MuiOutlinedInput-root': {
        borderRadius: '9999px',
        backgroundColor: 'rgba(255,255,255,0.5)',
        fontSize: '0.75rem',
        '& fieldset': { borderColor: 'rgb(229 231 235)' },
        '&:hover fieldset': { borderColor: 'rgb(34 34 34)' },
        '&.Mui-focused fieldset': { borderColor: 'rgb(34 34 34)', borderWidth: 1 },
    },
    '& .MuiInputBase-input': { paddingTop: '8px', paddingBottom: '8px' },
};

const InvoiceFiltersBar: FC<InvoiceFiltersBarProps> = ({
    activeFilterCount,
    customer,
    onCustomerChange,
    status,
    onStatusChange,
    dateFrom,
    dateTo,
    onDateFromChange,
    onDateToChange,
    search,
    onSearchChange,
}) => {
    const handleDateFrom = (value: Dayjs | null) => onDateFromChange(value ? value.format('YYYY-MM-DD') : '');
    const handleDateTo = (value: Dayjs | null) => onDateToChange(value ? value.format('YYYY-MM-DD') : '');

    return (
        <div className="glass-panel rounded-2xl p-2 flex items-center gap-3 flex-wrap">
            <span className="px-3 py-1.5 rounded-xl bg-brand-dark text-white text-xs font-bold font-numbers flex-shrink-0">
                Active filters {activeFilterCount}
            </span>

            <Select
                value={customer}
                onChange={(event: SelectChangeEvent) => onCustomerChange(event.target.value)}
                size="small"
                sx={pillSelectSx}
            >
                {CUSTOMER_OPTIONS.map((option) => (
                    <MenuItem key={option} value={option} sx={{ fontSize: '0.8rem' }}>
                        {option}
                    </MenuItem>
                ))}
            </Select>

            <Select
                value={status}
                onChange={(event: SelectChangeEvent) => onStatusChange(event.target.value)}
                size="small"
                sx={pillSelectSx}
            >
                {STATUS_OPTIONS.map((option) => (
                    <MenuItem key={option} value={option} sx={{ fontSize: '0.8rem' }}>
                        {option}
                    </MenuItem>
                ))}
            </Select>

            <LocalizationProvider dateAdapter={AdapterDayjs}>
                <DatePicker
                    value={dateFrom ? dayjs(dateFrom) : null}
                    onChange={handleDateFrom}
                    views={['year', 'month']}
                    format="MMMM YYYY"
                    slotProps={{ textField: { size: 'small', sx: pillDateSx, placeholder: 'November 2023' } }}
                />
                <DatePicker
                    value={dateTo ? dayjs(dateTo) : null}
                    onChange={handleDateTo}
                    views={['year', 'month']}
                    format="MMMM YYYY"
                    slotProps={{ textField: { size: 'small', sx: pillDateSx, placeholder: 'December 2023' } }}
                />
            </LocalizationProvider>

            <div className="relative ml-auto">
                <input
                    value={search}
                    onChange={(event) => onSearchChange(event.target.value)}
                    className="bg-white/50 border border-gray-200 text-xs rounded-xl pl-4 pr-10 py-2 w-48 focus:outline-none focus:ring-1 focus:ring-brand-dark"
                    placeholder="Enter invoice #"
                    type="text"
                />
                <FiSearch className="w-4 h-4 absolute right-3 top-2.5 text-gray-400" />
            </div>
        </div>
    );
};

export default InvoiceFiltersBar;
