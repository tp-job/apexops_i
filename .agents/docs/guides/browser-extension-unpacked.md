# ลองใช้ ApexOps extension แบบ unpacked (Chrome / Edge)

เอกสารนี้คือวิธีติดตั้งและลองใช้ extension บนเครื่องตัวเอง ยังไม่ขึ้น Web Store (ตามที่ตัดสินใจไว้ในสเปกข้อ 11)
สเปกเต็มอยู่ที่ `.agents/docs/features/browser-extension.md`

## 1. build

```bash
npm run build --workspace app/extension
```

ได้โฟลเดอร์ `app/extension/.output/chrome-mv3/` — นี่คือตัวที่จะโหลด
(`npm run zip --workspace app/extension` ได้ไฟล์ zip ถ้าจะส่งให้คนอื่น)

**อย่าโหลด `chrome-mv3-e2e`** โฟลเดอร์นั้นสร้างจาก `build:e2e` และ**ให้สิทธิ์ localhost ไว้ล่วงหน้า**เพื่อให้สคริปต์ทดสอบรันได้
โดยไม่มีหน้าต่างขอสิทธิ์ ใช้กับการทดสอบอัตโนมัติเท่านั้น

## 2. โหลดเข้า browser

**Chrome:** เปิด `chrome://extensions` → เปิด **Developer mode** (มุมขวาบน) → **Load unpacked** → เลือกโฟลเดอร์ `app/extension/.output/chrome-mv3`

**Edge:** เปิด `edge://extensions` → เปิด **Developer mode** (ซ้ายล่าง) → **Load unpacked** → เลือกโฟลเดอร์เดียวกัน

จะเห็นไอคอนสีมะนาวรูปเส้นกราฟ ปักหมุด (pin) ไว้ที่แถบเครื่องมือจะสะดวกกว่า

## 3. เตรียม web app และ API

ต้องรันสองตัว และ extension จะอ่าน `/apexops.json` จาก web app เพื่อรู้ว่า API อยู่ที่ไหน

```bash
npm run dev:server   # API (ค่าเริ่มต้น :3000 — บนเครื่องนี้ :3000 ถูกโปรเจกต์อื่นใช้อยู่ ดู memory)
npm run dev:client   # web app :5173
```

ตรวจว่าไฟล์ discovery ถูกต้อง (ต้องเห็น `apiUrl` ตรงกับ API จริง):

```bash
curl http://localhost:5173/apexops.json
```

## 4. เชื่อมเว็บที่จะทดสอบเข้ากับ project

1. เปิดเว็บที่จะทดสอบในแท็บหนึ่ง (เช่น `http://localhost:5174`) — **ต้องเป็น http หรือ https**
2. คลิกไอคอน ApexOps บนแถบเครื่องมือ **ขณะอยู่บนแท็บนั้น**
   (ต้องคลิกที่ไอคอนจริง เพราะ extension จะเห็น URL ของแท็บได้จากการคลิกนั้นเท่านั้น)
3. วาง URL ของ project จาก web app เช่น `http://localhost:5173/p/my-project/issues` แล้วกด **Continue**
   - คัดลอก URL ได้จากปุ่มในการ์ด "Browser extension" ที่หน้า `/p/<slug>/settings`
4. popup จะแสดง **ชื่อโฮสต์ที่รหัสผ่านจะถูกส่งไป** ตัวใหญ่ — อ่านก่อนกรอก แล้วกด **Sign in and connect**
5. เบราว์เซอร์จะขึ้นหน้าต่างขอสิทธิ์เข้าถึงเว็บที่ทดสอบกับ API → กด **Allow**

เสร็จแล้ว popup จะบอกว่า "This site is being captured now." โดย**ไม่ต้อง reload** หน้าเว็บ

## 5. ทดสอบว่าใช้ได้

เปิด console ของเว็บที่ทดสอบแล้วพิมพ์:

```js
console.error('hello from the site under test')
```

รอไม่เกิน ~5 วินาที (SDK ส่งเป็นชุดทุก 5 วินาที) แล้วเปิด `/p/<slug>/issues` ใน web app จะเห็น issue ใหม่

> **ถ้าเคยโหลดไว้แล้วและเพิ่ง build ใหม่** ให้กดปุ่ม reload (⟳) ที่การ์ด extension ในหน้า `chrome://extensions` ไม่งั้นยังเป็นตัวเก่า

## สิ่งที่ extension ทำและไม่ทำ

- ดักจับ `console.error`, `console.warn`, uncaught error และ unhandled rejection **เฉพาะเว็บที่ผูกไว้**
- URL ที่บันทึก **ตัด query string และ `#hash` ทิ้ง** แต่ **ข้อความ error ไม่ได้ถูกกรอง** — token ที่อยู่ในข้อความ error จะถูกส่งไปด้วย
- ถ้าหน้าเว็บมี SDK ของ ApexOps อยู่แล้ว extension จะหยุดส่งเอง เพื่อไม่ให้นับซ้ำ
- **ก่อนส่งรหัสผ่าน จะเช็ก `/api/health` ของ API ก่อน** ถ้าไม่ตอบว่าเป็น ApexOps จะไม่ส่งอะไรเลย (กันกรณีพอร์ตชนกับโปรเจกต์อื่น) เป็นการกันความผิดพลาด ไม่ใช่การยืนยันตัวตน เพราะเซิร์ฟเวอร์ใดก็ตอบข้อความนี้ได้
- session ของ extension แยกจาก web app จะเห็นเป็น "ApexOps extension · Chrome on Windows" ในหน้า Settings
- **sign out ไม่ได้ตัดการดักจับ** เพราะใช้ ingest key ซึ่งเป็น public โดยออกแบบ ถ้าจะหยุดให้กด **Disconnect this site**

## ปัญหาที่เจอบ่อย

| อาการ | สาเหตุ / วิธีแก้ |
|---|---|
| popup บอก "Open the website you want to test…" | เปิด popup จากแท็บที่ไม่ใช่เว็บ (เช่น `chrome://`) หรือไม่ได้คลิกจากไอคอน ให้ไปที่แท็บเว็บก่อนแล้วคลิกไอคอน |
| "Could not read …/apexops.json" | web app ไม่ได้รัน หรือใส่ URL ผิดพอร์ต · ถ้า deploy จริงแล้ว host ไม่ส่ง CORS header extension จะขอสิทธิ์เข้าถึงเว็บนั้นแล้วลองใหม่เอง |
| "…is not https" | extension ปฏิเสธ API ที่เป็น http ธรรมดาที่ไม่ใช่ localhost โดยตั้งใจ เพื่อไม่ให้รหัสผ่านวิ่งแบบไม่เข้ารหัส |
| "There is no project … that you are a member of" | บัญชีที่ login ไม่ได้เป็นสมาชิก project นั้น |
| ข้อความสีแดงเรื่อง "listed origins" | project เปิด origin allowlist อยู่ ต้องเพิ่ม origin ของ extension (popup แสดงไว้ให้คัดลอก) ตอนนี้ยังไม่มีช่องแก้ในเว็บ ต้องใช้ `PATCH /api/projects/<slug>` |
| build ไม่ผ่าน: `EBUSY: resource busy or locked, rmdir ...chrome-mv3` | โฟลเดอร์นั้นถูกโหลดอยู่ในเบราว์เซอร์ Windows จึงลบทับไม่ได้ · เอา extension ออก (หรือปิดเบราว์เซอร์) แล้ว build ใหม่ · หรือ build ไปที่อื่นด้วย `WXT_OUT_DIR=<path> npx wxt build` ใน `app/extension` |
| "…did not answer as an ApexOps API" | พอร์ตปลายทางไม่ใช่เซิร์ฟเวอร์ ApexOps (บนเครื่องนี้ :3000 เคยถูกโปรเจกต์อื่นยึด) extension จะไม่ส่งรหัสผ่านให้ · เช็กด้วย `curl http://localhost:3000/api/health` ต้องได้ `"app":"apexops"` |
| error ไม่ขึ้นเป็น issue | ดูว่า project เปิดจับ level นั้นไหม (`captureLevels` ที่หน้า settings) · ถ้า API ล่ม extension จะเก็บไว้ในคิวและส่งใหม่เองภายใน ~30 วินาที |

## ข้อจำกัดที่ยังมีอยู่ในเวอร์ชันนี้

- **ID ของ extension เปลี่ยนตามพาธโฟลเดอร์** ถ้าย้ายโฟลเดอร์ origin จะเปลี่ยน และ allowlist ที่ตั้งไว้จะไม่ตรง (จะตรึง key ใน P7)
- คิวที่ยังส่งไม่สำเร็จเก็บใน `storage.session` — **ปิดเบราว์เซอร์ทั้งตัวแล้ว event ที่ค้างหาย**
- ยังไม่มี toolbar ลอยบนหน้าเว็บ และยังไม่มีปุ่ม Report bug (อยู่ใน P5)
- ยังไม่ทดสอบบน Firefox
