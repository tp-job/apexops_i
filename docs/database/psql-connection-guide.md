# 📖 คู่มือการตั้งค่าการเชื่อมต่อ PostgreSQL ใน PSQL Workspace

## 🔧 วิธีการตั้งค่าการเชื่อมต่อ

### สำหรับ PSQL Workspace UI (Visual Studio Code Extension)

เมื่อคุณเปิด PSQL Workspace และเห็นฟอร์มการเชื่อมต่อ กรอกข้อมูลตามนี้:

#### 1. **Server Name** (Optional)
```
apxops
```
หรือตั้งชื่ออะไรก็ได้ตามต้องการ เช่น `apexops-local`, `my-db-server`

#### 2. **Host name/address** ⚠️ จำเป็น
```
localhost
```
หรือใช้ IP address ถ้า database อยู่บนเครื่องอื่น เช่น `192.168.1.100`

#### 3. **Port** ⚠️ จำเป็น (มี error indicator ใน UI)
```
5432
```
Port มาตรฐานของ PostgreSQL คือ `5432`

#### 4. **Database** ⚠️ จำเป็น
```
apexops_db
```
ชื่อ database ที่เราจะสร้าง (หรือถ้าสร้างแล้วใช้ชื่อนั้น)

#### 5. **User** ⚠️ จำเป็น
```
postgres
```
หรือชื่อ user ที่คุณสร้างไว้ เช่น `apexops_user`

#### 6. **Password** ⚠️ จำเป็น
```
[รหัสผ่าน PostgreSQL ของคุณ] 

123456789
```
รหัสผ่านที่คุณตั้งไว้สำหรับ PostgreSQL

#### 7. **Role** (Optional)
```
[ว่างไว้หรือเลือก role ตามต้องการ]
```

#### 8. **Service** (Optional)
```
[ว่างไว้]
```

### 📝 สรุปค่าที่ต้องกรอก

| ฟิลด์ | ค่าที่กรอก | หมายเหตุ |
|-------|-----------|----------|
| Server Name | `apxops` | ชื่ออะไรก็ได้ |
| Host name/address | `localhost` | ถ้า database อยู่เครื่องเดียวกัน |
| Port | `5432` | ⚠️ ต้องกรอก (มี error) |
| Database | `apexops_db` | ต้องสร้างก่อน |
| User | `postgres` | หรือ user อื่นที่สร้างไว้ |
| Password | `[รหัสผ่านของคุณ]` | รหัสผ่านที่ตั้งไว้ |

## ✅ ขั้นตอนการตั้งค่าทั้งหมด

### 1. สร้าง Database (ถ้ายังไม่มี)

เปิด Terminal/PowerShell และรัน:

```bash
# เข้า psql
psql -U postgres

# สร้าง database
CREATE DATABASE apexops_db;

# ออกจาก psql
\q
```

### 2. สร้างไฟล์ `.env` ในโฟลเดอร์ `server`

```bash
cd server
cp .env.example .env
```

### 3. แก้ไขไฟล์ `.env` ให้ตรงกับการตั้งค่า PostgreSQL ของคุณ

```env
PG_USER=postgres
PG_HOST=localhost
PG_DATABASE=apexops_db
PG_PASSWORD=your_actual_password_here
PG_PORT=5432

PORT=3000
NODE_ENV=development
JWT_SECRET=your-secret-key-change-in-production
```

⚠️ **สำคัญ**: แก้ไข `PG_PASSWORD` ให้ตรงกับรหัสผ่าน PostgreSQL ที่คุณตั้งไว้

### 4. กรอกข้อมูลใน PSQL Workspace UI

ใช้ค่าจากไฟล์ `.env` ที่แก้ไขแล้ว:

- **Host**: ค่าเดียวกับ `PG_HOST` → `localhost`
- **Port**: ค่าเดียวกับ `PG_PORT` → `5432`
- **Database**: ค่าเดียวกับ `PG_DATABASE` → `apexops_db`
- **User**: ค่าเดียวกับ `PG_USER` → `postgres`
- **Password**: ค่าเดียวกับ `PG_PASSWORD` → `your_actual_password_here`

### 5. คลิก "Connect & Open PSQL"

เมื่อกรอกข้อมูลครบถ้วนแล้ว คลิกปุ่ม **"Connect & Open PSQL"** เพื่อเชื่อมต่อ

## 🔍 ตรวจสอบการเชื่อมต่อ

หลังจากเชื่อมต่อสำเร็จ คุณสามารถทดสอบได้โดย:

```sql
-- ตรวจสอบว่าเชื่อมต่อได้
SELECT version();

-- ดูรายการ database
\l

-- เลือก database
\c apexops_db

-- ดูรายการตาราง (หลังจากรัน server แล้ว)
\dt
```

## ❌ แก้ไขปัญหา

### Error: "connection refused"

**สาเหตุ**: PostgreSQL service ไม่ทำงาน

**วิธีแก้**:
- Windows: เปิด Services และเริ่ม PostgreSQL service
- macOS: `brew services start postgresql`
- Linux: `sudo systemctl start postgresql`

### Error: "password authentication failed"

**สาเหตุ**: รหัสผ่านไม่ถูกต้อง

**วิธีแก้**:
1. ตรวจสอบรหัสผ่านในไฟล์ `.env`
2. หรือลอง reset password ใน PostgreSQL:
   ```sql
   ALTER USER postgres WITH PASSWORD 'new_password';
   ```

### Error: "database does not exist"

**สาเหตุ**: Database ยังไม่ถูกสร้าง

**วิธีแก้**:
```sql
CREATE DATABASE apexops_db;
```

### Error: "role does not exist"

**สาเหตุ**: User ที่ระบุไม่มีใน PostgreSQL

**วิธีแก้**:
```sql
-- สร้าง user ใหม่
CREATE USER postgres WITH PASSWORD 'your_password';

-- หรือใช้ user ที่มีอยู่แล้ว
-- ตรวจสอบ user ที่มีอยู่:
\du
```

## 🔗 ความสัมพันธ์ระหว่าง `.env` และ PSQL UI

| `.env` file | PSQL Workspace UI |
|-------------|-------------------|
| `PG_HOST` | Host name/address |
| `PG_PORT` | Port |
| `PG_DATABASE` | Database |
| `PG_USER` | User |
| `PG_PASSWORD` | Password |

⚠️ **สำคัญ**: ให้ค่าทั้งสองที่ตรงกัน เพื่อให้แน่ใจว่า server และ PSQL UI เชื่อมต่อกับ database เดียวกัน

## 📚 เอกสารเพิ่มเติม

- ดู `DATABASE_SETUP.md` สำหรับรายละเอียดการตั้งค่า database
- ดู `README.md` สำหรับการรัน server

