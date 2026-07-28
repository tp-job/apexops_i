## 1. Project Overview & Architecture

* **Frontend:** React, TypeScript, Tailwind CSS, shadcn/ui, Framer Motion (built on top of your existing HTML template).
* **Backend:** Node.js, Express.js, Prisma ORM.
* **Database:** PostgreSQL (pg).
* **Core Purpose:** A high-performance, minimalist workspace for tracking, managing, and monitoring tasks/issues with real-time feedback and smooth micro-interactions.

---

## 2. Database Schema (`prisma/schema.prisma`)

This schema covers workspaces, projects, users, issues (tickets), and comments.

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum Role {
  ADMIN
  MEMBER
}

enum IssueStatus {
  BACKLOG
  TODO
  IN_PROGRESS
  IN_REVIEW
  DONE
}

enum Priority {
  LOW
  MEDIUM
  HIGH
  URGENT
}

model User {
  id            String         @id @default(uuid())
  email         String         @unique
  name          String
  avatarUrl     String?
  workspaces    WorkspaceMember[]
  assignedIssues Issue[]       @relation("AssignedIssues")
  createdIssues  Issue[]       @relation("CreatedIssues")
  comments      Comment[]
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt
}

model Workspace {
  id          String            @id @default(uuid())
  name        String
  slug        String            @unique
  logo        String?
  members     WorkspaceMember[]
  projects    Project[]
  createdAt   DateTime          @default(now())
  updatedAt   DateTime          @updatedAt
}

model WorkspaceMember {
  id          String     @id @default(uuid())
  userId      String
  workspaceId String
  role        Role       @default(MEMBER)
  user        User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  workspace   Workspace  @relation(fields: [workspaceId], references: [id], onDelete: Cascade)

  @@unique([userId, workspaceId])
}

model Project {
  id          String     @id @default(uuid())
  name        String
  key         String     // e.g., "TRK" for ticket prefix TRK-1
  description String?
  workspaceId String
  workspace   Workspace  @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  issues      Issue[]
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt
}

model Issue {
  id          String       @id @default(uuid())
  identifier  String       // e.g., "TRK-101"
  title       String
  description String?
  status      IssueStatus  @default(BACKLOG)
  priority    Priority     @default(MEDIUM)
  projectId   String
  project     Project      @relation(fields: [projectId], references: [id], onDelete: Cascade)
  assigneeId  String?
  assignee    User?        @relation("AssignedIssues", fields: [assigneeId], references: [setNull], onDelete: SetNull)
  creatorId   String
  creator     User         @relation("CreatedIssues", fields: [creatorId], references: [id])
  comments    Comment[]
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt
}

model Comment {
  id        String   @id @default(uuid())
  content   String
  issueId   String
  issue     Issue    @relation(fields: [issueId], references: [id], onDelete: Cascade)
  authorId  String
  author    User     @relation(fields: [authorId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

```

---

## 3. Backend Setup (Node.js + Express + Prisma)

### Directory Structure

```text
backend/
├── prisma/
│   └── schema.prisma
├── src/
│   ├── controllers/
│   ├── routes/
│   ├── middleware/
│   └── server.ts
├── package.json
└── tsconfig.json

```

### Core Server Setup (`src/server.ts`)

```typescript
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

dotenv.config();

const app = express();
export const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

// Basic Route health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Import and mount routers here (e.g., issues, projects, workspaces)

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

```

---

## 4. Frontend Structure & Integration (React + Vite + Tailwind + shadcn)

### Directory Structure

```text
frontend/
├── src/
│   ├── components/
│   │   ├── ui/         # shadcn components
│   │   ├── sidebar.tsx
│   │   ├── kanban-board.tsx
│   │   └── issue-modal.tsx
│   ├── hooks/
│   ├── lib/
│   │   └── utils.ts    # cn helper
│   ├── pages/
│   │   ├── dashboard.tsx
│   │   └── project-view.tsx
│   ├── App.tsx
│   └── main.tsx

```

### Motion Integration Example (`src/components/kanban-card.tsx`)

Use Framer Motion to give your tickets a buttery-smooth entry and drag/layout transition feel:

```tsx
import React from 'react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';

interface IssueCardProps {
  id: string;
  identifier: string;
  title: string;
  priority: string;
  status: string;
}

export const KanbanCard: React.FC<IssueCardProps> = ({ identifier, title, priority }) => {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      whileHover={{ y: -2 }}
      className="p-4 rounded-xl bg-card border border-border/60 shadow-sm hover:shadow-md transition-shadow cursor-pointer flex flex-col gap-2"
    >
      <div className="flex items-center justify-between text-xs text-muted-foreground font-mono">
        <span>{identifier}</span>
        <Badge variant="outline" className="text-[10px] capitalize px-1.5 py-0">
          {priority.toLowerCase()}
        </Badge>
      </div>
      <p className="text-sm font-medium text-foreground line-clamp-2">{title}</p>
    </motion.div>
  );
};

```

---

## 5. Implementation Roadmap

1. **Database Initialization:** Run `npx prisma init`, paste the schema, and run `npx prisma migrate dev --name init`.
2. **REST API Development:** Build Express endpoints for creating projects, fetching workspaces, and moving issue states (`PATCH /api/issues/:id/status`).
3. **Template Adaptation:** Take your existing HTML template, break it down into modular React components (Navbar, Sidebar, Main Container), and style them using **Tailwind CSS** tokens.
4. **Interactive Polish:** Implement shadcn dialogs for issue creation and Framer Motion layout animations for fluid state transitions.