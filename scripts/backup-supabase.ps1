<#
.SYNOPSIS
  Sichert die GlobeSIM-Datenbank (Supabase) als Dateien auf diesem Rechner.

.DESCRIPTION
  Schreibt zwei Dateien pro Lauf in den Ordner $OutDir:
    globesim-public-<Datum>.backup   Schema "public" (Tabellen, Funktionen, Rechte, Daten)
    globesim-auth-<Datum>.backup     Nutzerkonten (auth.users, auth.identities), nur Daten
  Behält die letzten $Keep Sicherungen, ältere werden gelöscht.

  Das Passwort steht NICHT in diesem Skript. Es kommt aus der Umgebungsvariable PGPASSWORD
  oder aus der Datei %APPDATA%\postgresql\pgpass.conf (Zeile: host:port:datenbank:benutzer:passwort).

  Nicht enthalten: Dateien im Supabase-Storage (Bucket blog-covers). Die Sicherung enthält
  personenbezogene Daten (E-Mail-Adressen, Passwort-Hashes): nur auf einem geschützten Laufwerk
  speichern, nie ins Git-Repo legen.

.EXAMPLE
  powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\backup-supabase.ps1
#>
[CmdletBinding()]
param(
    [string]$DbHost = "aws-0-eu-west-2.pooler.supabase.com",
    [int]$Port = 5432,
    [string]$DbUser = "postgres.eudayhixxtdydsyhdfds",
    [string]$DbName = "postgres",
    [string]$OutDir = (Join-Path $env:USERPROFILE "Backups\globesim"),
    [int]$Keep = 8
)

$ErrorActionPreference = "Stop"

function Find-PgTool([string]$Name) {
    $cmd = Get-Command $Name -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }
    $root = "C:\Program Files\PostgreSQL"
    if (Test-Path $root) {
        $candidates = Get-ChildItem $root -Directory |
            Sort-Object Name -Descending |
            ForEach-Object { Join-Path $_.FullName ("bin\" + $Name + ".exe") } |
            Where-Object { Test-Path $_ }
        if ($candidates) { return @($candidates)[0] }
    }
    throw "$Name nicht gefunden. Die PostgreSQL-Kommandozeilenwerkzeuge (Version 17 oder 18) installieren."
}

function Write-Log([string]$Message) {
    $line = "{0}  {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $Message
    Write-Host $line
    Add-Content -Path (Join-Path $OutDir "backup.log") -Value $line
}

New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

$pgpass = Join-Path $env:APPDATA "postgresql\pgpass.conf"
if (-not $env:PGPASSWORD -and -not (Test-Path $pgpass)) {
    throw "Kein Passwort gefunden. PGPASSWORD setzen oder $pgpass anlegen (host:port:datenbank:benutzer:passwort)."
}

$pgDump = Find-PgTool "pg_dump"
$pgRestore = Find-PgTool "pg_restore"
$stamp = Get-Date -Format "yyyy-MM-dd_HHmm"
$publicFile = Join-Path $OutDir "globesim-public-$stamp.backup"
$authFile = Join-Path $OutDir "globesim-auth-$stamp.backup"
$conn = @("--host=$DbHost", "--port=$Port", "--username=$DbUser", "--dbname=$DbName", "--no-password")

function Test-BackupFile([string]$Path) {
    if (-not (Test-Path $Path)) { throw "Datei fehlt: $Path" }
    if ((Get-Item $Path).Length -lt 2048) { throw "Datei ist auffällig klein: $Path" }
    & $pgRestore --list $Path | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "Datei ist nicht lesbar (pg_restore --list): $Path" }
}

try {
    Write-Log "Sicherung startet (public)"
    & $pgDump @conn --format=custom --no-owner --schema=public --file=$publicFile
    if ($LASTEXITCODE -ne 0) { throw "pg_dump (public) ist fehlgeschlagen." }
    Test-BackupFile $publicFile
    Write-Log ("public ok: {0} ({1:N1} MB)" -f $publicFile, ((Get-Item $publicFile).Length / 1MB))

    Write-Log "Sicherung startet (auth)"
    & $pgDump @conn --format=custom --no-owner --data-only --schema=auth --table=auth.users --table=auth.identities --file=$authFile
    if ($LASTEXITCODE -ne 0) {
        Write-Log "WARNUNG: Nutzerkonten (auth) konnten nicht gesichert werden. Die Sicherung von public ist vorhanden."
    } else {
        Test-BackupFile $authFile
        Write-Log ("auth ok: {0} ({1:N1} MB)" -f $authFile, ((Get-Item $authFile).Length / 1MB))
    }

    foreach ($prefix in @("globesim-public-", "globesim-auth-")) {
        Get-ChildItem $OutDir -Filter "$prefix*.backup" |
            Sort-Object LastWriteTime -Descending |
            Select-Object -Skip $Keep |
            Remove-Item -Force
    }
    Write-Log "Fertig."
}
catch {
    Write-Log ("FEHLER: " + $_.Exception.Message)
    exit 1
}
