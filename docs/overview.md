# 🧭 ApexOps Overview

## 🎯 จุดประสงค์ของเว็บไซต์

ApexOps คือระบบ **Bug & Log Management System**  
สำหรับนักพัฒนาในการตรวจสอบ **Console Logs, Errors, Bugs**  
และสร้าง **Tickets** สำหรับติดตามปัญหา คล้าย JIRA

ระบบนี้ช่วยให้นักพัฒนาสามารถ:
- 📊 จัดการและติดตาม logs จาก application
- 🐛 ติดตาม bugs และ issues ผ่าน ticket system
- 🔍 วิเคราะห์ console logs จาก browser
- 📈 ดูสถิติและ dashboard แบบ real-time

---

## 💡 ฟังก์ชันหลัก

### 🔐 Authentication & Authorization
- **User Registration** - สมัครสมาชิกใหม่
- **Login/Logout** - เข้าสู่ระบบด้วย JWT
- **Profile Management** - จัดการข้อมูลส่วนตัว
- **Token-based Authentication** - ใช้ JWT สำหรับ session management

### 📝 Logs Management
- **View Logs** - แสดง logs ทั้งหมด (ล่าสุด 100 รายการ)
- **Filter Logs** - กรองตาม level (info, warning, error)
- **Search Logs** - ค้นหา logs ตาม message หรือ source
- **Create Logs** - เพิ่ม log ใหม่
- **Console Logs Fetching** - ดึง console logs จาก browser URL (Puppeteer)

### 🎫 Ticket Management (JIRA Style)
- **Create Tickets** - สร้าง ticket ใหม่จาก logs หรือ manual
- **Update Tickets** - แก้ไข ticket (status, priority, assignee)
- **Delete Tickets** - ลบ ticket
- **Ticket Status** - open, in-progress, resolved, closed
- **Priority Levels** - low, medium, high, critical
- **Assignee Management** - กำหนดผู้รับผิดชอบ
- **Tags & Related Logs** - จัดกลุ่ม tickets และเชื่อมโยงกับ logs

### 📊 Dashboard
- **Statistics Overview** - สถิติ logs และ tickets
- **Charts & Graphs** - แสดงข้อมูลแบบ visual
- **Real-time Updates** - อัปเดตข้อมูลแบบ real-time
- **User Profile** - ข้อมูลผู้ใช้และสถิติ

### 💬 Chat & AI Chat
- **Simple Chat** - ระบบ chat พื้นฐาน
- **AI Chat Assistant** - พูดคุยกับ AI Assistant
- **Message History** - เก็บประวัติการสนทนา
- **Real-time Messaging** - ส่งข้อความแบบ real-time

### 🎨 UI/UX Features
- **Dark/Light Theme** - รองรับทั้ง dark และ light mode
- **Responsive Design** - ใช้งานได้บนทุกอุปกรณ์
- **Modern UI** - ใช้ Tailwind CSS และ modern design patterns
- **Smooth Animations** - อนิเมชันที่ลื่นไหล

---

## 🧱 โครงสร้างระบบ

### Frontend
- **React 19** - UI Framework
- **TypeScript** - Type Safety
- **Vite** - Build Tool & Dev Server
- **Tailwind CSS 4** - Styling Framework
- **React Router DOM** - Client-side Routing
- **Axios** - HTTP Client
- **Recharts** - Data Visualization
- **Lucide React** - Icon Library

### Backend
- **Node.js** - JavaScript Runtime
- **Express.js 5** - Web Framework
- **PostgreSQL** - Relational Database
- **JWT** - Authentication
- **bcryptjs** - Password Hashing
- **Puppeteer** - Headless Browser (Console Logs)

### Database
- **PostgreSQL** - เก็บข้อมูล users, logs, tickets
- **Connection Pooling** - ใช้ pg library

---

## 🚀 เป้าหมาย

สร้างเว็บแอปที่:
- ✅ **ใช้งานง่าย** - Interface ที่เข้าใจง่ายและใช้งานสะดวก
- ✅ **ดูเท่แบบ Cyber Developer** - UI แบบ dark neon theme
- ✅ **มีระบบเก็บบันทึก bug/log ที่เข้าใจได้ทันที** - จัดการ logs และ tickets อย่างเป็นระบบ
- ✅ **Performance ดี** - โหลดเร็วและ responsive
- ✅ **Scalable** - ขยายได้ง่ายเมื่อมีผู้ใช้มากขึ้น

---

## 🎯 Use Cases

### สำหรับนักพัฒนา
- ตรวจสอบ console logs จาก browser
- ติดตาม bugs และ issues
- จัดการ tickets อย่างเป็นระบบ
- วิเคราะห์สถิติและ trends

### สำหรับทีมพัฒนา
- แชร์ logs และ tickets ระหว่างทีม
- ติดตาม progress ของ bugs
- จัดการ priorities และ assignments

---

## 📈 Roadmap

### Version 1.0 (Current)
- ✅ Basic authentication
- ✅ Logs management
- ✅ Tickets management
- ✅ Dashboard
- ✅ Chat & AI Chat
- ✅ Dark/Light theme

### Future Versions
- 🔄 Real-time notifications
- 🔄 Advanced analytics
- 🔄 Export reports
- 🔄 Integration with external tools
- 🔄 Mobile app

---

**Last Updated**: 2025-01-27
