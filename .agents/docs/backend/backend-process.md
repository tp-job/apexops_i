> ⚠️ **Stale as of 2026-07-24** — this tree shows `server/` at the repo root with `server.js` and
> raw `pg` models/routes. The actual path is `app/server/`, using Prisma (`database/prisma/schema.prisma`)
> instead of hand-written models, and `server.ts`. See `project-structure.md` and `devrule.md` §4–5
> for the current backend architecture.

```
server/
└── src/
    ├── server.js
    ├── routes/
    │   ├── logs.js
    │   ├── tickets.js
    │   └── auth.js
    ├── models/
    │   └── db.js
    └── utils/
        └── errorHandler.js
```


---

## 🧠 2️⃣ `docs/backend-process.md`

```markdown
# 🔄 Backend Process Flow — ApexOps

## 🧭 ภาพรวมการทำงาน

1. **Client (React)** ส่ง request มาที่ Express server  
2. **Express** ตรวจสอบ token / validate ข้อมูล  
3. **Route Handler** ทำงานตามประเภท (logs, tickets, auth)  
4. **Database (PostgreSQL)** จัดการข้อมูลผ่าน `pg`  
5. **Response** กลับไปยัง Frontend เป็น JSON  

---

## ⚙️ ลำดับการทำงานของ API

### 🔐 Authentication
1. `/api/auth/register` → สมัครสมาชิก → hash password → insert DB  
2. `/api/auth/login` → ตรวจสอบ user/password → ออก JWT  
3. `/api/auth/profile` → ตรวจสอบ JWT → ดึงข้อมูล user

---

### 🪵 Logs System
1. `/api/logs` (GET) → ดึง log ทั้งหมด  
2. `/api/logs` (POST) → เพิ่ม log ใหม่  
3. `/api/logs/:id` (DELETE) → ลบ log  

---

### 🎫 Tickets System
1. `/api/tickets` (GET) → ดึง tickets ทั้งหมด  
2. `/api/tickets` (POST) → เพิ่ม ticket  
3. `/api/tickets/:id` (PUT) → เปลี่ยนสถานะ ticket  

---

## 🧩 Middleware สำคัญ
- `authMiddleware.js` → ตรวจสอบ JWT  
- `errorHandler.js` → จัดการ error กลาง  

---

## 🗂️ Database Tables
- `users (id, username, email, password_hash, role)`
- `logs (id, message, level, created_at)`
- `tickets (id, title, description, status, assigned_to)`
