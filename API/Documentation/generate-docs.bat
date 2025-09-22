@echo off
REM Script to generate JSDoc documentation

REM Install docdash template if not already installed
call npm install docdash --no-save

REM Run JSDoc
echo Generating JSDoc documentation...
call npx jsdoc -c jsdoc.json

echo Documentation generated in ./output directory
pause