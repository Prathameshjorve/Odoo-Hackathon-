# PostgreSQL Complete Setup Script
# Run as Administrator to execute all setup steps
# Usage: .\setup-postgresql-complete.ps1

$ErrorActionPreference = "Stop"

Write-Host "╔════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   PostgreSQL Data Persistence Setup - Complete    ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Check if running as Administrator
$currentUser = [System.Security.Principal.WindowsIdentity]::GetCurrent()
$principal = New-Object System.Security.Principal.WindowsPrincipal($currentUser)
if (-not $principal.IsInRole([System.Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Host "✗ This script must be run as Administrator" -ForegroundColor Red
    Write-Host "Please run PowerShell as Administrator and try again." -ForegroundColor Red
    exit 1
}

# ============================================
# STEP 1: Verify PostgreSQL Service
# ============================================
Write-Host "[STEP 1/5] Verifying PostgreSQL Service..." -ForegroundColor Yellow
Write-Host ""

$service = Get-Service -Name "postgresql-x64-18" -ErrorAction SilentlyContinue
if (-not $service) {
    Write-Host "✗ PostgreSQL service 'postgresql-x64-18' not found" -ForegroundColor Red
    Write-Host "Please install PostgreSQL 18 and ensure the service is named 'postgresql-x64-18'" -ForegroundColor Red
    exit 1
}

Write-Host "Current Status: $($service.Status)" -ForegroundColor Cyan
Write-Host "Current StartType: $($service.StartType)" -ForegroundColor Cyan

if ($service.StartType -ne "Automatic") {
    Write-Host "Setting service to Automatic startup..." -ForegroundColor Yellow
    Set-Service -Name "postgresql-x64-18" -StartupType Automatic
    Write-Host "✓ Service set to Automatic" -ForegroundColor Green
} else {
    Write-Host "✓ Service already set to Automatic" -ForegroundColor Green
}

if ($service.Status -ne "Running") {
    Write-Host "Starting PostgreSQL service..." -ForegroundColor Yellow
    Start-Service -Name "postgresql-x64-18"
    Start-Sleep -Seconds 3
    Write-Host "✓ Service started" -ForegroundColor Green
} else {
    Write-Host "✓ Service already running" -ForegroundColor Green
}

Write-Host ""

# ============================================
# STEP 2: Configure pg_hba.conf
# ============================================
Write-Host "[STEP 2/5] Configuring pg_hba.conf..." -ForegroundColor Yellow
Write-Host ""

$hbaPath = "C:\Program Files\PostgreSQL\18\data\pg_hba.conf"

if (-not (Test-Path $hbaPath)) {
    Write-Host "✗ pg_hba.conf not found at: $hbaPath" -ForegroundColor Red
    Write-Host "PostgreSQL data directory may be in a different location." -ForegroundColor Yellow
    exit 1
}

# Backup
$backupPath = "$hbaPath.backup.$(Get-Date -Format 'yyyyMMdd_HHmmss')"
Copy-Item -Path $hbaPath -Destination $backupPath -Force
Write-Host "✓ Backup created: $backupPath" -ForegroundColor Green

# Read and update
Write-Host "Updating authentication settings..." -ForegroundColor Gray
$content = Get-Content $hbaPath -Raw

# Update authentication methods
$originalContent = $content
$content = $content -replace 'host\s+all\s+all\s+127\.0\.0\.1/32\s+md5', `
                           'host    all             all             127.0.0.1/32            trust'
$content = $content -replace 'host\s+all\s+all\s+::1/128\s+md5', `
                           'host    all             all             ::1/128                 trust'

# Ensure local trust entries exist
if ($content -notmatch 'local\s+all\s+postgres\s+trust') {
    $content += "`nlocal   all             postgres                                trust`n"
}
if ($content -notmatch 'local\s+all\s+all\s+trust') {
    $content += "local   all             all                                      trust`n"
}

$content | Set-Content $hbaPath -Force
Write-Host "✓ pg_hba.conf configured for trust authentication" -ForegroundColor Green
Write-Host ""

# ============================================
# STEP 3: Optimize postgresql.conf
# ============================================
Write-Host "[STEP 3/5] Optimizing postgresql.conf..." -ForegroundColor Yellow
Write-Host ""

$confPath = "C:\Program Files\PostgreSQL\18\data\postgresql.conf"

if (-not (Test-Path $confPath)) {
    Write-Host "✗ postgresql.conf not found at: $confPath" -ForegroundColor Red
    exit 1
}

# Backup
$backupPath = "$confPath.backup.$(Get-Date -Format 'yyyyMMdd_HHmmss')"
Copy-Item -Path $confPath -Destination $backupPath -Force
Write-Host "✓ Backup created: $backupPath" -ForegroundColor Green

# Read file
Write-Host "Updating configuration settings..." -ForegroundColor Gray
$content = Get-Content $confPath
$newContent = @()

# Settings to add/update
$settingsToAdd = @{
    'max_connections' = '200'
    'shared_buffers' = '256MB'
    'effective_cache_size' = '1GB'
    'work_mem' = '4MB'
    'maintenance_work_mem' = '64MB'
    'checkpoint_timeout' = '15min'
    'wal_buffers' = '16MB'
    'synchronous_commit' = 'on'
}

$addedSettings = @{}

foreach ($line in $content) {
    $skip = $false
    foreach ($setting in $settingsToAdd.Keys) {
        # Skip commented and uncommented versions of settings we're updating
        if ($line -match "^\s*#?\s*$setting\s*=") {
            $skip = $true
            $addedSettings[$setting] = $true
            break
        }
    }
    
    if (-not $skip) {
        $newContent += $line
    }
}

# Add our settings
$newContent += ""
$newContent += "# === Performance Settings ==="
foreach ($setting in $settingsToAdd.GetEnumerator()) {
    $newContent += "$($setting.Key) = $($setting.Value)"
}

$newContent | Set-Content $confPath -Force
Write-Host "✓ postgresql.conf optimized for development" -ForegroundColor Green
Write-Host ""

# Restart service to apply changes
Write-Host "Restarting PostgreSQL to apply configuration changes..." -ForegroundColor Yellow
Stop-Service -Name "postgresql-x64-18" -Force
Start-Sleep -Seconds 2
Start-Service -Name "postgresql-x64-18"
Start-Sleep -Seconds 3
Write-Host "✓ PostgreSQL restarted and configuration applied" -ForegroundColor Green
Write-Host ""

# ============================================
# STEP 4: Setup Backup Infrastructure
# ============================================
Write-Host "[STEP 4/5] Setting up backup infrastructure..." -ForegroundColor Yellow
Write-Host ""

$backupDir = "D:\Odoo Hackathon\backend\db_backups"
if (-not (Test-Path $backupDir)) {
    New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
    Write-Host "✓ Created backup directory: $backupDir" -ForegroundColor Green
} else {
    Write-Host "✓ Backup directory already exists: $backupDir" -ForegroundColor Green
}

# Check if backup scripts exist
$backupScript = "D:\Odoo Hackathon\backend\backup-database.ps1"
$restoreScript = "D:\Odoo Hackathon\backend\restore-database.ps1"

if ((Test-Path $backupScript) -and (Test-Path $restoreScript)) {
    Write-Host "✓ Backup scripts already exist" -ForegroundColor Green
} else {
    Write-Host "⚠ Backup scripts not found (will be created separately if needed)" -ForegroundColor Yellow
}

Write-Host ""

# ============================================
# STEP 5: Verify Connection
# ============================================
Write-Host "[STEP 5/5] Verifying connection and data persistence..." -ForegroundColor Yellow
Write-Host ""

$psqlPath = "C:\Program Files\PostgreSQL\18\bin\psql"

if (-not (Test-Path $psqlPath)) {
    Write-Host "✗ psql not found at: $psqlPath" -ForegroundColor Red
    exit 1
}

try {
    Write-Host "Testing PostgreSQL connection..." -ForegroundColor Gray
    $output = & $psqlPath -h localhost -U postgres -c "SELECT version();" 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Successfully connected to PostgreSQL" -ForegroundColor Green
        
        # Show PostgreSQL version
        $version = $output | Select-String -Pattern "PostgreSQL"
        if ($version) {
            Write-Host "  $version" -ForegroundColor Green
        }
        
        # Check if auth_api database exists
        $dbCheck = & $psqlPath -h localhost -U postgres -l 2>&1 | Select-String "auth_api"
        if ($dbCheck) {
            Write-Host "✓ Database 'auth_api' exists" -ForegroundColor Green
            
            # Try to count records if possible
            $tableCheck = & $psqlPath -h localhost -U postgres -d auth_api -c "\dt" 2>&1
            if ($tableCheck -and $tableCheck.Count -gt 2) {
                Write-Host "✓ Database has tables" -ForegroundColor Green
            }
        } else {
            Write-Host "⚠ Database 'auth_api' not found" -ForegroundColor Yellow
            Write-Host "  It will be created when you run 'npm run dev' in the backend" -ForegroundColor Yellow
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

Write-Host ""

# ============================================
# Completion Summary
# ============================================
Write-Host "╔════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║     ✓ PostgreSQL Setup Completed Successfully!    ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Host "Configuration Summary:" -ForegroundColor Cyan
Write-Host "  • PostgreSQL Service: Automatic startup enabled" -ForegroundColor Cyan
Write-Host "  • Authentication: Trust method (localhost)" -ForegroundColor Cyan
Write-Host "  • Performance: Optimized for development" -ForegroundColor Cyan
Write-Host "  • Backup Directory: $backupDir" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "  1. (Optional) Set up Task Scheduler for automatic backups:" -ForegroundColor Yellow
Write-Host "     & 'D:\Odoo Hackathon\backend\setup-backup-scheduler.ps1'" -ForegroundColor White
Write-Host ""
Write-Host "  2. Start your backend server:" -ForegroundColor Yellow
Write-Host "     cd 'D:\Odoo Hackathon\backend'" -ForegroundColor White
Write-Host "     npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "  3. Create test data and verify it persists after restart" -ForegroundColor Yellow
Write-Host ""
Write-Host "Useful Commands:" -ForegroundColor Cyan
Write-Host "  • Create backup:      & 'D:\Odoo Hackathon\backend\backup-database.ps1'" -ForegroundColor White
Write-Host "  • List backups:       Get-ChildItem 'D:\Odoo Hackathon\backend\db_backups'" -ForegroundColor White
Write-Host "  • Check DB connection: psql -h localhost -U postgres -l" -ForegroundColor White
Write-Host ""
