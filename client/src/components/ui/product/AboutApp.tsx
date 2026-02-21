import type { FC } from 'react';
import APIReference from '@/components/ui/resources/APIReference';

const AboutApp: FC = () => {
    return (
        <div className="w-full min-h-full bg-background-light dark:bg-background-dark text-gray-900 dark:text-gray-100 flex flex-col overflow-x-hidden">
            {/* Header / Intro */}
            <section className="border-b border-gray-200 dark:border-gray-800 bg-card-light dark:bg-background-dark py-12 px-8 lg:px-12">
                <div className="max-w-4xl">
                    <div className="flex items-center space-x-2 text-sm text-primary font-medium mb-4">
                        <span>Architecture Hub</span>
                        <span className="text-gray-400">/</span>
                        <span>Platform Overview</span>
                    </div>
                    <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-6">
                        Platform Overview &amp; API Guide
                    </h1>
                    <p className="text-lg text-gray-600 dark:text-gray-300 leading-relaxed max-w-3xl">
                        Explore how ApexOps is structured under the hood and how its API surface works in practice. This
                        overview combines high-level architecture, core capabilities, and concrete API examples to help you
                        integrate and operate the platform with confidence.
                    </p>
                </div>
            </section>

            {/* API Reference style section (hybrid part 1) */}
            <APIReference />

            {/* Core Architecture & Core Functions (hybrid part 2) */}
            <section className="px-8 lg:px-12 py-16 bg-white dark:bg-background-dark border-b border-gray-200 dark:border-gray-800">
                <div className="max-w-4xl">
                    <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-3">
                        <span className="material-symbols-outlined text-primary">account_tree</span>
                        <span>Core Architecture</span>
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-8 leading-relaxed">
                        ApexOps is designed as a modular observability and incident response platform. Each capability—logs,
                        tickets, AI diagnostics, and dashboards—is isolated into focused services, but they share a common
                        event and data model so that you can trace an issue end-to-end from the browser console down to the
                        underlying infrastructure.
                    </p>

                    <div className="space-y-10">
                        <div>
                            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                                Logging &amp; Metrics Pipeline
                            </h3>
                            <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                                Client and server events are ingested through a unified logging API. Events are buffered,
                                normalized, and enriched with context (environment, release, user, and correlation IDs) before
                                being persisted. This allows you to pivot easily between console logs, performance metrics, and
                                error traces without losing context.
                            </p>
                        </div>

                        <div className="grid md:grid-cols-2 gap-8 items-start">
                            <div className="bg-gray-100 dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                                <h4 className="text-xs font-bold uppercase text-gray-500 mb-4 tracking-wider">AI Diagnostics</h4>
                                <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                                    ApexOps can analyze stack traces, logs, and ticket history to suggest root causes and next
                                    actions. It surfaces related incidents, likely regressions, and remediation templates so your
                                    team can move from detection to resolution faster.
                                </p>
                            </div>
                            <div>
                                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                                    Incident &amp; Ticket Workflow
                                </h3>
                                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                                    Ticketing is tightly integrated with the logging pipeline. You can escalate an error directly
                                    into a structured ticket, link it to deployments, and track its lifecycle from triage through
                                    resolution using familiar, JIRA-style workflows.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Technology Stack section (hybrid part 3a) */}
            <section className="px-8 lg:px-12 py-16 bg-gray-50 dark:bg-gray-900/30 border-b border-gray-200 dark:border-gray-800">
                <div className="max-w-4xl">
                    <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-3">
                        <span className="material-symbols-outlined text-primary">layers</span>
                        <span>Technology Stack</span>
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-10">
                        ApexOps is built on a modern TypeScript-first stack optimized for developer experience, observability,
                        and scalability.
                    </p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 max-w-4xl">
                    <div className="flex flex-col items-center p-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
                        <div className="tech-grid-icon mb-4 flex items-center justify-center w-12 h-12 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                            <span className="material-symbols-outlined text-blue-500">javascript</span>
                        </div>
                        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">React &amp; TypeScript</span>
                    </div>

                    <div className="flex flex-col items-center p-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
                        <div className="tech-grid-icon mb-4 flex items-center justify-center w-12 h-12 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                            <span className="material-symbols-outlined text-green-500">token</span>
                        </div>
                        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Node.js API</span>
                    </div>

                    <div className="flex flex-col items-center p-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
                        <div className="tech-grid-icon mb-4 flex items-center justify-center w-12 h-12 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                            <span className="material-symbols-outlined text-indigo-500">database</span>
                        </div>
                        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">PostgreSQL</span>
                    </div>

                    <div className="flex flex-col items-center p-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
                        <div className="tech-grid-icon mb-4 flex items-center justify-center w-12 h-12 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                            <span className="material-symbols-outlined text-sky-500">box</span>
                        </div>
                        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Docker</span>
                    </div>

                    <div className="flex flex-col items-center p-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
                        <div className="tech-grid-icon mb-4 flex items-center justify-center w-12 h-12 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                            <span className="material-symbols-outlined text-black dark:text-white">hub</span>
                        </div>
                        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">GitHub Actions</span>
                    </div>
                </div>
            </section>

            {/* Resources & Development Tools section (hybrid part 3b) */}
            <section className="px-8 lg:px-12 py-16 bg-white dark:bg-background-dark border-b border-gray-200 dark:border-gray-800">
                <div className="max-w-4xl">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-3">
                        <span className="material-symbols-outlined text-primary">build</span>
                        <span>Development Resources</span>
                    </h2>

                    <div className="grid md:grid-cols-2 gap-12">
                        <div>
                            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-4">
                                Recommended IDE Extensions
                            </h3>
                            <ul className="space-y-3">
                                <li className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                    <span className="material-symbols-outlined text-gray-400">extension</span>
                                    <div>
                                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">ESLint &amp; Prettier</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">Code quality and consistent formatting.</p>
                                    </div>
                                </li>
                                <li className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                    <span className="material-symbols-outlined text-gray-400">extension</span>
                                    <div>
                                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Tailwind CSS IntelliSense</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                            Autocomplete, linting, and previews for utility classes.
                                        </p>
                                    </div>
                                </li>
                                <li className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                    <span className="material-symbols-outlined text-gray-400">extension</span>
                                    <div>
                                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Prisma VS Code</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">Schema highlighting and linting for the data layer.</p>
                                    </div>
                                </li>
                            </ul>
                        </div>

                        <div>
                            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-4">
                                Local Dev &amp; Operations
                            </h3>
                            <ul className="space-y-3">
                                <li className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                    <span className="material-symbols-outlined text-gray-400">apps</span>
                                    <div>
                                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Docker Desktop</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                            Run Postgres, supporting services, and preview environments locally.
                                        </p>
                                    </div>
                                </li>
                                <li className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                    <span className="material-symbols-outlined text-gray-400">apps</span>
                                    <div>
                                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Postman / Insomnia</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                            Explore and validate ApexOps APIs during development.
                                        </p>
                                    </div>
                                </li>
                                <li className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                    <span className="material-symbols-outlined text-gray-400">apps</span>
                                    <div>
                                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Browser DevTools</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                            Pair console logs with ApexOps dashboards for a full picture of runtime behavior.
                                        </p>
                                    </div>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default AboutApp;

