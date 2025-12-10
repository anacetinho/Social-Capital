#!/bin/bash
# Database initialization script for Social Capital CRM

set -e

echo "🚀 Initializing Social Capital CRM Database..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  No .env file found. Copying from .env.example..."
    cp .env.example .env
    echo "⚠️  Please update .env with your configuration before running this script again."
    exit 1
fi

# Load environment variables
source .env

# Default values if not set
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}
DB_NAME=${DB_NAME:-socialcapital}
DB_USER=${DB_USER:-postgres}

echo "📊 Database Configuration:"
echo "  Host: $DB_HOST"
echo "  Port: $DB_PORT"
echo "  Database: $DB_NAME"
echo "  User: $DB_USER"

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL to be ready..."
until PGPASSWORD=$DB_PASSWORD psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -c '\q' 2>/dev/null; do
  echo "PostgreSQL is unavailable - sleeping"
  sleep 2
done
echo "✅ PostgreSQL is ready!"

# Create database if it doesn't exist
echo "📦 Creating database if not exists..."
PGPASSWORD=$DB_PASSWORD psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -tc "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME'" | grep -q 1 || \
PGPASSWORD=$DB_PASSWORD psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -c "CREATE DATABASE $DB_NAME"

# Run migrations
echo "🔄 Running database migrations..."
for migration in backend/src/db/migrations/*.sql; do
    if [ -f "$migration" ]; then
        echo "  Running: $(basename $migration)"
        PGPASSWORD=$DB_PASSWORD psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$migration"
    fi
done

echo "✅ Database migrations completed!"

# Ask if user wants to load demo data
read -p "📋 Load demo data? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "📊 Loading demo data..."
    cd backend && node src/db/seeders/demo-data.js && cd ..
    echo "✅ Demo data loaded!"
fi

echo "🎉 Database initialization complete!"
echo ""
echo "Next steps:"
echo "  1. Start the backend: cd backend && npm start"
echo "  2. Start the frontend: cd frontend && npm start"
echo "  3. Or use Docker: docker-compose up"
