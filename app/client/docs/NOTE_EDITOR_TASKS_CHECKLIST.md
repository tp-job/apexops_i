# Note Editor – รายการตรวจสอบงาน (Checklist)

## แผน: Comment และ UI (comment_position_and_draggable)

| # | งาน | สถานะ | หมายเหตุ |
|---|-----|--------|----------|
| 1 | ให้ Comment อยู่ใกล้อักษรสุดท้ายของ selection | ✅ เสร็จ | เปลี่ยนไปใช้ปุ่มบน toolbar แทนปุ่มลอย |
| 2 | ปรับ handleOpenCommentDialog ให้คำนวณตำแหน่ง dialog | ✅ เสร็จ | เปิด dialog กลางจอใต้ toolbar |
| 3 | ลบ "Line 1" ออกจาก title row | ✅ เสร็จ | ไม่มีเลขบรรทัดซ้ายของ Document title |
| 4 | ทำให้ Popup Comment ลากด้วยเมาส์ได้ | ✅ เสร็จ | ลากที่ header ได้ มี cursor grab/grabbing |

## งานเพิ่ม: ย้าย Comment ไป toolbar + Senior Design

| # | งาน | สถานะ | หมายเหตุ |
|---|-----|--------|----------|
| 5 | ย้าย Comment ไปอยู่ด้านบนรวมกับ toolbar (Home, Insert, Layout, View) | ✅ เสร็จ | ปุ่ม Comment อยู่ในแถบ tab เดียวกับ Home, Insert, Layout, View |
| 6 | ปุ่ม Comment เปิดได้เมื่อมี selection เท่านั้น | ✅ เสร็จ | disabled + opacity เมื่อไม่มี selection, มี title tooltip |
| 7 | ปรับ UI toolbar แบบ senior design | ✅ เสร็จ | แยก tab ด้วย divider, สไตล์ปุ่มสม่ำเสมอ (rounded, border, transition) |
| 8 | ลบปุ่ม Comment ลอยในเนื้อหา | ✅ เสร็จ | ลบ floating button ออก เหลือเฉพาะปุ่มบน toolbar |
| 9 | ลดโค้ดที่ไม่ใช้ (commentButtonRef, logic ปุ่มลอย) | ✅ เสร็จ | ลบ ref และ simplify useEffect ปิด dialog |

## สรุปฟีเจอร์ Comment ปัจจุบัน

- **เปิด Comment:** เลือกข้อความ → กดปุ่ม **Comment** บน toolbar (แถบเดียวกับ Home, Insert, Layout, View)
- **Dialog:** แสดง Line, Text ที่เลือก, ช่อง Message, ปุ่ม Cancel / Add Comment
- **ลากได้:** คลิกลากที่หัวข้อ "Comment" เพื่อย้าย popup
- **ปิด:** คลิกนอก, กด Escape, หรือกด Cancel
- **Comments panel:** ดูรายการ comment ทั้งหมดที่แท็บ **Comments** ในแถบด้านขวา
