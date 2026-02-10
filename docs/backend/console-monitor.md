# 🔍 ApexOps Real-time Console Monitor

> Real-time web console monitoring system with multiple URL tabs, filtering, and admin authentication

## ✨ Features

- ✅ **Multiple URL Tabs** - Monitor multiple applications simultaneously
- ✅ **Real-time Streaming** - Live console logs via WebSocket
- ✅ **Log Filtering** - Filter by level (info, warning, error, debug)
- ✅ **Pause/Resume** - Control log stream
- ✅ **Copy Logs** - Export logs to clipboard
- ✅ **Clear Logs** - Remove logs from session
- ✅ **Admin Auth** - Secure access with JWT
- ✅ **Dark Theme** - Beautiful dark UI
- ✅ **Statistics** - Real-time log statistics
- ✅ **Auto-scroll** - Follow latest logs

## 🚀 Quick Start

### 1. Start Server

```bash
cd server
npm start
```

### 2. Open Console Monitor

```
http://localhost:3000/console-monitor
```

### 3. Login

Use your admin credentials to login.

### 4. Add URL to Monitor

1. Enter URL in input field
2. Click "Add Tab" or press Enter
3. Watch logs in real-time!

## 📸 Screenshots

### Main Interface

```
┌─────────────────────────────────────────────────────────┐
│ 🔍 ApexOps Console Monitor    [●Connected] Admin User  │
├─────────────────────────────────────────────────────────┤
│ [URL Input...........................] [➕ Add Tab]     │
│ [⏸️ Pause] [📋 Copy] [🗑️ Clear]                        │
├─────────────────────────────────────────────────────────┤
│ [App 1 ✕] [App 2 ✕] [App 3 ✕]                         │
├─────────────────────────────────────────────────────────┤
│ Filter: [All] [Info] [Warning] [Error] [Debug]         │
│ ☑ Auto-scroll                                           │
├─────────────────────────────────────────────────────────┤
│ Total: 150 | Errors: 5 | Warnings: 12 | Uptime: 01:23  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ [14:30:25] [INFO]    Application started               │
│ [14:30:26] [WARNING] Connection slow                   │
│ [14:30:27] [ERROR]   Database connection failed        │
│              at connectDB (db.js:45:12)                │
│              at startup (app.js:10:5)                  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## 🎯 Use Cases

### 1. Production Monitoring

Monitor production apps in real-time to catch errors immediately.

```javascript
// Add production URL
https://app.example.com

// Filter by errors
[Error] only

// Get notified of issues instantly
```

### 2. Development Debugging

Debug multiple services simultaneously during development.

```javascript
// Tab 1: Frontend (localhost:3000)
// Tab 2: Backend API (localhost:4000)  
// Tab 3: WebSocket (localhost:5000)

// See logs from all services in one place
```

### 3. QA Testing

Monitor test environments and capture logs during testing.

```javascript
// Add staging URL
https://staging.example.com

// Run tests
// Copy logs for bug reports
```

## 🔧 Installation

### Install Client Script in Target App

**Method 1: Script Tag**

```html
<script>
  window.BUG_TRACKER_SERVER = 'http://localhost:3000';
  window.BUG_TRACKER_APP_NAME = 'My App';
</script>
<script src="http://localhost:3000/bug-tracker-client.js"></script>
```

**Method 2: Console**

1. Open DevTools (F12)
2. Paste script from `/bug-tracker-client.js`
3. Press Enter

**Method 3: Bookmarklet**

Create bookmark with this URL:

```javascript
javascript:(function(){var s=document.createElement('script');s.src='http://localhost:3000/bug-tracker-client.js';document.head.appendChild(s);})();
```

## 📡 API Endpoints

### Sessions

```http
# Get all sessions
GET /api/console-monitor/sessions
Authorization: Bearer <token>

# Create session
POST /api/console-monitor/sessions
Authorization: Bearer <token>
Content-Type: application/json

{
  "url": "https://example.com",
  "appName": "My App"
}

# Stop session
DELETE /api/console-monitor/sessions/:sessionId
Authorization: Bearer <token>
```

### Logs

```http
# Get logs
GET /api/console-monitor/logs/:sessionId?level=error&limit=100
Authorization: Bearer <token>

# Get statistics
GET /api/console-monitor/stats/:sessionId
Authorization: Bearer <token>

# Clear logs
POST /api/console-monitor/clear/:sessionId
Authorization: Bearer <token>
```

## 🔌 WebSocket Events

### Client Events

```javascript
// Register as monitor
socket.emit('register', {
  clientType: 'monitor'
});
```

### Server Events

```javascript
// Receive logs
socket.on('console-logs', (logs) => {
  console.log('New logs:', logs);
});

// App connected
socket.on('target-app-connected', (appInfo) => {
  console.log('App connected:', appInfo);
});

// App disconnected
socket.on('target-app-disconnected', (appInfo) => {
  console.log('App disconnected:', appInfo);
});
```

## 🎨 UI Controls

### Toolbar

- **URL Input** - Enter URL to monitor
- **Add Tab** - Create new monitoring session
- **Pause/Resume** - Control log stream
- **Copy** - Copy filtered logs to clipboard
- **Clear** - Remove all logs from current session

### Filters

- **All** - Show all logs
- **Info** - Show info logs only
- **Warning** - Show warning logs only
- **Error** - Show error logs only
- **Debug** - Show debug logs only
- **Auto-scroll** - Toggle automatic scrolling

### Statistics

- **Total** - Total number of logs
- **Errors** - Number of error logs
- **Warnings** - Number of warning logs
- **Info** - Number of info logs
- **Uptime** - Monitoring session duration

## 🔐 Security

### Authentication Required

- Login with admin credentials
- JWT token authentication
- Token stored in localStorage
- Token expires in 1 hour

### Authorization

- Users can only access their own sessions
- Admin role can access all sessions
- Session ownership validation

## 🎓 Examples

### Example 1: Monitor Single App

```javascript
// 1. Login to console monitor
// 2. Enter URL: https://my-app.com
// 3. Click "Add Tab"
// 4. Install client script in target app
// 5. Watch logs in real-time
```

### Example 2: Monitor Multiple Apps

```javascript
// Tab 1: Production Frontend
https://app.example.com

// Tab 2: Production API
https://api.example.com

// Tab 3: Staging Environment
https://staging.example.com

// Switch between tabs to see different logs
```

### Example 3: Debug Errors

```javascript
// 1. Add URL to monitor
// 2. Set filter to "Error"
// 3. Wait for errors to appear
// 4. Click "Pause" to stop stream
// 5. Read error details
// 6. Click "Copy" to export
// 7. Fix the issue
// 8. Click "Clear" to remove old logs
// 9. Click "Resume" to continue monitoring
```

## 📊 Performance

### Optimizations

- **Batch Processing** - Logs batched every 100ms
- **Lazy Rendering** - Only visible logs rendered
- **WebSocket** - Efficient real-time communication
- **Auto-cleanup** - Old logs automatically removed

### Limits

- Max logs per tab: Unlimited (but recommend clearing periodically)
- Max tabs: Unlimited (but recommend < 10 for performance)
- Batch size: 50 logs
- Batch interval: 100ms

## 🐛 Troubleshooting

### WebSocket Not Connecting

**Check:**
- Server is running
- Port 8081 is not blocked
- CORS settings are correct

**Fix:**
```bash
# Restart server
npm start

# Check server logs
# Look for WebSocket errors
```

### No Logs Appearing

**Check:**
- Client script is installed in target app
- URL matches the source URL
- Filter is not hiding logs
- WebSocket is connected

**Fix:**
```javascript
// 1. Check DevTools Console for errors
// 2. Verify client script loaded
// 3. Check Network tab for WebSocket connection
// 4. Set filter to "All"
```

### Authentication Failed

**Check:**
- Email and password are correct
- User account exists
- Token hasn't expired

**Fix:**
```javascript
// 1. Logout and login again
// 2. Check credentials
// 3. Create new user if needed
```

## 📚 Documentation

- **Full Guide**: [CONSOLE_MONITOR_GUIDE.md](./CONSOLE_MONITOR_GUIDE.md)
- **API Structure**: [API_STRUCTURE.md](./API_STRUCTURE.md)
- **API Summary (Thai)**: [API_SUMMARY_TH.md](./API_SUMMARY_TH.md)

## 🔗 Links

- Console Monitor UI: http://localhost:3000/console-monitor
- API Documentation: http://localhost:3000/
- Client Script: http://localhost:3000/bug-tracker-client.js
- WebSocket (Socket.IO): ws://localhost:8081
- Native WebSocket: ws://localhost:8082

## 🚀 Tech Stack

- **Backend**: Node.js, Express
- **Real-time**: Socket.IO, Native WebSocket
- **Database**: PostgreSQL
- **Authentication**: JWT
- **Frontend**: Vanilla JavaScript, HTML5, CSS3

## 📝 License

MIT

## 👥 Contributors

ApexOps Team

---

**Version**: 1.0.0  
**Last Updated**: December 27, 2025

For detailed documentation, see [CONSOLE_MONITOR_GUIDE.md](./CONSOLE_MONITOR_GUIDE.md)

