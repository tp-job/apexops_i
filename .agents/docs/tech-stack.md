# 🛠️ ApexOps - Complete Tech Stack

## 📊 ภาพรวม Tech Stack

ApexOps ใช้ **PERN Stack** (PostgreSQL, Express, React, Node.js) พร้อม TypeScript และ Tailwind CSS

---

## 🎯 Architecture Overview

```
┌─────────────────┐
│   Frontend      │
│  React + TS     │
│  Tailwind CSS   │
│  Vite           │
└────────┬────────┘
         │ HTTP/REST API
         ▼
┌─────────────────┐
│   Backend        │
│  Express.js      │
│  Node.js         │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Database      │
│  PostgreSQL      │
└─────────────────┘
```

---

## 💻 Frontend Tech Stack

### Core Technologies

| Technology | Version | Purpose |
|------------|---------|---------|
| **React** | 19.1.1 | UI Framework |
| **TypeScript** | 5.9.3 | Type Safety |
| **Vite** | 7.1.12 | Build Tool & Dev Server |
| **React Router DOM** | 7.9.5 | Client-side Routing |

### Styling & UI

| Technology | Version | Purpose |
|------------|---------|---------|
| **Tailwind CSS** | 4.1.16 | Utility-first CSS Framework |
| **Lucide React** | 0.552.0 | Icon Library |
| **RemixIcon** | 4.7.0 | Additional Icons |

### Data Visualization

| Technology | Version | Purpose |
|------------|---------|---------|
| **Recharts** | 2.15.4 | Chart & Graph Library |

### HTTP Client

| Technology | Version | Purpose |
|------------|---------|---------|
| **Axios** | 1.13.1 | HTTP Client for API Calls |

### Development Tools

| Technology | Version | Purpose |
|------------|---------|---------|
| **ESLint** | 9.36.0 | Code Linting |
| **TypeScript ESLint** | 8.45.0 | TypeScript-specific Linting |
| **@vitejs/plugin-react-swc** | 4.1.0 | React Plugin for Vite (SWC) |

---

## ⚙️ Backend Tech Stack

### Core Technologies

| Technology | Version | Purpose |
|------------|---------|---------|
| **Node.js** | 18+ | JavaScript Runtime |
| **Express.js** | 5.1.0 | Web Framework |
| **PostgreSQL** | 14+ | Relational Database |

### Database

| Technology | Version | Purpose |
|------------|---------|---------|
| **pg (node-postgres)** | 8.16.3 | PostgreSQL Client Library |

### Authentication & Security

| Technology | Version | Purpose |
|------------|---------|---------|
| **jsonwebtoken** | 9.0.2 | JWT Token Generation & Verification |
| **bcryptjs** | 3.0.2 | Password Hashing |
| **cors** | 2.8.5 | Cross-Origin Resource Sharing |

### Utilities

| Technology | Version | Purpose |
|------------|---------|---------|
| **dotenv** | 16.6.1 | Environment Variables Management |
| **body-parser** | 2.2.0 | Request Body Parsing |
| **puppeteer** | 23.11.1 | Headless Browser (Console Logs) |

### Development Tools

| Technology | Version | Purpose |
|------------|---------|---------|
| **nodemon** | 3.1.10 | Auto-restart Server on Changes |

---

## 🗄️ Database

### PostgreSQL

- **Version**: 14+
- **Connection Pooling**: pg (node-postgres)
- **Tables**:
  - `users` - User accounts
  - `logs` - Application logs
  - `tickets` - Bug tracking tickets

---

## 📦 Package Managers

- **npm** - Node Package Manager
- **package.json** - Dependency Management

---

## 🚀 Build & Deployment

### Frontend Build
- **Build Tool**: Vite
- **Output**: `client/dist/`
- **Command**: `npm run build`

### Backend
- **Runtime**: Node.js
- **Process Manager**: (Optional) PM2
- **Command**: `npm start` (production) / `npm run dev` (development)

---

## 🔧 Development Tools

### Code Quality
- **ESLint** - JavaScript/TypeScript Linting
- **TypeScript** - Static Type Checking
- **Prettier** (Optional) - Code Formatting

### Version Control
- **Git** - Version Control System

---

## 🌐 Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

---

## 📱 Responsive Design

- **Mobile First**: Tailwind CSS responsive utilities
- **Breakpoints**: 
  - sm: 640px
  - md: 768px
  - lg: 1024px
  - xl: 1280px
  - 2xl: 1536px

---

## 🔐 Security

- **JWT Authentication**: Token-based authentication
- **Password Hashing**: bcryptjs (10 rounds)
- **CORS**: Configured for cross-origin requests
- **Environment Variables**: Sensitive data in `.env`

---

## 📚 Additional Libraries & Tools

### Frontend
- **React Context API** - State Management
- **React Hooks** - Functional Components
- **CSS Modules** - Scoped Styles (optional)

### Backend
- **Express Middleware** - Request/Response Processing
- **PostgreSQL Pool** - Database Connection Management

---

## 🎨 UI Libraries

- **Lucide React** - Modern Icon Set
- **RemixIcon** - Additional Icons
- **Tailwind CSS** - Utility-first CSS
- **Custom Theme** - Dark/Light Mode Support

---

## 📊 Monitoring & Debugging

- **Console Logging** - Server-side logging
- **Browser DevTools** - Client-side debugging
- **PostgreSQL Logs** - Database queries

---

## 🔄 Version Information

### Frontend Dependencies
```json
{
  "react": "^19.1.1",
  "react-dom": "^19.1.1",
  "typescript": "~5.9.3",
  "vite": "^7.1.12",
  "tailwindcss": "^4.1.16",
  "axios": "^1.13.1",
  "react-router-dom": "^7.9.5",
  "recharts": "^2.15.4"
}
```

### Backend Dependencies
```json
{
  "express": "^5.1.0",
  "pg": "^8.16.3",
  "jsonwebtoken": "^9.0.2",
  "bcryptjs": "^3.0.2",
  "puppeteer": "^23.11.1",
  "cors": "^2.8.5"
}
```

---

## 📖 Documentation References

- [Frontend Tech Stack Details](./frontend/frontend-tech-stack.md)
- [Backend Tech Stack Details](./backend/backend-tech-stack.md)
- [Installation Guide](./installation.md)
- [API Documentation](./api-documentation.md)

---

**Last Updated**: 2025-01-27

