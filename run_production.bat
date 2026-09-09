@echo off
title SCADA Predictive Operations Center - Production Deployment
echo ====================================================================
echo Starting SCADA Predictive Management System in Production Mode...
echo ====================================================================
cd /d C:\Users\Lenovo\.gemini\antigravity\scratch\predictive-scada-app
python start_production_server.py
pause
