#!/bin/sh
set -e

echo "Running database migrations..."
npx prisma migrate deploy 2>&1 || echo "Migration warning (may be first run)"

echo "Starting application..."
exec "$@"
