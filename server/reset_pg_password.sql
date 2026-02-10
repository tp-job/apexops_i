-- Reset PostgreSQL password to match .env file
-- Run this in pgAdmin Query Tool

ALTER USER postgres WITH PASSWORD '123456789';

-- Verify
SELECT 'Password changed successfully!' as status;

