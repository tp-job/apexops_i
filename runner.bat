@echo off
REM Start the backend from the monorepo root (app/server is an npm workspace).
REM Dev (ts-node-dev, auto-reload):
call npm run dev:server
REM For production, build then run the compiled output instead:
REM   npm run build --workspace app/server
REM   node app\server\dist\server.js
