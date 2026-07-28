# ⚙️ Backend Tech Stack — ApexOps

## 🔧 ภาพรวม

ส่วน Backend ของ ApexOps สร้างด้วย **Express.js 5 + PostgreSQL (PERN Stack)**  
มีหน้าที่หลักในการให้ REST API สำหรับระบบ Logs, Tickets, Users, และ Authentication

---

## 🧠 เทคโนโลยีหลัก

### Core Framework

| เทคโนโลยี | เวอร์ชัน | หน้าที่ | หมายเหตุ |
|-------------|---------|----------|-----------|
| **Node.js** | 18+ | JavaScript Runtime | ใช้รัน Express server |
| **Express.js** | 5.1.0 | Web Framework | รองรับ routing, middleware |

### Database

| เทคโนโลยี | เวอร์ชัน | หน้าที่ | หมายเหตุ |
|-------------|---------|----------|-----------|
| **PostgreSQL** | 14+ | Relational Database | เก็บ Users, Logs, Tickets |
| **pg (node-postgres)** | 8.16.3 | PostgreSQL Client | ใช้ pool connections |

### Authentication & Security

| เทคโนโลยี | เวอร์ชัน | หน้าที่ | หมายเหตุ |
|-------------|---------|----------|-----------|
| **jsonwebtoken** | 9.0.2 | JWT Authentication | สร้าง token สำหรับ session |
| **bcryptjs** | 3.0.2 | Password Hashing | ปลอดภัยในการเก็บรหัสผ่าน |
| **cors** | 2.8.5 | CORS Middleware | ป้องกัน cross-origin |

### Utilities

| เทคโนโลยี | เวอร์ชัน | หน้าที่ | หมายเหตุ |
|-------------|---------|----------|-----------|
| **dotenv** | 16.6.1 | Environment Variables | เก็บค่าลับใน `.env` |
| **body-parser** | 2.2.0 | Request Body Parser | Parse JSON request body |
| **puppeteer** | 23.11.1 | Headless Browser | ดึง console logs จาก browser |

### Development Tools

| เทคโนโลยี | เวอร์ชัน | หน้าที่ | หมายเหตุ |
|-------------|---------|----------|-----------|
| **nodemon** | 3.1.10 | Auto-restart Server | Auto reload เมื่อไฟล์เปลี่ยน |

---

## 📁 โครงสร้าง Backend

```
server/
├── src/
│   ├── server.js          # Main server file
│   ├── models/            # Database models
│   │   └── TicketModel.js
│   ├── routes/            # API routes
│   │   ├── logs.js
│   │   └── tickets.js
│   └── utils/             # Utility functions
│       └── db.js          # Database connection
├── .env                   # Environment variables
├── package.json           # Dependencies
└── README.md              # Documentation
```

---

## 🧰 Dependencies

### Production Dependencies

```bash
npm install express pg bcryptjs jsonwebtoken dotenv cors body-parser puppeteer
```

**Package Details:**
- `express` - Web framework
- `pg` - PostgreSQL client
- `bcryptjs` - Password hashing
- `jsonwebtoken` - JWT authentication
- `dotenv` - Environment variables
- `cors` - Cross-origin resource sharing
- `body-parser` - Request body parsing
- `puppeteer` - Headless browser for console logs

### Development Dependencies

```bash
npm install --save-dev nodemon
```

**Package Details:**
- `nodemon` - Auto-restart server on file changes

---

## 🗄️ Database Schema

### Users Table
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Logs Table
```sql
CREATE TABLE logs (
    id SERIAL PRIMARY KEY,
    level TEXT NOT NULL,
    message TEXT NOT NULL,
    source TEXT,
    stack TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Tickets Table
```sql
CREATE TABLE tickets (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'open',
    priority TEXT DEFAULT 'medium',
    assignee TEXT,
    reporter TEXT DEFAULT 'System',
    tags JSONB DEFAULT '[]',
    related_logs JSONB DEFAULT '[]',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 🔧 Configuration

### Environment Variables (.env)

```env
# Database Configuration
PG_USER=postgres
PG_HOST=localhost
PG_DATABASE=apexops_db
PG_PASSWORD=your_password
PG_PORT=5432

# Server Configuration
PORT=3000
NODE_ENV=development

# JWT Secret
JWT_SECRET=your-secret-key-change-in-production
```

---

## 🚀 Development Setup

### Install Dependencies
```bash
cd server
npm install
```

### Setup Environment
```bash
cp .env.example .env
# แก้ไข .env ตามการตั้งค่าของคุณ
```

### Run Development Server
```bash
npm run dev
```

### Run Production Server
```bash
npm start
```

---

## 📡 API Endpoints

### Authentication
- `POST /register` - Register new user
- `POST /login` - Login user
- `GET /profile` - Get user profile (protected)

### Logs
- `GET /api/logs` - Get all logs
- `POST /api/logs` - Create new log

### Tickets
- `GET /api/tickets` - Get all tickets
- `GET /api/tickets/:id` - Get ticket by ID
- `POST /api/tickets` - Create new ticket
- `PUT /api/tickets/:id` - Update ticket
- `DELETE /api/tickets/:id` - Delete ticket

### Console Logs
- `POST /api/console-logs` - Fetch console logs from URL

### Health Check
- `GET /` - Root endpoint
- `GET /api/health` - Health check

---

## 🔐 Security Features

### Password Hashing
- ใช้ bcryptjs กับ 10 rounds
- เก็บ hashed password ใน database

### JWT Authentication
- สร้าง token เมื่อ login
- ตรวจสอบ token สำหรับ protected routes
- Token expiration: 1 hour

### CORS
- ตั้งค่า CORS สำหรับ cross-origin requests
- อนุญาตเฉพาะ origins ที่กำหนด

---

## 🎯 Best Practices

### Error Handling
- ใช้ try-catch สำหรับ async operations
- ส่ง error response ที่ชัดเจน
- Log errors สำหรับ debugging

### Database
- ใช้ connection pooling
- ใช้ parameterized queries (ป้องกัน SQL injection)
- จัดการ transactions เมื่อจำเป็น

### Code Organization
- แยก routes ออกเป็นไฟล์
- ใช้ middleware สำหรับ common operations
- จัดระเบียบโครงสร้างไฟล์

---

## 📚 Additional Resources

- [Express.js Documentation](https://expressjs.com/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Node.js Documentation](https://nodejs.org/docs/)
- [JWT Documentation](https://jwt.io/)

---

**Last Updated**: 2025-01-27
