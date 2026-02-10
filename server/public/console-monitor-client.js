// console-monitor-client.js - Real-time Console Monitor Client
(function() {
    'use strict';

    // Configuration
    const CONFIG = {
        apiUrl: window.location.origin,
        wsUrl: window.location.origin
    };

    // State
    let socket = null;
    let authToken = null;
    let currentUser = null;
    let tabs = [];
    let activeTabId = null;
    let isPaused = false;
    let currentFilter = 'all';
    let autoScroll = true;
    let stats = {
        total: 0,
        errors: 0,
        warnings: 0,
        info: 0,
        debug: 0
    };
    let startTime = null;
    let uptimeInterval = null;

    // Initialize
    function init() {
        // Check for saved auth token
        authToken = localStorage.getItem('authToken');
        if (authToken) {
            verifyAuth();
        }

        // Setup event listeners
        setupEventListeners();

        // Start uptime counter
        startUptimeCounter();
    }

    // Setup event listeners
    function setupEventListeners() {
        // Handle Enter key in URL input
        document.getElementById('urlInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                addNewTab();
            }
        });

        // Handle Enter key in login form
        document.getElementById('loginEmail').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                document.getElementById('loginPassword').focus();
            }
        });
        
        document.getElementById('loginPassword').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                login();
            }
        });
    }

    // Verify authentication
    async function verifyAuth() {
        try {
            const response = await fetch(`${CONFIG.apiUrl}/api/auth/profile`, {
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                currentUser = data.user;
                updateUserInfo();
                connectWebSocket();
            } else {
                // Token invalid
                localStorage.removeItem('authToken');
                authToken = null;
            }
        } catch (error) {
            console.error('Auth verification failed:', error);
        }
    }

    // Login
    window.login = async function() {
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;

        if (!email || !password) {
            showToast('Please enter email and password', 'error');
            return;
        }

        try {
            const response = await fetch(`${CONFIG.apiUrl}/api/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });

            if (response.ok) {
                const data = await response.json();
                authToken = data.accessToken;
                currentUser = data.user;
                localStorage.setItem('authToken', authToken);
                
                hideLoginModal();
                updateUserInfo();
                connectWebSocket();
                showToast('Login successful!', 'success');
            } else {
                const error = await response.json();
                showToast(error.error || 'Login failed', 'error');
            }
        } catch (error) {
            console.error('Login error:', error);
            showToast('Login failed', 'error');
        }
    };

    // Update user info in UI
    function updateUserInfo() {
        const userInfo = document.getElementById('userInfo');
        const loginBtn = document.querySelector('.header-actions button');
        
        if (currentUser) {
            userInfo.textContent = `${currentUser.firstName} ${currentUser.lastName}`;
            loginBtn.textContent = 'Logout';
            loginBtn.onclick = logout;
        } else {
            userInfo.textContent = 'Not logged in';
            loginBtn.textContent = 'Login';
            loginBtn.onclick = showLoginModal;
        }
    }

    // Logout
    function logout() {
        localStorage.removeItem('authToken');
        authToken = null;
        currentUser = null;
        updateUserInfo();
        disconnectWebSocket();
        
        // Clear all tabs
        tabs = [];
        activeTabId = null;
        renderTabs();
        renderConsole();
        
        showToast('Logged out successfully', 'info');
    }

    // Connect WebSocket
    function connectWebSocket() {
        if (!authToken) return;

        socket = io(CONFIG.wsUrl, {
            auth: {
                token: authToken
            }
        });

        socket.on('connect', () => {
            console.log('WebSocket connected');
            updateConnectionStatus(true);
            
            // Register as monitor
            socket.emit('register', {
                clientType: 'monitor'
            });
        });

        socket.on('disconnect', () => {
            console.log('WebSocket disconnected');
            updateConnectionStatus(false);
        });

        socket.on('console-logs', (logs) => {
            if (!isPaused) {
                handleIncomingLogs(logs);
            }
        });

        socket.on('target-app-connected', (appInfo) => {
            console.log('Target app connected:', appInfo);
        });

        socket.on('target-app-disconnected', (appInfo) => {
            console.log('Target app disconnected:', appInfo);
        });
    }

    // Disconnect WebSocket
    function disconnectWebSocket() {
        if (socket) {
            socket.disconnect();
            socket = null;
            updateConnectionStatus(false);
        }
    }

    // Update connection status
    function updateConnectionStatus(connected) {
        const statusIndicator = document.getElementById('connectionStatus');
        const statusText = document.getElementById('statusText');
        
        if (connected) {
            statusIndicator.className = 'status-indicator connected';
            statusText.textContent = 'Connected';
        } else {
            statusIndicator.className = 'status-indicator disconnected';
            statusText.textContent = 'Disconnected';
        }
    }

    // Add new tab
    window.addNewTab = async function() {
        const urlInput = document.getElementById('urlInput');
        const url = urlInput.value.trim();

        if (!url) {
            showToast('Please enter a URL', 'error');
            return;
        }

        if (!authToken) {
            showToast('Please login first', 'error');
            showLoginModal();
            return;
        }

        // Validate URL
        try {
            new URL(url);
        } catch (e) {
            showToast('Invalid URL format', 'error');
            return;
        }

        // Check if tab already exists
        if (tabs.find(t => t.url === url)) {
            showToast('Tab already exists for this URL', 'error');
            return;
        }

        try {
            // Create session
            const response = await fetch(`${CONFIG.apiUrl}/api/console-monitor/sessions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify({ url })
            });

            if (response.ok) {
                const data = await response.json();
                
                const tab = {
                    id: data.sessionId,
                    url: data.url,
                    appName: data.appName,
                    logs: [],
                    stats: { total: 0, errors: 0, warnings: 0, info: 0, debug: 0 },
                    startedAt: new Date(data.startedAt)
                };

                tabs.push(tab);
                activeTabId = tab.id;
                
                urlInput.value = '';
                renderTabs();
                renderConsole();
                updateButtons();
                
                showToast('Monitoring started', 'success');
                
                // Start monitoring session time
                if (!startTime) {
                    startTime = new Date();
                }
            } else {
                const error = await response.json();
                showToast(error.error || 'Failed to create session', 'error');
            }
        } catch (error) {
            console.error('Error creating session:', error);
            showToast('Failed to create session', 'error');
        }
    };

    // Close tab
    window.closeTab = async function(tabId, event) {
        event.stopPropagation();

        if (!authToken) return;

        try {
            await fetch(`${CONFIG.apiUrl}/api/console-monitor/sessions/${tabId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });

            tabs = tabs.filter(t => t.id !== tabId);
            
            if (activeTabId === tabId) {
                activeTabId = tabs.length > 0 ? tabs[0].id : null;
            }

            renderTabs();
            renderConsole();
            updateButtons();
            
            if (tabs.length === 0) {
                startTime = null;
            }
        } catch (error) {
            console.error('Error closing tab:', error);
            showToast('Failed to close tab', 'error');
        }
    };

    // Switch tab
    window.switchTab = function(tabId) {
        activeTabId = tabId;
        renderTabs();
        renderConsole();
        updateStats();
    };

    // Render tabs
    function renderTabs() {
        const container = document.getElementById('tabsContainer');
        
        if (tabs.length === 0) {
            container.innerHTML = '';
            return;
        }

        container.innerHTML = tabs.map(tab => `
            <button class="tab ${tab.id === activeTabId ? 'active' : ''}" onclick="switchTab('${tab.id}')">
                <span>${tab.appName}</span>
                <span class="tab-close" onclick="closeTab('${tab.id}', event)">✕</span>
            </button>
        `).join('');
    }

    // Handle incoming logs
    function handleIncomingLogs(logs) {
        if (!activeTabId) return;

        const activeTab = tabs.find(t => t.id === activeTabId);
        if (!activeTab) return;

        logs.forEach(log => {
            // Check if log belongs to this tab's URL
            if (log.source === activeTab.url || log.appName === activeTab.appName) {
                activeTab.logs.push(log);
                
                // Update stats
                activeTab.stats.total++;
                if (log.level === 'error') activeTab.stats.errors++;
                else if (log.level === 'warning') activeTab.stats.warnings++;
                else if (log.level === 'info') activeTab.stats.info++;
                else if (log.level === 'debug') activeTab.stats.debug++;
            }
        });

        renderConsole();
        updateStats();
    }

    // Render console
    function renderConsole() {
        const output = document.getElementById('consoleOutput');
        
        if (!activeTabId || tabs.length === 0) {
            output.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📟</div>
                    <div>No active monitoring session</div>
                    <div style="font-size: 0.875rem;">Enter a URL and click "Add Tab" to start monitoring</div>
                </div>
            `;
            return;
        }

        const activeTab = tabs.find(t => t.id === activeTabId);
        if (!activeTab || activeTab.logs.length === 0) {
            output.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">⏳</div>
                    <div>Waiting for logs...</div>
                    <div style="font-size: 0.875rem;">Monitoring ${activeTab.url}</div>
                </div>
            `;
            return;
        }

        // Filter logs
        const filteredLogs = currentFilter === 'all' 
            ? activeTab.logs 
            : activeTab.logs.filter(log => log.level === currentFilter);

        output.innerHTML = filteredLogs.map(log => `
            <div class="log-entry ${log.level}">
                <div class="log-timestamp">${formatTime(log.timestamp || log.receivedAt)}</div>
                <div class="log-level ${log.level}">${log.level}</div>
                <div class="log-message">
                    ${escapeHtml(log.message)}
                    ${log.stack ? `<div class="log-stack">${escapeHtml(log.stack)}</div>` : ''}
                </div>
            </div>
        `).join('');

        // Auto-scroll
        if (autoScroll) {
            output.scrollTop = output.scrollHeight;
        }
    }

    // Update stats
    function updateStats() {
        if (!activeTabId) {
            stats = { total: 0, errors: 0, warnings: 0, info: 0, debug: 0 };
        } else {
            const activeTab = tabs.find(t => t.id === activeTabId);
            if (activeTab) {
                stats = activeTab.stats;
            }
        }

        document.getElementById('totalCount').textContent = stats.total;
        document.getElementById('errorCount').textContent = stats.errors;
        document.getElementById('warningCount').textContent = stats.warnings;
        document.getElementById('infoCount').textContent = stats.info;
    }

    // Set filter
    window.setFilter = function(level) {
        currentFilter = level;
        
        // Update filter buttons
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.level === level);
        });
        
        renderConsole();
    };

    // Toggle pause
    window.togglePause = function() {
        isPaused = !isPaused;
        
        const btn = document.getElementById('pauseBtn');
        const icon = document.getElementById('pauseIcon');
        const statusIndicator = document.getElementById('connectionStatus');
        
        if (isPaused) {
            btn.textContent = '▶️ Resume';
            icon.textContent = '▶️';
            statusIndicator.className = 'status-indicator paused';
            document.getElementById('statusText').textContent = 'Paused';
        } else {
            btn.textContent = '⏸️ Pause';
            icon.textContent = '⏸️';
            updateConnectionStatus(socket && socket.connected);
        }
    };

    // Toggle auto-scroll
    window.toggleAutoScroll = function() {
        autoScroll = document.getElementById('autoScroll').checked;
    };

    // Copy logs
    window.copyLogs = function() {
        if (!activeTabId) return;

        const activeTab = tabs.find(t => t.id === activeTabId);
        if (!activeTab) return;

        const filteredLogs = currentFilter === 'all' 
            ? activeTab.logs 
            : activeTab.logs.filter(log => log.level === currentFilter);

        const text = filteredLogs.map(log => 
            `[${formatTime(log.timestamp || log.receivedAt)}] [${log.level.toUpperCase()}] ${log.message}${log.stack ? '\n' + log.stack : ''}`
        ).join('\n');

        navigator.clipboard.writeText(text).then(() => {
            showToast('Logs copied to clipboard', 'success');
        }).catch(err => {
            console.error('Failed to copy:', err);
            showToast('Failed to copy logs', 'error');
        });
    };

    // Clear logs
    window.clearLogs = async function() {
        if (!activeTabId || !authToken) return;

        if (!confirm('Are you sure you want to clear all logs for this session?')) {
            return;
        }

        try {
            await fetch(`${CONFIG.apiUrl}/api/console-monitor/clear/${activeTabId}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });

            const activeTab = tabs.find(t => t.id === activeTabId);
            if (activeTab) {
                activeTab.logs = [];
                activeTab.stats = { total: 0, errors: 0, warnings: 0, info: 0, debug: 0 };
            }

            renderConsole();
            updateStats();
            showToast('Logs cleared', 'success');
        } catch (error) {
            console.error('Error clearing logs:', error);
            showToast('Failed to clear logs', 'error');
        }
    };

    // Update buttons state
    function updateButtons() {
        const hasActiveTab = activeTabId !== null;
        document.getElementById('pauseBtn').disabled = !hasActiveTab;
        document.getElementById('copyBtn').disabled = !hasActiveTab;
        document.getElementById('clearBtn').disabled = !hasActiveTab;
    }

    // Start uptime counter
    function startUptimeCounter() {
        uptimeInterval = setInterval(() => {
            if (startTime) {
                const uptime = Math.floor((Date.now() - startTime) / 1000);
                const hours = Math.floor(uptime / 3600).toString().padStart(2, '0');
                const minutes = Math.floor((uptime % 3600) / 60).toString().padStart(2, '0');
                const seconds = (uptime % 60).toString().padStart(2, '0');
                document.getElementById('uptime').textContent = `${hours}:${minutes}:${seconds}`;
            } else {
                document.getElementById('uptime').textContent = '00:00:00';
            }
        }, 1000);
    }

    // Show login modal
    window.showLoginModal = function() {
        document.getElementById('loginModal').classList.add('show');
        document.getElementById('loginEmail').focus();
    };

    // Hide login modal
    window.hideLoginModal = function() {
        document.getElementById('loginModal').classList.remove('show');
        document.getElementById('loginEmail').value = '';
        document.getElementById('loginPassword').value = '';
    };

    // Show toast
    function showToast(message, type = 'info') {
        const toast = document.getElementById('toast');
        const toastMessage = document.getElementById('toastMessage');
        
        toastMessage.textContent = message;
        toast.className = `toast ${type} show`;
        
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }

    // Utility: Format time
    function formatTime(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('en-US', { hour12: false });
    }

    // Utility: Escape HTML
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Initialize on load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();

