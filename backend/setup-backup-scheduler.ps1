# Setup Task Scheduler for Automatic PostgreSQL Backups
# Run as Administrator
# Usage: .\setup-backup-scheduler.ps1

$ErrorActionPreference = "Stop"

Write-Host "╔════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║    Setup PostgreSQL Backup Task Scheduler         ║" -ForegroundColor Cyan
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

$taskName = "PostgreSQL-Database-Backup-auth_api"
$taskDescription = "Daily automatic backup of PostgreSQL auth_api database at 2:00 AM"
$backupScriptPath = "D:\Odoo Hackathon\backend\backup-database.ps1"
$logPath = "D:\Odoo Hackathon\backend\db_backups\backup_schedule.log"

# Verify backup script exists
if (-not (Test-Path $backupScriptPath)) {
    Write-Host "✗ Backup script not found at: $backupScriptPath" -ForegroundColor Red
    Write-Host "Please ensure backup-database.ps1 exists in the backend directory" -ForegroundColor Red
    exit 1
}

Write-Host "Configuration:" -ForegroundColor Cyan
Write-Host "  Task Name: $taskName" -ForegroundColor Cyan
Write-Host "  Schedule: Daily at 2:00 AM" -ForegroundColor Cyan
Write-Host "  Script: $backupScriptPath" -ForegroundColor Cyan
Write-Host ""

try {
    # Check if task already exists
    $existingTask = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
    if ($existingTask) {
        Write-Host "Task already exists. Removing it first..." -ForegroundColor Yellow
        Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
        Start-Sleep -Seconds 1
    }
    
    Write-Host "Creating scheduled task..." -ForegroundColor Gray
    
    # Create a scheduled task trigger (daily at 2 AM)
    $trigger = New-ScheduledTaskTrigger -Daily -At 2am -ErrorAction Stop
    
    # Create action to run the backup script
    $action = New-ScheduledTaskAction -Execute "powershell.exe" `
        -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$backupScriptPath`" >> `"$logPath`"" `
        -WorkingDirectory "D:\Odoo Hackathon\backend" `
        -ErrorAction Stop
    
    # Create task settings
    $settings = New-ScheduledTaskSettingsSet `
        -StartWhenAvailable `
        -RunOnlyIfNetworkAvailable `
        -MultipleInstances IgnoreNew `
        -ErrorAction Stop
    
    # Register the task (run as SYSTEM)
    Register-ScheduledTask -TaskName $taskName `
        -Trigger $trigger `
        -Action $action `
        -Settings $settings `
        -Description $taskDescription `
        -ErrorAction Stop | Out-Null
    
    Write-Host "✓ Scheduled task created successfully" -ForegroundColor Green
    Write-Host ""
    
    # Verify the task
    Write-Host "Verifying scheduled task..." -ForegroundColor Cyan
    $task = Get-ScheduledTask -TaskName $taskName
    
    Write-Host "  Task Name: $($task.TaskName)" -ForegroundColor Green
    Write-Host "  State: $($task.State)" -ForegroundColor Green
    Write-Host "  Author: $($task.Author)" -ForegroundColor Green
    Write-Host ""
    
    # Get trigger details
    $triggers = $task.Triggers
    if ($triggers) {
        foreach ($t in $triggers) {
            Write-Host "  Schedule Details:" -ForegroundColor Green
            Write-Host "    Type: $($t.CimClass.CimClassName)" -ForegroundColor Green
            if ($t.StartBoundary) {
                Write-Host "    Start Time: $($t.StartBoundary)" -ForegroundColor Green
            }
        }
    }
    
    Write-Host ""
    Write-Host "═════════════════════════════════════════════════" -ForegroundColor Green
    Write-Host "✓ Task Scheduler Setup Complete!" -ForegroundColor Green
    Write-Host "═════════════════════════════════════════════════" -ForegroundColor Green
    Write-Host ""
    
    Write-Host "Testing the backup script manually..." -ForegroundColor Yellow
    
    $response = Read-Host "Run backup now to test? (yes/no)"
    if ($response -eq "yes") {
        Write-Host "Running backup..." -ForegroundColor Gray
        & $backupScriptPath
        
        if ($?) {
            Write-Host "✓ Manual backup test completed successfully" -ForegroundColor Green
            
            # Check backup directory
            $backups = Get-ChildItem "D:\Odoo Hackathon\backend\db_backups\*.sql" 2>/dev/null | 
                Sort-Object LastWriteTime -Descending | Select-Object -First 1
            
            if ($backups) {
                Write-Host "✓ Latest backup: $($backups.Name)" -ForegroundColor Green
                $size = $backups.Length / 1MB
                Write-Host "  Size: $([Math]::Round($size, 2)) MB" -ForegroundColor Green
            }
        } else {
            Write-Host "⚠ Backup test had issues. Check the backup script." -ForegroundColor Yellow
        }
    }
    
    Write-Host ""
    Write-Host "Next Steps:" -ForegroundColor Cyan
    Write-Host "  • The backup will run automatically at 2:00 AM every day" -ForegroundColor Cyan
    Write-Host "  • Backups are stored in: D:\Odoo Hackathon\backend\db_backups" -ForegroundColor Cyan
    Write-Host "  • Old backups (>30 days) are automatically cleaned up" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Commands to manage the task:" -ForegroundColor Yellow
    Write-Host "  • View task: Get-ScheduledTask -TaskName '$taskName'" -ForegroundColor White
    Write-Host "  • Run now:   Start-ScheduledTask -TaskName '$taskName'" -ForegroundColor White
    Write-Host "  • Disable:   Disable-ScheduledTask -TaskName '$taskName'" -ForegroundColor White
    Write-Host "  • Enable:    Enable-ScheduledTask -TaskName '$taskName'" -ForegroundColor White
    Write-Host "  • Delete:    Unregister-ScheduledTask -TaskName '$taskName' -Confirm:\$false" -ForegroundColor White
    Write-Host ""
}
catch {
    Write-Host "✗ Error creating scheduled task:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}
