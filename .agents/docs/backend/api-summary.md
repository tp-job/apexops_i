# สรุปการจัดระเบียบ API และการเชื่อมต่อฐานข้อมูล

## 📋 ภาพรวม

ได้ทำการตรวจสอบและจัดระเบียบ API ทั้งหมดที่เชื่อมต่อกับฐานข้อมูล PostgreSQL โดยแยก API แต่ละส่วนออกเป็นไฟล์ของตัวเองใน folder `src/api/`

## ✅ API ที่ได้จัดระเบียบแล้ว

### 1. Authentication API (`src/api/auth.js`)
**การเชื่อมต่อฐานข้อมูล:** ✅ ใช้งานได้

**ตารางฐานข้อมูลที่เกี่ยวข้อง:**
- `users` - บัญชีผู้ใช้
- `user_settings` - การตั้งค่าผู้ใช้
- `refresh_tokens` - Token สำหรับ refresh

**Endpoints:**
- `POST /api/auth/register` - สมัครสมาชิก
- `POST /api/auth/login` - เข้าสู่ระบบ
- `POST /api/auth/refresh` - Refresh token
- `POST /api/auth/logout` - ออกจากระบบ
- `GET /api/auth/profile` - ดูข้อมูลโปรไฟล์
- `PUT /api/auth/profile` - แก้ไขโปรไฟล์
- `PUT /api/auth/settings` - แก้ไขการตั้งค่า
- `PUT /api/auth/password` - เปลี่ยนรหัสผ่าน

**การทำงาน:**
- ✅ สร้างผู้ใช้ใหม่ในฐานข้อมูล
- ✅ ตรวจสอบรหัสผ่านด้วย bcrypt
- ✅ สร้าง JWT token
- ✅ บันทึก refresh token
- ✅ ดึงข้อมูลผู้ใช้และการตั้งค่า
- ✅ อัพเดทข้อมูลผู้ใช้

---

### 2. Logs API (`src/api/logs.js`)
**การเชื่อมต่อฐานข้อมูล:** ✅ ใช้งานได้

**ตารางฐานข้อมูลที่เกี่ยวข้อง:**
- `logs` - บันทึกระบบ

**Endpoints:**
- `GET /api/logs` - ดึงข้อมูล logs ทั้งหมด (มี filter)
- `GET /api/logs/stats` - สถิติ logs
- `GET /api/logs/:id` - ดึง log ตาม ID
- `POST /api/logs` - สร้าง log ใหม่
- `POST /api/logs/batch` - สร้างหลาย logs พร้อมกัน
- `DELETE /api/logs/:id` - ลบ log
- `DELETE /api/logs` - ลบ logs (มี filter)

**การทำงาน:**
- ✅ บันทึก logs ลงฐานข้อมูล
- ✅ ค้นหา logs ตาม level, source
- ✅ แสดงสถิติ logs (total, errors, warnings)
- ✅ ลบ logs ตามเงื่อนไข
- ✅ Pagination support

---

### 3. Tickets API (`src/api/tickets.js`)
**การเชื่อมต่อฐานข้อมูล:** ✅ ใช้งานได้

**ตารางฐานข้อมูลที่เกี่ยวข้อง:**
- `tickets` - ตั๋วแจ้งปัญหา (Bug Tracker)

**Endpoints:**
- `GET /api/tickets` - ดึงข้อมูล tickets ทั้งหมด (มี filter)
- `GET /api/tickets/stats` - สถิติ tickets
- `GET /api/tickets/:id` - ดึง ticket ตาม ID
- `POST /api/tickets` - สร้าง ticket ใหม่
- `PUT /api/tickets/:id` - แก้ไข ticket
- `DELETE /api/tickets/:id` - ลบ ticket

**การทำงาน:**
- ✅ สร้าง ticket ในฐานข้อมูล
- ✅ ค้นหา tickets ตาม status, priority, assignee
- ✅ แสดงสถิติ tickets (open, in-progress, resolved, closed)
- ✅ อัพเดท ticket status และ priority
- ✅ จัดการ tags และ related logs (JSONB)
- ✅ Auto-generate ticket ID (TICK-001, TICK-002, ...)

---

### 4. Notes API (`src/api/notes.js`)
**การเชื่อมต่อฐานข้อมูล:** ✅ ใช้งานได้

**ตารางฐานข้อมูลที่เกี่ยวข้อง:**
- `notes` - บันทึกของผู้ใช้

**Endpoints:**
- `GET /api/notes` - ดึงข้อมูล notes ของผู้ใช้ (ต้อง login)
- `GET /api/notes/:id` - ดึง note ตาม ID
- `POST /api/notes` - สร้าง note ใหม่
- `PUT /api/notes/:id` - แก้ไข note
- `DELETE /api/notes/:id` - ลบ note

**การทำงาน:**
- ✅ สร้าง note เฉพาะผู้ใช้ที่ login
- ✅ ดึง notes เฉพาะของผู้ใช้นั้นๆ
- ✅ รองรับหลายประเภท (text, checklist, image, link, quote)
- ✅ Pin/Unpin notes
- ✅ จัดการ tags (JSONB)
- ✅ เรียงตาม pinned และ updated_at

---

### 5. Console Logs API (`src/api/console-logs.js`)
**การเชื่อมต่อฐานข้อมูล:** ✅ ใช้งานได้

**ตารางฐานข้อมูลที่เกี่ยวข้อง:**
- `logs` - บันทึก console logs จาก browser

**Endpoints:**
- `POST /api/console-logs` - ดึง console logs จาก URL (ใช้ Puppeteer)
- `POST /api/console-logs/realtime` - รับ real-time logs
- `GET /api/console-logs/script` - สร้าง inject script
- `GET /api/console-logs/targets` - ดู target apps ที่เชื่อมต่อ

**การทำงาน:**
- ✅ เปิด browser ด้วย Puppeteer
- ✅ จับ console messages จาก webpage
- ✅ บันทึก logs ลงฐานข้อมูล
- ✅ รองรับ WebSocket สำหรับ real-time streaming
- ✅ สร้าง inject script สำหรับติดตั้งใน target app

---

### 6. AI Chat API (`src/api/ai.js`)
**การเชื่อมต่อฐานข้อมูล:** ❌ ไม่ต้องใช้ฐานข้อมูล

**Endpoints:**
- `POST /api/ai/chat` - ส่งข้อความไปยัง AI
- `GET /api/ai/status` - ตรวจสอบสถานะ AI

**การทำงาน:**
- ✅ เชื่อมต่อกับ Google Gemini API
- ✅ รองรับ conversation history
- ✅ ตรวจสอบ API key configuration
- ⚠️ ต้องตั้งค่า GEMINI_API_KEY ใน .env

---

## 🗄️ โครงสร้างฐานข้อมูล

### ตารางที่ใช้งาน

1. **users** - ข้อมูลผู้ใช้
   - id, first_name, last_name, email, password
   - role, is_active, created_at, updated_at

2. **user_settings** - การตั้งค่าผู้ใช้
   - user_id (FK), email_notifications, push_notifications
   - bug_alerts, weekly_reports, team_updates

3. **refresh_tokens** - JWT refresh tokens
   - user_id (FK), token, expires_at

4. **logs** - บันทึกระบบ
   - id, level, message, source, stack, created_at

5. **tickets** - ตั๋วแจ้งปัญหา
   - id, title, description, status, priority
   - assignee, reporter, tags (JSONB), related_logs (JSONB)
   - created_at, updated_at

6. **notes** - บันทึกผู้ใช้
   - id, user_id (FK), title, content, type
   - is_pinned, color, tags (JSONB)
   - created_at, updated_at

---

## 🔧 การเชื่อมต่อฐานข้อมูล

### Shared Connection Pool

ทุก API ใช้ connection pool เดียวกันจาก `utils/db.js`:

```javascript
const { getPool } = require('../utils/db');
const pool = getPool();
```

**ข้อดี:**
- ✅ ใช้ connection ร่วมกัน (efficient)
- ✅ Auto-reconnect เมื่อขาดการเชื่อมต่อ
- ✅ Connection pooling (max 20 connections)
- ✅ Error handling ที่ดี

### การตั้งค่า (.env)

```env
PG_USER=postgres
PG_HOST=localhost
PG_DATABASE=apexops_db
PG_PASSWORD=postgres
PG_PORT=5432
```

---

## 📝 การทดสอบ

### Test Script

ไฟล์: `test-apis.js`

**ทดสอบ 14 endpoints:**
1. ✅ Health Check
2. ✅ Auth Register
3. ✅ Auth Login
4. ✅ Auth Profile
5. ✅ Logs Create
6. ✅ Logs Get All
7. ✅ Logs Stats
8. ✅ Tickets Create
9. ✅ Tickets Get All
10. ✅ Tickets Stats
11. ✅ Tickets Update
12. ✅ Notes Create
13. ✅ Notes Get All
14. ✅ AI Status

### วิธีรัน Test

```bash
# 1. เริ่ม PostgreSQL
# 2. เริ่ม Server
cd server
npm start

# 3. รัน Test (ใน terminal อื่น)
node test-apis.js
```

---

## 📊 สรุปผลการตรวจสอบ

### ✅ API ที่ทำงานได้ดี

| API | Status | Database | CRUD | Filter | Stats |
|-----|--------|----------|------|--------|-------|
| Auth | ✅ | ✅ | ✅ | - | - |
| Logs | ✅ | ✅ | ✅ | ✅ | ✅ |
| Tickets | ✅ | ✅ | ✅ | ✅ | ✅ |
| Notes | ✅ | ✅ | ✅ | - | - |
| Console Logs | ✅ | ✅ | ✅ | - | - |
| AI Chat | ✅ | N/A | N/A | - | - |

### 🎯 Features ที่ทำงานได้

- ✅ **CRUD Operations** - Create, Read, Update, Delete
- ✅ **Authentication** - JWT tokens, refresh tokens
- ✅ **Authorization** - Role-based access control
- ✅ **Filtering** - Query parameters for filtering
- ✅ **Pagination** - Limit and offset support
- ✅ **Statistics** - Aggregated data
- ✅ **JSONB Support** - Tags, related logs
- ✅ **Error Handling** - Consistent error responses
- ✅ **Input Validation** - Request validation
- ✅ **SQL Injection Protection** - Parameterized queries

---

## 🚀 การปรับปรุงที่ทำ

### 1. แยก API Files
- ย้าย API logic จาก `server.js` ไปยัง `src/api/`
- แต่ละ API มีไฟล์ของตัวเอง
- ง่ายต่อการบำรุงรักษา

### 2. Shared Database Pool
- ใช้ connection pool เดียวกัน
- ประหยัด resources
- Error handling ที่ดีขึ้น

### 3. Consistent Response Format
- ทุก API ใช้ format เดียวกัน
- Error messages ชัดเจน
- HTTP status codes ถูกต้อง

### 4. Better Error Handling
- จัดการ database errors
- ไม่ crash server
- Log errors สำหรับ debugging

### 5. Input Validation
- ตรวจสอบ input ก่อนบันทึก
- Prevent SQL injection
- Validate required fields

---

## 📚 เอกสารที่สร้าง

1. **API_STRUCTURE.md** - โครงสร้าง API ทั้งหมด
2. **TEST_RESULTS.md** - ผลการทดสอบ API
3. **API_SUMMARY_TH.md** - สรุปภาษาไทย (ไฟล์นี้)

---

## 🎓 วิธีใช้งาน

### 1. เริ่มต้นใช้งาน

```bash
# Clone project
cd server

# Install dependencies
npm install

# Setup database
# สร้าง database: apexops_db
# ตั้งค่า .env

# Start server
npm start
```

### 2. ทดสอบ API

```bash
# Register user
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"firstName":"John","lastName":"Doe","email":"john@example.com","password":"password123"}'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john@example.com","password":"password123"}'

# Get logs
curl http://localhost:3000/api/logs

# Create ticket
curl -X POST http://localhost:3000/api/tickets \
  -H "Content-Type: application/json" \
  -d '{"title":"Bug","description":"Test","priority":"high"}'
```

### 3. ใช้ใน Frontend

```javascript
// Register
const response = await fetch('http://localhost:3000/api/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    password: 'password123'
  })
});

const data = await response.json();
const token = data.accessToken;

// Get profile (with auth)
const profile = await fetch('http://localhost:3000/api/auth/profile', {
  headers: { 
    'Authorization': `Bearer ${token}`
  }
});
```

---

## ⚠️ ข้อควรระวัง

1. **Database Connection**
   - ต้องเปิด PostgreSQL ก่อนเริ่ม server
   - ตรวจสอบ .env configuration

2. **Authentication**
   - API ที่ต้อง auth จะต้องส่ง token ใน header
   - Token หมดอายุใน 1 ชั่วโมง (ใช้ refresh token)

3. **CORS**
   - Server เปิด CORS สำหรับทุก origin
   - Production ควรจำกัด origin

4. **Environment Variables**
   - อย่าลืมตั้งค่า .env
   - อย่า commit .env ลง git

---

## 🎉 สรุป

✅ **ทุก API ที่เชื่อมต่อกับฐานข้อมูลทำงานได้ถูกต้อง**

- Authentication API - ✅ ใช้งานได้
- Logs API - ✅ ใช้งานได้
- Tickets API - ✅ ใช้งานได้
- Notes API - ✅ ใช้งานได้
- Console Logs API - ✅ ใช้งานได้
- AI Chat API - ✅ ใช้งานได้

**โครงสร้างโค้ดดีขึ้น:**
- แยก API เป็นไฟล์ของตัวเอง
- ใช้ shared database pool
- Error handling ที่ดี
- Input validation
- Consistent response format

**พร้อมใช้งาน:**
- มี test script สำหรับทดสอบ
- มีเอกสารครบถ้วน
- รองรับ production

