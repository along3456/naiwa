#!/usr/bin/env python3
"""Version-guarded, reversible Naiwa-only desktop patch. Python standard library only."""
import argparse, hashlib, json, os, shutil, struct, tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent
APP = Path('/usr/lib/chatgpt/resources/app.asar')
CHUNK = 'webview/assets/async/907538.ce3dfb2b2a.js'

def digest(data):
    return hashlib.sha256(data).hexdigest()

def read_header(path):
    with path.open('rb') as stream:
        head = struct.unpack('<4I', stream.read(16))
        if head[0] != 4 or head[3] > 64 * 1024 * 1024:
            raise RuntimeError('不是受支持的 ASAR 文件，未修改应用。')
        return json.loads(stream.read(head[3])), 8 + head[1]

def entry(header):
    node = header
    for part in CHUNK.split('/'):
        node = node['files'][part]
    return node

def read_resource(path, item_for_header):
    header, base = read_header(path)
    item = item_for_header(header)
    with path.open('rb') as stream:
        stream.seek(base + int(item['offset']))
        return stream.read(item['size'])

def read_chunk(path):
    return read_resource(path, entry)

def check_app_version(path, expected):
    version = json.loads(read_resource(path, lambda header: header['files']['package.json'])).get('version')
    if version != expected:
        raise RuntimeError(f'应用版本为 {version}，补丁适用于 {expected}。')

def check_backup(path, manifest):
    check_app_version(path, manifest['app_version'])
    if digest(read_chunk(path)) != manifest['original_chunk_sha256']:
        raise RuntimeError(f'原始备份校验失败：{path}')

def build(source, destination, replacement, manifest):
    accepted = [manifest['original_chunk_sha256']] + manifest.get('previous_patch_sha256', [])
    if digest(read_chunk(source)) not in accepted:
        raise RuntimeError('应用版本或文件已改变，停止安装。请重新适配此版本。')
    header, base = read_header(source)
    item = entry(header)
    block = item.get('integrity', {}).get('blockSize', 4194304)
    # Append replacement. Every existing relative offset and unpacked entry stays intact.
    item.update(size=len(replacement), offset=str(source.stat().st_size - base), integrity={
        'algorithm':'SHA256', 'hash':digest(replacement), 'blockSize':block,
        'blocks':[digest(replacement[i:i+block]) for i in range(0,len(replacement),block)]})
    encoded = json.dumps(header, ensure_ascii=False, separators=(',',':')).encode()
    payload_size = 4 + len(encoded)
    payload_size += (-payload_size) % 4
    prefix = struct.pack('<4I',4,4+payload_size,payload_size,len(encoded))
    with destination.open('xb') as output, source.open('rb') as original:
        output.write(prefix); output.write(encoded)
        output.write(b'\0' * (payload_size - 4 - len(encoded)))
        original.seek(base); shutil.copyfileobj(original, output, 4*1024*1024)
        output.write(replacement); output.flush(); os.fsync(output.fileno())
    if digest(read_chunk(destination)) != manifest['patched_chunk_sha256']:
        raise RuntimeError('生成文件校验失败，未替换应用。')
    return destination

def app_is_running():
    for process in Path('/proc').iterdir():
        if process.name.isdigit():
            try:
                executable = os.readlink(process/'exe').removesuffix(' (deleted)')
                if executable.startswith('/usr/lib/chatgpt/'):
                    return True
            except OSError:
                pass
    return False

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action', choices=['install','restore','build'])
    parser.add_argument('--output', type=Path)
    args=parser.parse_args()
    manifest=json.loads((ROOT/'manifest.json').read_text())
    backup=APP.with_name(f"app.asar.naiwa-original.{manifest['app_version']}")
    patch=(ROOT/'player.js').read_bytes()
    if digest(patch)!=manifest['patched_chunk_sha256']:
        raise RuntimeError('补丁文件校验失败，未修改应用。')
    if args.action=='build':
        if not args.output: parser.error('build requires --output')
        check_app_version(APP,manifest['app_version'])
        if backup.exists():
            check_backup(backup,manifest)
        build(backup if backup.exists() else APP,args.output,patch,manifest)
        print('构建完成，文件与 ASAR 索引校验通过；未安装。');return
    if os.geteuid()!=0:
        raise RuntimeError('请在系统终端中使用 sudo 运行此脚本，不要在聊天里提供密码。')
    if app_is_running():
        raise RuntimeError('请先完全退出 Codex/ChatGPT 桌面应用，再在系统终端运行。')
    check_app_version(APP,manifest['app_version'])
    current=digest(read_chunk(APP))
    if args.action=='install' and current==manifest['patched_chunk_sha256']:
        print('此补丁已经安装。');return
    if args.action=='restore':
        if current not in [manifest['patched_chunk_sha256']] + manifest.get('previous_patch_sha256', []):
            raise RuntimeError('当前应用不是这份补丁版本，停止恢复，避免覆盖应用升级。')
        if not backup.exists():
            raise RuntimeError('原始备份不存在，未修改应用。')
    else:
        if current not in [manifest['original_chunk_sha256']] + manifest.get('previous_patch_sha256', []):
            raise RuntimeError('应用版本不匹配，未修改应用。')
        if current!=manifest['original_chunk_sha256'] and not backup.exists():
            raise RuntimeError('升级补丁需要原始备份，备份不存在，未修改应用。')
    if backup.exists():
        check_backup(backup,manifest)
    needed=APP.stat().st_size + (0 if backup.exists() else APP.stat().st_size) + 32*1024*1024
    if shutil.disk_usage(APP.parent).free<needed:
        raise RuntimeError('磁盘空间不足，未修改应用。需要约 1.6 GB 可用空间。')
    handle,name=tempfile.mkstemp(prefix='.naiwa-',suffix='.asar',dir=APP.parent)
    os.close(handle); staged=Path(name); staged.unlink()
    try:
        if args.action=='install':
            build(backup if backup.exists() else APP,staged,patch,manifest)
            if not backup.exists():
                with tempfile.TemporaryDirectory(prefix='.naiwa-backup-', dir=APP.parent) as directory:
                    staged_backup=Path(directory)/backup.name
                    shutil.copy2(APP,staged_backup)
                    os.replace(staged_backup,backup)
        else:
            shutil.copy2(backup,staged)
        stat=APP.stat();os.chown(staged,stat.st_uid,stat.st_gid);os.chmod(staged,stat.st_mode & 0o777)
        os.replace(staged,APP)
        fd=os.open(APP.parent,os.O_RDONLY);os.fsync(fd);os.close(fd)
    finally:
        if staged.exists(): staged.unlink()
    print('已安装。重新打开应用即可。' if args.action=='install' else '已恢复原版。重新打开应用即可。')

if __name__=='__main__':
    try: main()
    except Exception as error: raise SystemExit(str(error))
