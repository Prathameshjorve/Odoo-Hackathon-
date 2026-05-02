# PostgreSQL Setup - Step-by-Step Quick Start Guide

## ⚡ 5-Minute Express Setup

### For Users Who Just Want It Working:

**Step 1: Open PowerShell as Administrator**
- Press `Win + X`
- Select "Windows PowerShell (Admin)"

**Step 2: Run the Complete Setup**
```powershell
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope CurrentUser -Force
& "D:\Odoo Hackathon\backend\setup-postgresql-complete.ps1"
```

Wait for completion (should take 1-2 minutes).

**Step 3: Verify It Worked**
```powershell
& "D:\Odoo Hackathon\backend\verify-postgresql-setup.ps1"
```

Should show "✓ All critical checks passed!"

**Step 4: Start Your Backend**
```powershell
cd "D:\Odoo Hackathon\backend"
npm run dev
```

**Done!** Your PostgreSQL is now set up with data persistence.

---

## 📋 What Each Script Does

| Script | Purpose | When to Run |
|--------|---------|-------------|
| `setup-postgresql-complete.ps1` | One-time complete setup | First time only |
| `verify-postgresql-setup.ps1` | Check if everything works | Anytime to diagnose issues |
| `backup-database.ps1` | Create manual backup | Anytime manually |
| `setup-backup-scheduler.ps1` | Schedule automatic backups | Once, if you want auto backups |
| `restore-database.ps1` | Restore from backup | Only when you need to recover data |

---

## 🔍 What Gets Configured

### 1. PostgreSQL Service
- ✓ Set to start automatically with Windows
- ✓ Started and running now

### 2. Authentication (pg_hba.conf)
- ✓ No password needed on localhost
- ✓ Can connect directly: `psql -U postgres`

### 3. Performance (postgresql.conf)
- ✓ Optimized for development
- ✓ Connection limits set
- ✓ Memory settings configured

### 4. Data Persistence
- ✓ Data stored in: `C:\Program Files\PostgreSQL\18\data`
- ✓ Survives restarts
- ✓ Survives Windows reboot

### 5. Backup Capability
- ✓ Manual backups: `backup-database.ps1`
- ✓ Optional automatic daily backups at 2 AM
- ✓ Restore scripts included

---

## ✅ Quick Verification Tests

### Test 1: Is PostgreSQL Running?
```powershell
Get-Service -Name "postgresql-x64-18" | Select-Object Status
```
Expected: `Running`

### Test 2: Can I Connect?
```powershell
C:\Program Files\PostgreSQL\18\bin\psql -h localhost -U postgres -c "SELECT 1"
```
Expected: No error, shows `1`

### Test 3: Does Database Exist?
```powershell
C:\Program Files\PostgreSQL\18\bin\psql -h localhost -U postgres -d auth_api -c "\dt"
```
Expected: Tables listed (or "Did not find any relations" if new)

### Test 4: Will Data Persist?
```powershell
# 1. Insert test data
C:\Program Files\PostgreSQL\18\bin\psql -h localhost -U postgres -d auth_api -c `
  "CREATE TABLE IF NOT EXISTS test (id serial primary key, value text); INSERT INTO test (value) VALUES ('hello');"

# 2. Count rows
C:\Program Files\PostgreSQL\18\bin\psql -h localhost -U postgres -d auth_api -c "SELECT COUNT(*) FROM test;"
# Shows: 1

# 3. Restart PostgreSQL
Restart-Service -Name "postgresql-x64-18" -Force
Start-Sleep -Seconds 3

# 4. Count again
C:\Program Files\PostgreSQL\18\bin\psql -h localhost -U postgres -d auth_api -c "SELECT COUNT(*) FROM test;"
# Should still show: 1 (data persisted!)

# 5. Clean up
C:\Program Files\PostgreSQL\18\bin\psql -h localhost -U postgres -d auth_api -c "DROP TABLE test;"
```

---

## 🚀 Now Start Your Backend

### Option 1: Development Mode
```powershell
cd "D:\Odoo Hackathon\backend"
npm run dev
```

### Option 2: Production Mode
```powershell
cd "D:\Odoo Hackathon\backend"
npm start
```

Backend should start without database errors.

---

## 📁 Files Reference

All new files are in: `D:\Odoo Hackathon\backend\`

```
backend/
├── setup-postgresql-complete.ps1    ← Run this first (Admin)
├── verify-postgresql-setup.ps1       ← Run to check status
├── backup-database.ps1               ← Manual backup
├── restore-database.ps1              ← Restore from backup
├── setup-backup-scheduler.ps1        ← Schedule automatic backups (Admin)
├── POSTGRESQL_SETUP.md               ← Detailed documentation
├── QUICK_REFERENCE.md                ← Command reference
└── db_backups/                       ← Backup files stored here
    └── (backups created automatically)
```

---

## ⚠️ Common Issues & Quick Fixes

### "Connection refused"
```powershell
# Is it running?
Get-Service -Name "postgresql-x64-18"

# If not running, start it:
Start-Service -Name "postgresql-x64-18"
Start-Sleep -Seconds 3
```

### "Password authentication failed"
```powershell
# This means pg_hba.conf needs updating
# Just run the complete setup again:
& "D:\Odoo Hackathon\backend\setup-postgresql-complete.ps1"
```

### "Database auth_api does not exist"
```powershell
# Run your backend (it will create it):
cd "D:\Odoo Hackathon\backend"
npm run dev

# Or create manually:
C:\Program Files\PostgreSQL\18\bin\psql -h localhost -U postgres -c "CREATE DATABASE auth_api;"
```

### "Data disappeared after restart"
```powershell
# Check service startup type:
Get-Service -Name "postgresql-x64-18" | Select-Object StartType

# Should be "Automatic". If not:
Set-Service -Name "postgresql-x64-18" -StartupType Automatic

# Then run complete setup again:
& "D:\Odoo Hackathon\backend\setup-postgresql-complete.ps1"
```

### Backup script won't run
```powershell
# Fix PowerShell execution policy:
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope CurrentUser -Force

# Then test manually:
& "D:\Odoo Hackathon\backend\backup-database.ps1"
```

---

## 📊 Before vs After

### Before Setup
- ❌ Database password required
- ❌ Data lost on restart
- ❌ Manual backup process
- ❌ No automatic backups
- ❌ Performance not optimized

### After Setup
- ✅ No password needed (localhost)
- ✅ Data persists through restarts
- ✅ One-click manual backups
- ✅ Automatic daily backups (optional)
- ✅ Optimized for development

---

## 🎯 Next Steps

1. ✅ **Run setup** (already done or about to do)
2. ✅ **Verify it works** (run verify script)
3. ⏭️ **Start your backend** (npm run dev)
4. ⏭️ **Create test data** (via API or database)
5. ⏭️ **Restart to verify** (data still there)
6. ⏭️ (Optional) **Schedule backups** (run scheduler script)

---

## 📞 Support Resources

### Check Logs
PostgreSQL logs are at:
```
C:\Program Files\PostgreSQL\18\data\log\
```

View recent log:
```powershell
Get-ChildItem "C:\Program Files\PostgreSQL\18\data\log\" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
```

### Detailed Documentation
- [POSTGRESQL_SETUP.md](POSTGRESQL_SETUP.md) - Complete setup guide
- [QUICK_REFERENCE.md](QUICK_REFERENCE.md) - Command reference

### Common PostgreSQL Directories
```
Installation:  C:\Program Files\PostgreSQL\18\
Data:          C:\Program Files\PostgreSQL\18\data\
Backups:       D:\Odoo Hackathon\backend\db_backups\
Config Files:  C:\Program Files\PostgreSQL\18\data\
Logs:          C:\Program Files\PostgreSQL\18\data\log\
```

---

## 💾 Backup & Recovery

### Create a Backup
```powershell
& "D:\Odoo Hackathon\backend\backup-database.ps1"
```

Creates timestamped SQL file in `db_backups` folder.

### List Backups
```powershell
Get-ChildItem "D:\Odoo Hackathon\backend\db_backups\*.sql" | 
    Sort-Object LastWriteTime -Descending |
    Select-Object Name, @{Name="Size (MB)"; Expression={[Math]::Round($_.Length/1MB, 2)}}
```

### Restore from Backup
```powershell
# List available backups:
Get-ChildItem "D:\Odoo Hackathon\backend\db_backups\*.sql"

# Restore:
& "D:\Odoo Hackathon\backend\restore-database.ps1" `
  -BackupFile "D:\Odoo Hackathon\backend\db_backups\auth_api_backup_YYYYMMDD_HHMMSS.sql"
```

---

## 🔐 Production Considerations

This setup is optimized for **development**. For production:

1. **Change password** (remove trust auth):
   ```sql
   ALTER USER postgres WITH PASSWORD 'strong-password';
   ```

2. **Use environment variables** for database credentials

3. **Increase buffer settings** based on server specs

4. **Enable SSL/TLS** connections

5. **Set up regular backups** to external storage

6. **Monitor disk space** and connections

7. **Review logs regularly** for errors

---

## 🆘 Still Having Issues?

### Run Diagnostics
```powershell
& "D:\Odoo Hackathon\backend\verify-postgresql-setup.ps1"
```

This will show exactly what's wrong and what needs fixing.

### Check Service
```powershell
Get-Service -Name "postgresql-x64-18" -ErrorAction SilentlyContinue | 
  Select-Object Name, Status, StartType, DisplayName
```

### Test Connection
```powershell
C:\Program Files\PostgreSQL\18\bin\psql -h localhost -U postgres -c "SELECT NOW();"
```

If this works, PostgreSQL is running and accessible.

---

## 📝 Summary

**You now have:**
- ✅ Automatic PostgreSQL startup
- ✅ No password authentication (localhost)
- ✅ Persistent data storage
- ✅ Automatic backups (optional)
- ✅ Restore capability
- ✅ Performance optimized
- ✅ Verification tools
- ✅ Documentation

**Your backend can now:**
- ✓ Connect to PostgreSQL without issues
- ✓ Store data persistently
- ✓ Survive restarts
- ✓ Be backed up automatically

---

## 🚀 You're All Set!

Run your backend and start building:
```powershell
cd "D:\Odoo Hackathon\backend"
npm run dev
```

Data will persist. Backups are optional but recommended.

Happy coding! 🎉
