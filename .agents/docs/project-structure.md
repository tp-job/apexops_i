# Project Structure

This document outlines the structure of the ApexOps project.

```
E:/ApexCore/ApexDev/PERN/apexops_i/
├───client/
│   ├───.gitignore
│   ├───eslint.config.js
│   ├───index.html
│   ├───package-lock.json
│   ├───package.json
│   ├───README.md
│   ├───tsconfig.app.json
│   ├───tsconfig.json
│   ├───tsconfig.node.json
│   ├───vite.config.ts
│   ├───node_modules/...
│   ├───public/
│   │   └───vite.svg
│   └───src/
│       ├───App.tsx
│       ├───main.tsx
│       ├───api/              # API base URL, auth headers, optional fetchWithAuth
│       │   ├───config.ts
│       │   └───client.ts
│       ├───assets/
│       ├───components/        # common/, layouts/, ui/<feature>/, charts/
│       ├───context/          # Auth, Theme, Toast
│       ├───hooks/            # useNoteStatsOverview, useCalendarEvents, useBugTrackerData, etc.
│       ├───layouts/
│       ├───pages/
│       ├───routes/
│       ├───services/         # api.ts (axios), auth.ts
│       ├───types/            # auth, notes, charts, api, calendar, bugTrackerApp
│       └───utils/            # error, offlineMock, calendarApi, calendarGrid, optimizationCalendar
├───docs/
│   ├───features.md
│   ├───overview.md
│   ├───project-structure.md
│   ├───theme-style.md
│   ├───backend/
│   │   ├───backend-process.md
│   │   └───backend-tech-stack.md
│   └───frontend/
│       ├───frontend-process.md
│       └───frontend-tech-stack.md
└───server/
    ├───package-lock.json
    ├───package.json
    ├───node_modules/...
    └───src/
        ├───server.js
        ├───models/
        │   └───TicketModel.js
        ├───routes/
        │   ├───logs.js
        │   └───tickets.js
        └───utils/
            └───db.js
```

## Root Directory

-   `client/`: Contains the frontend code for the project, built with React and Vite.
-   `docs/`: Contains project documentation.
-   `server/`: Contains the backend code for the project, built with Node.js and Express.

## `client/` Directory

-   `public/`: Contains public assets that are served directly by the web server.
-   `src/`: Contains the source code for the React application.
    -   `api/`: Shared API config (base URL, auth headers) and optional `fetchWithAuth`.
    -   `assets/`: Static assets (images, fonts).
    -   `components/`: Reusable UI (common/, layouts/, ui/feature folders/, charts/).
    -   `context/`: React context (Auth, Theme, Toast).
    -   `hooks/`: Data and UI hooks (e.g. useNoteStatsOverview, useCalendarEvents, useBugTrackerData).
    -   `layouts/`: Layout components.
    -   `pages/`: Route-level page components.
    -   `routes/`: Routing configuration.
    -   `services/`: Axios API (api.ts) and auth service (auth.ts).
    -   `types/`: Shared TypeScript types (auth, notes, charts, api, calendar).
    -   `utils/`: Utilities (error, offlineMock, calendarApi, calendarGrid).

## `docs/` Directory

-   `backend/`: Contains documentation related to the backend.
-   `frontend/`: Contains documentation related to the frontend.

## `server/` Directory

-   `src/`: Contains the source code for the Node.js server.
    -   `models/`: Contains database models.
    -   `routes/`: Contains API route definitions.
    -   `utils/`: Contains utility functions.
