#!/usr/bin/env python3
"""Optional: reassemble the frozen atlas layers; no image generation is involved."""
import argparse,hashlib,json
from pathlib import Path
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--output',type=Path,default=ROOT/'assets/atlas.png')
args=parser.parse_args()
atlas=Image.new('RGBA',(1536,2912))
atlas.alpha_composite(Image.open(ROOT/'artwork/original-atlas.png').convert('RGBA'))
atlas.alpha_composite(Image.open(ROOT/'artwork/transition-rows.png').convert('RGBA'),(0,2288))
args.output.parent.mkdir(parents=True,exist_ok=True);atlas.save(args.output,format='PNG')
digest=hashlib.sha256(args.output.read_bytes()).hexdigest()
expected=json.loads((ROOT/'config/release.json').read_text())['atlas_sha256']
if digest!=expected:raise SystemExit('图集编码与迁移基线不同；请使用 requirements-art.txt 指定的 Pillow 版本。')
print('图集重建与基线一致：'+digest)
