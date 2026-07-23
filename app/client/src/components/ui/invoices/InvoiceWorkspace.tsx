import type { FC, SyntheticEvent } from 'react';
import { useState } from 'react';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import InvoiceListPane from './InvoiceListPane';
import InvoiceDetailPane from './InvoiceDetailPane';
import type { Invoice } from '@/types/invoice';

interface InvoiceWorkspaceProps {
    invoices: Invoice[];
    selectedId: string | null;
    onSelect: (id: string) => void;
}

const InvoiceWorkspace: FC<InvoiceWorkspaceProps> = ({ invoices, selectedId, onSelect }) => {
    const [activeTab, setActiveTab] = useState(2);
    const selectedInvoice = invoices.find((invoice) => invoice.id === selectedId) ?? null;

    const handleChange = (_event: SyntheticEvent, value: number) => setActiveTab(value);

    return (
        <div className="relative flex-1">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 z-10 bg-white p-1 rounded-b-2xl shadow-sm border-x border-b border-gray-100">
                <Tabs
                    value={activeTab}
                    onChange={handleChange}
                    TabIndicatorProps={{ style: { display: 'none' } }}
                    sx={{ minHeight: 0 }}
                >
                    <Tab
                        disableRipple
                        label="All Invoices"
                        sx={{
                            minHeight: 0,
                            textTransform: 'none',
                            fontSize: '0.8rem',
                            fontWeight: 500,
                            borderRadius: '0.75rem',
                            color: 'rgb(75 85 99)',
                            '&.Mui-selected': { color: 'rgb(34 34 34)' },
                        }}
                    />
                    <Tab
                        disableRipple
                        label={
                            <span className="flex items-center gap-2">
                                Draft
                                <span className="bg-gray-100 px-1.5 rounded-md text-[11px] font-numbers">3</span>
                            </span>
                        }
                        sx={{
                            minHeight: 0,
                            textTransform: 'none',
                            fontSize: '0.8rem',
                            fontWeight: 500,
                            borderRadius: '0.75rem',
                            color: 'rgb(75 85 99)',
                            '&.Mui-selected': { color: 'rgb(34 34 34)' },
                        }}
                    />
                    <Tab
                        disableRipple
                        label={
                            <span className="flex items-center gap-2">
                                Unpaid
                                <span className="bg-white/50 px-1.5 rounded-md text-[11px] font-numbers">
                                    {invoices.length}
                                </span>
                            </span>
                        }
                        sx={{
                            minHeight: 0,
                            textTransform: 'none',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            borderRadius: '0.75rem',
                            '&.Mui-selected': {
                                backgroundColor: 'var(--color-brand-accent)',
                                color: 'var(--color-brand-dark)',
                            },
                        }}
                    />
                </Tabs>
            </div>

            <div className="bg-brand-nearBlack border border-white/10 rounded-3xl flex min-h-[420px] h-full">
                <InvoiceListPane invoices={invoices} selectedId={selectedId} onSelect={onSelect} />
                <InvoiceDetailPane invoice={selectedInvoice} />
            </div>
        </div>
    );
};

export default InvoiceWorkspace;
