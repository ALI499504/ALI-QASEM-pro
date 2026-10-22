#!/bin/bash
# BFX Gold AI Bot — runner script
# هذا السكريبت يشغل البوت على GitHub Actions
echo "=== BFX Gold AI Bot Starting ==="
pip install MetaTrader5 pandas pandas-ta requests 2>/dev/null
python src/bot.py
echo "=== Done ==="
