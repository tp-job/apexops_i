import type { FC } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { Users, TrendingUp } from 'lucide-react';

const PatientDemographicsChart: FC = () => {
    const patientDemographics = [
        { name: '0-18', value: 20, color: '#2F3E52', label: 'Children' },
        { name: '19-35', value: 35, color: '#41436A', label: 'Young Adults' },
        { name: '36-50', value: 25, color: '#984063', label: 'Adults' },
        { name: '51-65', value: 15, color: '#F64668', label: 'Seniors' },
        { name: '65+', value: 5, color: '#FE9677', label: 'Elderly' }
    ];

    const total = patientDemographics.reduce((sum, p) => sum + p.value, 0);

    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div className="px-3 py-2 rounded-lg shadow-lg border bg-white border-light-border dark:bg-dark-surface dark:border-dark-border">
                    <p className="text-sm font-medium text-light-text-primary dark:text-dark-text-primary">
                        {data.label}
                    </p>
                    <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
                        Age: {data.name} • {data.value}%
                    </p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="rounded-2xl overflow-hidden bg-white border-light-border dark:bg-dark-surface dark:border-dark-border border">
            {/* Header */}
            <div className="px-6 py-4 border-b flex items-center justify-between border-light-border dark:border-dark-border">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-navy to-indigo flex items-center justify-center">
                        <Users className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h3 className="font-bold text-light-text-primary dark:text-dark-text-primary">
                            Patient Demographics
                        </h3>
                        <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
                            Age distribution
                        </p>
                    </div>
                </div>
                <span className="flex items-center gap-1 text-xs font-medium text-global-green">
                    <TrendingUp className="w-3.5 h-3.5" />
                    +12%
                </span>
            </div>

            {/* Chart */}
            <div className="p-6">
                <div className="flex items-center justify-center">
                    <div className="relative">
                        <ResponsiveContainer width={200} height={200}>
                            <PieChart>
                                <Pie
                                    data={patientDemographics}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={55}
                                    outerRadius={85}
                                    paddingAngle={3}
                                    dataKey="value"
                                    strokeWidth={0}
                                >
                                    {patientDemographics.map((entry, index) => (
                                        <Cell 
                                            key={`cell-${index}`} 
                                            fill={entry.color}
                                            className="hover:opacity-80 transition-opacity cursor-pointer"
                                        />
                                    ))}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                            </PieChart>
                        </ResponsiveContainer>
                        {/* Center Text */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span className="text-3xl font-bold text-light-text-primary dark:text-dark-text-primary">
                                {total}%
                            </span>
                            <span className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
                                Total
                            </span>
                        </div>
                    </div>
                </div>

                {/* Legend */}
                <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {patientDemographics.map((item) => (
                        <div 
                            key={item.name} 
                            className="flex items-center gap-2 p-2 rounded-lg bg-light-surface-2 dark:bg-dark-surface-2"
                        >
                            <div 
                                className="w-3 h-3 rounded-full shrink-0" 
                                style={{ backgroundColor: item.color }}
                            />
                            <div className="min-w-0">
                                <span className="text-xs block truncate text-light-text-secondary dark:text-dark-text-secondary">
                                    {item.name}
                                </span>
                                <span className="text-sm font-bold text-light-text-primary dark:text-dark-text-primary">
                                    {item.value}%
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default PatientDemographicsChart;
