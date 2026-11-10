#!/bin/sh
# Kopia zapasowa bazy danych i wgranych zdjęć (wdrożenie Docker Compose).
# Użycie:   ./scripts/backup.sh [katalog_docelowy]
# Cron (codziennie 2:30):  30 2 * * * cd /opt/motopuls && ./scripts/backup.sh >> /var/log/motopuls-backup.log 2>&1
#
# Przywracanie bazy:
#   gunzip -c backups/db-RRRRMMDD-GGMMSS.sql.gz | docker compose exec -T db psql -U motopuls -d motopuls
# Przywracanie zdjęć:
#   docker compose exec -T app tar -xzf - -C /app/uploads < backups/uploads-RRRRMMDD-GGMMSS.tar.gz
set -eu

BACKUP_DIR="${1:-./backups}"
KEEP_DAYS="${KEEP_DAYS:-14}"
STAMP="$(date +%Y%m%d-%H%M%S)"

umask 077
mkdir -p "$BACKUP_DIR"

docker compose exec -T db pg_dump -U motopuls -d motopuls --clean --if-exists --no-owner | gzip > "$BACKUP_DIR/db-$STAMP.sql.gz"
docker compose exec -T app tar -czf - -C /app/uploads . > "$BACKUP_DIR/uploads-$STAMP.tar.gz"

# Pusta kopia oznacza błąd – nie zostawiamy jej jako „udanej”.
[ -s "$BACKUP_DIR/db-$STAMP.sql.gz" ] || { echo "Kopia bazy jest pusta" >&2; exit 1; }

find "$BACKUP_DIR" -type f \( -name 'db-*.sql.gz' -o -name 'uploads-*.tar.gz' \) -mtime +"$KEEP_DAYS" -delete

echo "$(date -Iseconds) kopia zapisana: $BACKUP_DIR/db-$STAMP.sql.gz"
# Kopie zawierają dane osobowe – przechowuj je zaszyfrowane i poza serwerem (np. restic / rclone crypt).
