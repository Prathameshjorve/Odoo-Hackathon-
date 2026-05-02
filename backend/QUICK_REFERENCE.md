# PostgreSQL Setup - Quick Reference & Checklist

## Quick Start (5 minutes)

### Run This First (as Administrator in PowerShell):
```powershell
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope CurrentUser -Force
& "D:\Odoo Hackathon\backend\setup-postgresql-complete.ps1"
```

### Then (Optional - Schedule Automatic Backups):
```powershell
& "D:\Odoo Hackathon\backend\setup-backup-scheduler.ps1"
```

### Then (Start Your Backend):
```powershell
cd "D:\Odoo Hackathon\backend"
npm run dev
```

---

## Verification Checklist

### ✅ Step 1: Verify PostgreSQL Service
```powershell
# Run this to check service status
Get-Service -Name "postgresql-x64-18" | Select-Object Name, Status, StartType

# Expected output:
# Name                    Status   StartType
# ----                    ------   ---------
# postgresql-x64-18       Running  Automatic
```

### ✅ Step 2: Verify Port 5432 is Listening
```powershell
# Check if PostgreSQL is listening on port 5432
netstat -ano | findstr ":5432"

# Expected output should show port 5432 LISTENING
```

### ✅ Step 3: Test Database Connection
```powershell
# Connect to PostgreSQL
C:\Program Files\PostgreSQL\18\bin\psql -h localhost -U postgres -c "\l"

# Should list databases including 'auth_api'
```

### ✅ Step 4: Verify auth_api Database
```powershell
# List tables in auth_api
C:\Program Files\PostgreSQL\18\bin\psql -h localhost -U postgres -d auth_api -c "\dt"

# Should show tables (initially empty on first setup)
```

### ✅ Step 5: Test Connection with Node.js
```powershell
# From backend directory
cd "D:\Odoo Hackathon\backend"

# Test environment
npm run dev

# Should start without database connection errors
```

### ✅ Step 6: Create Test Data
```powershell
# Insert test data (example - register a user via API)
# Then verify it persists
C:\Program Files\PostgreSQL\18\bin\psql -h localhost -U postgres -d auth_api -c `
  "SELECT COUNT(*) FROM users;"
```

### ✅ Step 7: Verify Data Persistence
```powershell
# Stop and restart PostgreSQL
Stop-Service -Name "postgresql-x64-18" -Force
Start-Sleep -Seconds 2
Start-Service -Name "postgresql-x64-18"
Start-Sleep -Seconds 3

# Verify data still exists
C:\Program Files\PostgreSQL\18\bin\psql -h localhost -U postgres -d auth_api -c `
  "SELECT COUNT(*) FROM users;"

# Count should be the same as before restart
```

### ✅ Step 8: Verify Backups (if Task Scheduler configured)
```powershell
# Check backup directory
Get-ChildItem "D:\Odoo Hackathon\backend\db_backups\*.sql" | 
    Sort-Object LastWriteTime -Descending | 
    Select-Object -First 5

# Should show backup files
```

---

## Common Issues & Solutions

### Issue: "Connection refused" or "psql: error: could not connect to server"

**Solutions:**
1. Check if PostgreSQL is running:
   ```powershell
   Get-Service -Name "postgresql-x64-18" | Select-Object Status
   ```

2. Start the service:
   ```powershell
   Start-Service -Name "postgresql-x64-18"
   Start-Sleep -Seconds 3
   ```

3. Check if port 5432 is listening:
   ```powershell
   netstat -ano | findstr ":5432"
   ```

4. Restart PostgreSQL:
   ```powershell
   Restart-Service -Name "postgresql-x64-18" -Force
   ```

---

### Issue: "Password authentication failed for user postgres"

**Solutions:**
1. Verify pg_hba.conf has trust authentication:
   ```powershell
   # View authentication settings
   Get-Content "C:\Program Files\PostgreSQL\18\data\pg_hba.conf" | Select-String "host.*all.*all"
   
   # Should show "trust" method
   ```

2. Restart PostgreSQL after fixing pg_hba.conf:
   ```powershell
   Stop-Service -Name "postgresql-x64-18" -Force
   Start-Sleep -Seconds 2
   Start-Service -Name "postgresql-x64-18"
   Start-Sleep -Seconds 3
   ```

---

### Issue: "Database 'auth_api' does not exist"

**Solutions:**
1. Run backend to create database:
   ```powershell
   cd "D:\Odoo Hackathon\backend"
   npm run dev
   ```

2. Or create manually:
   ```powershell
   C:\Program Files\PostgreSQL\18\bin\psql -h localhost -U postgres -c "CREATE DATABASE auth_api;"
   ```

---

### Issue: "Data disappears after restart"

**Ensure this:**
1. PostgreSQL data is in default location:
   ```powershell
   Test-Path "C:\Program Files\PostgreSQL\18\data"
   ```

2. PostgreSQL service is set to Automatic:
   ```powershell
   Get-Service -Name "postgresql-x64-18" | Select-Object StartType
   
   # If not "Automatic", run:
   Set-Service -Name "postgresql-x64-18" -StartupType Automatic
   ```

3. Windows starts PostgreSQL on boot:
   ```powershell
   # Schedule service start at boot
   # Usually automatic, but verify with:
   Get-Service -Name "postgresql-x64-18" | Select-Object Status, StartType
   ```

---

## Useful PowerShell Commands

### Manage PostgreSQL Service
```powershell
# Check status
Get-Service -Name "postgresql-x64-18"

# Start
Start-Service -Name "postgresql-x64-18"

# Stop
Stop-Service -Name "postgresql-x64-18" -Force

# Restart
Restart-Service -Name "postgresql-x64-18" -Force

# Set to Automatic
Set-Service -Name "postgresql-x64-18" -StartupType Automatic

# Set to Manual
Set-Service -Name "postgresql-x64-18" -StartupType Manual
```

### Database Operations
```powershell
# List all databases
C:\Program Files\PostgreSQL\18\bin\psql -h localhost -U postgres -l

# Connect to auth_api
C:\Program Files\PostgreSQL\18\bin\psql -h localhost -U postgres -d auth_api

# Run SQL command
C:\Program Files\PostgreSQL\18\bin\psql -h localhost -U postgres -d auth_api -c "SELECT COUNT(*) FROM users;"

# View all tables
C:\Program Files\PostgreSQL\18\bin\psql -h localhost -U postgres -d auth_api -c "\dt"

# View table structure
C:\Program Files\PostgreSQL\18\bin\psql -h localhost -U postgres -d auth_api -c "\d+ users"
```

### Backup Operations
```powershell
# Create manual backup
& "D:\Odoo Hackathon\backend\backup-database.ps1"

# List backups
Get-ChildItem "D:\Odoo Hackathon\backend\db_backups\*.sql" | 
    Sort-Object LastWriteTime -Descending

# Restore from backup
& "D:\Odoo Hackathon\backend\restore-database.ps1" -BackupFile "path\to\backup.sql"

# Get backup size
(Get-Item "D:\Odoo Hackathon\backend\db_backups\auth_api_backup_*.sql" | 
    Sort-Object LastWriteTime -Descending | 
    Select-Object -First 1).Length / 1MB
```

### Task Scheduler
```powershell
# View backup task
Get-ScheduledTask -TaskName "PostgreSQL-Database-Backup-auth_api"

# Run backup task now
Start-ScheduledTask -TaskName "PostgreSQL-Database-Backup-auth_api"

# Disable backup task
Disable-ScheduledTask -TaskName "PostgreSQL-Database-Backup-auth_api"

# Enable backup task
Enable-ScheduledTask -TaskName "PostgreSQL-Database-Backup-auth_api"

# Delete backup task
Unregister-ScheduledTask -TaskName "PostgreSQL-Database-Backup-auth_api" -Confirm:$false
```

---

## Directory Reference

| Path | Purpose |
|------|---------|
| `C:\Program Files\PostgreSQL\18\` | PostgreSQL Installation |
| `C:\Program Files\PostgreSQL\18\data\` | PostgreSQL Data Directory |
| `C:\Program Files\PostgreSQL\18\bin\psql` | PostgreSQL Client |
| `C:\Program Files\PostgreSQL\18\bin\pg_dump` | Backup Tool |
| `D:\Odoo Hackathon\backend\` | Backend Project |
| `D:\Odoo Hackathon\backend\.env` | Environment Configuration |
| `D:\Odoo Hackathon\backend\db_backups\` | Backup Directory |
| `D:\Odoo Hackathon\backend\backup-database.ps1` | Backup Script |
| `D:\Odoo Hackathon\backend\restore-database.ps1` | Restore Script |
| `D:\Odoo Hackathon\backend\setup-postgresql-complete.ps1` | Setup Script |
| `D:\Odoo Hackathon\backend\setup-backup-scheduler.ps1` | Scheduler Setup Script |

---

## Configuration Files Reference

### pg_hba.conf Location
```
C:\Program Files\PostgreSQL\18\data\pg_hba.conf
```

**Trust authentication for localhost should look like:**
```
host    all             all             127.0.0.1/32            trust
host    all             all             ::1/128                 trust
local   all             postgres                                trust
local   all             all                                      trust
```

### postgresql.conf Location
```
C:\Program Files\PostgreSQL\18\data\postgresql.conf
```

**Key settings:**
```ini
listen_addresses = 'localhost'
port = 5432
max_connections = 200
shared_buffers = 256MB
synchronous_commit = on
```

### .env File Location
```
D:\Odoo Hackathon\backend\.env
```

**Should contain:**
```env
NODE_ENV=development
PORT=4000
DATABASE_URL="postgresql://postgres@localhost:5432/auth_api"
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_DAYS=30
```

---

## Data Persistence Verification

### Complete Test Procedure
```powershell
# 1. Check backend can connect
cd "D:\Odoo Hackathon\backend"
npm test

# 2. Create sample data (via API or database)
# 3. Verify data exists
C:\Program Files\PostgreSQL\18\bin\psql -h localhost -U postgres -d auth_api -c `
  "SELECT * FROM users LIMIT 5;"

# 4. Stop PostgreSQL
Stop-Service -Name "postgresql-x64-18" -Force

# 5. Wait
Start-Sleep -Seconds 3

# 6. Start PostgreSQL
Start-Service -Name "postgresql-x64-18"
Start-Sleep -Seconds 3

# 7. Verify data still exists
C:\Program Files\PostgreSQL\18\bin\psql -h localhost -U postgres -d auth_api -c `
  "SELECT * FROM users LIMIT 5;"

# 8. Data should be identical - persistence verified!
```

---

## Performance Tuning Notes

The setup includes these performance optimizations for development:

- **max_connections = 200** - Sufficient for development
- **shared_buffers = 256MB** - Reasonable for development workloads
- **effective_cache_size = 1GB** - Helps query planner
- **work_mem = 4MB** - Per-operation memory
- **maintenance_work_mem = 64MB** - For maintenance operations
- **synchronous_commit = on** - Data safety (important for persistence)

For production environments, adjust these values based on your server specifications.

