#!/bin/bash
# Script to apply missing columns migration to production database

echo "🔧 Applying missing campaign_leads columns migration..."

# Run the migration
psql $DATABASE_URL -f backend/migrations/007_add_missing_campaign_leads_columns.sql

if [ $? -eq 0 ]; then
    echo "✅ Migration completed successfully!"
    echo "The following columns have been added/verified:"
    echo "  - lead_data (JSONB)"
    echo "  - snapshot (JSONB)"
    echo "  - is_deleted (BOOLEAN)"
else
    echo "❌ Migration failed. Please check the error above."
    exit 1
fi
