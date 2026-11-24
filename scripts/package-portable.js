import fs from 'fs';
import path from 'path';

const rootDir = process.cwd();
const distDir = path.join(rootDir, 'dist');
const targetDir = 'C:\\Users\\jacek\\Downloads\\PowerKeeper_Studio_Offline';

console.log('Copying files from:', distDir);
console.log('Target directory:', targetDir);

// 1. Ensure target directory exists and is clean
if (fs.existsSync(targetDir)) {
  fs.rmSync(targetDir, { recursive: true, force: true });
}
fs.mkdirSync(targetDir, { recursive: true });

// Helper to copy recursively
function copyDirSync(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

copyDirSync(distDir, targetDir);

// 2. Create URUCHOM_POWERKEEPER.bat
const batContent = `@echo off
setlocal
cd /d "%~dp0"
title PowerKeeper Studio - Audyt BESS Offline
cls
echo =======================================================================
echo          PowerKeeper Studio - Audyt BESS (Wersja Portable / Offline)
echo =======================================================================
echo.
echo Uruchamianie aplikacji w Twojej domyslnej przegladarce...
echo.
echo Gdy zakonczysz prace, mozesz zamknac to okno konsoli.
echo.

powershell -NoProfile -ExecutionPolicy Bypass -Command "$port = 8080; while (Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue) { $port++ }; $url = 'http://127.0.0.1:' + $port + '/'; $listener = New-Object System.Net.HttpListener; $listener.Prefixes.Add($url); $listener.Start(); Write-Host ('Aplikacja otwarta pod adresem: ' + $url); Start-Process $url; while ($listener.IsListening) { $ctx = $listener.GetContext(); $path = $ctx.Request.Url.LocalPath.TrimStart('/'); if ([string]::IsNullOrWhiteSpace($path)) { $path = 'index.html' }; $file = Join-Path $PWD $path.Replace('/', [System.IO.Path]::DirectorySeparatorChar); if (Test-Path $file -PathType Leaf) { $bytes = [System.IO.File]::ReadAllBytes($file); $ext = [System.IO.Path]::GetExtension($file).ToLower(); $mime = 'application/octet-stream'; if ($ext -eq '.html') { $mime = 'text/html; charset=utf-8' } elseif ($ext -eq '.js') { $mime = 'application/javascript; charset=utf-8' } elseif ($ext -eq '.css') { $mime = 'text/css; charset=utf-8' } elseif ($ext -eq '.svg') { $mime = 'image/svg+xml' } elseif ($ext -eq '.csv') { $mime = 'text/csv; charset=utf-8' } elseif ($ext -eq '.json') { $mime = 'application/json' }; $ctx.Response.ContentType = $mime; $ctx.Response.ContentLength64 = $bytes.Length; $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length) } else { $ctx.Response.StatusCode = 404 }; $ctx.Response.Close() }"
`;

fs.writeFileSync(path.join(targetDir, 'URUCHOM_POWERKEEPER.bat'), batContent, 'utf8');
fs.writeFileSync(path.join(targetDir, 'URUCHOM_AUDYTOR.bat'), batContent, 'utf8');

// 3. Create URUCHOM_CICHY_START.vbs
const vbsContent = `Set WshShell = CreateObject("WScript.Shell")\nWshShell.Run "cmd /c URUCHOM_POWERKEEPER.bat", 0, False\n`;
fs.writeFileSync(path.join(targetDir, 'URUCHOM_CICHY_START.vbs'), vbsContent, 'utf8');

// 4. Create INSTRUKCJA_OBSLUGI.txt
const readmeContent = `========================================================================
 POWERKEEPER STUDIO - AUDYT BESS & PV (PORTABLE / WERSJA OFFLINE)
========================================================================

Ten folder zawiera pelna, w 100% autonomiczna wersje PowerKeeper Studio,
ktora dziala calkowicie bez internetu i bez instalowania zadnego oprogramowania!

JAK OTWORZYC APLIKACJE (2 PROSTE SPOSOBY):
------------------------------------------------------------------------
SPOSOB 1 (NAJPROSTSZY):
  Kliknij dwukrotnie bezposrednio w plik:
  -> index.html
  Aplikacja otworzy sie natychmiast w Twojej przegladarce (Chrome, Edge itp.)!
  Dzieki technologii Single-File wszystkie kalkulatory, profile i wykresy
  sa wbudowane bezposrednio w ten jeden plik.

SPOSOB 2 (PRZEZ LOKALNY LAUNCHER):
  Kliknij dwukrotnie w:
  -> URUCHOM_POWERKEEPER.bat (lub URUCHOM_AUDYTOR.bat)
  Uruchomi to lokalny serwer i otworzy aplikacje pod http://127.0.0.1:8080/

JAK PRZENIESC NA INNY KOMPUTER (PENDRIVE):
------------------------------------------------------------------------
Skopiuj caly ten folder "PowerKeeper_Studio_Offline" na pendrive lub dysk USB
i uruchom na dowolnym komputerze z systemem Windows / macOS / Linux.
========================================================================
`;
fs.writeFileSync(path.join(targetDir, 'INSTRUKCJA_OBSLUGI.txt'), readmeContent, 'utf8');

console.log('Successfully packaged portable folder at:', targetDir);
