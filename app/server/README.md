# Server Setup Guide

## 🚀 Quick Start

### 1. ติดตั้ง Dependencies

```bash
cd server
npm install
```

### 2. ตั้งค่า Database (PostgreSQL)

1. **สร้างไฟล์ `.env`**:
   ```bash
   cp .env.example .env
   ```

2. **แก้ไขไฟล์ `.env`** ตามการตั้งค่าของคุณ:
   ```env
   PG_USER=postgres
   PG_HOST=localhost
   PG_DATABASE=apexops_db
   PG_PASSWORD=your_password
   PG_PORT=5432
   
   PORT=3000
   NODE_ENV=development
   JWT_SECRET=your-secret-key-change-in-production
   ```

3. **สร้าง Database**:
   ```bash
   # เข้า psql
   psql -U postgres
   
   # สร้าง database
   CREATE DATABASE apexops_db;
   
   # ออกจาก psql
   \q
   ```

### 3. รัน Server

```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start
```

## 📋 Database Setup

ดูรายละเอียดเพิ่มเติมในไฟล์ [DATABASE_SETUP.md](./DATABASE_SETUP.md)

## ✅ ตรวจสอบว่า Server ทำงาน

เมื่อรันสำเร็จ คุณจะเห็นข้อความ:

```
✅ PostgreSQL connected successfully
✅ Database tables initialized successfully
🚀 Server running on http://localhost:3000
📡 Environment: development
```

## 🔍 Troubleshooting

### Error: "Connection refused"
- ตรวจสอบว่า PostgreSQL service ทำงานอยู่
- ตรวจสอบว่า port 5432 ไม่ถูกใช้งานโดยโปรแกรมอื่น

### Error: "password authentication failed"
- ตรวจสอบ `PG_PASSWORD` ในไฟล์ `.env`
- ตรวจสอบรหัสผ่าน PostgreSQL ของคุณ

### Error: "database does not exist"
- สร้าง database ด้วยคำสั่ง: `CREATE DATABASE apexops_db;`

## 📦 Dependencies

- **express**: Web framework
- **pg**: PostgreSQL client
- **puppeteer**: Headless browser สำหรับ console logs
- **dotenv**: Environment variables management
- **cors**: Cross-origin resource sharing
- **bcryptjs**: Password hashing
- **jsonwebtoken**: JWT authentication

## 🌐 API Endpoints

- `POST /api/console-logs` - Fetch console logs from browser URL
- `GET /api/logs` - Get all logs
- `POST /api/logs` - Create new log
- `GET /api/tickets` - Get all tickets
- `POST /api/tickets` - Create new ticket
- `PUT /api/tickets/:id` - Update ticket
- `DELETE /api/tickets/:id` - Delete ticket

