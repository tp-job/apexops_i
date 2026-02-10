# 💻 Frontend Tech Stack — ApexOps

## 🎯 ภาพรวม

Frontend ของ ApexOps ใช้ **React.js 19 + TypeScript + Tailwind CSS 4**  
เน้นความเร็วและ UI ที่ดูเป็น **Dark/Light Theme**  
ใช้ Vite เป็น build tool ที่เร็วมาก

---

## 🧠 เทคโนโลยีหลัก

### Core Framework

| เทคโนโลยี | เวอร์ชัน | หน้าที่ |
|-------------|---------|----------|
| **React** | 19.1.1 | UI Framework |
| **React DOM** | 19.1.1 | React DOM Renderer |
| **TypeScript** | 5.9.3 | Type Safety |

### Build Tools

| เทคโนโลยี | เวอร์ชัน | หน้าที่ |
|-------------|---------|----------|
| **Vite** | 7.1.12 | Build Tool & Dev Server |
| **@vitejs/plugin-react-swc** | 4.1.0 | React Plugin (SWC) |

### Styling

| เทคโนโลยี | เวอร์ชัน | หน้าที่ |
|-------------|---------|----------|
| **Tailwind CSS** | 4.1.16 | Utility-first CSS Framework |
| **@tailwindcss/vite** | 4.1.16 | Tailwind Vite Plugin |

### Routing

| เทคโนโลยี | เวอร์ชัน | หน้าที่ |
|-------------|---------|----------|
| **React Router DOM** | 7.9.5 | Client-side Routing |

### HTTP Client

| เทคโนโลยี | เวอร์ชัน | หน้าที่ |
|-------------|---------|----------|
| **Axios** | 1.13.1 | HTTP Client for API Calls |

### Icons

| เทคโนโลยี | เวอร์ชัน | หน้าที่ |
|-------------|---------|----------|
| **Lucide React** | 0.552.0 | Modern Icon Library |
| **RemixIcon** | 4.7.0 | Additional Icon Set |

### Data Visualization

| เทคโนโลยี | เวอร์ชัน | หน้าที่ |
|-------------|---------|----------|
| **Recharts** | 2.15.4 | Chart & Graph Library |

### Development Tools

| เทคโนโลยี | เวอร์ชัน | หน้าที่ |
|-------------|---------|----------|
| **ESLint** | 9.36.0 | Code Linting |
| **TypeScript ESLint** | 8.45.0 | TypeScript-specific Linting |
| **@types/react** | 19.1.16 | React Type Definitions |
| **@types/react-dom** | 19.1.9 | React DOM Type Definitions |
| **@types/node** | 24.6.0 | Node.js Type Definitions |

---

## 📁 โครงสร้าง Frontend

```
client/
├── src/
│   ├── components/          # Reusable components
│   │   ├── charts/         # Chart components
│   │   ├── common/         # Common components
│   │   └── layouts/        # Layout components
│   ├── context/            # React Context providers
│   ├── layouts/            # Layout components
│   ├── pages/              # Page components
│   ├── routes/             # Route configuration
│   ├── services/           # API services
│   ├── styles/             # Global styles
│   └── types/              # TypeScript types
├── public/                 # Public assets
├── vite.config.ts          # Vite configuration
├── tsconfig.json           # TypeScript configuration
└── package.json            # Dependencies
```

---

## 🎨 Styling Approach

### Tailwind CSS
- **Utility-first** - ใช้ utility classes
- **Custom Theme** - กำหนด theme colors
- **Dark Mode** - รองรับ dark/light mode
- **Responsive** - ใช้ responsive utilities

### CSS Modules (Optional)
- **Scoped Styles** - styles ที่ไม่ชนกัน
- **Component Styles** - styles สำหรับแต่ละ component

---

## ⚡ Performance Features

### Vite
- **Fast HMR** - Hot Module Replacement ที่เร็วมาก
- **Optimized Build** - build ที่ optimize แล้ว
- **Code Splitting** - แบ่ง code อัตโนมัติ

### React
- **Functional Components** - ใช้ functional components
- **Hooks** - ใช้ React Hooks
- **Context API** - จัดการ state ด้วย Context

---

## 🔧 Development Setup

### Install Dependencies
```bash
cd client
npm install
```

### Development Server
```bash
npm run dev
```

### Build for Production
```bash
npm run build
```

### Preview Production Build
```bash
npm run preview
```

### Lint Code
```bash
npm run lint
```

---

## 📦 Key Dependencies

### Production Dependencies
```json
{
  "react": "^19.1.1",
  "react-dom": "^19.1.1",
  "react-router-dom": "^7.9.5",
  "axios": "^1.13.1",
  "tailwindcss": "^4.1.16",
  "lucide-react": "^0.552.0",
  "recharts": "^2.15.4",
  "remixicon": "^4.7.0"
}
```

### Development Dependencies
```json
{
  "vite": "^7.1.12",
  "@vitejs/plugin-react-swc": "^4.1.0",
  "typescript": "~5.9.3",
  "@types/react": "^19.1.16",
  "@types/react-dom": "^19.1.9",
  "eslint": "^9.36.0",
  "typescript-eslint": "^8.45.0"
}
```

---

## 🎯 Best Practices

### TypeScript
- ใช้ TypeScript สำหรับ type safety
- กำหนด types สำหรับ props และ state
- ใช้ interfaces สำหรับ type definitions

### Component Structure
- แยก components ออกเป็น reusable components
- ใช้ functional components และ hooks
- จัดการ state ด้วย useState และ useContext

### Code Organization
- จัดระเบียบไฟล์ตาม features
- ใช้ absolute imports (@/ alias)
- แยก business logic จาก UI

---

## 📚 Additional Resources

- [React Documentation](https://react.dev/)
- [TypeScript Documentation](https://www.typescriptlang.org/)
- [Vite Documentation](https://vite.dev/)
- [Tailwind CSS Documentation](https://tailwindcss.com/)
- [React Router Documentation](https://reactrouter.com/)

---

**Last Updated**: 2025-01-27

