#!/usr/bin/env python3
"""Run the installer from the latest build without relying on a chat path."""
import runpy
from pathlib import Path
target=Path(__file__).resolve().parents[1]/'dist/install.py'
if not target.exists():raise SystemExit('请先运行 python3 scripts/build.py。')
runpy.run_path(str(target),run_name='__main__')
