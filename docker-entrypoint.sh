#!/bin/sh

set -e

echo "🚀 Starting AI Realtor Backend..."

# Run database migrations
echo "📦 Running database migrations..."
npx prisma migrate deploy

# Start the application
echo "🎯 Starting the application..."
exec node dist/main.js
