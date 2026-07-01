#!/bin/sh
set -e

# Ensure the SQLite data directory exists (mounted as a volume in compose).
mkdir -p /app/prisma/data

# Create/upgrade the database schema on startup.
npx prisma db push --skip-generate

# Start the Next.js server on all interfaces.
exec npx next start -p 3000 -H 0.0.0.0
