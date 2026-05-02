# PostgreSQL Permanent Data Persistence Setup Guide

This guide provides complete steps to configure PostgreSQL 18 for permanent data persistence on Windows.

## 📋 Table of Contents
1. [Step 1: Verify PostgreSQL Service](#step-1-verify-postgresql-service)
2. [Step 2: Configure pg_hba.conf](#step-2-configure-pg_hbaconf)
3. [Step 3: Optimize postgresql.conf](#step-3-optimize-postgresqlconf)
4. [Step 4: Create Backup Infrastructure](#step-4-create-backup-infrastructure)
5. [Step 5: Schedule Automated Backups](#step-5-schedule-automated-backups)
6. [Step 6: Verify Connection and Data Persistence](#step-6-verify-connection-and-data-persistence)

---

## Step 1: Verify PostgreSQL Service

### 1.1 Check Service Status
Open PowerShell as Administrator and run:

```powershell
# Get PostgreSQL service status
Get-Service -Name "postgresql-x64-18" | Select-Object Name, Status, StartType
```

**Expected output:**
```
Name                    Status   StartType
----                    ------   ---------
postgresql-x64-18       Running  Automatic
```

### 1.2 Set Service to Automatic Startup (if not already set)
```powershell
# Set PostgreSQL to start automatically
Set-Service -Name "postgresql-x64-18" -StartupType Automatic

# Verify it was set
Get-Service -Name "postgresql-x64-18" | Select-Object Name, Status, StartType
```

### 1.3 Start the Service (if not running)
```powershell
# Start the service
Start-Service -Name "postgresql-x64-18"

# Wait a moment and verify
Start-Sleep -Seconds 2
Get-Service -Name "postgresql-x64-18" | Select-Object Status
```

---

## Step 2: Configure pg_hba.conf

### 2.1 Locate pg_hba.conf
PostgreSQL 18 on Windows typically stores it at:
```
C:\Program Files\PostgreSQL\18\data\pg_hba.conf
```

### 2.2 Backup Current File
```powershell
# Backup the current file
Copy-Item -Path "C:\Program Files\PostgreSQL\18\data\pg_hba.conf" `
          -Destination "C:\Program Files\PostgreSQL\18\data\pg_hba.conf.backup.$(Get-Date -Format 'yyyyMMdd_HHmmss')" `
          -Force

# Verify backup
Get-ChildItem -Path "C:\Program Files\PostgreSQL\18\data\pg_hba.conf*"
```

### 2.3 Update pg_hba.conf
Replace the following section in `pg_hba.conf`:

**Remove these lines (if present):**
```
# TYPE  DATABASE        USER            ADDRESS                 METHOD
host    all             all             127.0.0.1/32            md5
host    all             all             ::1/128                 md5
```

**Add these lines instead:**
```
# TYPE  DATABASE        USER            ADDRESS                 METHOD
# Trust authentication on localhost for development
host    all             all             127.0.0.1/32            trust
host    all             all             ::1/128                 trust
local   all             postgres                                 trust
local   all             all                                      trust
```

### 2.4 PowerShell Script to Update pg_hba.conf
```powershell
$hbaPath = "C:\Program Files\PostgreSQL\18\data\pg_hba.conf"

# Read the file
$content = Get-Content $hbaPath

# Find and replace the host authentication lines
$content = $content -replace 'host\s+all\s+all\s+127\.0\.0\.1/32\s+md5', `
                           'host    all             all             127.0.0.1/32            trust'
$content = $content -replace 'host\s+all\s+all\s+::1/128\s+md5', `
                           'host    all             all             ::1/128                 trust'

# Write back
$content | Set-Content $hbaPath -Force

Write-Host "✓ pg_hba.conf updated successfully"
```

### 2.5 Reload Configuration
```powershell
# Stop PostgreSQL
Stop-Service -Name "postgresql-x64-18" -Force

# Wait for it to stop
Start-Sleep -Seconds 3

# Start it again to reload configuration
Start-Service -Name "postgresql-x64-18"

# Wait for it to start
Start-Sleep -Seconds 3

Write-Host "✓ PostgreSQL service reloaded"
```

---

## Step 3: Optimize postgresql.conf

### 3.1 Locate postgresql.conf
PostgreSQL 18 on Windows typically stores it at:
```
C:\Program Files\PostgreSQL\18\data\postgresql.conf
```

### 3.2 Backup Current File
```powershell
# Backup the current file
Copy-Item -Path "C:\Program Files\PostgreSQL\18\data\postgresql.conf" `
          -Destination "C:\Program Files\PostgreSQL\18\data\postgresql.conf.backup.$(Get-Date -Format 'yyyyMMdd_HHmmss')" `
          -Force

# Verify backup
Get-ChildItem -Path "C:\Program Files\PostgreSQL\18\data\postgresql.conf*"
```

### 3.3 Key Settings to Update in postgresql.conf

Find and update these settings (uncomment and modify as needed):

```ini
# Connection settings
listen_addresses = 'localhost'
port = 5432
max_connections = 200

# Memory settings (for development on typical Windows PC)
shared_buffers = 256MB
effective_cache_size = 1GB
work_mem = 4MB
maintenance_work_mem = 64MB

# Checkpoint settings for data safety
checkpoint_timeout = 15min
checkpoint_completion_target = 0.9
wal_buffers = 16MB

# Logging for debugging
log_statement = 'all'
log_duration = off
log_min_duration_statement = 1000

# Performance
synchronous_commit = on
random_page_cost = 1.1
effective_io_concurrency = 200
```

### 3.4 PowerShell Script to Update postgresql.conf
```powershell
$confPath = "C:\Program Files\PostgreSQL\18\data\postgresql.conf"

# Read the file
$content = Get-Content $confPath

# Function to update or add a setting
function Update-Setting {
    param($content, $setting, $value)
    
    # Try to find commented version
    if ($content -match "^#\s*$setting\s*=") {
        $content = $content -replace "^#\s*$setting\s*=.*", "$setting = $value"
    }
    # Try to find uncommented version
    elseif ($content -match "^$setting\s*=") {
        $content = $content -replace "^$setting\s*=.*", "$setting = $value"
    }
    
    return $content
}

# Update settings
$settings = @{
    'max_connections' = '200'
    'shared_buffers' = '256MB'
    'effective_cache_size' = '1GB'
    'work_mem' = '4MB'
    'maintenance_work_mem' = '64MB'
    'checkpoint_timeout' = '15min'
    'wal_buffers' = '16MB'
    'synchronous_commit' = 'on'
}

foreach ($setting in $settings.GetEnumerator()) {
    $content = Update-Setting $content $setting.Key $setting.Value
}

# Write back
$content | Set-Content $confPath -Force

Write-Host "✓ postgresql.conf updated successfully"
```

---

## Step 4: Create Backup Infrastructure

### 4.1 Create Backup Directory
```powershell
# Create backup directory
$backupDir = "D:\Odoo Hackathon\backend\db_backups"
if (-not (Test-Path $backupDir)) {
    New-Item -ItemType Directory -Path $backupDir | Out-Null
    Write-Host "✓ Created backup directory: $backupDir"
} else {
    Write-Host "✓ Backup directory already exists"
}

# Verify
Get-Item $backupDir | Select-Object FullName
```

### 4.2 Create Backup Script
Create file: `D:\Odoo Hackathon\backend\backup-database.ps1`

```powershell
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
            ForEach-Object { Write-Host "  - $($_.Name) ($([Math]::Round($_.Length/1MB, 2)) MB)" }
        
        # Clean up old backups (keep last 30 days)
        $cutoffDate = (Get-Date).AddDays(-30)
        Get-ChildItem $BackupDir -Filter "${Database}_backup_*.sql" | 
            Where-Object { $_.LastWriteTime -lt $cutoffDate } | 
            Remove-Item -Force
        
        exit 0
    } else {
        Write-Host "✗ Backup failed with exit code $LASTEXITCODE" -ForegroundColor Red
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
```

### 4.3 Create Restore Script
Create file: `D:\Odoo Hackathon\backend\restore-database.ps1`

```powershell
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
    Write-Host "Starting database restore from: $BackupFile" -ForegroundColor Green
    
    # Get file size
    $fileSize = (Get-Item $BackupFile).Length / 1MB
    Write-Host "Backup size: $([Math]::Round($fileSize, 2)) MB" -ForegroundColor Green
    
    Write-Host "`nWARNING: This will overwrite the existing '$Database' database!" -ForegroundColor Yellow
    $response = Read-Host "Do you want to continue? (yes/no)"
    
    if ($response -ne "yes") {
        Write-Host "Restore cancelled." -ForegroundColor Yellow
        exit 0
    }
    
    # Drop existing database
    Write-Host "`nDropping existing database..."
    & $psqlPath -h $Host -U $User -p $Port -c "DROP DATABASE IF EXISTS $Database;" 2>&1
    
    # Create new database
    Write-Host "Creating new database..."
    & $psqlPath -h $Host -U $User -p $Port -c "CREATE DATABASE $Database;" 2>&1
    
    # Restore from backup
    Write-Host "Restoring data..."
    & $psqlPath -h $Host -U $User -p $Port -d $Database -f $BackupFile 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n✓ Restore completed successfully" -ForegroundColor Green
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
```

---

## Step 5: Schedule Automated Backups

### 5.1 Create Task Scheduler Script
Create file: `D:\Odoo Hackathon\backend\setup-backup-scheduler.ps1`

```powershell
# Setup automated backup scheduling via Windows Task Scheduler
# Run this script as Administrator

$taskName = "PostgreSQL-Database-Backup-auth_api"
$taskDescription = "Daily backup of PostgreSQL auth_api database"
$backupScriptPath = "D:\Odoo Hackathon\backend\backup-database.ps1"
$logPath = "D:\Odoo Hackathon\backend\db_backups\backup_schedule.log"

try {
    # Create a scheduled task trigger (daily at 2 AM)
    $trigger = New-ScheduledTaskTrigger -Daily -At 2am -ErrorAction Stop
    
    # Create action to run the backup script
    $action = New-ScheduledTaskAction -Execute "powershell.exe" `
        -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$backupScriptPath`"" `
        -WorkingDirectory "D:\Odoo Hackathon\backend" `
        -ErrorAction Stop
    
    # Create task settings
    $settings = New-ScheduledTaskSettingsSet `
        -StartWhenAvailable `
        -RunOnlyIfNetworkAvailable `
        -ErrorAction Stop
    
    # Register the task
    Register-ScheduledTask -TaskName $taskName `
        -Trigger $trigger `
        -Action $action `
        -Settings $settings `
        -Description $taskDescription `
        -Force `
        -ErrorAction Stop
    
    Write-Host "✓ Scheduled task created: $taskName" -ForegroundColor Green
    Write-Host "  Schedule: Daily at 2:00 AM" -ForegroundColor Green
    Write-Host "  Script: $backupScriptPath" -ForegroundColor Green
    
    # Verify the task
    Write-Host "`nVerifying scheduled task..." -ForegroundColor Cyan
    $task = Get-ScheduledTask -TaskName $taskName
    Write-Host "Task Name: $($task.TaskName)" -ForegroundColor Cyan
    Write-Host "State: $($task.State)" -ForegroundColor Cyan
    Write-Host "Last Run: $($task.LastRunTime)" -ForegroundColor Cyan
    Write-Host "Last Result: $($task.LastTaskResult)" -ForegroundColor Cyan
    
}
catch {
    Write-Host "✗ Error creating scheduled task: $_" -ForegroundColor Red
    exit 1
}
```

### 5.2 Run Setup Scheduler Script
```powershell
# Run as Administrator
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope CurrentUser -Force
& "D:\Odoo Hackathon\backend\setup-backup-scheduler.ps1"
```

### 5.3 Verify Scheduled Task
```powershell
# List the scheduled task
Get-ScheduledTask -TaskName "PostgreSQL-Database-Backup-auth_api" | 
    Select-Object TaskName, State, Author

# Run the task manually to test
Start-ScheduledTask -TaskName "PostgreSQL-Database-Backup-auth_api"

# Wait a moment
Start-Sleep -Seconds 3

# Check if backup was created
Get-ChildItem "D:\Odoo Hackathon\backend\db_backups\*.sql" | 
    Sort-Object LastWriteTime -Descending | 
    Select-Object -First 5 |
    ForEach-Object { Write-Host "Latest backup: $($_.Name) ($([Math]::Round($_.Length/1MB, 2)) MB)" }
```

---

## Step 6: Verify Connection and Data Persistence

### 6.1 Verify PostgreSQL is Running
```powershell
# Check if PostgreSQL service is running
$service = Get-Service -Name "postgresql-x64-18"
Write-Host "PostgreSQL Service Status: $($service.Status)" -ForegroundColor Cyan
Write-Host "PostgreSQL Startup Type: $($service.StartType)" -ForegroundColor Cyan

# Check if port 5432 is listening
netstat -ano | findstr ":5432" | Out-Host
```

### 6.2 Test Database Connection
```powershell
# Connect and verify database exists
$psqlPath = "C:\Program Files\PostgreSQL\18\bin\psql"

Write-Host "Testing connection to PostgreSQL..." -ForegroundColor Cyan
& $psqlPath -h localhost -U postgres -c "\l" 2>&1 | 
    Select-String "auth_api"

if ($?) {
    Write-Host "✓ Successfully connected to PostgreSQL" -ForegroundColor Green
    Write-Host "✓ Database 'auth_api' exists" -ForegroundColor Green
} else {
    Write-Host "✗ Connection failed" -ForegroundColor Red
}
```

### 6.3 Check Node.js Backend Connection
```powershell
# Run from backend directory
cd "D:\Odoo Hackathon\backend"

# Clear any previous .env cache
Remove-Item -Path "node_modules\.cache" -Recurse -Force -ErrorAction SilentlyContinue

# Push database schema
$env:PGPASSWORD = ""
npx prisma db push --skip-generate

# Generate Prisma client
npx prisma generate
```

### 6.4 Test Data Persistence
```powershell
# Get a list of tables in auth_api database
$psqlPath = "C:\Program Files\PostgreSQL\18\bin\psql"

Write-Host "Tables in auth_api database:" -ForegroundColor Cyan
& $psqlPath -h localhost -U postgres -d auth_api -c "\dt" 2>&1

# Count records in main tables
Write-Host "`nRecord counts:" -ForegroundColor Cyan
& $psqlPath -h localhost -U postgres -d auth_api -c `
    "SELECT 
        (SELECT COUNT(*) FROM users) as users,
        (SELECT COUNT(*) FROM organizations) as organizations,
        (SELECT COUNT(*) FROM bookings) as bookings;" 2>&1
```

### 6.5 Verify Backup Directory
```powershell
# Check backup directory
$backupDir = "D:\Odoo Hackathon\backend\db_backups"
Write-Host "Backup Directory Contents:" -ForegroundColor Cyan
Get-ChildItem $backupDir -Filter "*.sql" | 
    Sort-Object LastWriteTime -Descending |
    Format-Table Name, @{Name="Size (MB)"; Expression={[Math]::Round($_.Length/1MB, 2)}}, LastWriteTime
```

---

## Complete Setup Automation Script

Create file: `D:\Odoo Hackathon\backend\setup-postgresql-complete.ps1`

Run this script to automate all configuration steps:

```powershell
# COMPLETE PostgreSQL Setup Script
# Run as Administrator
# Usage: .\setup-postgresql-complete.ps1

$ErrorActionPreference = "Stop"

Write-Host "╔════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   PostgreSQL Data Persistence Setup - Complete    ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════╝" -ForegroundColor Cyan

# ============================================
# STEP 1: Verify PostgreSQL Service
# ============================================
Write-Host "`n[STEP 1/5] Verifying PostgreSQL Service..." -ForegroundColor Yellow

$service = Get-Service -Name "postgresql-x64-18" -ErrorAction SilentlyContinue
if (-not $service) {
    Write-Host "✗ PostgreSQL service not found. Please install PostgreSQL 18." -ForegroundColor Red
    exit 1
}

if ($service.StartType -ne "Automatic") {
    Write-Host "Setting service to Automatic startup..."
    Set-Service -Name "postgresql-x64-18" -StartupType Automatic
}

if ($service.Status -ne "Running") {
    Write-Host "Starting PostgreSQL service..."
    Start-Service -Name "postgresql-x64-18"
    Start-Sleep -Seconds 3
}

Write-Host "✓ PostgreSQL Service Status: Running, StartType: Automatic" -ForegroundColor Green

# ============================================
# STEP 2: Configure pg_hba.conf
# ============================================
Write-Host "`n[STEP 2/5] Configuring pg_hba.conf..." -ForegroundColor Yellow

$hbaPath = "C:\Program Files\PostgreSQL\18\data\pg_hba.conf"

if (-not (Test-Path $hbaPath)) {
    Write-Host "✗ pg_hba.conf not found at $hbaPath" -ForegroundColor Red
    exit 1
}

# Backup
$backupPath = "$hbaPath.backup.$(Get-Date -Format 'yyyyMMdd_HHmmss')"
Copy-Item -Path $hbaPath -Destination $backupPath -Force
Write-Host "✓ Backup created: $backupPath" -ForegroundColor Green

# Read and update
$content = Get-Content $hbaPath -Raw

# Update authentication methods
$content = $content -replace 'host\s+all\s+all\s+127\.0\.0\.1/32\s+md5', `
                           'host    all             all             127.0.0.1/32            trust'
$content = $content -replace 'host\s+all\s+all\s+::1/128\s+md5', `
                           'host    all             all             ::1/128                 trust'

# Ensure local trust entries exist
if ($content -notmatch 'local\s+all\s+postgres\s+trust') {
    $content += "`nlocal   all             postgres                                trust"
}
if ($content -notmatch 'local\s+all\s+all\s+trust') {
    $content += "`nlocal   all             all                                      trust"
}

$content | Set-Content $hbaPath -Force
Write-Host "✓ pg_hba.conf updated for trust authentication" -ForegroundColor Green

# ============================================
# STEP 3: Optimize postgresql.conf
# ============================================
Write-Host "`n[STEP 3/5] Optimizing postgresql.conf..." -ForegroundColor Yellow

$confPath = "C:\Program Files\PostgreSQL\18\data\postgresql.conf"

if (-not (Test-Path $confPath)) {
    Write-Host "✗ postgresql.conf not found at $confPath" -ForegroundColor Red
    exit 1
}

# Backup
$backupPath = "$confPath.backup.$(Get-Date -Format 'yyyyMMdd_HHmmss')"
Copy-Item -Path $confPath -Destination $backupPath -Force
Write-Host "✓ Backup created: $backupPath" -ForegroundColor Green

# Read file
$content = Get-Content $confPath
$newContent = @()

foreach ($line in $content) {
    # Skip commented out versions of settings we're updating
    if ($line -match '^\s*#\s*(max_connections|shared_buffers|effective_cache_size|work_mem|maintenance_work_mem|checkpoint_timeout|wal_buffers|synchronous_commit)\s*=') {
        continue
    }
    # Skip uncommented versions we'll add
    if ($line -match '^\s*(max_connections|shared_buffers|effective_cache_size|work_mem|maintenance_work_mem|checkpoint_timeout|wal_buffers|synchronous_commit)\s*=') {
        continue
    }
    $newContent += $line
}

# Add our settings
$newContent += "`n# === Custom Performance Settings ==="
$newContent += "max_connections = 200"
$newContent += "shared_buffers = 256MB"
$newContent += "effective_cache_size = 1GB"
$newContent += "work_mem = 4MB"
$newContent += "maintenance_work_mem = 64MB"
$newContent += "checkpoint_timeout = 15min"
$newContent += "wal_buffers = 16MB"
$newContent += "synchronous_commit = on"

$newContent | Set-Content $confPath -Force
Write-Host "✓ postgresql.conf optimized for development" -ForegroundColor Green

# Restart service to apply changes
Write-Host "Restarting PostgreSQL to apply configuration changes..."
Stop-Service -Name "postgresql-x64-18" -Force
Start-Sleep -Seconds 2
Start-Service -Name "postgresql-x64-18"
Start-Sleep -Seconds 3
Write-Host "✓ PostgreSQL restarted" -ForegroundColor Green

# ============================================
# STEP 4: Setup Backup Infrastructure
# ============================================
Write-Host "`n[STEP 4/5] Setting up backup infrastructure..." -ForegroundColor Yellow

$backupDir = "D:\Odoo Hackathon\backend\db_backups"
if (-not (Test-Path $backupDir)) {
    New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
    Write-Host "✓ Created backup directory: $backupDir" -ForegroundColor Green
} else {
    Write-Host "✓ Backup directory exists: $backupDir" -ForegroundColor Green
}

# Backup scripts already exist, just verify
$backupScript = "D:\Odoo Hackathon\backend\backup-database.ps1"
if (Test-Path $backupScript) {
    Write-Host "✓ Backup script exists" -ForegroundColor Green
} else {
    Write-Host "⚠ Backup script not found (will be created separately)" -ForegroundColor Yellow
}

# ============================================
# STEP 5: Verify Connection
# ============================================
Write-Host "`n[STEP 5/5] Verifying connection and data persistence..." -ForegroundColor Yellow

$psqlPath = "C:\Program Files\PostgreSQL\18\bin\psql"

try {
    $output = & $psqlPath -h localhost -U postgres -c "SELECT version();" 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Successfully connected to PostgreSQL" -ForegroundColor Green
        
        # Check if auth_api database exists
        $dbCheck = & $psqlPath -h localhost -U postgres -l 2>&1 | Select-String "auth_api"
        if ($dbCheck) {
            Write-Host "✓ Database 'auth_api' exists" -ForegroundColor Green
        } else {
            Write-Host "⚠ Database 'auth_api' not found (will be created when backend runs)" -ForegroundColor Yellow
        }
    } else {
        Write-Host "✗ Connection failed" -ForegroundColor Red
        Write-Host $output -ForegroundColor Red
        exit 1
    }
}
catch {
    Write-Host "✗ Error testing connection: $_" -ForegroundColor Red
    exit 1
}

# ============================================
# Completion
# ============================================
Write-Host "`n╔════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║          ✓ Setup Complete Successfully!            ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════════════╝" -ForegroundColor Green

Write-Host "`nNext Steps:" -ForegroundColor Cyan
Write-Host "1. Set up Task Scheduler backup:"
Write-Host "   & 'D:\Odoo Hackathon\backend\setup-backup-scheduler.ps1'" -ForegroundColor White
Write-Host "`n2. Start your backend server:"
Write-Host "   cd 'D:\Odoo Hackathon\backend'" -ForegroundColor White
Write-Host "   npm run dev" -ForegroundColor White
Write-Host "`n3. Create test data and verify it persists after restart"
```

---

## Quick Reference Commands

### Check Service Status
```powershell
Get-Service -Name "postgresql-x64-18" | Select-Object Status, StartType
```

### Create Manual Backup
```powershell
& "D:\Odoo Hackathon\backend\backup-database.ps1"
```

### Restore from Backup
```powershell
& "D:\Odoo Hackathon\backend\restore-database.ps1" -BackupFile "D:\Odoo Hackathon\backend\db_backups\auth_api_backup_[timestamp].sql"
```

### Check Database Connection
```powershell
C:\Program Files\PostgreSQL\18\bin\psql -h localhost -U postgres -c "\l"
```

### View Database Tables
```powershell
C:\Program Files\PostgreSQL\18\bin\psql -h localhost -U postgres -d auth_api -c "\dt"
```

### Test Data Persistence
```powershell
C:\Program Files\PostgreSQL\18\bin\psql -h localhost -U postgres -d auth_api -c "SELECT COUNT(*) FROM users;"
```

---

## Troubleshooting

### Connection Refused
- Verify PostgreSQL service is running: `Get-Service postgresql-x64-18`
- Check port 5432 is listening: `netstat -ano | findstr ":5432"`
- Restart service: `Restart-Service -Name "postgresql-x64-18" -Force`

### Authentication Failed
- Verify pg_hba.conf has trust method for localhost
- Restart PostgreSQL after changing pg_hba.conf
- Check USER name is 'postgres'

### Data Lost After Restart
- Verify data directory is in default location: `C:\Program Files\PostgreSQL\18\data`
- Check sufficient disk space
- Review PostgreSQL logs: `C:\Program Files\PostgreSQL\18\data\pg_log`

### Backup Not Running
- Check scheduled task: `Get-ScheduledTask -TaskName "PostgreSQL-Database-Backup-auth_api"`
- Test script manually: `& "D:\Odoo Hackathon\backend\backup-database.ps1"`
- Check backup directory permissions

