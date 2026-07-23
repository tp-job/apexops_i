# 🚀 ApexOps - Installation Guide

## 📋 Prerequisites

ก่อนเริ่มติดตั้ง ตรวจสอบว่าคุณมีสิ่งต่อไปนี้:

- **Node.js** (v18 หรือสูงกว่า) - [Download](https://nodejs.org/)
- **PostgreSQL** (v14 หรือสูงกว่า) - [Download](https://www.postgresql.org/download/)
- **npm** หรือ **yarn** (มากับ Node.js)
- **Git** (สำหรับ clone repository)

---

## 🔧 Installation Steps

### 1. Clone Repository

```bash
git clone <repository-url>
cd apexops_i
```

### 2. Install Backend Dependencies

```bash
cd server
npm install
```

### 3. Setup Backend Environment

```bash
# สร้างไฟล์ .env จาก .env.example
cp .env.example .env
```

แก้ไขไฟล์ `.env` ตามการตั้งค่าของคุณ:

```env
# Database Configuration
PG_USER=postgres
PG_HOST=localhost
PG_DATABASE=apexops_db
PG_PASSWORD=your_postgres_password
PG_PORT=5432

# Server Configuration
PORT=3000
NODE_ENV=development

# JWT Secret (เปลี่ยนใน production)
JWT_SECRET=your-secret-key-change-in-production
```

### 4. Setup PostgreSQL Database

```bash
# เข้า psql
psql -U postgres

# สร้าง database
CREATE DATABASE apexops_db;

# ออกจาก psql
\q
```

หรือดูคู่มือเพิ่มเติมใน [DATABASE_SETUP.md](../server/DATABASE_SETUP.md)

### 5. Install Frontend Dependencies

```bash
cd ../client
npm install
```

### 6. Setup Frontend Environment (Optional)

สร้างไฟล์ `.env` ใน `client/` ถ้าจำเป็น:

```env
VITE_API_URL=http://localhost:3000
```

---

## 🚀 Running the Application

### Development Mode

#### Terminal 1 - Backend Server

```bash
cd server
npm run dev
```

Server จะรันที่: `http://localhost:3000`

#### Terminal 2 - Frontend Server

```bash
cd client
npm run dev
```

Frontend จะรันที่: `http://localhost:5173`

### Production Mode

#### Build Frontend

```bash
cd client
npm run build
```

Output จะอยู่ใน `client/dist/`

#### Start Backend

```bash
cd server
npm start
```

---

## ✅ Verification

### 1. ตรวจสอบ Backend

เปิด browser ไปที่: `http://localhost:3000`

คุณควรเห็น:
```json
{
  "message": "ApexOps API Server is running!",
  "version": "1.0.0",
  "endpoints": { ... }
}
```

### 2. ตรวจสอบ Frontend

เปิด browser ไปที่: `http://localhost:5173`

คุณควรเห็นหน้า Dashboard หรือหน้า Login

### 3. ตรวจสอบ Database

```bash
psql -U postgres -d apexops_db

# ตรวจสอบตาราง
\dt

# ควรเห็นตาราง:
# - users
# - logs
# - tickets
```

---

## 🔍 Troubleshooting

### Error: "Cannot connect to PostgreSQL"

**สาเหตุ**: PostgreSQL service ไม่ทำงาน

**วิธีแก้**:
- **Windows**: เปิด Services และเริ่ม PostgreSQL service
- **macOS**: `brew services start postgresql`
- **Linux**: `sudo systemctl start postgresql`

### Error: "password authentication failed"

**สาเหตุ**: รหัสผ่านใน `.env` ไม่ถูกต้อง

**วิธีแก้**:
1. ตรวจสอบรหัสผ่าน PostgreSQL ของคุณ
2. แก้ไข `PG_PASSWORD` ในไฟล์ `.env`

### Error: "database does not exist"

**สาเหตุ**: Database ยังไม่ถูกสร้าง

**วิธีแก้**:
```bash
psql -U postgres
CREATE DATABASE apexops_db;
\q
```

### Error: "Port 3000 already in use"

**สาเหตุ**: Port 3000 ถูกใช้งานอยู่

**วิธีแก้**:
- เปลี่ยน PORT ใน `.env` เป็นค่าอื่น (เช่น 3001)
- หรือหยุดโปรแกรมที่ใช้ port 3000

### Error: "Port 5173 already in use"

**สาเหตุ**: Port 5173 ถูกใช้งานอยู่ (Vite default port)

**วิธีแก้**:
- Vite จะเปลี่ยน port อัตโนมัติ
- หรือแก้ไขใน `vite.config.ts`

### Error: "Module not found"

**สาเหตุ**: Dependencies ยังไม่ได้ติดตั้ง

**วิธีแก้**:
```bash
# Backend
cd server
npm install

# Frontend
cd client
npm install
```

---

## 📦 Dependencies Installation Details

### Backend Dependencies

```bash
cd server
npm install express pg bcryptjs jsonwebtoken dotenv cors body-parser puppeteer
npm install --save-dev nodemon
```

### Frontend Dependencies

```bash
cd client
npm install react react-dom react-router-dom axios tailwindcss lucide-react recharts remixicon
npm install --save-dev typescript @types/react @types/react-dom vite @vitejs/plugin-react-swc eslint
```

---

## 🔐 Security Checklist

- [ ] เปลี่ยน `JWT_SECRET` ใน `.env` เป็นค่าที่ปลอดภัย
- [ ] เปลี่ยน `PG_PASSWORD` ใน `.env` ให้ตรงกับรหัสผ่าน PostgreSQL
- [ ] ตรวจสอบว่า `.env` อยู่ใน `.gitignore`
- [ ] ตั้งค่า CORS ใน production ให้ถูกต้อง
- [ ] ใช้ HTTPS ใน production

---

## 📝 Next Steps

หลังจากติดตั้งเสร็จแล้ว:

1. อ่าน [Overview](./overview.md) เพื่อเข้าใจโปรเจกต์
2. ดู [Features](./features.md) เพื่อรู้ฟีเจอร์ทั้งหมด
3. อ่าน [API Documentation](./api-documentation.md) สำหรับ API endpoints
4. ดู [Project Structure](./project-structure.md) เพื่อเข้าใจโครงสร้าง

---

## 🆘 Getting Help

หากพบปัญหาหรือมีคำถาม:

1. ตรวจสอบ [Troubleshooting](#-troubleshooting) ด้านบน
2. อ่าน [DATABASE_SETUP.md](../server/DATABASE_SETUP.md)
3. อ่าน [README.md](../server/README.md)

---

**Last Updated**: 2025-01-27

