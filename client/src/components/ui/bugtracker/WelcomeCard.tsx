import type { FC } from 'react';
import { Link } from 'react-router-dom';
import QuickStatBadge from '@/components/ui/bugtracker/QuickStatBadge';

interface WelcomeCardProps {
    userName?: string;
    ticketStats?: {
        open: number;
        inProgress: number;
        resolved: number;
        critical: number;
    };
}

const WelcomeCard: FC<WelcomeCardProps> = ({ userName = 'Developer', ticketStats = { open: 0, inProgress: 0, resolved: 0, critical: 0 } }) => {

    const now = new Date();
    const hour = now.getHours();
    const greeting = hour < 12 ? 'Good Morning' : hour < 18 ? 'Good Afternoon' : 'Good Evening';
    const dateStr = now.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    const timeStr = now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
    });

    const downloadPDF = async () => {
        const response = await fetch("/api/report/pdf", {
            method: "GET",
        });

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        a.download = "report.pdf";
        document.body.appendChild(a);
        a.click();

        a.remove();
        window.URL.revokeObjectURL(url);
    };

    return (
        <main className="relative overflow-hidden rounded-2xl">
            {/* background gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-navy via-indigo to-wine" />
            {/* decorative elements */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-ember/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-peach/15 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
            {/* grid pattern */}
            <div className="absolute inset-0 opacity-5">
                <div className="w-full h-full" style={{ backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
            </div>
            {/* content */}
            <section className="relative z-10 p-8">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                    {/* left side - greeting */}
                    <article className="space-y-4">
                        <div className="flex items-center gap-2 text-peach/80">
                            <div className="flex gap-2 items-center">
                                <i className="ri-calendar-fill"></i>
                                <span className="text-sm font-medium">{dateStr}</span>
                            </div>
                            <span className="text-white/40">•</span>
                            <div className="flex gap-2 items-center">
                                <i className="ri-alarm-fill"></i>
                                <span className="text-sm font-medium">{timeStr}</span>
                            </div>
                        </div>

                        <div>
                            <h1 className="text-3xl lg:text-4xl font-bold text-white mb-2">
                                {greeting}, {userName}!
                                <i className="ri-sparkling-2-fill inline-block w-8 h-8 ml-2 text-peach animate-pulse"></i>
                            </h1>
                            <p className="text-white/70 text-lg">
                                Welcome to ApexOps Bug Tracker. Let's squash some bugs today!
                            </p>
                        </div>

                        <div className="flex items-center gap-2">
                            <Link to="/bug-tracker" className="px-3 py-1.5 rounded-full bg-white/10 text-white/90 text-sm font-medium backdrop-blur-sm border border-white/10 flex items-center gap-1.5">
                                <i className="ri-bug-fill"></i>
                                View Tickets
                            </Link>
                            <button onClick={downloadPDF} className="px-3 py-1.5 rounded-full bg-white/10 text-white/90 text-sm font-medium backdrop-blur-sm border border-white/10 flex items-center gap-1.5">
                                <i className="ri-download-line"></i>
                                Download
                            </button>

                            {ticketStats.critical > 0 && (
                                <span className="px-3 py-1.5 rounded-full bg-global-red/20 text-red-300 text-sm font-medium backdrop-blur-sm border border-global-red/30 flex items-center gap-1.5 animate-pulse">
                                    <i className="ri-error-warning-fill"></i>
                                    {ticketStats.critical} Critical
                                </span>
                            )}
                        </div>
                    </article>
                    {/* right side - quick stats preview */}
                    <article className="flex gap-4">
                        <QuickStatBadge label="Open" value={ticketStats.open.toString()} color="ember" icon={<i className="ri-bug-fill"></i>} />
                        <QuickStatBadge label="In Progress" value={ticketStats.inProgress.toString()} color="indigo" icon={<i className="ri-calendar-fill"></i>} />
                        <QuickStatBadge label="Resolved" value={ticketStats.resolved.toString()} color="green" icon={<i className="ri-checkbox-circle-line"></i>} />
                    </article>
                </div>
            </section>
        </main>
    );
};

export default WelcomeCard;
