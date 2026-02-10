# แก้ไข PostgreSQL Authentication

## วิธีที่ 1: ใช้ Trust Authentication (แนะนำสำหรับ Development)

### ขั้นตอน:

1. **หาไฟล์ pg_hba.conf**
   - ตำแหน่งมักจะอยู่ที่: `C:\Program Files\PostgreSQL\18\data\pg_hba.conf`
   - หรือใช้ pgAdmin: File → Preferences → Paths → Binary paths

2. **แก้ไขไฟล์ pg_hba.conf**
   
   เปิดไฟล์ด้วย **Notepad as Administrator**
   
   หาบรรทัดนี้:
   ```
   # IPv4 local connections:
   host    all             all             127.0.0.1/32            scram-sha-256
   ```
   
   เปลี่ยนเป็น:
   ```
   # IPv4 local connections:
   host    all             all             127.0.0.1/32            trust
   ```

3. **Restart PostgreSQL Service**
   - เปิด Services (Win + R → services.msc)
   - หา "postgresql-x64-18"
   - คลิกขวา → Restart

4. **ลบ Password จาก .env**
   ```env
   PG_PASSWORD=
   ```

---

## วิธีที่ 2: ตั้ง Password ใหม่

### ใช้ pgAdmin:

1. เปิด pgAdmin 4
2. เชื่อมต่อกับ PostgreSQL 18
3. คลิกขวาที่ **Login/Group Roles** → **postgres**
4. ไปที่ tab **Definition**
5. ใส่ password ใหม่: `123456789`
6. คลิก **Save**

### หรือใช้ SQL:

```sql
ALTER USER postgres WITH PASSWORD '123456789';
```

---

## วิธีที่ 3: ใช้ Environment Variable

แก้ไข `.env`:
```env
PG_USER=postgres
PG_PASSWORD=your_actual_password_here
PG_HOST=localhost
PG_DATABASE=apexops_db
PG_PORT=5432
```

---

## ทดสอบ Connection

หลังแก้ไขแล้ว restart server:

```bash
node src/server.js
```

ควรเห็น:
```
✅ Database connected
🚀 Server running on http://localhost:3000
💾 Database: ✅ Connected
```

