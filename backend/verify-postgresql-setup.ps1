# PostgreSQL Setup Verification Script
# Run this to verify all configurations are correct
# Usage: .\verify-postgresql-setup.ps1

Write-Host "╔══════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║     PostgreSQL Setup Verification & Diagnostics        ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

$passCount = 0
$failCount = 0
$warnCount = 0

function Test-Item {
    param($condition, $passMsg, $failMsg, $level = "ERROR")
    
    if ($condition) {
        Write-Host "✓ $passMsg" -ForegroundColor Green
        $script:passCount++
        return $true
    } else {
        if ($level -eq "WARN") {
            Write-Host "⚠ $failMsg" -ForegroundColor Yellow
            $script:warnCount++
        } else {
            Write-Host "✗ $failMsg" -ForegroundColor Red
            $script:failCount++
        }
        return $false
    }
}

Write-Host "[1/8] Checking PostgreSQL Service..." -ForegroundColor Yellow
Write-Host ""

# Check service exists
$service = Get-Service -Name "postgresql-x64-18" -ErrorAction SilentlyContinue
Test-Item ($null -ne $service) `
    "PostgreSQL service 'postgresql-x64-18' is installed" `
    "PostgreSQL service 'postgresql-x64-18' not found (install PostgreSQL 18)"

if ($service) {
    # Check service running
    Test-Item ($service.Status -eq "Running") `
        "PostgreSQL service is running" `
        "PostgreSQL service is not running (run: Start-Service -Name 'postgresql-x64-18')" `
        "ERROR"
    
    # Check service startup type
    Test-Item ($service.StartType -eq "Automatic") `
        "PostgreSQL service startup type is Automatic" `
        "PostgreSQL service startup type is not Automatic (run: Set-Service -Name 'postgresql-x64-18' -StartupType Automatic)" `
        "WARN"
}

Write-Host ""
Write-Host "[2/8] Checking PostgreSQL Installation..." -ForegroundColor Yellow
Write-Host ""

# Check PostgreSQL installation directory
$pgInstall = Test-Path "C:\Program Files\PostgreSQL\18"
Test-Item $pgInstall `
    "PostgreSQL 18 installation found at C:\Program Files\PostgreSQL\18" `
    "PostgreSQL 18 installation not found"

# Check psql executable
$psqlPath = Test-Path "C:\Program Files\PostgreSQL\18\bin\psql"
Test-Item $psqlPath `
    "PostgreSQL psql client found" `
    "psql not found"

# Check pg_dump executable
$pgDumpPath = Test-Path "C:\Program Files\PostgreSQL\18\bin\pg_dump"
Test-Item $pgDumpPath `
    "PostgreSQL pg_dump utility found" `
    "pg_dump not found"

# Check data directory
$dataDir = Test-Path "C:\Program Files\PostgreSQL\18\data"
Test-Item $dataDir `
    "PostgreSQL data directory found" `
    "PostgreSQL data directory not found"

Write-Host ""
Write-Host "[3/8] Checking Port 5432..." -ForegroundColor Yellow
Write-Host ""

# Check if port 5432 is listening
$portCheck = netstat -ano 2>/dev/null | Select-String ":5432"
Test-Item ($null -ne $portCheck) `
    "Port 5432 is listening" `
    "Port 5432 is not listening (PostgreSQL may not be running)" `
    "WARN"

Write-Host ""
Write-Host "[4/8] Checking Configuration Files..." -ForegroundColor Yellow
Write-Host ""

# Check pg_hba.conf
$hbaPath = "C:\Program Files\PostgreSQL\18\data\pg_hba.conf"
$hbaExists = Test-Path $hbaPath
Test-Item $hbaExists `
    "pg_hba.conf found at $hbaPath" `
    "pg_hba.conf not found"

if ($hbaExists) {
    $hbaContent = Get-Content $hbaPath -Raw
    
    # Check for trust authentication
    $trustAuth = $hbaContent -match 'host\s+all\s+all\s+127\.0\.0\.1/32\s+trust'
    Test-Item $trustAuth `
        "pg_hba.conf has trust authentication for localhost" `
        "pg_hba.conf missing trust authentication (may need password)" `
        "WARN"
}

# Check postgresql.conf
$confPath = "C:\Program Files\PostgreSQL\18\data\postgresql.conf"
$confExists = Test-Path $confPath
Test-Item $confExists `
    "postgresql.conf found at $confPath" `
    "postgresql.conf not found"

if ($confExists) {
    $confContent = Get-Content $confPath
    
    # Check for key performance settings
    $maxConn = $confContent -match 'max_connections\s*=\s*\d+'
    Test-Item $maxConn `
        "postgresql.conf has max_connections setting" `
        "postgresql.conf missing max_connections" `
        "WARN"
    
    $sharedBuf = $confContent -match 'shared_buffers\s*='
    Test-Item $sharedBuf `
        "postgresql.conf has shared_buffers setting" `
        "postgresql.conf missing shared_buffers" `
        "WARN"
}

Write-Host ""
Write-Host "[5/8] Testing Database Connection..." -ForegroundColor Yellow
Write-Host ""

try {
    $psqlTest = & "C:\Program Files\PostgreSQL\18\bin\psql" -h localhost -U postgres -c "SELECT version();" 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Test-Item $true `
            "Can connect to PostgreSQL" `
            "Cannot connect to PostgreSQL"
        
        # Extract version
        $versionMatch = $psqlTest | Select-String "PostgreSQL"
        if ($versionMatch) {
            Write-Host "  Details: $versionMatch" -ForegroundColor Cyan
        }
    } else {
        Test-Item $false `
            "Can connect to PostgreSQL" `
            "Cannot connect to PostgreSQL (error: $($psqlTest -join ', '))"
    }
}
catch {
    Test-Item $false `
        "Can connect to PostgreSQL" `
        "Error connecting: $_"
}

Write-Host ""
Write-Host "[6/8] Checking auth_api Database..." -ForegroundColor Yellow
Write-Host ""

try {
    $dbList = & "C:\Program Files\PostgreSQL\18\bin\psql" -h localhost -U postgres -l 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        $dbExists = $dbList -match 'auth_api'
        Test-Item $dbExists `
            "auth_api database exists" `
            "auth_api database does not exist (will be created on first backend run)" `
            "WARN"
        
        if ($dbExists) {
            # Try to get table count
            try {
                $tableCount = & "C:\Program Files\PostgreSQL\18\bin\psql" -h localhost -U postgres -d auth_api -t -c `
                    "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public';" 2>&1
                
                if ($LASTEXITCODE -eq 0) {
                    $tableNum = $tableCount -replace '\s', ''
                    if ([int]$tableNum -gt 0) {
                        Write-Host "  Tables: $tableNum found" -ForegroundColor Green
                    } else {
                        Write-Host "  Tables: Database exists but is empty" -ForegroundColor Yellow
                    }
                }
            }
            catch {
                # Ignore if can't connect to specific database
            }
        }
    } else {
        Test-Item $false `
            "Can query databases" `
            "Cannot query databases"
    }
}
catch {
    Test-Item $false `
        "Can query databases" `
        "Error querying databases: $_"
}

Write-Host ""
Write-Host "[7/8] Checking Backup Infrastructure..." -ForegroundColor Yellow
Write-Host ""

# Check backup directory
$backupDir = "D:\Odoo Hackathon\backend\db_backups"
$backupDirExists = Test-Path $backupDir
Test-Item $backupDirExists `
    "Backup directory exists at $backupDir" `
    "Backup directory does not exist" `
    "WARN"

# Check backup scripts
$backupScript = "D:\Odoo Hackathon\backend\backup-database.ps1"
$backupScriptExists = Test-Path $backupScript
Test-Item $backupScriptExists `
    "backup-database.ps1 script found" `
    "backup-database.ps1 script not found" `
    "WARN"

$restoreScript = "D:\Odoo Hackathon\backend\restore-database.ps1"
$restoreScriptExists = Test-Path $restoreScript
Test-Item $restoreScriptExists `
    "restore-database.ps1 script found" `
    "restore-database.ps1 script not found" `
    "WARN"

# Check for scheduled task
try {
    $scheduledTask = Get-ScheduledTask -TaskName "PostgreSQL-Database-Backup-auth_api" -ErrorAction SilentlyContinue
    Test-Item ($null -ne $scheduledTask) `
        "PostgreSQL backup scheduled task is configured" `
        "PostgreSQL backup scheduled task is not configured (optional - run setup-backup-scheduler.ps1)" `
        "WARN"
}
catch {
    # Task may not exist, that's OK
}

Write-Host ""
Write-Host "[8/8] Checking Node.js Backend..." -ForegroundColor Yellow
Write-Host ""

# Check backend directory
$backendDir = "D:\Odoo Hackathon\backend"
Test-Item (Test-Path $backendDir) `
    "Backend directory found at $backendDir" `
    "Backend directory not found"

# Check .env file
$envFile = "D:\Odoo Hackathon\backend\.env"
Test-Item (Test-Path $envFile) `
    ".env file found" `
    ".env file not found (backend may fail to start)"

if (Test-Path $envFile) {
    $envContent = Get-Content $envFile
    
    # Check DATABASE_URL
    $dbUrl = $envContent | Select-String "DATABASE_URL"
    if ($dbUrl) {
        if ($dbUrl -match 'postgresql://postgres@localhost:5432/auth_api') {
            Write-Host "  DATABASE_URL is correctly configured" -ForegroundColor Green
        } else {
            Write-Host "  ⚠ DATABASE_URL may have unexpected format:" -ForegroundColor Yellow
            Write-Host "    $dbUrl" -ForegroundColor Yellow
        }
    }
}

# Check package.json
$packageJson = "D:\Odoo Hackathon\backend\package.json"
Test-Item (Test-Path $packageJson) `
    "package.json found" `
    "package.json not found (cannot run backend)"

Write-Host ""
Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║              VERIFICATION RESULTS                       ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════════╝" -ForegroundColor Cyan

$total = $passCount + $failCount + $warnCount

Write-Host ""
Write-Host "Summary:" -ForegroundColor White
Write-Host "  ✓ Passed: $passCount" -ForegroundColor Green
Write-Host "  ⚠ Warnings: $warnCount" -ForegroundColor Yellow
Write-Host "  ✗ Failed: $failCount" -ForegroundColor Red
Write-Host "  Total: $total" -ForegroundColor White

Write-Host ""

if ($failCount -eq 0) {
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Green
    Write-Host "✓ All critical checks passed! Your PostgreSQL is configured." -ForegroundColor Green
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Green
    Write-Host ""
    Write-Host "You can now run:" -ForegroundColor Cyan
    Write-Host "  cd D:\Odoo Hackathon\backend" -ForegroundColor White
    Write-Host "  npm run dev" -ForegroundColor White
    Write-Host ""
    exit 0
} else {
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Red
    Write-Host "✗ Some critical issues were found. Please fix them above." -ForegroundColor Red
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Red
    Write-Host ""
    if ($failCount -gt 0) {
        Write-Host "Critical Issues:" -ForegroundColor Red
        Write-Host "  1. Ensure PostgreSQL service is running" -ForegroundColor Red
        Write-Host "  2. Check that PostgreSQL is properly installed" -ForegroundColor Red
        Write-Host "  3. Run setup-postgresql-complete.ps1 if not already done" -ForegroundColor Red
    }
    Write-Host ""
    exit 1
}
