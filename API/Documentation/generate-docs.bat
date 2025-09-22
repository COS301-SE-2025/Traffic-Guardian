@echo off
REM Script to generate JSDoc documentation

REM Install required templates and plugins
echo Installing documentation dependencies...
call npm install docdash jsdoc-summarize --no-save

REM Run JSDoc with enhanced configuration
echo Generating JSDoc documentation...
call npx jsdoc -c jsdoc.json

REM Create index.html redirect in output root if it doesn't exist
echo Creating index redirect...
IF NOT EXIST "output\index.html" (
  echo ^<!DOCTYPE html^>^<html^>^<head^>^<meta http-equiv="refresh" content="0; url=./index.html"^>^</head^>^<body^>^</body^>^</html^> > output\index.html
)

echo Documentation generated in ./output directory
echo Open ./output/index.html in your browser to view
pause