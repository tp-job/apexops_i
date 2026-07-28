# ApexOps API Structure

## Overview
All APIs have been reorganized into separate files in the `src/api/` directory for better maintainability and organization.

## API Files Structure

```
server/src/
├── api/
│   ├── auth.js           # Authentication & User Management
│   ├── logs.js           # System Logs Management
│   ├── tickets.js        # Bug Tracker Tickets
│   ├── notes.js          # User Notes
│   ├── console-logs.js   # Browser Console Monitoring
│   └── ai.js             # AI Chat (Gemini)
├── routes/
│   ├── auth.js           # Legacy auth routes
│   ├── logs.js           # Legacy logs routes
│   ├── tickets.js        # Legacy tickets routes
│   └── notes.js          # Legacy notes routes
├── models/
│   ├── LogModel.js
│   ├── TicketModel.js
│   └── NoteModel.js
├── middleware/
│   └── auth.js           # JWT Authentication
├── utils/
│   └── db.js             # Database Connection Pool
└── server.js             # Main Server File
```

## API Endpoints

### 1. Authentication API (`/api/auth`)
**File:** `src/api/auth.js`

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/auth/register` | Register new user | No |
| POST | `/api/auth/login` | Login user | No |
| POST | `/api/auth/refresh` | Refresh access token | No |
| POST | `/api/auth/logout` | Logout user | Yes |
| GET | `/api/auth/profile` | Get user profile | Yes |
| PUT | `/api/auth/profile` | Update user profile | Yes |
| PUT | `/api/auth/settings` | Update user settings | Yes |
| PUT | `/api/auth/password` | Change password | Yes |

**Database Tables:**
- `users` - User accounts
- `user_settings` - User preferences
- `refresh_tokens` - JWT refresh tokens

### 2. Logs API (`/api/logs`)
**File:** `src/api/logs.js`

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/logs` | Get all logs (with filters) | No |
| GET | `/api/logs/stats` | Get log statistics | No |
| GET | `/api/logs/:id` | Get log by ID | No |
| POST | `/api/logs` | Create log entry | No |
| POST | `/api/logs/batch` | Create multiple logs | No |
| DELETE | `/api/logs/:id` | Delete log entry | No |
| DELETE | `/api/logs` | Delete logs (with filters) | No |

**Query Parameters:**
- `level` - Filter by log level (info, warning, error)
- `source` - Filter by source
- `limit` - Limit results (default: 100)
- `offset` - Offset for pagination

**Database Tables:**
- `logs` - System logs

### 3. Tickets API (`/api/tickets`)
**File:** `src/api/tickets.js`

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/tickets` | Get all tickets (with filters) | No |
| GET | `/api/tickets/stats` | Get ticket statistics | No |
| GET | `/api/tickets/:id` | Get ticket by ID | No |
| POST | `/api/tickets` | Create new ticket | No |
| PUT | `/api/tickets/:id` | Update ticket | No |
| DELETE | `/api/tickets/:id` | Delete ticket | No |

**Query Parameters:**
- `status` - Filter by status (open, in-progress, resolved, closed)
- `priority` - Filter by priority (low, medium, high, critical)
- `assignee` - Filter by assignee
- `limit` - Limit results (default: 100)
- `offset` - Offset for pagination

**Database Tables:**
- `tickets` - Bug tracker tickets

### 4. Notes API (`/api/notes`)
**File:** `src/api/notes.js`

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/notes` | Get all user notes | Yes |
| GET | `/api/notes/:id` | Get note by ID | Yes |
| POST | `/api/notes` | Create new note | Yes |
| PUT | `/api/notes/:id` | Update note | Yes |
| DELETE | `/api/notes/:id` | Delete note | Yes |

**Database Tables:**
- `notes` - User notes

### 5. Console Logs API (`/api/console-logs`)
**File:** `src/api/console-logs.js`

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/console-logs` | Fetch logs from URL (Puppeteer) | No |
| POST | `/api/console-logs/realtime` | Receive real-time logs | No |
| GET | `/api/console-logs/script` | Generate inject script | No |
| GET | `/api/console-logs/targets` | Get connected target apps | No |

**Features:**
- Browser console monitoring using Puppeteer
- Real-time log streaming via WebSocket
- Inject script generation for target apps

### 6. AI Chat API (`/api/ai`)
**File:** `src/api/ai.js`

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/ai/chat` | Send message to AI | No |
| GET | `/api/ai/status` | Check AI service status | No |

**Configuration:**
- Requires `GEMINI_API_KEY` environment variable
- Uses Google Gemini 2.5 Flash model

## Database Connection

All APIs use a shared PostgreSQL connection pool from `utils/db.js`:

```javascript
const { getPool } = require('../utils/db');
const pool = getPool();
```

**Connection Configuration:**
- `PG_USER` - Database user (default: postgres)
- `PG_HOST` - Database host (default: localhost)
- `PG_DATABASE` - Database name (default: apexops_db)
- `PG_PASSWORD` - Database password (default: postgres)
- `PG_PORT` - Database port (default: 5432)

## Authentication

Protected endpoints require JWT token in the Authorization header:

```
Authorization: Bearer <token>
```

The `authenticate` middleware from `middleware/auth.js` validates tokens and attaches user info to `req.user`.

## Error Handling

All APIs follow consistent error response format:

```json
{
  "error": "Error message",
  "details": "Additional details (optional)"
}
```

**Common HTTP Status Codes:**
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error
- `503` - Service Unavailable

## Testing

Run the API test suite:

```bash
cd server
node test-apis.js
```

The test script verifies:
- ✅ Database connectivity
- ✅ All CRUD operations
- ✅ Authentication flow
- ✅ Data persistence
- ✅ Error handling

## Migration from Legacy Routes

Legacy routes in `routes/` are still available for backward compatibility but are deprecated. New code should use the APIs in `api/` directory.

**Migration Path:**
- `/register` → `/api/auth/register`
- `/login` → `/api/auth/login`
- `/profile` → `/api/auth/profile`
- `/api/logs` → Same (now uses new API)
- `/api/tickets` → Same (now uses new API)
- `/api/notes` → Same (now uses new API)

## WebSocket Features

The server also provides WebSocket functionality for real-time features:

**Socket.IO (Port 8081):**
- Monitor client registration
- Target app registration
- Real-time console log streaming

**Native WebSocket (Port 8082):**
- Direct WebSocket connection for injected scripts
- Browser console monitoring

## Environment Variables

```env
# Server
PORT=3000
NODE_ENV=development

# Database
PG_USER=postgres
PG_HOST=localhost
PG_DATABASE=apexops_db
PG_PASSWORD=postgres
PG_PORT=5432

# JWT
JWT_SECRET=mySecretKey
JWT_REFRESH_SECRET=myRefreshSecretKey
JWT_EXPIRY=1h
JWT_REFRESH_EXPIRY=7d

# AI
GEMINI_API_KEY=your_api_key_here

# WebSocket
WS_PORT=8081
NATIVE_WS_PORT=8082
```

## Best Practices

1. **Always use the shared pool** from `utils/db.js`
2. **Handle database errors gracefully** - don't crash the server
3. **Validate input** before database operations
4. **Use parameterized queries** to prevent SQL injection
5. **Return consistent response formats**
6. **Log errors** for debugging
7. **Use appropriate HTTP status codes**

## Future Improvements

- [ ] Add rate limiting
- [ ] Implement API versioning
- [ ] Add request validation middleware
- [ ] Implement caching layer
- [ ] Add API documentation (Swagger/OpenAPI)
- [ ] Add database migrations
- [ ] Implement database transactions for complex operations
- [ ] Add comprehensive logging

