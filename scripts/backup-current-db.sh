#!/bin/bash
# Backup script untuk database saat ini
# Jalankan sebelum migration: bash scripts/backup-current-db.sh

BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DB_NAME="laundry_db"

mkdir -p $BACKUP_DIR

echo "🔄 Backing up current database..."

# Backup using mysqldump
mysqldump -u root -p $DB_NAME > "$BACKUP_DIR/laundry_db_backup_$TIMESTAMP.sql"

if [ $? -eq 0 ]; then
  echo "✅ Backup completed: $BACKUP_DIR/laundry_db_backup_$TIMESTAMP.sql"
else
  echo "❌ Backup failed!"
  exit 1
fi

# Also backup Prisma migrations
cp -r prisma/migrations "$BACKUP_DIR/migrations_backup_$TIMESTAMP"

echo "✅ All backups completed!"
