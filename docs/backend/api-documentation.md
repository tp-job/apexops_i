# 📡 ApexOps - API Documentation

## 🌐 Base URL

```
http://localhost:3000
```

---

## 📋 Table of Contents

- [Authentication](#-authentication)
- [Logs API](#-logs-api)
- [Tickets API](#-tickets-api)
- [Console Logs API](#-console-logs-api)
- [Health Check](#-health-check)

---

## 🔐 Authentication

### Register User

**POST** `/register`

สร้างผู้ใช้ใหม่

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "message": "User registered successfully"
}
```

**Error Responses:**
- `500` - Server error หรือ email ซ้ำ

---

### Login

**POST** `/login`

เข้าสู่ระบบและรับ JWT token

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error Responses:**
- `400` - Email หรือ password ไม่ครบถ้วน
- `401` - Email หรือ password ไม่ถูกต้อง
- `500` - Server error

---

### Get Profile (Protected)

**GET** `/profile`

รับข้อมูลผู้ใช้ปัจจุบัน (ต้องใช้ JWT token)

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "message": "Welcome!",
  "user": {
    "id": 1,
    "email": "john@example.com"
  }
}
```

**Error Responses:**
- `401` - ไม่มี token
- `403` - Token ไม่ถูกต้องหรือหมดอายุ

---

## 📝 Logs API

### Get All Logs

**GET** `/api/logs`

รับรายการ logs ทั้งหมด (ล่าสุด 100 รายการ)

**Response:**
```json
[
  {
    "id": "1",
    "timestamp": "2025-01-27T10:30:00.000Z",
    "level": "error",
    "message": "Failed to connect to database",
    "source": "database.js",
    "stack": "Error: Connection refused\n    at connect..."
  },
  {
    "id": "2",
    "timestamp": "2025-01-27T10:25:00.000Z",
    "level": "warning",
    "message": "Slow query detected",
    "source": "query.js"
  }
]
```

**Query Parameters:**
- ไม่มี (จะ return ล่าสุด 100 รายการ)

---

### Create Log

**POST** `/api/logs`

สร้าง log ใหม่

**Request Body:**
```json
{
  "level": "error",
  "message": "Failed to connect to database",
  "source": "database.js",
  "stack": "Error: Connection refused\n    at connect..."
}
```

**Response:**
```json
{
  "id": "1",
  "timestamp": "2025-01-27T10:30:00.000Z",
  "level": "error",
  "message": "Failed to connect to database",
  "source": "database.js",
  "stack": "Error: Connection refused\n    at connect..."
}
```

**Error Responses:**
- `400` - Message ไม่ครบถ้วน
- `500` - Server error

---

## 🎫 Tickets API

### Get All Tickets

**GET** `/api/tickets`

รับรายการ tickets ทั้งหมด

**Response:**
```json
[
  {
    "id": "TICK-001",
    "title": "Fix login bug",
    "description": "Users cannot login with email",
    "status": "open",
    "priority": "high",
    "assignee": "John Doe",
    "reporter": "System",
    "createdAt": "2025-01-27T10:30:00.000Z",
    "updatedAt": "2025-01-27T10:30:00.000Z",
    "tags": ["bug", "auth"],
    "relatedLogs": ["1", "2"]
  }
]
```

---

### Get Ticket by ID

**GET** `/api/tickets/:id`

รับ ticket ตาม ID

**URL Parameters:**
- `id` - Ticket ID (เช่น `TICK-001` หรือ `001`)

**Response:**
```json
{
  "id": "TICK-001",
  "title": "Fix login bug",
  "description": "Users cannot login with email",
  "status": "open",
  "priority": "high",
  "assignee": "John Doe",
  "reporter": "System",
  "createdAt": "2025-01-27T10:30:00.000Z",
  "updatedAt": "2025-01-27T10:30:00.000Z",
  "tags": ["bug", "auth"],
  "relatedLogs": ["1", "2"]
}
```

**Error Responses:**
- `404` - Ticket ไม่พบ

---

### Create Ticket

**POST** `/api/tickets`

สร้าง ticket ใหม่

**Request Body:**
```json
{
  "title": "Fix login bug",
  "description": "Users cannot login with email",
  "status": "open",
  "priority": "high",
  "assignee": "John Doe",
  "reporter": "Current User",
  "tags": ["bug", "auth"],
  "relatedLogs": ["1", "2"]
}
```

**Required Fields:**
- `title` (string)
- `description` (string)

**Optional Fields:**
- `status` (string) - Default: `"open"`
- `priority` (string) - Default: `"medium"` (low, medium, high, critical)
- `assignee` (string) - Optional
- `reporter` (string) - Default: `"System"`
- `tags` (array) - Default: `[]`
- `relatedLogs` (array) - Default: `[]`

**Response:**
```json
{
  "id": "TICK-001",
  "title": "Fix login bug",
  "description": "Users cannot login with email",
  "status": "open",
  "priority": "high",
  "assignee": "John Doe",
  "reporter": "Current User",
  "createdAt": "2025-01-27T10:30:00.000Z",
  "updatedAt": "2025-01-27T10:30:00.000Z",
  "tags": ["bug", "auth"],
  "relatedLogs": ["1", "2"]
}
```

**Error Responses:**
- `400` - Title หรือ description ไม่ครบถ้วน
- `500` - Server error

---

### Update Ticket

**PUT** `/api/tickets/:id`

อัปเดต ticket

**URL Parameters:**
- `id` - Ticket ID (เช่น `TICK-001` หรือ `001`)

**Request Body:**
```json
{
  "title": "Fix login bug - Updated",
  "description": "Users cannot login with email. Fixed.",
  "status": "in-progress",
  "priority": "critical",
  "assignee": "Jane Doe"
}
```

**Note:** ทุก field เป็น optional - จะอัปเดตเฉพาะ field ที่ส่งมา

**Response:**
```json
{
  "id": "TICK-001",
  "title": "Fix login bug - Updated",
  "description": "Users cannot login with email. Fixed.",
  "status": "in-progress",
  "priority": "critical",
  "assignee": "Jane Doe",
  "reporter": "System",
  "createdAt": "2025-01-27T10:30:00.000Z",
  "updatedAt": "2025-01-27T11:00:00.000Z",
  "tags": ["bug", "auth"],
  "relatedLogs": ["1", "2"]
}
```

**Error Responses:**
- `404` - Ticket ไม่พบ
- `500` - Server error

---

### Delete Ticket

**DELETE** `/api/tickets/:id`

ลบ ticket

**URL Parameters:**
- `id` - Ticket ID (เช่น `TICK-001` หรือ `001`)

**Response:**
```json
{
  "deleted": true
}
```

**Error Responses:**
- `404` - Ticket ไม่พบ
- `500` - Server error

---

## 🌐 Console Logs API

### Fetch Console Logs from URL

**POST** `/api/console-logs`

ดึง console logs จาก browser URL โดยใช้ Puppeteer

**Request Body:**
```json
{
  "url": "http://localhost:5173/"
}
```

**Response:**
```json
[
  {
    "id": "console-1706356800000-0",
    "timestamp": "2025-01-27T10:30:00.000Z",
    "level": "error",
    "message": "Failed to load resource",
    "source": "http://localhost:5173/",
    "stack": "Error: Failed to load\n    at load..."
  },
  {
    "id": "console-1706356800000-1",
    "timestamp": "2025-01-27T10:30:00.000Z",
    "level": "warning",
    "message": "Deprecated API usage",
    "source": "http://localhost:5173/"
  }
]
```

**Note:** 
- Logs จะถูกบันทึกลง database อัตโนมัติ
- ใช้ Puppeteer เพื่อเปิด headless browser และดึง console logs
- อาจใช้เวลาสักครู่ (timeout 30 วินาที)

**Error Responses:**
- `400` - URL ไม่ถูกต้องหรือไม่ครบถ้วน
- `500` - Server error หรือ Puppeteer error

---

## ❤️ Health Check

### Root Endpoint

**GET** `/`

ตรวจสอบว่า server ทำงานอยู่

**Response:**
```json
{
  "message": "ApexOps API Server is running!",
  "version": "1.0.0",
  "endpoints": {
    "auth": ["/register", "/login", "/profile"],
    "logs": ["/api/logs"],
    "tickets": ["/api/tickets", "/api/tickets/:id"],
    "console": ["/api/console-logs"]
  }
}
```

---

### Health Check

**GET** `/api/health`

ตรวจสอบสถานะ server และ database

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-01-27T10:30:00.000Z",
  "database": "connected"
}
```

---

## 🔒 Authentication Headers

สำหรับ endpoints ที่ต้อง authentication:

```
Authorization: Bearer <token>
```

**Example:**
```bash
curl -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  http://localhost:3000/profile
```

---

## 📊 Response Status Codes

| Code | Meaning |
|------|---------|
| `200` | Success |
| `201` | Created |
| `400` | Bad Request |
| `401` | Unauthorized |
| `403` | Forbidden |
| `404` | Not Found |
| `500` | Internal Server Error |

---

## 🧪 Example Requests

### Using cURL

```bash
# Register
curl -X POST http://localhost:3000/register \
  -H "Content-Type: application/json" \
  -d '{"name":"John","email":"john@example.com","password":"pass123"}'

# Login
curl -X POST http://localhost:3000/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john@example.com","password":"pass123"}'

# Get Logs
curl http://localhost:3000/api/logs

# Create Ticket
curl -X POST http://localhost:3000/api/tickets \
  -H "Content-Type: application/json" \
  -d '{"title":"Bug Fix","description":"Fix the bug"}'
```

### Using Axios (Frontend)

```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000',
});

// Login
const response = await api.post('/login', {
  email: 'john@example.com',
  password: 'pass123'
});

// Get Logs
const logs = await api.get('/api/logs');

// Create Ticket
const ticket = await api.post('/api/tickets', {
  title: 'Bug Fix',
  description: 'Fix the bug',
  priority: 'high'
});
```

---

## 📝 Notes

- ทุก timestamps เป็น ISO 8601 format
- Ticket IDs จะเป็น format `TICK-XXX` (เช่น `TICK-001`)
- Log levels: `info`, `warning`, `error`
- Ticket statuses: `open`, `in-progress`, `resolved`, `closed`
- Ticket priorities: `low`, `medium`, `high`, `critical`

---

**Last Updated**: 2025-01-27

