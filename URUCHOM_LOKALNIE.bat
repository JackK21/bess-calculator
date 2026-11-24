@echo off
chcp 65001 >nul
title PowerKeeper Studio - Tryb Offline (Lokalny)
echo ===================================================================
echo   PowerKeeper BESS Audit Studio - Uruchamianie Lokalne (Offline)
echo   Działa w 100%% lokalnie, bez potrzeby połączenia z Internetem!
echo ===================================================================
echo.
echo [1/2] Otwieranie przeglądarki pod adresem http://localhost:4173 ...
start http://localhost:4173
echo [2/2] Start lokalnego serwera produkcyjnego (Ctrl+C aby zatrzymać)...
npx vite preview --port 4173 --host localhost
pause
