# PostgreSQL Database Backup Script
# Usage: .\backup-database.ps1
# Scheduled to run daily via Task Scheduler

param(
    [string]$Database = "auth_api",
    [string]$User = "postgres",
    [string]$Host = "localhost",
    [string]$Port = "5432",
    [string]$BackupDir = "D:\Odoo Hackathon\backend\db_backups"
)

# Create timestamp
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupFile = "$BackupDir\${Database}_backup_${timestamp}.sql"

# Create backup directory if it doesn't exist
if (-not (Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
}

# PostgreSQL path
$pgDumpPath = "C:\Program Files\PostgreSQL\18\bin\pg_dump"
$pgPath = "C:\Program Files\PostgreSQL\18\bin"

# Set password environment variable for PostgreSQL (trust auth, so not needed)
$env:PGPASSWORD = ""

try {
    Write-Host "Starting database backup for '$Database'..." -ForegroundColor Green
    Write-Host "Backup file: $backupFile" -ForegroundColor Green
    Write-Host "Timestamp: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Gray
    
    # Run pg_dump
    & $pgDumpPath -h $Host -U $User -p $Port -d $Database -F p -v > $backupFile 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Backup completed successfully" -ForegroundColor Green
        
        # Get backup file size
        $fileSize = (Get-Item $backupFile).Length / 1MB
        Write-Host "Backup size: $([Math]::Round($fileSize, 2)) MB" -ForegroundColor Green
        
        # List recent backups
        Write-Host "`nRecent backups:" -ForegroundColor Cyan
        Get-ChildItem $BackupDir -Filter "${Database}_backup_*.sql" | 
            Sort-Object LastWriteTime -Descending | 
            Select-Object -First 5 | 
            ForEach-Object { 
                $size = $_.Length / 1MB
                Write-Host "  - $($_.Name) ($([Math]::Round($size, 2)) MB)" 
            }
        
        # Clean up old backups (keep last 30 days)
        Write-Host "`nCleaning up old backups (older than 30 days)..." -ForegroundColor Gray
        $cutoffDate = (Get-Date).AddDays(-30)
        $oldBackups = Get-ChildItem $BackupDir -Filter "${Database}_backup_*.sql" | 
            Where-Object { $_.LastWriteTime -lt $cutoffDate }
        
        if ($oldBackups) {
            $oldBackups | ForEach-Object { 
                Write-Host "  Deleting: $($_.Name)" -ForegroundColor Gray
                Remove-Item -Path $_.FullName -Force
            }
        } else {
            Write-Host "  No old backups to clean up" -ForegroundColor Gray
        }
        
        exit 0
    } else {
        Write-Host "✗ Backup failed with exit code $LASTEXITCODE" -ForegroundColor Red
        Get-Content $backupFile -ErrorAction SilentlyContinue | Write-Host -ForegroundColor Red
        exit 1
    }
}
catch {
    Write-Host "✗ Error during backup: $_" -ForegroundColor Red
    exit 1
}
finally {
    # Clear password
    $env:PGPASSWORD = ""
}
