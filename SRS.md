# Software Requirements Specification (SRS)
# ApexOps — Bug & Log Management System

**Version:** 1.0  
**Last Updated:** 2026-02-17  
**Status:** Draft

---

## 1. Introduction

### 1.1 Purpose
This Software Requirements Specification (SRS) describes the functional and non-functional requirements for **ApexOps**, a web application for developers to manage console logs, track bugs via a ticket system (JIRA-style), and collaborate through chat and AI assistant features.

### 1.2 Scope
- **Product name:** ApexOps  
- **Product type:** Bug & Log Management System (web application)  
- **Target users:** Developers, development teams  
- **Main capabilities:** Log management, ticket (bug) tracking, dashboard analytics, notes, calendar, chat, AI chat

### 1.3 Definitions and Acronyms
| Term | Definition |
|------|------------|
| PERN | PostgreSQL, Express, React, Node.js |
| JWT | JSON Web Token |
| SRS | Software Requirements Specification |
| API | Application Programming Interface |

### 1.4 References
- [Overview](./docs/overview.md)
- [Features](./docs/features.md)
- [Tech Stack](./docs/tech-stack.md)
- [API Documentation](./docs/backend/api-documentation.md)
- [Installation Guide](./docs/installation.md)

---

## 2. Overall Description

### 2.1 Product Perspective
ApexOps is a standalone web application built on the PERN stack. It consists of:
- **Frontend:** React 19 + TypeScript + Vite + Tailwind CSS (single-page application)
- **Backend:** Node.js + Express 5 (REST API)
- **Database:** PostgreSQL (via Prisma ORM)

### 2.2 User Classes and Characteristics
| User Class | Description |
|------------|-------------|
| **Developer** | Uses logs, tickets, dashboard, notes, calendar, and chat |
| **Team member** | Same as developer; may be assignee/reporter on tickets |
| **Guest/Visitor** | Can view public homepage; must register/login for app features |

### 2.3 Operating Environment
- **Server:** Node.js 18+, PostgreSQL 14+
- **Client:** Modern browsers (Chrome, Firefox, Safari, Edge)
- **Network:** HTTP/HTTPS; API at configurable base URL (e.g. `http://localhost:3000`)

### 2.4 Design and Implementation Constraints
- Use of PERN stack (PostgreSQL, Express, React, Node.js)
- TypeScript for frontend and backend
- REST API (no GraphQL)
- JWT-based authentication with optional refresh tokens
- Responsive UI (mobile-first) with Tailwind CSS

### 2.5 Assumptions and Dependencies
- PostgreSQL is installed and accessible
- Node.js 18+ and npm are available
- Users have stable internet for real-time features
- AI chat depends on external AI API (if configured)
- Console log fetching uses Puppeteer (headless browser) on the server

---

## 3. System Features and Functional Requirements

### 3.1 Authentication and Authorization

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-AUTH-01 | The system shall allow user registration with name, email, and password. | High |
| FR-AUTH-02 | The system shall allow login with email and password and return JWT (and optionally refresh token). | High |
| FR-AUTH-03 | The system shall support token refresh and logout. | Medium |
| FR-AUTH-04 | The system shall provide a protected profile endpoint returning current user data. | High |
| FR-AUTH-05 | The system shall allow updating profile (e.g. name, phone, company, position, location, timezone, bio, avatar, language). | Medium |
| FR-AUTH-06 | The system shall allow updating user settings (notifications, 2FA, session timeout, etc.). | Low |
| FR-AUTH-07 | The system shall allow changing password when authenticated. | Medium |
| FR-AUTH-08 | The system shall hash passwords (e.g. bcrypt) and never store plain text. | High |
| FR-AUTH-09 | Protected routes shall require a valid JWT in the Authorization header. | High |

### 3.2 Logs Management

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-LOG-01 | The system shall allow listing logs (e.g. latest 100) with optional filtering. | High |
| FR-LOG-02 | The system shall allow filtering logs by level (info, warning, error). | High |
| FR-LOG-03 | The system shall allow creating a single log (level, message, source, stack). | High |
| FR-LOG-04 | The system shall support batch creation of logs. | Medium |
| FR-LOG-05 | The system shall allow retrieving a log by ID and deleting a log (or all logs). | Medium |
| FR-LOG-06 | The system shall provide log statistics (e.g. counts by level). | Medium |
| FR-LOG-07 | The system shall support fetching console logs from a given URL via a headless browser (e.g. Puppeteer) and persisting them. | Medium |

### 3.3 Ticket Management (Bug Tracking, JIRA-Style)

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-TKT-01 | The system shall allow creating a ticket with at least title and description. | High |
| FR-TKT-02 | The system shall support ticket status: open, in-progress, resolved, closed. | High |
| FR-TKT-03 | The system shall support priority: low, medium, high, critical. | High |
| FR-TKT-04 | The system shall allow assigning assignee and reporter (user or string). | High |
| FR-TKT-05 | The system shall support tags and related log IDs on a ticket. | Medium |
| FR-TKT-06 | The system shall allow updating a ticket (partial update). | High |
| FR-TKT-07 | The system shall allow deleting a ticket. | High |
| FR-TKT-08 | The system shall allow listing all tickets and getting ticket statistics. | High |

### 3.4 Notes Management

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-NOT-01 | The system shall allow authenticated users to create, read, update, and delete notes. | High |
| FR-NOT-02 | The system shall support note types (e.g. text, image, list, link) and optional fields (color, tags, imageUrl, linkUrl, checklistItems, quote). | Medium |
| FR-NOT-03 | The system shall support pinning notes and ordering by pinned and updated time. | Medium |
| FR-NOT-04 | The system shall provide note statistics (overview, by type, by color, daily/monthly, recent). | Low |
| FR-NOT-05 | The system shall provide calendar view data (notes by day for a given year/month). | Medium |

### 3.5 Dashboard and Analytics

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-DSH-01 | The system shall provide a dashboard with statistics for logs and tickets. | High |
| FR-DSH-02 | The system shall display charts/visualizations (e.g. Recharts) for trends. | High |
| FR-DSH-03 | The system shall support real-time or periodic updates of dashboard data. | Medium |

### 3.6 Chat and AI Chat

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-CHT-01 | The system shall provide a chat interface and list of users for conversation. | Medium |
| FR-CHT-02 | The system shall support sending and receiving messages (real-time or polled). | Medium |
| FR-CHT-03 | The system shall provide an AI chat endpoint that accepts user messages and returns AI-generated responses. | Medium |
| FR-CHT-04 | The system may persist or expose chat/AI message history as needed. | Low |

### 3.7 Console Monitor (Sessions)

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-CON-01 | The system shall allow creating and listing console monitor sessions (authenticated). | Low |
| FR-CON-02 | The system shall allow fetching logs and stats per session and clearing logs for a session. | Low |

### 3.8 Calendar

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-CAL-01 | The system shall provide a calendar view (e.g. month) with notes/activities per day. | Medium |
| FR-CAL-02 | The system shall support scheduling activities (UI; may integrate with notes or future events). | Low |

### 3.9 User Interface and Navigation

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-UI-01 | The system shall provide a public homepage and an auth page (login/register). | High |
| FR-UI-02 | The system shall provide layout-based routes: Dashboard, Bug Tracker, Chat, AI Chat, Account Settings, Notes, Note Editor, Calendar. | High |
| FR-UI-03 | The system shall provide error pages (e.g. 404, server error, service unavailable, gateway timeout). | Medium |
| FR-UI-04 | The system shall support dark and light theme with persistent preference. | Medium |
| FR-UI-05 | The system shall be responsive (mobile, tablet, desktop). | High |

---

## 4. External Interface Requirements

### 4.1 User Interfaces
- Web UI: React SPA with Tailwind CSS; responsive; support for dark/light theme (Sunset Gradient theme concept).
- Typography: Inter for UI, JetBrains Mono for code/terminal where applicable.

### 4.2 Hardware Interfaces
- No direct hardware interfaces; standard client/server over HTTP.

### 4.3 Software Interfaces
- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS 4, React Router, Axios, Recharts, MUI (Material UI) for calendar/forms where used.
- **Backend:** Node.js, Express 5, Prisma, PostgreSQL, JWT, bcryptjs, Puppeteer (console logs), CORS, Helmet.

### 4.4 Communication Interfaces
- REST API over HTTP/HTTPS; JSON request/response.
- Authentication: Bearer JWT in `Authorization` header.

---

## 5. Data Models (High-Level)

### 5.1 User
- id, firstName, lastName, email, password, phone, company, position, location, timezone, bio, avatarUrl, role, gender, birthDate, language, isActive, emailVerified, createdAt, updatedAt.
- Relations: UserSettings, Notes, Logs, RefreshTokens, assignedTickets, reportedTickets.

### 5.2 UserSettings
- userId, emailNotifications, pushNotifications, bugAlerts, weeklyReports, teamUpdates, twoFactorAuth, sessionTimeout, loginAlerts, profileVisibility, activityStatus, dataCollection, createdAt, updatedAt.

### 5.3 Log
- id, level, message, source, stack, userId (optional), createdAt.

### 5.4 Note
- id, userId, title, content, type, isPinned, color, tags (JSON), imageUrl, linkUrl, checklistItems (JSON), quote (JSON), createdAt, updatedAt.

### 5.5 Ticket
- id, title, description, status, priority, assignee, reporter, assigneeId, reporterId, tags (JSON), relatedLogs (JSON), createdAt, updatedAt.

### 5.6 RefreshToken
- id, userId, token, expiresAt, createdAt.

---

## 6. API Summary

| Area | Base Path | Main Operations |
|------|-----------|-----------------|
| Auth | `/api/auth` | POST register, login, refresh, logout; GET profile; PUT profile, settings, password |
| Logs | `/api/logs` | GET /, /stats, /:id; POST /, /batch; DELETE /, /:id |
| Tickets | `/api/tickets` | GET /, /stats, /:id; POST /; PUT /:id; DELETE /:id |
| Notes | `/api/notes` | GET /, /stats/overview, /calendar/:year/:month, /:id; POST /; PUT /:id; DELETE /:id |
| Console logs | `/api/console-logs` | POST /, /realtime; GET /script |
| Console monitor | `/api/console-monitor` | GET /sessions; POST /sessions; DELETE /sessions/:id; GET /logs/:id, /stats/:id; POST /clear/:id |
| AI | `/api/ai` | POST /chat; GET /status |
| Chat | `/api/chat` | GET /users (authenticated) |

---

## 7. Non-Functional Requirements

### 7.1 Performance
- Dashboard and list views shall load in a reasonable time (e.g. &lt; 3 seconds under normal load).
- Console log fetching may have a timeout (e.g. 30 seconds).

### 7.2 Security
- Passwords shall be hashed (e.g. bcrypt).
- Sensitive configuration in environment variables (e.g. JWT secret, DB URL).
- CORS and Helmet configured appropriately.

### 7.3 Availability
- Health check endpoint (e.g. `/`, `/api/health`) for monitoring.

### 7.4 Usability
- UI shall support dark/light theme and be responsive.
- Clear error messages and loading states where applicable.

### 7.5 Maintainability
- TypeScript used for type safety; modular backend (routes, middleware, schemas) and component-based frontend.

---

## 8. Acceptance Criteria (Summary)

- Users can register, login, and use JWT to access protected endpoints.
- Users can create, list, filter, and manage logs and tickets (CRUD, status, priority, assignee).
- Users can create, edit, and delete notes; view calendar data by month.
- Dashboard shows logs and ticket statistics and charts.
- Chat and AI chat endpoints are available and usable from the UI.
- Console logs can be fetched from a URL and stored.
- Application is responsive and supports theme toggle.
- API is documented (see docs/backend/api-documentation.md) and health check is available.

---

## 9. Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-17 | — | Initial SRS from project review |
