@echo off
cd /d "%~dp0socialshield-backend"
echo Installing requirements...
python -m pip install -r requirements.txt -q
echo Starting Social Shield at http://127.0.0.1:5000
python app.py
pause
