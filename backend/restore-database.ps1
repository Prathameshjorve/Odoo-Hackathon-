# PostgreSQL Database Restore Script
# Usage: .\restore-database.ps1 -BackupFile "D:\Odoo Hackathon\backend\db_backups\auth_api_backup_20251220_120000.sql"

param(
    [Parameter(Mandatory=$true)]
    [string]$BackupFile,
    [string]$Database = "auth_api",
    [string]$User = "postgres",
    [string]$Host = "localhost",
    [string]$Port = "5432"
)

# PostgreSQL path
$psqlPath = "C:\Program Files\PostgreSQL\18\bin\psql"

# Verify backup file exists
if (-not (Test-Path $BackupFile)) {
    Write-Host "✗ Backup file not found: $BackupFile" -ForegroundColor Red
    exit 1
}

try {
    Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Yellow
    Write-Host "   PostgreSQL Database Restore" -ForegroundColor Yellow
    Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Yellow
    
    Write-Host "`nRestore Details:" -ForegroundColor Cyan
    Write-Host "  Backup File: $BackupFile" -ForegroundColor Cyan
    Write-Host "  Database: $Database" -ForegroundColor Cyan
    Write-Host "  Host: $Host" -ForegroundColor Cyan
    Write-Host "  Port: $Port" -ForegroundColor Cyan
    
    # Get file size
    $fileSize = (Get-Item $BackupFile).Length / 1MB
    Write-Host "  Backup Size: $([Math]::Round($fileSize, 2)) MB" -ForegroundColor Cyan
    
    Write-Host "`n⚠ WARNING: This will overwrite the existing '$Database' database!" -ForegroundColor Yellow
    Write-Host "⚠ All current data will be replaced with data from the backup!" -ForegroundColor Yellow
    
    $response = Read-Host "`nDo you want to continue? (type 'yes' to confirm)"
    
    if ($response -ne "yes") {
        Write-Host "`n✗ Restore cancelled." -ForegroundColor Yellow
        exit 0
    }
    
    # Drop existing database
    Write-Host "`n[1/3] Dropping existing database '$Database'..." -ForegroundColor Gray
    & $psqlPath -h $Host -U $User -p $Port -c "DROP DATABASE IF EXISTS $Database;" 2>&1 | Out-Null
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "✗ Failed to drop database" -ForegroundColor Red
        exit 1
    }
    Write-Host "✓ Database dropped" -ForegroundColor Green
    
    # Create new database
    Write-Host "[2/3] Creating new database '$Database'..." -ForegroundColor Gray
    & $psqlPath -h $Host -U $User -p $Port -c "CREATE DATABASE $Database;" 2>&1 | Out-Null
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "✗ Failed to create database" -ForegroundColor Red
        exit 1
    }
    Write-Host "✓ Database created" -ForegroundColor Green
    
    # Restore from backup
    Write-Host "[3/3] Restoring data from backup..." -ForegroundColor Gray
    Write-Host "This may take a few moments..." -ForegroundColor Gray
    
    $startTime = Get-Date
    & $psqlPath -h $Host -U $User -p $Port -d $Database -f $BackupFile 2>&1 | Out-Null
    $endTime = Get-Date
    $duration = $endTime - $startTime
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Data restored successfully" -ForegroundColor Green
        
        # Count records
        Write-Host "`nVerifying restored data..." -ForegroundColor Cyan
        $result = & $psqlPath -h $Host -U $User -p $Port -d $Database -t -c `
            "SELECT 
                (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public') as table_count,
                (SELECT SUM(n_tup_ins + n_tup_upd + n_tup_del) FROM pg_stat_user_tables) as total_rows;" 2>&1
        
        Write-Host "Restore Duration: $([Math]::Round($duration.TotalSeconds, 2)) seconds" -ForegroundColor Gray
        
        Write-Host "`n✓ Restore completed successfully!" -ForegroundColor Green
        Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Green
        exit 0
    } else {
        Write-Host "`n✗ Restore failed with exit code $LASTEXITCODE" -ForegroundColor Red
        exit 1
    }
}
catch {
    Write-Host "✗ Error during restore: $_" -ForegroundColor Red
    exit 1
}
