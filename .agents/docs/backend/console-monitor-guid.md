# ApexOps Real-time Console Monitor Guide - คู่มือการใช้งาน

## 📋 ภาพรวม

Real-time Console Monitor เป็นระบบสำหรับ monitor console logs จาก web applications แบบ real-time ผ่าน WebSocket พร้อมฟีเจอร์ครบครัน:

- ✅ **Multiple URL Tabs** - เปิด monitor หลาย URL พร้อมกัน
- ✅ **Real-time Streaming** - รับ logs แบบ real-time ผ่าน WebSocket
- ✅ **Log Filtering** - กรอง logs ตาม level (info, warning, error, debug)
- ✅ **Pause/Resume** - หยุดและเล่น stream ได้
- ✅ **Copy Logs** - คัดลอก logs ไปใช้งานต่อ
- ✅ **Clear Logs** - ล้าง logs ของแต่ละ session
- ✅ **Admin Authentication** - ต้อง login ก่อนใช้งาน
- ✅ **Dark Theme UI** - ธีมสีเข้มสบายตา
- ✅ **Statistics** - แสดงสถิติ logs แบบ real-time
- ✅ **Auto-scroll** - เลื่อนหน้าจออัตโนมัติตาม logs ใหม่

## 🚀 การเริ่มต้นใช้งาน

### 1. เปิดใช้งาน Console Monitor

```bash
# เริ่ม server
cd server
npm start

# เปิด browser ไปที่
http://localhost:3000/console-monitor
```

### 2. Login

1. คลิกปุ่ม "Login" ที่มุมขวาบน
2. ใส่ email และ password ของ admin
3. กด "Login"

**หมายเหตุ:** ต้องสร้าง user account ก่อนผ่าน API `/api/auth/register`

### 3. เพิ่ม URL ที่ต้องการ Monitor

1. ใส่ URL ในช่อง input (เช่น `https://example.com`)
2. กดปุ่ม "Add Tab" หรือกด Enter
3. Tab ใหม่จะถูกสร้างขึ้น และเริ่ม monitor ทันที

### 4. ดู Logs แบบ Real-time

- Logs จะแสดงแบบ real-time เมื่อมีการ log จาก target app
- แต่ละ log จะแสดง:
  - **Timestamp** - เวลาที่เกิด log
  - **Level** - ระดับของ log (INFO, WARNING, ERROR, DEBUG)
  - **Message** - ข้อความ log
  - **Stack Trace** - (ถ้ามี) สำหรับ errors

## 🎯 ฟีเจอร์หลัก

### 1. Multiple URL Tabs

**การใช้งาน:**
- เพิ่ม URL ใหม่ได้ไม่จำกัด
- แต่ละ tab จะมี logs แยกกัน
- สลับระหว่าง tabs ได้ง่าย
- ปิด tab ได้ด้วยปุ่ม ✕

**ตัวอย่าง:**
```
Tab 1: https://app1.example.com
Tab 2: https://app2.example.com
Tab 3: http://localhost:3001
```

### 2. Log Filtering

**Filter ตาม Level:**
- **All** - แสดงทุก logs
- **Info** - แสดงเฉพาะ info logs
- **Warning** - แสดงเฉพาะ warning logs
- **Error** - แสดงเฉพาะ error logs
- **Debug** - แสดงเฉพาะ debug logs

**การใช้งาน:**
1. คลิกปุ่ม filter ที่ต้องการ
2. Logs จะถูกกรองทันที
3. Statistics จะยังแสดงข้อมูลทั้งหมด

### 3. Pause/Resume Stream

**การใช้งาน:**
- กดปุ่ม "⏸️ Pause" เพื่อหยุด stream ชั่วคราว
- Logs ใหม่จะไม่แสดงในขณะที่ pause
- กดปุ่ม "▶️ Resume" เพื่อเล่น stream ต่อ
- Logs ที่เกิดขึ้นระหว่าง pause จะถูกบันทึกไว้

**Use Case:**
- อ่าน logs ที่ผ่านมาโดยไม่ถูกรบกวนจาก logs ใหม่
- วิเคราะห์ error ที่เกิดขึ้น
- Copy logs ที่ต้องการ

### 4. Copy Logs

**การใช้งาน:**
1. เลือก filter ที่ต้องการ (ถ้าต้องการ copy เฉพาะบาง level)
2. กดปุ่ม "📋 Copy"
3. Logs จะถูก copy ไปยัง clipboard

**รูปแบบที่ Copy:**
```
[14:30:25] [INFO] Application started
[14:30:26] [ERROR] Connection failed
  at connectDatabase (db.js:45:12)
  at startup (app.js:10:5)
```

### 5. Clear Logs

**การใช้งาน:**
1. กดปุ่ม "🗑️ Clear"
2. ยืนยันการลบ
3. Logs ทั้งหมดของ tab นั้นจะถูกลบ (ทั้งใน UI และ database)

**หมายเหตุ:** การลบจะลบถาวร ไม่สามารถกู้คืนได้

### 6. Auto-scroll

**การใช้งาน:**
- เปิด/ปิด auto-scroll ด้วย checkbox "Auto-scroll"
- เมื่อเปิด: หน้าจอจะเลื่อนไปที่ log ล่าสุดอัตโนมัติ
- เมื่อปิด: หน้าจอจะอยู่กับที่ แม้มี logs ใหม่

### 7. Statistics

**ข้อมูลที่แสดง:**
- **Total** - จำนวน logs ทั้งหมด
- **Errors** - จำนวน error logs (สีแดง)
- **Warnings** - จำนวน warning logs (สีเหลือง)
- **Info** - จำนวน info logs (สีฟ้า)
- **Uptime** - เวลาที่ monitor ทำงาน (HH:MM:SS)

## 🔧 API Endpoints

### Authentication

```javascript
// Login
POST /api/auth/login
{
  "email": "admin@example.com",
  "password": "password123"
}

// Response
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "firstName": "Admin",
    "lastName": "User",
    "email": "admin@example.com"
  }
}
```

### Console Monitor Sessions

```javascript
// Get all sessions
GET /api/console-monitor/sessions
Headers: { Authorization: "Bearer <token>" }

// Create new session
POST /api/console-monitor/sessions
Headers: { Authorization: "Bearer <token>" }
Body: {
  "url": "https://example.com",
  "appName": "My App"
}

// Stop session
DELETE /api/console-monitor/sessions/:sessionId
Headers: { Authorization: "Bearer <token>" }

// Get logs for session
GET /api/console-monitor/logs/:sessionId?level=error&limit=100
Headers: { Authorization: "Bearer <token>" }

// Get statistics
GET /api/console-monitor/stats/:sessionId
Headers: { Authorization: "Bearer <token>" }

// Clear logs
POST /api/console-monitor/clear/:sessionId
Headers: { Authorization: "Bearer <token>" }
```

## 🔌 WebSocket Events

### Client → Server

```javascript
// Register as monitor
socket.emit('register', {
  clientType: 'monitor'
});
```

### Server → Client

```javascript
// Receive console logs
socket.on('console-logs', (logs) => {
  // logs: Array of log objects
  // {
  //   level: 'info' | 'warning' | 'error' | 'debug',
  //   message: string,
  //   source: string,
  //   stack?: string,
  //   timestamp: string,
  //   appName: string
  // }
});

// Target app connected
socket.on('target-app-connected', (appInfo) => {
  // appInfo: { socketId, appName, url, connectedAt }
});

// Target app disconnected
socket.on('target-app-disconnected', (appInfo) => {
  // appInfo: { socketId, appName, url }
});
```

## 📱 การติดตั้ง Client Script ใน Target App

### วิธีที่ 1: ใช้ Script Tag

```html
<!-- เพิ่มใน <head> หรือก่อน </body> -->
<script>
  window.BUG_TRACKER_SERVER = 'http://localhost:3000';
  window.BUG_TRACKER_APP_NAME = 'My Application';
</script>
<script src="http://localhost:3000/bug-tracker-client.js"></script>
```

### วิธีที่ 2: Copy-Paste ใน Console

1. เปิด DevTools (F12)
2. ไปที่ Console tab
3. Paste script จาก `http://localhost:3000/bug-tracker-client.js`
4. กด Enter

### วิธีที่ 3: ใช้ Bookmarklet

สร้าง bookmark ใหม่ด้วย URL:

```javascript
javascript:(function(){var s=document.createElement('script');s.src='http://localhost:3000/bug-tracker-client.js';document.head.appendChild(s);})();
```

คลิก bookmark เพื่อเปิดใช้งาน monitoring

## 🎨 UI Components

### Color Scheme

```css
/* Log Levels */
--log-info: #58a6ff (สีฟ้า)
--log-warn: #d29922 (สีเหลือง)
--log-error: #f85149 (สีแดง)
--log-debug: #8b949e (สีเทา)

/* Status */
--accent-green: #3fb950 (Connected)
--accent-red: #f85149 (Disconnected)
--accent-yellow: #d29922 (Paused)
```

### Layout

```
┌─────────────────────────────────────────────┐
│ Header (Logo + Status + User + Login)      │
├─────────────────────────────────────────────┤
│ Toolbar (URL Input + Add + Pause + Copy)   │
├─────────────────────────────────────────────┤
│ Tabs (Tab1 | Tab2 | Tab3 ...)              │
├─────────────────────────────────────────────┤
│ Filters (All | Info | Warning | Error)     │
├─────────────────────────────────────────────┤
│ Stats (Total | Errors | Warnings | Uptime) │
├─────────────────────────────────────────────┤
│                                             │
│ Console Output (Logs)                       │
│                                             │
│ [14:30:25] [INFO] Log message...           │
│ [14:30:26] [ERROR] Error message...        │
│                                             │
└─────────────────────────────────────────────┘
```

## 🔐 Security

### Authentication

- ต้อง login ก่อนใช้งาน
- ใช้ JWT tokens
- Token จะถูกเก็บใน localStorage
- Token หมดอายุใน 1 ชั่วโมง

### Authorization

- แต่ละ user จะเห็นเฉพาะ sessions ของตัวเอง
- ไม่สามารถเข้าถึง sessions ของ user อื่นได้
- Admin role สามารถเข้าถึงทุก sessions

### CORS

- WebSocket เปิด CORS สำหรับทุก origin (development)
- Production ควรจำกัด origin

## 🐛 Troubleshooting

### ปัญหา: ไม่สามารถ connect WebSocket

**สาเหตุ:**
- Server ไม่ทำงาน
- Port ถูกใช้งานโดยโปรแกรมอื่น

**แก้ไข:**
1. ตรวจสอบว่า server ทำงานอยู่
2. ตรวจสอบ console log ว่ามี error
3. ลอง restart server

### ปัญหา: ไม่เห็น logs

**สาเหตุ:**
- Target app ไม่ได้ติดตั้ง client script
- URL ไม่ตรงกับ source ของ logs
- Filter ซ่อน logs

**แก้ไข:**
1. ตรวจสอบว่าติดตั้ง client script แล้ว
2. ตรวจสอบ URL ใน tab ว่าตรงกับ target app
3. เปลี่ยน filter เป็น "All"
4. ตรวจสอบ Network tab ว่า WebSocket connected

### ปัญหา: Logs ไม่ update

**สาเหตุ:**
- Stream ถูก pause
- WebSocket disconnected

**แก้ไข:**
1. ตรวจสอบว่าไม่ได้กด pause
2. ตรวจสอบ connection status (มุมขวาบน)
3. Refresh หน้าเว็บ

### ปัญหา: Authentication failed

**สาเหตุ:**
- Email/Password ผิด
- Token หมดอายุ
- User ไม่มีสิทธิ์

**แก้ไข:**
1. ตรวจสอบ email และ password
2. Logout และ login ใหม่
3. ตรวจสอบว่า user account มีอยู่ในระบบ

## 📊 Performance

### Optimization

- **Batch Logs**: Client script จะรวม logs ก่อนส่ง (100ms interval)
- **Lazy Rendering**: แสดงเฉพาะ logs ที่เห็นบนหน้าจอ
- **Auto-cleanup**: ลบ logs เก่าอัตโนมัติเมื่อเกิน limit
- **WebSocket**: ใช้ WebSocket แทน HTTP polling

### Limits

- **Max Logs per Tab**: ไม่จำกัด (แต่แนะนำให้ clear เป็นระยะ)
- **Max Tabs**: ไม่จำกัด (แต่แนะนำไม่เกิน 10 tabs)
- **Batch Size**: 50 logs per batch
- **Batch Interval**: 100ms

## 🚀 Advanced Usage

### Custom Log Levels

```javascript
// ใน target app
console.log('[CUSTOM]', 'Custom log message');
console.warn('[ALERT]', 'Alert message');
console.error('[CRITICAL]', 'Critical error');
```

### Programmatic Control

```javascript
// ใน target app (หลังติดตั้ง client script)

// Flush logs ทันที
window.__BugTracker.flush();

// Reconnect WebSocket
window.__BugTracker.reconnect();

// Check connection status
if (window.__BugTracker.isConnected()) {
  console.log('Bug tracker connected');
}
```

### API Integration

```javascript
// สร้าง session programmatically
const response = await fetch('http://localhost:3000/api/console-monitor/sessions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    url: 'https://my-app.com',
    appName: 'Production App'
  })
});

const { sessionId } = await response.json();

// ดึง logs
const logs = await fetch(`http://localhost:3000/api/console-monitor/logs/${sessionId}?level=error`, {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

## 📝 Best Practices

1. **ใช้ Descriptive App Names**
   - ใช้ชื่อที่บอกถึง environment (e.g., "Production API", "Staging Frontend")

2. **Filter Logs**
   - ใช้ filter เพื่อลดข้อมูลที่ต้องดู
   - เริ่มจาก errors ก่อน

3. **Clear Logs เป็นระยะ**
   - Clear logs เก่าเพื่อประสิทธิภาพ
   - เก็บ logs สำคัญไว้ใน database

4. **Use Pause Wisely**
   - Pause เมื่อต้องการอ่าน logs อย่างละเอียด
   - อย่าลืม resume หลังจากอ่านเสร็จ

5. **Monitor Multiple Environments**
   - เปิด tab แยกสำหรับแต่ละ environment
   - ใช้ชื่อที่แตกต่างกันชัดเจน

## 🎓 Examples

### Example 1: Monitor Production App

```javascript
// 1. Login to console monitor
// 2. Add URL: https://app.example.com
// 3. Install client script in production app
// 4. Watch logs in real-time
// 5. Filter by "error" to see only errors
// 6. Copy error logs for debugging
```

### Example 2: Debug Multiple Services

```javascript
// Tab 1: Frontend (http://localhost:3000)
// Tab 2: API (http://localhost:4000)
// Tab 3: WebSocket (http://localhost:5000)

// Switch between tabs to see logs from each service
// Use filters to focus on specific log levels
```

### Example 3: Monitor Production Issues

```javascript
// 1. Add production URL
// 2. Set filter to "error"
// 3. Wait for errors to appear
// 4. Pause stream when error occurs
// 5. Copy error logs
// 6. Clear logs after fixing
```

## 🔗 Links

- **Console Monitor UI**: http://localhost:3000/console-monitor
- **API Documentation**: http://localhost:3000/
- **Client Script**: http://localhost:3000/bug-tracker-client.js
- **WebSocket**: ws://localhost:8081 (Socket.IO)
- **Native WebSocket**: ws://localhost:8082

## 📞 Support

หากมีปัญหาหรือคำถาม:
1. ตรวจสอบ Console ใน DevTools
2. ตรวจสอบ Network tab
3. ดู server logs
4. อ่าน Troubleshooting section

---

**Version**: 1.0.0  
**Last Updated**: December 27, 2025  
**Author**: ApexOps Team

