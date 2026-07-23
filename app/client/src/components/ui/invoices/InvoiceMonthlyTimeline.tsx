import type { FC } from 'react';

export interface TimelineMonth {
    label: string;
    fillPct: number;
    avatars?: string[];
}

interface InvoiceMonthlyTimelineProps {
    months: TimelineMonth[];
}

const InvoiceMonthlyTimeline: FC<InvoiceMonthlyTimelineProps> = ({ months }) => {
    return (
        <div className="grid grid-cols-4 gap-8">
            {months.map((month) => (
                <div key={month.label} className="flex flex-col gap-3">
                    <span className="text-sm font-medium text-gray-500">{month.label}</span>

                    <div className="relative h-2 rounded-full bg-gray-200/70 overflow-hidden">
                        {month.fillPct > 0 ? (
                            <div
                                className="pattern-stripes h-full rounded-full bg-brand-accent"
                                style={{ width: `${month.fillPct}%` }}
                            />
                        ) : (
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-brand-accent" />
                        )}
                    </div>

                    <div className="h-8">
                        {month.avatars && month.avatars.length > 0 && (
                            <div className="flex -space-x-2">
                                {month.avatars.map((avatar, index) => (
                                    <img
                                        key={`${avatar}-${index}`}
                                        src={avatar}
                                        alt="client avatar"
                                        className="w-8 h-8 rounded-full border-2 border-white object-cover"
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default InvoiceMonthlyTimeline;
