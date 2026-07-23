import type { FC } from 'react'

const APIReference: FC = () => {
    return (
        <>
            <div className="border-b border-gray-200 dark:border-gray-800 bg-card-light dark:bg-background-dark py-12 px-8 lg:px-12">
                <div className="max-w-4xl">
                    <div className="flex items-center space-x-2 text-sm text-primary font-medium mb-4">
                        <span>API Reference</span>
                        <span className="text-gray-400">/</span>
                        <span>Authentication</span>
                    </div>
                    <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-6">Authentication</h1>
                    <p className="text-lg text-gray-600 dark:text-gray-300 leading-relaxed max-w-3xl">
                        The DevPlatform API uses API keys to authenticate requests. You can view and manage your API keys in the <a className="text-primary hover:underline decoration-2 underline-offset-2" href="#">Dashboard</a> settings.
                    </p>
                </div>
            </div>
            <div className="flex flex-col xl:flex-row border-b border-gray-200 dark:border-gray-800">
                <div className="flex-1 px-8 lg:px-12 py-12 bg-card-light dark:bg-background-dark xl:border-r border-gray-200 dark:border-gray-800">
                    <div className="prose dark:prose-invert max-w-none">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">Bearer Token</h2>
                        <p className="text-gray-600 dark:text-gray-300 mb-6">
                            Your API keys carry many privileges, so be sure to keep them secure! Do not share your secret API keys in publicly accessible areas such as GitHub, client-side code, and so forth.
                        </p>
                        <p className="text-gray-600 dark:text-gray-300 mb-6">
                            Authentication to the API is performed via HTTP Basic Auth. Provide your API key as the basic auth username value. You do not need to provide a password.
                        </p>
                        <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-primary p-4 rounded-r mb-8">
                            <div className="flex">
                                <div className="flex-shrink-0">
                                    <span className="material-icons-round text-primary">info</span>
                                </div>
                                <div className="ml-3">
                                    <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">Production vs Sandbox</h3>
                                    <div className="mt-2 text-sm text-blue-700 dark:text-blue-300">
                                        <p>All API requests must be made over HTTPS. Calls made over plain HTTP will fail. API requests without authentication will also fail.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 mt-8">Handling Errors</h3>
                        <p className="text-gray-600 dark:text-gray-300 mb-4">
                            The API uses conventional HTTP response codes to indicate the success or failure of an API request.
                        </p>
                        <ul className="list-disc pl-5 space-y-2 text-gray-600 dark:text-gray-300 mb-8">
                            <li><code className="text-sm bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-primary font-mono">2xx</code> - Success.</li>
                            <li><code className="text-sm bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-primary font-mono">4xx</code> - Error caused by client (e.g. invalid parameters).</li>
                            <li><code className="text-sm bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-primary font-mono">5xx</code> - Error caused by server.</li>
                        </ul>
                    </div>
                </div>
                <div className="xl:w-[45%] bg-background-light dark:bg-[#0f1117] flex flex-col sticky top-16 h-auto xl:h-[calc(100vh-4rem)]">
                    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-white/50 dark:bg-[#0f1117]/50 backdrop-blur">
                        <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Request Example</span>
                        <div className="flex space-x-2">
                            <button className="px-2 py-1 rounded text-xs font-medium bg-primary text-white">cURL</button>
                            <button className="px-2 py-1 rounded text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800">Node.js</button>
                            <button className="px-2 py-1 rounded text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800">Python</button>
                        </div>
                    </div>
                    <div className="p-6 overflow-auto custom-scrollbar flex-1 bg-code-bg">
                        <pre className="font-mono text-sm leading-relaxed text-gray-300">
                            <span className="text-purple-400">curl</span> https://api.devplatform.com/v1/logs \
                            <span className="text-blue-400">-u</span> <span className="text-gray-400">YOUR_API_KEY</span>: \
                            <span className="text-blue-400">-d</span> limit=10 \
                            <span className="text-blue-400">-d</span> source=
                            <span className="text-green-400">"nginx-server-1"</span> \
                            <span className="text-blue-400">-G</span>
                        </pre>
                        <div className="mt-8 mb-2">
                            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Response Example</span>
                        </div>
                        <pre className="font-mono text-sm leading-relaxed text-gray-300">
                            <span className="text-yellow-400">{'{'}</span>
                            <span className="text-green-400">"data"</span>: <span className="text-yellow-400">[</span>
                            <span className="text-purple-400">{'{'}</span>
                            <span className="text-green-400">"id"</span>: <span className="text-blue-400">"log_1M3s7A2eZvKYlo2C"</span>,
                            <span className="text-green-400">"object"</span>: <span className="text-green-400">"log"</span>,
                            <span className="text-green-400">"timestamp"</span>: <span className="text-blue-400">1678892311</span>,
                            <span className="text-green-400">"level"</span>: <span className="text-green-400">"info"</span>,
                            <span className="text-green-400">"message"</span>: <span className="text-green-400">"Connection accepted from 192.168.1.1"</span>
                            <span className="text-purple-400">{'}'}</span>
                            <span className="text-yellow-400">]</span>,
                            <span className="text-green-400">"has_more"</span>: <span className="text-blue-400">true</span>,
                            <span className="text-green-400">"url"</span>: <span className="text-green-400">"/v1/logs"</span>
                            <span className="text-yellow-400">{'}'}</span>
                        </pre>
                    </div>
                </div>
            </div>
            <div className="flex flex-col xl:flex-row border-b border-gray-200 dark:border-gray-800">
                <div className="flex-1 px-8 lg:px-12 py-12 bg-card-light dark:bg-background-dark xl:border-r border-gray-200 dark:border-gray-800">
                    <div className="prose dark:prose-invert max-w-none">
                        <div className="flex items-center gap-3 mb-4">
                            <span className="bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 text-xs font-bold px-2 py-1 rounded uppercase">GET</span>
                            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white m-0">List all logs</h2>
                        </div>
                        <p className="text-gray-600 dark:text-gray-300 mb-6">
                            Returns a list of your logs. The logs are returned sorted by creation date, with the most recently created logs appearing first.
                        </p>
                        <h4 className="text-sm font-bold uppercase text-gray-500 dark:text-gray-400 mb-4 tracking-wider">Parameters</h4>
                        <div className="border-t border-gray-200 dark:border-gray-700">
                            <div className="py-4 border-b border-gray-200 dark:border-gray-700">
                                <div className="flex items-baseline gap-3 mb-1">
                                    <code className="text-primary font-mono text-sm font-semibold">limit</code>
                                    <span className="text-xs text-gray-500">optional</span>
                                </div>
                                <p className="text-sm text-gray-600 dark:text-gray-400">A limit on the number of objects to be returned. Limit can range between 1 and 100.</p>
                            </div>
                            <div className="py-4 border-b border-gray-200 dark:border-gray-700">
                                <div className="flex items-baseline gap-3 mb-1">
                                    <code className="text-primary font-mono text-sm font-semibold">starting_after</code>
                                    <span className="text-xs text-gray-500">optional</span>
                                </div>
                                <p className="text-sm text-gray-600 dark:text-gray-400">A cursor for use in pagination. starting_after is an object ID that defines your place in the list.</p>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="xl:w-[45%] bg-background-light dark:bg-[#0f1117] flex flex-col border-l border-gray-200 dark:border-gray-800 xl:border-l-0">
                    <div className="p-6 bg-code-bg h-full flex flex-col justify-center">
                        <div className="text-center text-gray-500 text-sm">
                            <span className="material-icons-round text-4xl mb-2 opacity-50">code</span>
                            <p>Interactive playground available in full view.</p>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default APIReference;
