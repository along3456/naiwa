# 奶蛙 Naiwa

奶蛙的素材、动画时间轴、专属播放器补丁与本地预览项目。当前版本支持：

- 常态约 **11.16 秒**一轮：捧腹前后倾斜两次，接战斗姿态并停留，再收势循环。外观沿用确认过的生成素材，节奏接近参考视频，不是逐帧复刻。
- **单击**换装开扇一次，约 **1.74 秒**后恢复常态。悬停不触发；播放中再次单击会从头播放并切换下一句气泡，拖动立即中断换装进入跑步，松开后恢复常态。
- 有效单击交替说 **「嘎嘎滴辣虾！」→「安迪~」→「嘎嘎滴辣虾！」……**，每个气泡约 3 秒。重新启动应用后从第一句开始。
- 保留左右跑步与对话视线，去掉独立跳跃和思考循环。

## 快速开始

需要 **Python 3.10+** 和 **Node.js 18+**。普通构建不需要 pip、npm、网络、API Key 或 Pets 插件。

```bash
cd /home/lhl/naiwa
python3 scripts/build.py --verify-release
```

产物在 `dist/`。直接用浏览器打开 `dist/index.html`，或运行：

```bash
python3 -m http.server 8765 --bind 127.0.0.1 --directory dist
```

访问 <http://127.0.0.1:8765>。单击预览里的奶蛙，动画和交替气泡即可播放。预览不修改桌面应用。

## 可复现范围

图像生成本身不是确定性的。本项目冻结了已确认的图集、图层、原始生成条带和参考素材；构建不再次调用图片生成。相同源码、配置和图集可生成与迁移基线 **SHA256 完全一致**的 `player.js`。

`--verify-release` 检查当前产物与 `config/release.json` 记录的迁移版本逐字节一致。正常修改源码或素材后，请用 `python3 scripts/build.py` 构建，不再要求与旧基线相同。构建输出包含输入文件的哈希清单，且不嵌入机器路径或构建时间。

`vendor/original-player.js` 是本机应用对应版本的原始 JS 资源，用于替换其中的宠物播放组件。普通构建不需要读取系统应用、旧聊天目录或 `/tmp`。整个项目移动到其他目录后仍可构建。

## 安装和恢复

安装目标为 Linux 桌面应用 **26.1103.60933**，路径由 `config/runtime.json` 指定。补丁只针对已有奶蛙 ID，不创建新宠物，不修改其他宠物，也不会同步到其他设备。

先构建，再完全退出 Codex/ChatGPT 桌面应用，在系统终端执行：

```bash
cd /home/lhl/naiwa
sudo python3 scripts/install.py install
```

重新打开应用生效。已安装此前聊天中任一受支持版本的补丁，也可以用这个命令升级。安装脚本保留原版备份，并检查应用版本和资源校验值。需要管理员权限，预留约 1.6 GB 可用空间。

恢复原版时，完全退出应用后执行：

```bash
cd /home/lhl/naiwa
sudo python3 scripts/install.py restore
```

原始备份位于 `/usr/lib/chatgpt/resources/app.asar.naiwa-original`。应用升级后，旧补丁可能不再兼容；安装器会拒绝未知版本，不能仅修改版本号绕过校验。若自己修改并安装了新版补丁，继续迭代时需把上次安装产物的 `patched_chunk_sha256` 加入 `config/runtime.json` 的 `previous_patch_sha256`，以允许从已知旧版升级。

本次迁移不执行安装，不重启应用，也不修改当前桌面宠物。

## 项目结构

```text
src/component.js             奶蛙专属播放器、点击判定、气泡交替逻辑
src/preview.html             本地预览模板
config/pet.json              宠物 ID、帧时间轴、两句气泡、显示时长
config/runtime.json          应用版本、资源路径、允许升级的旧补丁哈希
config/release.json          迁移基线的图集与播放器 SHA256
assets/atlas.png             构建使用的已确认 14 行图集
artwork/original-atlas.png   保留原跑步、视线等画面的 11 行图层
artwork/transition-rows.png  大笑、战斗过渡、开扇的 3 行图层
artwork/source-strips/      生成的原始动作条带
artwork/references/         用户视频、站姿、服装参考与标准造型
artwork/prompts.txt         图像生成提示词记录
vendor/original-player.js   对应应用版本的原始播放器资源
scripts/build.py           确定性打包与必要语法检查
scripts/install.py         安装/恢复入口
scripts/installer.py        版本守卫、ASAR 构建、备份与原子替换
scripts/rebuild_atlas.py    可选：从冻结图层重新组合图集
tests/player.cjs            已有播放与点击逻辑的针对性检查
docs/                      说明、迁移记录及 GIF 预览
dist/                      构建输出，已被 Git 忽略
```

## 修改方式

- 修改气泡：编辑 `config/pet.json` 的 `speechTexts`；`speechMs` 控制显示时长。
- 修改动作节奏：编辑同一文件的 `idle` 和 `hover` 帧列表；`hover` 是沿用的内部名称，现在由单击触发。修改开扇列表时同步其总时长 `hoverMs`。
- 修改触发和交互：编辑 `src/component.js`。
- 修改素材：更新 `assets/atlas.png`。每格 192×208，8 列、14 行；前 11 行保留原画面，第 12–14 行依次为大笑过渡、战斗过渡、开扇。它是本机播放器专用图集，不能直接作为标准 11 行 Pets 图集上传。

所有修改都运行 `python3 scripts/build.py`，再预览、按需安装。

## 可选的图集重建

普通开发无需安装 Pillow。如果要从两张冻结图层重新组合图集：

```bash
python3 -m venv .venv
.venv/bin/pip install -r requirements-art.txt
.venv/bin/python scripts/rebuild_atlas.py
python3 scripts/build.py --verify-release
```

图集基线使用 Pillow 12.2.0 编码。生成条带仅用于追溯和继续设计；已经确认的透明图层是重建输入，无需重新抠图或重画。

## 验证边界

构建会检查生成 JavaScript 的语法。需要验证交互逻辑时，运行一次已有检查：

```bash
node tests/player.cjs
```

它覆盖单击、拖动/取消不触发、播放中连点、三次气泡轮换、动画时长、跑步与视线等逻辑。不要把这些检查当作真实桌面运行验证。

安装后最小手动确认：观察一轮常态；悬停不换装；连续进行三次有效单击（每次等待动作结束），应依次出现两句话再回到第一句；拖动不误触，并确认对话视线和屏幕边缘气泡显示正常。迁移阶段不扩大桌面测试范围。

更新：换装可被单击重播或拖动抢断。拖动清除气泡，松开后不续播被打断的换装。安装后最小确认：播放到一半再点，应从头播放并切换气泡；播放中分别左右拖动，应立即跑步，松开恢复常态。

显示兜底：已经选中奶蛙但云端记录暂不可用时，使用冻结的本地图集保留奶蛙身份；不改变默认宠物或其他宠物的选择。此修复需要重新构建、安装并重启后确认。

转向防抖：相对当前方向最远点反向累计移动 4 像素才转向，无需越过按下起点。小幅抖动和竖向移动保持原方向，同向移动不重复重启动画。阈值在 config/pet.json 的 dragTurnThresholdPx 中设置。安装后先左右轻微抖动（小于 4 像素）应保持方向，再明确反向拖动应转身。
