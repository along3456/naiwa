#!/usr/bin/env python3
"""Build the Naiwa player deterministically from frozen artwork and source."""
import argparse, base64, hashlib, json, shutil, subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
def digest(data): return hashlib.sha256(data).hexdigest()
def read_json(path): return json.loads(path.read_text(encoding='utf-8'))
def write(path, text): path.write_text(text, encoding='utf-8', newline='\n')

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, default=ROOT/'dist')
    parser.add_argument('--verify-release', action='store_true', help='Check byte-for-byte equality with the migrated release')
    args=parser.parse_args()
    out=args.output.resolve()
    if out == ROOT or ROOT in out.parents and out.parts[len(ROOT.parts)] in {'src','assets','config','vendor','artwork','scripts','tests'}:
        parser.error('输出目录不能覆盖项目源码。')
    runtime=read_json(ROOT/'config/runtime.json')
    config=read_json(ROOT/'config/pet.json')
    original_bytes=(ROOT/'vendor/original-player.js').read_bytes()
    if digest(original_bytes)!=runtime['original_chunk_sha256']:
        raise SystemExit('原始播放器资源校验失败。')
    node=shutil.which('node')
    if not node: raise SystemExit('需要 Node.js 18+ 执行 JavaScript 编译检查。')
    component=(ROOT/'src/component.js').read_text(encoding='utf-8')
    atlas=(ROOT/'assets/atlas.png').read_bytes()
    original=original_bytes.decode('utf-8')
    module=original.index('FPUb(e,t,n)')
    start=original.index('let y=({assetMap:',module)
    end=original.index('function E(',start)
    full=dict(config,url='data:image/png;base64,'+base64.b64encode(atlas).decode('ascii'))
    patched=original[:start]+'const NAIWA='+json.dumps(full,ensure_ascii=False,separators=(',',':'))+';'+component+original[end:]
    # Preserve a selected Naiwa's identity while its cloud artwork is unavailable.
    fallback=dict(id=config['id'],name='奶蛙',description='本机奶蛙',spriteVersionNumber=2,
                  spritesheetUrl='data:image/png;base64,'+base64.b64encode((ROOT/'artwork/original-atlas.png').read_bytes()).decode('ascii'))
    marker='isPending:"pending"===r||"enabled"===r&&s,pet:i??null'
    if patched.count(marker)!=1: raise SystemExit('云端宠物回退入口不匹配，停止构建。')
    replacement='isPending:e==='+json.dumps(config['id'])+'?false:("pending"===r||"enabled"===r&&s),pet:i??(e==='+json.dumps(config['id'])+'?'+json.dumps(fallback,ensure_ascii=False,separators=(',',':'))+':null)'
    patched=patched.replace(marker,replacement,1)
    player_sha=digest(patched.encode('utf-8'));atlas_sha=digest(atlas)
    if args.verify_release:
        release=read_json(ROOT/'config/release.json')
        if player_sha!=release['player_sha256'] or atlas_sha!=release['atlas_sha256']:
            raise SystemExit('源码或素材已改变，不能与迁移基线逐字节复现。正常开发构建请省略 --verify-release。')
    out.mkdir(parents=True,exist_ok=True)
    write(out/'player.js',patched)
    subprocess.run([node,'--check',str(out/'player.js')],check=True)
    (out/'atlas.png').write_bytes(atlas)
    write(out/'timeline.json',json.dumps(config,ensure_ascii=False,indent=2))
    write(out/'player-readable.js','/* Artwork URL omitted; player.js contains the atlas. */\nconst NAIWA='+json.dumps(config,ensure_ascii=False,indent=2)+';\n'+component)
    manifest={
        'pet_id':config['id'],'app_version':runtime['app_version'],
        'original_chunk_sha256':runtime['original_chunk_sha256'],
        'patched_chunk_sha256':player_sha,'atlas_sha256':atlas_sha,
        'previous_patch_sha256':runtime['previous_patch_sha256'],
        'idle_ms':sum(frame['frameDurationMs'] for frame in config['idle']),
        'hover_ms':config['hoverMs'],'trigger':config['trigger'],
        'speech_ms':config['speechMs'],'speech_texts':config['speechTexts'],
        'installed':False,'desktop_runtime_verified':False,
    }
    write(out/'manifest.json',json.dumps(manifest,ensure_ascii=False,indent=2))
    installer=(ROOT/'scripts/installer.py').read_text(encoding='utf-8')
    installer=installer.replace("APP = Path('/usr/lib/chatgpt/resources/app.asar')",'APP = Path('+repr(runtime['application'])+')')
    installer=installer.replace("CHUNK = 'webview/assets/async/182735.5b42af8792.js'",'CHUNK = '+repr(runtime['chunk']))
    write(out/'install.py',installer)
    preview=(ROOT/'src/preview.html').read_text(encoding='utf-8')
    preview=preview.replace('__NAIWA_CONFIG__',json.dumps(config,ensure_ascii=False,separators=(',',':')))
    preview=preview.replace('__NAIWA_HELPERS__',component.split('let y=({assetMap:')[0])
    write(out/'index.html',preview)
    preview_script=out/'preview.js'
    write(preview_script,preview.split('<script>')[1].split('</script>')[0])
    subprocess.run([node,'--check',str(preview_script)],check=True)
    preview_script.unlink()
    inputs=['src/component.js','src/preview.html','scripts/build.py','scripts/installer.py','config/pet.json','config/runtime.json','assets/atlas.png','artwork/original-atlas.png','vendor/original-player.js']
    write(out/'build-inputs.json',json.dumps({name:digest((ROOT/name).read_bytes()) for name in inputs},indent=2))
    print('构建成功：'+str(out))
    print('player SHA256: '+player_sha)
    if args.verify_release:print('迁移基线逐字节复现通过。')

if __name__=='__main__':main()
