Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  Starting NoteAlert – Smart Notes & Deadline Reminder" -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Launching server on http://localhost:5000 ..." -ForegroundColor Yellow
node backend/src/server.js
