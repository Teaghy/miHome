@echo off
setlocal
pushd "%~dp0"
where pnpm >nul 2>nul
if errorlevel 1 (
  echo Please install pnpm 10.32.1 first. See README.md.
  pause
  exit /b 1
)
call pnpm install --frozen-lockfile
if errorlevel 1 (
  pause
  exit /b 1
)
call pnpm run desktop:build
if errorlevel 1 pause
popd
