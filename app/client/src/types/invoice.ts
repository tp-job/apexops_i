export type InvoiceStatus = 'unsent' | 'viewed' | 'overdue' | 'due' | 'paid';

export interface InvoiceLineItem {
    id: string;
    label: string;
    amount: number;
}

export interface Invoice {
    id: string;
    number: string;
    status: InvoiceStatus;
    amount: number;
    dueInDays: number;
    avatar: string;
    company: {
        name: string;
    };
    customer: {
        name: string;
        title: string;
        avatar: string;
    };
    items: InvoiceLineItem[];
}

export const mockInvoices: Invoice[] = [
    {
        id: 'inv-404-002',
        number: '# 404-002',
        status: 'unsent',
        amount: 80770,
        dueInDays: 2,
        avatar: 'https://i.pravatar.cc/64?img=12',
        company: { name: 'Northwind Traders' },
        customer: {
            name: 'James Carter',
            title: 'Founder, Northwind Traders',
            avatar: 'https://i.pravatar.cc/64?img=12',
        },
        items: [
            { id: 'li-1', label: 'Brand identity concept', amount: 40385 },
            { id: 'li-2', label: 'Design system integration', amount: 40385 },
        ],
    },
    {
        id: 'inv-426-001',
        number: '# 426-001',
        status: 'viewed',
        amount: 27114,
        dueInDays: 4,
        avatar: 'https://i.pravatar.cc/64?img=32',
        company: { name: 'Lumen Studio' },
        customer: {
            name: 'Sara Whitfield',
            title: 'Creative Director, Lumen Studio',
            avatar: 'https://i.pravatar.cc/64?img=32',
        },
        items: [
            { id: 'li-3', label: 'Landing page concept', amount: 13557 },
            { id: 'li-4', label: 'Component integration', amount: 13557 },
        ],
    },
    {
        id: 'inv-427-012',
        number: '# 427-012',
        status: 'unsent',
        amount: 53154,
        dueInDays: 5,
        avatar: 'https://i.pravatar.cc/64?img=45',
        company: { name: 'BlueRock' },
        customer: {
            name: 'Maria Jones',
            title: 'CEO, BlueRock Pvt Ltd',
            avatar: 'https://i.pravatar.cc/64?img=45',
        },
        items: [
            { id: 'li-5', label: 'Concept Development', amount: 10630.8 },
            { id: 'li-6', label: 'CRM Development', amount: 31892.4 },
            { id: 'li-7', label: 'CRM Integration', amount: 10630.8 },
        ],
    },
    {
        id: 'inv-424-112',
        number: '# 424-112',
        status: 'viewed',
        amount: 61223,
        dueInDays: 16,
        avatar: 'https://i.pravatar.cc/64?img=5',
        company: { name: 'Harbor Digital' },
        customer: {
            name: 'Daniel Reyes',
            title: 'Operations Lead, Harbor Digital',
            avatar: 'https://i.pravatar.cc/64?img=5',
        },
        items: [
            { id: 'li-8', label: 'Dashboard concept', amount: 30611.5 },
            { id: 'li-9', label: 'API integration', amount: 30611.5 },
        ],
    },
    {
        id: 'inv-417-020',
        number: '# 417-020',
        status: 'viewed',
        amount: 7311,
        dueInDays: 19,
        avatar: 'https://i.pravatar.cc/64?img=18',
        company: { name: 'Cedar & Vine' },
        customer: {
            name: 'Olivia Bennett',
            title: 'Owner, Cedar & Vine',
            avatar: 'https://i.pravatar.cc/64?img=18',
        },
        items: [
            { id: 'li-10', label: 'Motion concept', amount: 3655.5 },
            { id: 'li-11', label: 'Prototype integration', amount: 3655.5 },
        ],
    },
];
