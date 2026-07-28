# คู่มือ Toolbar ของ Note Editor

## Overview

Toolbar ของ Note Editor ใช้ **contenteditable API** และ **document.execCommand()** ของ JavaScript เพื่อให้ผู้ใช้สามารถจัดรูปแบบข้อความได้

---

##  Toolbar Features

### 1. **Text Formatting (การจัดรูปแบบข้อความ)**

#### Bold (ตัวหนา)

- **Button:** `<i class="bi bi-type-bold"></i>`

- **Function:** `formatText('bold')`

- **Keyboard Shortcut:** `Ctrl+B`

- **HTML Result:** `<strong>text</strong>`

- **How it works:**

  ```javascript

  window.formatText = function(command) {

    window.addClickFeedback(`[onclick="formatText('${command}')"]`);

    window.execCommand(command);

  };

  ```

  

#### Italic (ตัวเอียง)

- **Button:** `<i class="bi bi-type-italic"></i>`

- **Function:** `formatText('italic')`

- **Keyboard Shortcut:** `Ctrl+I`

- **HTML Result:** `<em>text</em>`

  

#### Underline (ขีดเส้นใต้)

- **Button:** `<i class="bi bi-type-underline"></i>`

- **Function:** `formatText('underline')`

- **Keyboard Shortcut:** `Ctrl+U`

- **HTML Result:** `<u>text</u>`

  

#### Strikethrough (ขีดฆ่า)

- **Button:** `<i class="bi bi-type-strikethrough"></i>`

- **Function:** `formatText('strikeThrough')`

- **HTML Result:** `<s>text</s>`

  

---

  

### 2. **Lists (รายการ)**

#### Bullet List (รายการแบบจุด)

- **Button:** `<i class="bi bi-list-ul"></i>`

- **Function:** `insertList('ul')`

- **HTML Result:** `<ul><li>item</li></ul>`

#### Numbered List (รายการแบบหมายเลข)

- **Button:** `<i class="bi bi-list-ol"></i>`

- **Function:** `insertList('ol')`

- **HTML Result:** `<ol><li>item</li></ol>`

---

  

### 3. **Text Alignment (การจัดตำแหน่งข้อความ)**

#### Align Left (ชิดซ้าย)

- **Button:** `<i class="bi bi-text-left"></i>`

- **Function:** `alignText('justifyLeft')`

#### Align Center (กึ่งกลาง)

- **Button:** `<i class="bi bi-text-center"></i>`

- **Function:** `alignText('justifyCenter')`

#### Align Right (ชิดขวา)

- **Button:** `<i class="bi bi-text-right"></i>`

- **Function:** `alignText('justifyRight')`

---

  

### 4. **Media & Links (สื่อและลิงก์)**

#### Insert Image (แทรกภาพ)

- **Button:** `<i class="bi bi-image"></i>`

- **Function:** `insertImage()`

- **Features:**

  - สามารถเลือกไฟล์ภาพจากเครื่อง

  - อัปโหลดไฟล์ไปยังเซิร์ฟเวอร์

  - แปลงเป็น base64 ถ้ายังไม่มี Note ID

#### Insert Link (แทรกลิงก์)

- **Button:** `<i class="bi bi-link"></i>`

- **Function:** `insertLink()`

- **Features:**

  - ขอให้ผู้ใช้ป้อน URL

  - สร้าง `<a>` tag พร้อม target="_blank"

#### Insert Table (แทรกตาราง)

- **Button:** `<i class="bi bi-table"></i>`

- **Function:** `insertTable()`

- **Features:**

  - สร้างตาราง 3x3 โดยค่าเริ่มต้น

  - รองรับการแก้ไขจำนวนแถว/คอลัมน์

---

### 5. **Undo/Redo (ยกเลิก/ทำซ้ำ)**

#### Undo (ยกเลิก)

- **Button:** `<i class="bi bi-arrow-counterclockwise"></i>`

- **Function:** `undoAction()`

- **Keyboard Shortcut:** `Ctrl+Z`

#### Redo (ทำซ้ำ)

- **Button:** `<i class="bi bi-arrow-clockwise"></i>`

- **Function:** `redoAction()`

- **Keyboard Shortcut:** `Ctrl+Y`

---

##  How It Works (วิธีการทำงาน)

### Step-by-Step Process

1. **User clicks button** (ผู้ใช้คลิกปุ่ม)

   ```html

   <button class="btn btn-sm ng-chip" onclick="formatText('bold')">

     <i class="bi bi-type-bold"></i>

   </button>

   ```

2. **formatText() function is called** (เรียกใช้ฟังก์ชัน)

   ```javascript

   window.formatText = function(command) {

     window.addClickFeedback(`[onclick="formatText('${command}')"]`);

     window.execCommand(command);

   };

   ```

3. **addClickFeedback() adds visual effect** (เพิ่มเอฟเฟกต์ภาพ)

   ```javascript

   window.addClickFeedback = function(buttonSelector) {

     const button = document.querySelector(buttonSelector);

     if (button) {

       button.style.transform = 'scale(0.96)';

       button.style.transition = 'transform 0.12s ease';

       setTimeout(() => { button.style.transform = ''; }, 100);

     }

   };

   ```

4. **execCommand() applies formatting** (ใช้การจัดรูปแบบ)

   ```javascript

   window.execCommand = function(command, value = null) {

     const editor = window.getEditor();

     if (!editor) return false;

     editor.focus();

     const result = document.execCommand(command, false, value);

     setTimeout(window.updateToolbarStates, 10);

     return result;

   };

   ```

5. **updateToolbarStates() highlights active button** (ไฮไลต์ปุ่มที่ใช้งาน)

   ```javascript

   window.updateToolbarStates = function() {

     const toolbar = document.querySelector('.editor-toolbar');

     if (!toolbar) return;

     const commandMap = {

       bold: "formatText('bold')",

       italic: "formatText('italic')",

       underline: "formatText('underline')",

       strikeThrough: "formatText('strikeThrough')"

     };

     Object.keys(commandMap).forEach(cmd => {

       try {

         const isActive = document.queryCommandState(cmd);

         const button = toolbar.querySelector(`[onclick="${commandMap[cmd]}"]`);

         if (button) button.classList.toggle('active', isActive);

       } catch(_) {}

     });

   };

   ```

---

  

##  File Locations

  

| Component | Location |

|-----------|----------|

| **HTML Template** | [app/templates/notes/note_editor_fragment.html](../../app/templates/notes/note_editor_fragment.html) |

| **JavaScript Logic** | [app/static/js/note_js/note_editor.js](../../app/static/js/note_js/note_editor.js) |

| **Toolbar HTML** | Lines 89-127 (note_editor_fragment.html) |

| **Formatting Functions** | Lines 328-490 (note_editor.js) |

  

---

  

##  Toolbar Structure

```html

<div class="p-2 mx-2 mt-2 mb-1 border-0 editor-toolbar ui-toolbar glass-panel">

  <div class="flex-wrap gap-2 d-flex align-items-center">

    <!-- Text Formatting -->

    <button class="btn btn-sm ng-chip" onclick="formatText('bold')">

      <i class="bi bi-type-bold"></i>

    </button>

    <button class="btn btn-sm ng-chip" onclick="formatText('italic')">

      <i class="bi bi-type-italic"></i>

    </button>

    <!-- ... more buttons ... -->

    <!-- Separator -->

    <div class="vr"></div>

    <!-- Lists -->

    <button class="btn btn-sm ng-chip" onclick="insertList('ul')">

      <i class="bi bi-list-ul"></i>

    </button>

    <!-- ... -->

  </div>

</div>

```

---

##  Key Points

1. **contenteditable="true"**: Editor div ที่อยู่ใน line 145 ของ note_editor_fragment.html

2. **document.execCommand()**: Native API ของ JavaScript ที่ใช้สำหรับจัดรูปแบบ

3. **document.queryCommandState()**: ตรวจสอบสถานะของ formatting (เช่น bold เปิดหรือปิด)

4. **Focus Management**: ต้องให้ editor มี focus ก่อนใช้ execCommand()

5. **Toolbar State**: ปุ่มที่ใช้งานจะถูก highlight ด้วย `.active` class

---

  

##  Troubleshooting

### Formatting ไม่ทำงาน

- ตรวจสอบว่า editor มี `contenteditable="true"`

- ตรวจสอบว่า JavaScript ได้ load เรียบร้อย

### Toolbar ไม่แสดง

- ตรวจสอบ CSS class: `editor-toolbar`, `ui-toolbar`, `glass-panel`

- ตรวจสอบว่า note_editor_fragment.html ได้ load

### Undo/Redo ไม่ทำงาน

- `document.execCommand('undo')` และ `document.execCommand('redo')` มีข้อจำกัด

- Browser ต้องรองรับ contenteditable

# aindoe1@gmail.com