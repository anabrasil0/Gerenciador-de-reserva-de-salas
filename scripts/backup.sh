#!/bin/bash
BACKUP_DIR="../backups"
DB_FILE="../database/bancoreservas_v2.db"

mkdir -p $BACKUP_DIR
cp $DB_FILE $BACKUP_DIR/banco_$(date +%Y%m%d_%H%M%S).db
echo "Backup realizado em $(date)"