import { useState, useCallback } from 'react';
import type { FC } from 'react';
import { Radio, Globe, Copy, Check } from 'lucide-react';

interface InjectScriptModalProps {
    isOpen: boolean;
    onClose: () => void;
    targetUrl: string;
}

export const InjectScriptModal: FC<InjectScriptModalProps> = ({
    isOpen,
    onClose,
    targetUrl
}) => {
    const [copied, setCopied] = useState(false);

    const getInjectScript = useCallback(() => {
        const serverUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        let appName = 'My App';
        try {
            const url = new URL(targetUrl);
            appName = url.hostname + (url.port ? ':' + url.port : '');
        } catch {
            // Use default if URL is invalid
        }
        return `
<!-- ApexOps Bug Tracker - Add this to your target app (${targetUrl}) -->
<script>
    window.BUG_TRACKER_SERVER = '${serverUrl}';
    window.BUG_TRACKER_APP_NAME = '${appName}';
</script>
<script src="${serverUrl}/bug-tracker-client.js"></script>
`;
    }, [targetUrl]);

    const copyInjectScript = () => {
        navigator.clipboard.writeText(getInjectScript());
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className={`glass-dark w-full max-w-2xl animate-scale-in p-0 overflow-hidden border border-white/20 rounded-3xl`}>
                <div className="p-6 border-b border-white/10 flex justify-between items-center glass-panel">
                    <div>
                        <h2 className="text-xl font-bold text-brand-dark font-heading flex items-center gap-2">
                            <Radio className="w-5 h-5 text-orange-primary" />
                            Setup Real-time Monitoring
                        </h2>
                        <p className="text-sm text-gray-400 mt-1">Add this script to your target application</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-full text-brand-dark"
                    >
                        âœ•
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    <div className="flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-xl">
                        <Globe className="w-5 h-5 text-blue-secondary" />
                        <div className="flex-1">
                            <span className="text-xs text-gray-400">Target Application</span>
                            <p className="font-numbers text-sm font-medium text-blue-secondary">{targetUrl || 'http://localhost:3000'}</p>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-bold text-brand-dark">
                                ðŸ“‹ Copy & Paste to your HTML
                            </label>
                            <button
                                onClick={copyInjectScript}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${copied
                                    ? 'bg-green/10 text-green dark:bg-green/20 dark:text-green'
                                    : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-brand-dark'
                                    }`}
                            >
                                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                {copied ? 'Copied!' : 'Copy'}
                            </button>
                        </div>
                        <pre className="bg-black/50 text-gray-300 p-4 rounded-xl text-xs font-numbers overflow-x-auto whitespace-pre-wrap border border-white/10">
                            {getInjectScript()}
                        </pre>
                    </div>

                    <div className="bg-blue-secondary/10 border border-blue-secondary/20 rounded-xl p-4">
                        <h4 className="font-bold text-blue-secondary text-sm mb-2">ðŸ“Œ Instructions</h4>
                        <ol className="text-xs text-blue-secondary space-y-1 list-decimal list-inside">
                            <li>Copy the script above</li>
                            <li>Paste it into the <code className="bg-blue-secondary/20 px-1 rounded">&lt;head&gt;</code> or before <code className="bg-blue-secondary/20 px-1 rounded">&lt;/body&gt;</code> of your target app</li>
                            <li>Refresh your target app - it will automatically connect</li>
                            <li>Console logs will appear here in real-time! ðŸš€</li>
                        </ol>
                    </div>

                    <div className="bg-orange-primary/10 border border-orange-primary/20 rounded-xl p-4">
                        <h4 className="font-bold text-orange-primary text-sm mb-2">âš ï¸ Development Only</h4>
                        <p className="text-xs text-orange-primary/80">
                            This script is for development purposes only. Remove it before deploying to production.
                        </p>
                    </div>
                </div>

                <div className="p-6 border-t border-white/10 bg-black/20">
                    <button
                        onClick={onClose}
                        className="w-full bg-brand-accent text-brand-dark font-bold rounded-xl py-3 hover:bg-[#b5db00] transition-colors"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
};
