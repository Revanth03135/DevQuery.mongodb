#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Organize DevQuery documentation into ReadIt folder
.DESCRIPTION
    Moves all README and documentation files from root to ReadIt folder
.EXAMPLE
    .\organize-docs.ps1
#>

# Set strict mode
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# Get script directory
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$rootPath = $scriptPath  # Assuming script is in DevQuery.mongodb root

Write-Host "📚 DevQuery Documentation Organization Script" -ForegroundColor Cyan
Write-Host "=" * 50 -ForegroundColor Cyan
Write-Host ""

# Check if ReadIt folder exists
$readItPath = Join-Path $rootPath "ReadIt"
if (-not (Test-Path $readItPath)) {
    Write-Host "⚠️  ReadIt folder not found. Creating..." -ForegroundColor Yellow
    New-Item -ItemType Directory -Path $readItPath | Out-Null
    Write-Host "✅ ReadIt folder created" -ForegroundColor Green
} else {
    Write-Host "✅ ReadIt folder already exists" -ForegroundColor Green
}

Write-Host ""
Write-Host "Starting file migration..." -ForegroundColor Cyan
Write-Host ""

# Get all .md files in root
$mdFiles = Get-ChildItem -Path $rootPath -Filter "*.md" -File
$txtFiles = Get-ChildItem -Path $rootPath -Filter "START_HERE.txt" -File

$totalFiles = $mdFiles.Count + $txtFiles.Count
$movedFiles = 0
$skippedFiles = 0

# Move .md files
if ($mdFiles) {
    Write-Host "Moving Markdown files ($($mdFiles.Count) files)..." -ForegroundColor Cyan
    foreach ($file in $mdFiles) {
        try {
            $destinationPath = Join-Path $readItPath $file.Name
            
            # Skip if already in ReadIt
            if ($file.Directory.Name -eq "ReadIt") {
                Write-Host "  ⊘ Skipping: $($file.Name) (already in ReadIt)" -ForegroundColor Gray
                $skippedFiles++
                continue
            }
            
            Move-Item -Path $file.FullName -Destination $destinationPath -Force
            Write-Host "  ✅ Moved: $($file.Name)" -ForegroundColor Green
            $movedFiles++
        } catch {
            Write-Host "  ❌ Error moving $($file.Name): $_" -ForegroundColor Red
        }
    }
}

# Move START_HERE.txt
if ($txtFiles) {
    Write-Host ""
    Write-Host "Moving text files ($($txtFiles.Count) files)..." -ForegroundColor Cyan
    foreach ($file in $txtFiles) {
        try {
            $destinationPath = Join-Path $readItPath $file.Name
            Move-Item -Path $file.FullName -Destination $destinationPath -Force
            Write-Host "  ✅ Moved: $($file.Name)" -ForegroundColor Green
            $movedFiles++
        } catch {
            Write-Host "  ❌ Error moving $($file.Name): $_" -ForegroundColor Red
        }
    }
}

Write-Host ""
Write-Host "=" * 50 -ForegroundColor Cyan
Write-Host ""

# Verification
Write-Host "Verification:" -ForegroundColor Cyan
$readItCount = (Get-ChildItem -Path $readItPath -File).Count
Write-Host "  📁 Files in ReadIt: $readItCount" -ForegroundColor Cyan
Write-Host "  ✅ Files moved: $movedFiles" -ForegroundColor Green
Write-Host "  ⊘ Files skipped: $skippedFiles" -ForegroundColor Gray

Write-Host ""

# Check if INDEX.md exists in ReadIt
$indexPath = Join-Path $readItPath "INDEX.md"
if (Test-Path $indexPath) {
    Write-Host "  ✅ INDEX.md found in ReadIt" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  INDEX.md not found in ReadIt" -ForegroundColor Yellow
}

# Check if ORGANIZATION_GUIDE.md exists
$guidePath = Join-Path $readItPath "ORGANIZATION_GUIDE.md"
if (Test-Path $guidePath) {
    Write-Host "  ✅ ORGANIZATION_GUIDE.md found in ReadIt" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  ORGANIZATION_GUIDE.md not found in ReadIt" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=" * 50 -ForegroundColor Cyan
Write-Host "✅ Documentation organization complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📚 Start with: ReadIt/INDEX.md" -ForegroundColor Cyan
Write-Host ""
