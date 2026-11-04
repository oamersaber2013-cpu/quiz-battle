@echo off
setlocal
pushd "%~dp0"

echo [1/4] Type checking every workspace...
call npm run typecheck
if errorlevel 1 goto failed

echo [2/4] Running API and web regression tests...
call npm test
if errorlevel 1 goto failed

echo [3/4] Building production packages...
call npm run build
if errorlevel 1 goto failed

echo [4/4] Testing desktop and mobile against the production frontend...
set PLAYWRIGHT_USE_BUILD=1
call npm run test:e2e -w web -- --workers=2
if errorlevel 1 goto failed

echo Test Suite: PASSED
popd
exit /b 0

:failed
echo Test Suite: FAILED
popd
exit /b 1
