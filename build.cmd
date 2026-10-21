@echo off
setlocal
pushd "%~dp0"
if not exist node_modules (
  call npm install
  if errorlevel 1 (
    pause
    exit /b 1
  )
)
call npm run desktop:build
if errorlevel 1 pause
popd
