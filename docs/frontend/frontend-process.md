```
client/
└── src/
    ├── api/
    ├── components/
    ├── context/
    ├── hooks/
    ├── layouts/
    ├── pages/
    ├── routes/
    ├── styles/
    ├── types/
    └── utils/
```


---

## 🧱 หน้าที่หลักแต่ละส่วน
- `components/` → ปุ่ม, modal, card  
- `pages/` → หน้า Dashboard, Logs, Tickets, Login  
- `context/` → Auth state และ token  
- `api/` → ไฟล์เชื่อมต่อ backend เช่น axios instance  
- `styles/` → รวม Tailwind theme + global CSS  

---

## ⚡ จุดเด่น
- Type-safe ด้วย TypeScript  
- UI Modern ใช้ Tailwind + Neon theme  
- SPA (Single Page App) โหลดเร็ว  
- รองรับ Dark/Light mode toggle


# 🔄 Frontend Process Flow — ApexOps

## 🧭 ภาพรวมการทำงาน

1. ผู้ใช้เข้าเว็บ → React โหลดหน้าแรกผ่าน `App.tsx`  
2. ระบบตรวจสอบ token จาก localStorage  
3. ถ้ามี → แสดง Dashboard / Logs / Tickets  
4. ถ้าไม่มี → redirect ไปหน้า Login  

---

## 🔐 Login / Register Flow
- เมื่อผู้ใช้กรอกข้อมูล → ส่ง POST `/api/auth/login`
- ถ้าสำเร็จ → เซฟ JWT ใน localStorage  
- ใช้ Context (`AuthContext`) จัดการสถานะการ login  
- ทุก request ต่อไปแนบ header `Authorization: Bearer <token>`

---

## 🪵 Logs & Tickets Flow
1. React ส่ง GET `/api/logs` หรือ `/api/tickets`
2. Backend ตอบกลับ JSON
3. React แสดงผลใน table / card  
4. ผู้ใช้สามารถเพิ่ม/แก้ไข/ลบได้ผ่าน modal

---

## 🌈 UI Flow
- Navbar → ลิงก์หน้า Dashboard / Logs / Tickets  
- Sidebar → Filter logs / tickets  
- Theme Switcher → toggle dark neon mode  
- Toast Notification → แจ้งผลสำเร็จ / error  

---

## ⚡ State Management
ใช้ Context + useReducer แทน Redux  
แยก context เป็น:
- `AuthContext`
- `LogsContext`
- `TicketsContext`
