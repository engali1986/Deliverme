# Generates all_screens.md combining source files under frontend/src/screens
# Usage: run from workspace root (where this script will write all_screens.md)

$screensDir = Join-Path -Path (Get-Location) -ChildPath 'frontend\src\screens'
if (-not (Test-Path $screensDir)) {
    Write-Error "Screens directory not found: $screensDir"
    exit 1
}

$mdPath = Join-Path -Path (Get-Location) -ChildPath 'all_screens.md'
# Create/overwrite the markdown file with UTF-8
"" | Out-File -FilePath $mdPath -Encoding utf8

# File extensions to include
$patterns = @('*.js','*.jsx','*.ts','*.tsx')

# Collect files deterministically
$files = @()
foreach ($p in $patterns) {
    $files += Get-ChildItem -Path $screensDir -Recurse -File -Filter $p -ErrorAction SilentlyContinue
}
$files = $files | Sort-Object FullName

if ($files.Count -eq 0) {
    Write-Warning "No source files found under $screensDir"
    exit 0
}

foreach ($file in $files) {
    try {
        $cwd = (Get-Location).Path
        $rel = $file.FullName.Substring($cwd.Length + 1) -replace '\\','/'

        # Heading with relative path
        "## $rel" | Out-File -FilePath $mdPath -Encoding utf8 -Append
        "" | Out-File -FilePath $mdPath -Encoding utf8 -Append

        # Fenced code block with language tag
        '```javascript' | Out-File -FilePath $mdPath -Encoding utf8 -Append

        # Append file contents as-is (preserve indentation/newlines)
        Get-Content -Path $file.FullName -Raw | Out-File -FilePath $mdPath -Encoding utf8 -Append

        "" | Out-File -FilePath $mdPath -Encoding utf8 -Append
        '```' | Out-File -FilePath $mdPath -Encoding utf8 -Append
        "" | Out-File -FilePath $mdPath -Encoding utf8 -Append

        Write-Host "Added: $rel"
    } catch {
        Write-Warning "Failed to add $($file.FullName): $_"
    }
}

Write-Host "Done. Markdown written to: $mdPath"
# Generates all_screens.md combining source files under frontend/src/screens
# Usage: run from workspace root (where this script will write all_screens.md)

$screensDir = Join-Path -Path (Get-Location) -ChildPath 'frontend\src\screens'
if (-not (Test-Path $screensDir)) {
    Write-Error "Screens directory not found: $screensDir"
    exit 1
}

$mdPath = Join-Path -Path (Get-Location) -ChildPath 'all_screens.md'
# Create/overwrite the markdown file with UTF-8
"" | Out-File -FilePath $mdPath -Encoding utf8

# File extensions to include
$patterns = @('*.js','*.jsx','*.ts','*.tsx')

# Collect files deterministically
$files = @()
foreach ($p in $patterns) {
    $files += Get-ChildItem -Path $screensDir -Recurse -File -Filter $p -ErrorAction SilentlyContinue
}
$files = $files | Sort-Object FullName

if ($files.Count -eq 0) {
    Write-Warning "No source files found under $screensDir"
    exit 0
}

foreach ($file in $files) {
    try {
        $cwd = (Get-Location).Path
        $rel = $file.FullName.Substring($cwd.Length + 1) -replace '\\','/'

        # Heading with relative path
        "## $rel" | Out-File -FilePath $mdPath -Encoding utf8 -Append
        "" | Out-File -FilePath $mdPath -Encoding utf8 -Append

        # Fenced code block with language tag
        "```javascript" | Out-File -FilePath $mdPath -Encoding utf8 -Append

        # Append file contents as-is (preserve indentation/newlines)
        Get-Content -Path $file.FullName -Raw | Out-File -FilePath $mdPath -Encoding utf8 -Append

        "" | Out-File -FilePath $mdPath -Encoding utf8 -Append
        "```" | Out-File -FilePath $mdPath -Encoding utf8 -Append
        "" | Out-File -FilePath $mdPath -Encoding utf8 -Append

        Write-Host "Added: $rel"
    } catch {
        Write-Warning "Failed to add $($file.FullName): $_"
    }
}

Write-Host "Done. Markdown written to: $mdPath"