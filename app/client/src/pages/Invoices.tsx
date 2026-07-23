import type { FC } from 'react';
import { useMemo, useState } from 'react';
import InvoiceTopHeader from '@/components/ui/invoices/InvoiceTopHeader';
import InvoicePageHeader from '@/components/ui/invoices/InvoicePageHeader';
import InvoiceKpiOverview from '@/components/ui/invoices/InvoiceKpiOverview';
import InvoicePayoutCard from '@/components/ui/invoices/InvoicePayoutCard';
import InvoiceFiltersBar from '@/components/ui/invoices/InvoiceFiltersBar';
import InvoiceWorkspace from '@/components/ui/invoices/InvoiceWorkspace';
import { mockInvoices } from '@/types/invoice';

const Invoices: FC = () => {
    const [selectedId, setSelectedId] = useState<string | null>(mockInvoices[2]?.id ?? null);
    const [customer, setCustomer] = useState('All customers');
    const [status, setStatus] = useState('All statuses');
    const [dateFrom, setDateFrom] = useState('2023-11-01');
    const [dateTo, setDateTo] = useState('2023-12-01');
    const [search, setSearch] = useState('');

    const filteredInvoices = useMemo(() => {
        return mockInvoices.filter((invoice) => {
            const matchesCustomer = customer === 'All customers' || invoice.company.name === customer;
            const matchesStatus = status === 'All statuses' || invoice.status === status.toLowerCase();
            const matchesSearch =
                search.trim() === '' ||
                invoice.number.toLowerCase().includes(search.trim().toLowerCase()) ||
                invoice.company.name.toLowerCase().includes(search.trim().toLowerCase());
            return matchesCustomer && matchesStatus && matchesSearch;
        });
    }, [customer, status, search]);

    const activeFilterCount = 2;

    return (
        <div className="flex flex-col gap-5">
            <InvoiceTopHeader />
            <InvoicePageHeader />

            <div className="grid grid-cols-5 gap-4 items-stretch">
                <div className="col-span-3">
                    <InvoiceKpiOverview invoices={mockInvoices} />
                </div>
                <div className="col-span-2">
                    <InvoicePayoutCard />
                </div>
            </div>

            <InvoiceFiltersBar
                activeFilterCount={activeFilterCount}
                customer={customer}
                onCustomerChange={setCustomer}
                status={status}
                onStatusChange={setStatus}
                dateFrom={dateFrom}
                onDateFromChange={setDateFrom}
                dateTo={dateTo}
                onDateToChange={setDateTo}
                search={search}
                onSearchChange={setSearch}
            />

            <InvoiceWorkspace
                invoices={filteredInvoices}
                selectedId={selectedId}
                onSelect={setSelectedId}
            />
        </div>
    );
};

export default Invoices;
