# การตั้งค่า PostgreSQL Database

## 📋 ข้อกำหนดเบื้องต้น

1. ติดตั้ง PostgreSQL บนเครื่องของคุณ
   - Windows: ดาวน์โหลดจาก [postgresql.org](https://www.postgresql.org/download/windows/)
   - macOS: `brew install postgresql` หรือใช้ PostgreSQL.app
   - Linux: `sudo apt-get install postgresql` (Ubuntu/Debian)

2. ตรวจสอบว่า PostgreSQL service ทำงานอยู่
   - Windows: ตรวจสอบใน Services
   - macOS/Linux: `pg_ctl status` หรือ `sudo systemctl status postgresql`

## 🔧 ขั้นตอนการตั้งค่า

### 1. สร้าง Database

เปิด terminal/PowerShell และเข้าสู่ PostgreSQL:

```bash
psql -U postgres
```

หรือบน Windows:
```bash
psql -U postgres -p 5432
```

### 2. สร้าง Database และ User (ถ้าต้องการ)

```sql
-- สร้าง database
CREATE DATABASE apexops_db;

-- หรือสร้าง user ใหม่ (optional)
CREATE USER apexops_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE apexops_db TO apexops_user;

-- ออกจาก psql
\q
```

### 3. ตั้งค่า Environment Variables

1. คัดลอกไฟล์ `.env.example` เป็น `.env`:
   ```bash
   cd server
   cp .env.example .env
   ```

2. แก้ไขไฟล์ `.env` ตามการตั้งค่าของคุณ:
   ```env
   PG_USER=postgres
   PG_HOST=localhost
   PG_DATABASE=apexops_db
   PG_PASSWORD=your_postgres_password
   PG_PORT=5432
   ```

### 4. ติดตั้ง Dependencies

```bash
cd server
npm install
```

### 5. รัน Server

```bash
npm run dev
```

หรือ

```bash
npm start
```

Server จะ:
- เชื่อมต่อกับ PostgreSQL อัตโนมัติ
- สร้างตาราง `users`, `logs`, และ `tickets` อัตโนมัติ (ถ้ายังไม่มี)

## ✅ ตรวจสอบการเชื่อมต่อ

หากเห็นข้อความต่อไปนี้ แสดงว่าเชื่อมต่อสำเร็จ:

```
✅ PostgreSQL connected successfully
✅ Database tables initialized successfully
🚀 Server running on http://localhost:3000
```

## 🔍 แก้ไขปัญหา

### Error: "Connection refused"

**สาเหตุ**: PostgreSQL service ไม่ทำงาน

**วิธีแก้**:
- Windows: เปิด Services และเริ่ม PostgreSQL service
- macOS: `brew services start postgresql`
- Linux: `sudo systemctl start postgresql`

### Error: "password authentication failed"

**สาเหตุ**: รหัสผ่านใน `.env` ไม่ถูกต้อง

**วิธีแก้**:
1. ตรวจสอบรหัสผ่าน PostgreSQL ของคุณ
2. แก้ไข `PG_PASSWORD` ในไฟล์ `.env`

### Error: "database does not exist"

**สาเหตุ**: Database ยังไม่ถูกสร้าง

**วิธีแก้**:
1. เข้า psql: `psql -U postgres`
2. สร้าง database: `CREATE DATABASE apexops_db;`
3. ออกจาก psql: `\q`

### Error: "relation does not exist"

**สาเหตุ**: ตารางยังไม่ถูกสร้าง

**วิธีแก้**: Server จะสร้างตารางอัตโนมัติเมื่อเริ่มทำงาน หรือรันคำสั่ง SQL ต่อไปนี้:

```sql
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS logs (
    id SERIAL PRIMARY KEY,
    level TEXT NOT NULL,
    message TEXT NOT NULL,
    source TEXT,
    stack TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tickets (
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

## 📝 ข้อมูลเพิ่มเติม

- Default PostgreSQL port: `5432`
- Default host: `localhost`
- Database จะสร้างตารางอัตโนมัติเมื่อเริ่ม server

## 🔐 ความปลอดภัย

**สำคัญ**: อย่า commit ไฟล์ `.env` ลง git repository!

เพิ่ม `.env` ใน `.gitignore`:
```
.env
.env.local
.env.production
```

