# 🧩 ApexOps — Core Features

## 🚀 ฟีเจอร์หลักของระบบ

### 🔐 Authentication & Authorization

#### User Management
- **User Registration** - สมัครสมาชิกใหม่ด้วย email และ password
- **User Login** - เข้าสู่ระบบด้วย JWT token
- **User Logout** - ออกจากระบบ
- **Profile Management** - ดูและแก้ไขข้อมูลส่วนตัว

#### Security Features
- **Token-based Authentication** - ใช้ JWT สำหรับ session management
- **Password Hashing** - เข้ารหัสรหัสผ่านด้วย bcryptjs
- **Protected Routes** - ต้อง login เพื่อเข้าถึงบางหน้า
- **CORS Configuration** - ตั้งค่า cross-origin requests

---

### 📝 Logs Management

#### View & Filter
- **View All Logs** - แสดง logs ทั้งหมด (ล่าสุด 100 รายการ)
- **Filter by Level** - กรองตาม level (info, warning, error)
- **Search Logs** - ค้นหา logs ตาม message หรือ source
- **Sort by Timestamp** - เรียงตามเวลาล่าสุด

#### Log Details
- **Log Level** - error, warning, info
- **Message** - ข้อความ log
- **Source** - แหล่งที่มาของ log
- **Stack Trace** - สำหรับ error logs
- **Timestamp** - เวลาที่สร้าง log

#### Console Logs
- **Fetch Console Logs** - ดึง console logs จาก browser URL
- **Puppeteer Integration** - ใช้ Puppeteer เพื่อเปิด headless browser
- **Auto Save** - บันทึก logs อัตโนมัติลง database

---

### 🎫 Ticket Management (JIRA Style)

#### Ticket Operations
- **Create Ticket** - สร้าง ticket ใหม่ (จาก log หรือ manual)
- **Update Ticket** - แก้ไข ticket (title, description, status, priority, assignee)
- **Delete Ticket** - ลบ ticket
- **View Ticket Details** - ดูรายละเอียด ticket

#### Ticket Properties
- **Status** - open, in-progress, resolved, closed
- **Priority** - low, medium, high, critical
- **Assignee** - ผู้รับผิดชอบ
- **Reporter** - ผู้รายงาน
- **Tags** - tags สำหรับจัดกลุ่ม
- **Related Logs** - logs ที่เกี่ยวข้อง

#### Ticket Features
- **Create from Log** - สร้าง ticket จาก log โดยอัตโนมัติ
- **Link Logs** - เชื่อมโยง logs กับ ticket
- **Status Tracking** - ติดตามสถานะ ticket
- **Priority Management** - จัดการความสำคัญ

---

### 📊 Dashboard

#### Statistics
- **Logs Statistics** - สถิติ logs (จำนวน, ระดับ, แหล่งที่มา)
- **Tickets Statistics** - สถิติ tickets (จำนวน, สถานะ, ความสำคัญ)
- **Real-time Updates** - อัปเดตข้อมูลแบบ real-time

#### Charts & Visualizations
- **Charts** - แสดงข้อมูลแบบ visual ด้วย Recharts
- **Trends** - แสดงแนวโน้มการเปลี่ยนแปลง
- **Filter by Date** - กรองตามช่วงเวลา

#### User Profile
- **Profile Information** - ข้อมูลผู้ใช้
- **Activity History** - ประวัติการใช้งาน
- **Statistics** - สถิติส่วนตัว

---

### 💬 Chat & AI Chat

#### Simple Chat
- **Chat Interface** - หน้าจอ chat พื้นฐาน
- **Message History** - เก็บประวัติการสนทนา
- **Real-time Messaging** - ส่งข้อความแบบ real-time
- **User Selection** - เลือกผู้ใช้เพื่อสนทนา

#### AI Chat Assistant
- **AI Assistant** - พูดคุยกับ AI Assistant
- **Intelligent Responses** - ตอบกลับอย่างชาญฉลาด
- **Loading States** - แสดงสถานะกำลังพิมพ์
- **Message Formatting** - จัดรูปแบบข้อความ

---

### 🎨 UI/UX Features

#### Theme
- **Dark Mode** - โหมดมืด (default)
- **Light Mode** - โหมดสว่าง
- **Theme Toggle** - สลับ theme ได้
- **Persistent Theme** - เก็บการตั้งค่า theme

#### Design
- **Modern UI** - ใช้ Tailwind CSS และ modern design patterns
- **Responsive Design** - ใช้งานได้บนทุกอุปกรณ์
- **Smooth Animations** - อนิเมชันที่ลื่นไหล
- **Loading States** - แสดงสถานะ loading

#### Components
- **Reusable Components** - components ที่ใช้ซ้ำได้
- **Custom Components** - components ที่สร้างเอง
- **Icons** - ใช้ Lucide React และ RemixIcon
- **Charts** - ใช้ Recharts สำหรับ visualization

---

### 🔍 Search & Filter

#### Search
- **Search Logs** - ค้นหา logs ตาม message หรือ source
- **Search Tickets** - ค้นหา tickets ตาม title หรือ description

#### Filter
- **Filter by Level** - กรอง logs ตาม level
- **Filter by Status** - กรอง tickets ตาม status
- **Filter by Priority** - กรอง tickets ตาม priority

---

### 📱 Responsive Design

- **Mobile First** - ออกแบบสำหรับ mobile ก่อน
- **Tablet Support** - รองรับ tablet
- **Desktop Optimized** - ปรับให้เหมาะกับ desktop
- **Breakpoints** - ใช้ Tailwind breakpoints

---

### 🚀 Performance

- **Fast Loading** - โหลดเร็วด้วย Vite
- **Code Splitting** - แบ่ง code เพื่อลดขนาด bundle
- **Lazy Loading** - โหลด components เมื่อจำเป็น
- **Optimized Build** - build ที่ optimize แล้ว

---

**Last Updated**: 2025-01-27
