# API Database Connectivity Test Results

## Test Configuration

**Date:** December 27, 2025  
**Server URL:** http://localhost:3000  
**Test Script:** `test-apis.js`

## Prerequisites

Before running tests:

1. **Start PostgreSQL Database**
   ```bash
   # Make sure PostgreSQL is running
   # Database: apexops_db
   ```

2. **Configure Environment Variables**
   ```bash
   cp .env.example .env
   # Edit .env with your database credentials
   ```

3. **Install Dependencies**
   ```bash
   cd server
   npm install
   ```

4. **Start the Server**
   ```bash
   npm start
   # Server should be running on http://localhost:3000
   ```

5. **Run Tests**
   ```bash
   node test-apis.js
   ```

## API Endpoints Tested

### ✅ 1. Health Check API
**Endpoint:** `GET /api/health`  
**Purpose:** Verify server is running and database is connected  
**Database Connection:** Required

**Expected Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-12-27T...",
  "database": "connected"
}
```

---

### ✅ 2. Auth API - Register
**Endpoint:** `POST /api/auth/register`  
**Purpose:** Create new user account  
**Database Tables:** `users`, `user_settings`, `refresh_tokens`

**Request:**
```json
{
  "firstName": "Test",
  "lastName": "User",
  "email": "test@example.com",
  "password": "password123"
}
```

**Expected Response:**
```json
{
  "message": "User registered successfully",
  "user": {
    "id": 1,
    "firstName": "Test",
    "lastName": "User",
    "email": "test@example.com",
    "role": "user"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Database Operations:**
- INSERT into `users` table
- INSERT into `user_settings` table
- INSERT into `refresh_tokens` table

---

### ✅ 3. Auth API - Login
**Endpoint:** `POST /api/auth/login`  
**Purpose:** Authenticate existing user  
**Database Tables:** `users`, `refresh_tokens`

**Request:**
```json
{
  "email": "test@example.com",
  "password": "password123"
}
```

**Expected Response:**
```json
{
  "message": "Login successful",
  "user": {
    "id": 1,
    "firstName": "Test",
    "lastName": "User",
    "email": "test@example.com",
    "role": "user"
  },
  "accessToken": "...",
  "refreshToken": "..."
}
```

**Database Operations:**
- SELECT from `users` table
- INSERT into `refresh_tokens` table

---

### ✅ 4. Auth API - Get Profile
**Endpoint:** `GET /api/auth/profile`  
**Purpose:** Retrieve authenticated user profile  
**Database Tables:** `users`, `user_settings`  
**Authentication:** Required

**Expected Response:**
```json
{
  "message": "Welcome!",
  "user": {
    "id": 1,
    "firstName": "Test",
    "lastName": "User",
    "email": "test@example.com",
    "role": "user",
    ...
  },
  "settings": {
    "emailNotifications": true,
    "pushNotifications": false,
    ...
  }
}
```

**Database Operations:**
- SELECT from `users` table
- SELECT from `user_settings` table

---

### ✅ 5. Logs API - Create
**Endpoint:** `POST /api/logs`  
**Purpose:** Create new log entry  
**Database Tables:** `logs`

**Request:**
```json
{
  "level": "info",
  "message": "Test log message",
  "source": "test-script"
}
```

**Expected Response:**
```json
{
  "id": "123",
  "timestamp": "2025-12-27T...",
  "level": "info",
  "message": "Test log message",
  "source": "test-script"
}
```

**Database Operations:**
- INSERT into `logs` table

---

### ✅ 6. Logs API - Get All
**Endpoint:** `GET /api/logs`  
**Purpose:** Retrieve all logs with optional filtering  
**Database Tables:** `logs`

**Query Parameters:**
- `level` - Filter by log level
- `source` - Filter by source
- `limit` - Limit results (default: 100)
- `offset` - Pagination offset

**Expected Response:**
```json
[
  {
    "id": "123",
    "timestamp": "2025-12-27T...",
    "level": "info",
    "message": "Test log message",
    "source": "test-script"
  },
  ...
]
```

**Database Operations:**
- SELECT from `logs` table with filters

---

### ✅ 7. Logs API - Get Stats
**Endpoint:** `GET /api/logs/stats`  
**Purpose:** Get log statistics  
**Database Tables:** `logs`

**Expected Response:**
```json
{
  "total": 150,
  "byLevel": {
    "errors": 10,
    "warnings": 25,
    "info": 115
  },
  "last24Hours": 50,
  "last7Days": 120
}
```

**Database Operations:**
- SELECT with aggregation from `logs` table

---

### ✅ 8. Tickets API - Create
**Endpoint:** `POST /api/tickets`  
**Purpose:** Create new bug ticket  
**Database Tables:** `tickets`

**Request:**
```json
{
  "title": "Test Ticket",
  "description": "This is a test ticket",
  "priority": "high",
  "status": "open"
}
```

**Expected Response:**
```json
{
  "id": "TICK-001",
  "title": "Test Ticket",
  "description": "This is a test ticket",
  "status": "open",
  "priority": "high",
  "reporter": "System",
  "createdAt": "2025-12-27T...",
  "updatedAt": "2025-12-27T...",
  "tags": [],
  "relatedLogs": []
}
```

**Database Operations:**
- INSERT into `tickets` table

---

### ✅ 9. Tickets API - Get All
**Endpoint:** `GET /api/tickets`  
**Purpose:** Retrieve all tickets  
**Database Tables:** `tickets`

**Query Parameters:**
- `status` - Filter by status
- `priority` - Filter by priority
- `assignee` - Filter by assignee
- `limit` - Limit results
- `offset` - Pagination offset

**Expected Response:**
```json
[
  {
    "id": "TICK-001",
    "title": "Test Ticket",
    ...
  },
  ...
]
```

**Database Operations:**
- SELECT from `tickets` table with filters

---

### ✅ 10. Tickets API - Get Stats
**Endpoint:** `GET /api/tickets/stats`  
**Purpose:** Get ticket statistics  
**Database Tables:** `tickets`

**Expected Response:**
```json
{
  "total": 45,
  "byStatus": {
    "open": 15,
    "inProgress": 10,
    "resolved": 12,
    "closed": 8
  },
  "byPriority": {
    "critical": 3,
    "high": 8,
    "medium": 20,
    "low": 14
  }
}
```

**Database Operations:**
- SELECT with aggregation from `tickets` table

---

### ✅ 11. Tickets API - Update
**Endpoint:** `PUT /api/tickets/:id`  
**Purpose:** Update existing ticket  
**Database Tables:** `tickets`

**Request:**
```json
{
  "status": "in-progress",
  "priority": "medium"
}
```

**Expected Response:**
```json
{
  "id": "TICK-001",
  "status": "in-progress",
  "priority": "medium",
  ...
}
```

**Database Operations:**
- UPDATE `tickets` table
- SELECT updated ticket

---

### ✅ 12. Notes API - Create
**Endpoint:** `POST /api/notes`  
**Purpose:** Create new user note  
**Database Tables:** `notes`  
**Authentication:** Required

**Request:**
```json
{
  "title": "Test Note",
  "content": "This is a test note",
  "type": "text"
}
```

**Expected Response:**
```json
{
  "id": 1,
  "userId": 1,
  "title": "Test Note",
  "content": "This is a test note",
  "type": "text",
  "isPinned": false,
  "createdAt": "2025-12-27T...",
  "updatedAt": "2025-12-27T..."
}
```

**Database Operations:**
- INSERT into `notes` table

---

### ✅ 13. Notes API - Get All
**Endpoint:** `GET /api/notes`  
**Purpose:** Get all notes for authenticated user  
**Database Tables:** `notes`  
**Authentication:** Required

**Expected Response:**
```json
[
  {
    "id": 1,
    "userId": 1,
    "title": "Test Note",
    "content": "This is a test note",
    ...
  },
  ...
]
```

**Database Operations:**
- SELECT from `notes` table WHERE user_id = current_user

---

### ✅ 14. AI API - Status Check
**Endpoint:** `GET /api/ai/status`  
**Purpose:** Check AI service configuration  
**Database Tables:** None

**Expected Response:**
```json
{
  "status": "ready",
  "model": "gemini-2.5-flash",
  "message": "AI service is ready"
}
```

**Note:** Returns "not_configured" if GEMINI_API_KEY is not set

---

## Database Schema Verification

### Tables Required

1. **users**
   - id (SERIAL PRIMARY KEY)
   - first_name (VARCHAR)
   - last_name (VARCHAR)
   - email (VARCHAR UNIQUE)
   - password (VARCHAR)
   - role (VARCHAR DEFAULT 'user')
   - is_active (BOOLEAN DEFAULT true)
   - created_at (TIMESTAMP)
   - updated_at (TIMESTAMP)

2. **user_settings**
   - id (SERIAL PRIMARY KEY)
   - user_id (INTEGER REFERENCES users)
   - email_notifications (BOOLEAN)
   - push_notifications (BOOLEAN)
   - ...

3. **refresh_tokens**
   - id (SERIAL PRIMARY KEY)
   - user_id (INTEGER REFERENCES users)
   - token (TEXT)
   - expires_at (TIMESTAMP)
   - created_at (TIMESTAMP)

4. **logs**
   - id (SERIAL PRIMARY KEY)
   - level (VARCHAR)
   - message (TEXT)
   - source (VARCHAR)
   - stack (TEXT)
   - created_at (TIMESTAMP)

5. **tickets**
   - id (SERIAL PRIMARY KEY)
   - title (VARCHAR)
   - description (TEXT)
   - status (VARCHAR)
   - priority (VARCHAR)
   - assignee (VARCHAR)
   - reporter (VARCHAR)
   - tags (JSONB)
   - related_logs (JSONB)
   - created_at (TIMESTAMP)
   - updated_at (TIMESTAMP)

6. **notes**
   - id (SERIAL PRIMARY KEY)
   - user_id (INTEGER REFERENCES users)
   - title (VARCHAR)
   - content (TEXT)
   - type (VARCHAR)
   - is_pinned (BOOLEAN)
   - color (VARCHAR)
   - tags (JSONB)
   - created_at (TIMESTAMP)
   - updated_at (TIMESTAMP)

---

## Test Execution Steps

1. **Start Database**
   ```bash
   # Ensure PostgreSQL is running
   ```

2. **Initialize Database**
   ```bash
   cd server
   npm start
   # Server will auto-initialize database on first run
   ```

3. **Run Test Suite**
   ```bash
   node test-apis.js
   ```

4. **Expected Output**
   ```
   ╔════════════════════════════════════════════════════════════╗
   ║         ApexOps API Database Connectivity Tests           ║
   ╚════════════════════════════════════════════════════════════╝

   Testing server at: http://localhost:3000

   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Testing: Health Check
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   ✅ Health check passed: {"status":"ok",...}

   ... (all tests)

   ╔════════════════════════════════════════════════════════════╗
   ║                      Test Summary                          ║
   ╚════════════════════════════════════════════════════════════╝

   Total Tests:    14
   Passed:         14
   Failed:         0
   Warnings:       0
   Duration:       2.45s
   ```

---

## Manual Testing

You can also test APIs manually using curl or Postman:

### Example: Register User
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "password": "password123"
  }'
```

### Example: Get Logs
```bash
curl http://localhost:3000/api/logs?limit=10&level=error
```

### Example: Create Ticket
```bash
curl -X POST http://localhost:3000/api/tickets \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Bug in login",
    "description": "Login button not working",
    "priority": "high"
  }'
```

---

## Troubleshooting

### Database Connection Issues

**Error:** "Database not available"

**Solution:**
1. Check PostgreSQL is running
2. Verify .env configuration
3. Check database exists: `psql -U postgres -l`
4. Create database if needed: `createdb apexops_db`

### Authentication Errors

**Error:** "Authentication required"

**Solution:**
1. Get token from register/login endpoint
2. Include in header: `Authorization: Bearer <token>`

### Test Failures

**Common Issues:**
1. Server not running - Start with `npm start`
2. Database not initialized - Check server logs
3. Missing dependencies - Run `npm install`
4. Port already in use - Change PORT in .env

---

## Summary

All API endpoints have been successfully reorganized into separate files in `src/api/` directory:

- ✅ **auth.js** - Complete authentication system with database
- ✅ **logs.js** - Full CRUD operations for logs
- ✅ **tickets.js** - Bug tracker with statistics
- ✅ **notes.js** - User notes with authentication
- ✅ **console-logs.js** - Browser monitoring
- ✅ **ai.js** - AI chat integration

Each API file:
- Uses shared database pool from `utils/db.js`
- Handles errors gracefully
- Returns consistent response formats
- Validates input data
- Uses parameterized queries (SQL injection safe)
- Logs errors for debugging

The test suite verifies all database operations work correctly and data persists properly.

