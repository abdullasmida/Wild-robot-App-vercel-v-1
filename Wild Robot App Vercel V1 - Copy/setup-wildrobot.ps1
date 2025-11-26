param(
    [string]$ProjectRoot = "D:\work\PROGRAMING\Wild Robot V1"
)

# 1) تأكيد إن فولدر المشروع موجود
if (-not (Test-Path $ProjectRoot)) {
    Write-Error "Project folder not found: $ProjectRoot"
    exit 1
}

Set-Location $ProjectRoot

# 2) فنكشن عامة لإنشاء ملف + إنشاء الفولدر الأب لو مش موجود
function Ensure-File {
    param(
        [Parameter(Mandatory)]
        [string]$Path,

        [Parameter(Mandatory)]
        [string]$Content
    )

    $dir = Split-Path $Path -Parent
    if ($dir -and -not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }

    Set-Content -Path $Path -Value $Content -Encoding UTF8
    Write-Host "Created/updated $Path" -ForegroundColor Cyan
}

# 3) مسارات الملفات
$readmePath    = Join-Path $ProjectRoot "README.md"
$docsRoot      = Join-Path $ProjectRoot "docs"
$overviewPath  = Join-Path $docsRoot   "PROJECT_OVERVIEW.md"
$dataModelPath = Join-Path $docsRoot   "DATA_MODEL.md"
$devNotesPath  = Join-Path $docsRoot   "DEV_NOTES.md"

# 4) محتوى README.md (مختصر وواضح)
$readmeContent = @"
# Wild Robot V1 — Gymnastics Player Evaluation

This project is a front-end prototype for evaluating gymnastics players
per branch, session and player. It runs fully in the browser (no backend).

## How to run

1. Open this folder in VS Code.
2. Install the Live Server extension.
3. Right-click Wild_Robot_fixed.html -> Open with Live Server.
"@

# 5) محتوى PROJECT_OVERVIEW.md
$projectOverviewContent = @"
# Project Overview — Wild Robot V1

Screens:
- Home (Branches)
- Sessions
- Roster
- Evaluation (Skills & Routine)
- Player Report
- Session Summary
"@

# 6) محتوى DATA_MODEL.md
$dataModelContent = @"
# Data Model — Wild Robot V1

- In-memory DB object:
  DB.branches -> sessions -> players -> devices -> skills

- LocalStorage key:
  wr_reports_v5 (stores saved report records).
"@

# 7) محتوى DEV_NOTES.md
$devNotesContent = @"
# Dev Notes — Wild Robot V1

TODO:
- Replace Skill A/B/C with real skills.
- Connect video URLs to storage (e.g. Supabase).
- Add authentication (coach / academy login).
"@

# 8) إنشاء الملفات فعلاً
Ensure-File -Path $readmePath    -Content $readmeContent
Ensure-File -Path $overviewPath  -Content $projectOverviewContent
Ensure-File -Path $dataModelPath -Content $dataModelContent
Ensure-File -Path $devNotesPath  -Content $devNotesContent

Write-Host "Done. Docs & README are ready." -ForegroundColor Green
