import type { FC } from 'react';

const PresentMarketPanel: FC = () => (
    <div className="w-full lg:w-1/2 h-auto lg:h-screen bg-background-light dark:bg-black text-light-text-primary dark:text-dark-text-primary p-8 lg:p-20 flex flex-col justify-center relative">
        <div className="absolute top-8 left-8 lg:left-20 flex w-full pr-16 justify-between text-xs lg:text-sm text-light-text-secondary dark:text-dark-text-secondary uppercase tracking-widest font-medium">
            <span>Market Opportunity</span>
            <span className="mr-8 lg:mr-24">Page 08</span>
        </div>
        <div className="mb-16 mt-12 lg:mt-0">
            <h2 className="text-4xl lg:text-6xl font-light leading-tight tracking-tight">
                Market Opportunity <br />
                <span className="text-brand-green font-normal">Growing</span>{' '}
                <span className="text-brand-blue font-normal">Market</span> <br />
                Demand
            </h2>
        </div>
        <div className="space-y-10 lg:space-y-12">
            <div className="flex gap-6 group">
                <div className="flex-shrink-0 mt-1">
                    <span className="material-icons-outlined text-3xl lg:text-4xl text-light-text-secondary dark:text-dark-text-secondary group-hover:text-brand-green transition-colors">
                        bolt
                    </span>
                </div>
                <div>
                    <h3 className="text-xl lg:text-2xl font-normal mb-2">Energy Demand</h3>
                    <p className="text-light-text dark:text-dark-text-secondary text-sm lg:text-base leading-relaxed max-w-md">
                        The increasing global need for energy solutions drives the demand for smarter, more efficient
                        consumption management.
                    </p>
                </div>
            </div>
            <div className="flex gap-6 group">
                <div className="flex-shrink-0 mt-1">
                    <span className="material-icons-outlined text-3xl lg:text-4xl text-light-text-secondary dark:text-dark-text-secondary group-hover:text-brand-blue transition-colors">
                        trending_up
                    </span>
                </div>
                <div>
                    <h3 className="text-xl lg:text-2xl font-normal mb-2">Market Growth</h3>
                    <p className="text-light-text dark:text-dark-text-secondary text-sm lg:text-base leading-relaxed max-w-md">
                        The energy management sector is experiencing rapid expansion, fueled by advancements in AI and
                        predictive analytics.
                    </p>
                </div>
            </div>
            <div className="flex gap-6 group">
                <div className="flex-shrink-0 mt-1">
                    <span className="material-icons-outlined text-3xl lg:text-4xl text-light-text-secondary dark:text-dark-text-secondary group-hover:text-white transition-colors">
                        diamond
                    </span>
                </div>
                <div>
                    <h3 className="text-xl lg:text-2xl font-normal mb-2">Industry Benefits</h3>
                    <p className="text-light-text dark:text-dark-text-secondary text-sm lg:text-base leading-relaxed max-w-md">
                        Key industries such as manufacturing, commercial buildings, data centers can optimize operations
                        &amp; reduce costs using Deepstack.
                    </p>
                </div>
            </div>
        </div>
        <div className="hidden lg:block absolute left-0 top-1/4 w-12 border-t border-dotted border-dark-border" />
    </div>
);

export default PresentMarketPanel;

