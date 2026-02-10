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
│       ├───index.css
│       ├───main.tsx
│       ├───assets/
│       │   └───react.svg
│       ├───components/
│       ├───context/
│       ├───layouts/
│       ├───pages/
│       ├───routes/
│       ├───styles/
│       └───types/
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
    -   `assets/`: Contains static assets like images and fonts.
    -   `components/`: Contains reusable React components.
    -   `context/`: Contains React context providers for state management.
    -   `layouts/`: Contains layout components that define the structure of pages.
    -   `pages/`: Contains the main pages of the application.
    -   `routes/`: Contains the routing configuration for the application.
    -   `styles/`: Contains global styles and CSS modules.
    -   `types/`: Contains TypeScript type definitions.

## `docs/` Directory

-   `backend/`: Contains documentation related to the backend.
-   `frontend/`: Contains documentation related to the frontend.

## `server/` Directory

-   `src/`: Contains the source code for the Node.js server.
    -   `models/`: Contains database models.
    -   `routes/`: Contains API route definitions.
    -   `utils/`: Contains utility functions.
