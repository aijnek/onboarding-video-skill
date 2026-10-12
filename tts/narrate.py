# 動画のナレーション音声を Qwen3-TTS (MLX, ローカル実行) で生成する。
# 全動画・全行で同じお手本音声 (voice.py で選んだもの) を参照させ、声・速さ・間をそろえる。
# 作業ディレクトリ (Remotion プロジェクト) で実行する:
#   uv run --project <skill>/tts python <skill>/tts/narrate.py Overview        # 全行
#   uv run --project <skill>/tts python <skill>/tts/narrate.py Overview 0 3    # 指定した行だけ作り直す
# 原稿: narration/<動画>.txt (1行 = 1行分のナレーション)。読み間違えやすい語は {表示|読み} と書くと、読みの側を読む
#       (表示の側は scripts/srt.mjs が字幕に使う。例: {package.json|パッケージ・ジェイソン})
# 出力: public/narration/<動画>/NN.wav と、各音声の長さ (フレーム数) を書いた src/narration/<動画>.json
import json
import math
import os
import re
import subprocess
import sys

import numpy as np
import soundfile as sf
from mlx_audio.tts.utils import load_model

from voice import ANCHOR_AUDIO, ANCHOR_TEXT

MODEL = "mlx-community/Qwen3-TTS-12Hz-1.7B-Base-bf16"
SAMPLE_RATE = 24000
FPS = 30
LONG_SILENCE = 1.2  # 秒。これ以上の無音が文中にあれば警告する

if not os.path.exists(ANCHOR_AUDIO):
    sys.exit(f"お手本音声がありません: {ANCHOR_AUDIO} (先に voice.py で声を選ぶ)")
with open(ANCHOR_TEXT) as f:
    anchor_text = f.read().strip()


def longest_silence(audio):
    # 20ms ごとの音量が -45 dBFS 未満を無音とみなし、先頭と末尾を除いた最長の無音 (秒) を返す
    hop = SAMPLE_RATE // 50
    frames = audio[: len(audio) // hop * hop].reshape(-1, hop)
    silent = 20 * np.log10(np.sqrt((frames**2).mean(axis=1)) + 1e-9) < -45
    voiced = np.flatnonzero(~silent)
    if len(voiced) == 0:
        return 0.0
    longest = run = 0
    for s in silent[voiced[0] : voiced[-1]]:
        run = run + 1 if s else 0
        longest = max(longest, run)
    return longest / 50


video = sys.argv[1]
with open(f"narration/{video}.txt") as f:
    NARRATION = [re.sub(r"\{[^|}]*\|([^}]*)\}", r"\1", line.strip()) for line in f if line.strip()]
out_json = f"src/narration/{video}.json"

targets = [int(a) for a in sys.argv[2:]] or list(range(len(NARRATION)))
if targets != list(range(len(NARRATION))):
    with open(out_json) as f:
        result = json.load(f)
    result += [None] * (len(NARRATION) - len(result))  # 原稿の末尾に行を足した場合
else:
    result = [None] * len(NARRATION)

os.makedirs(f"public/narration/{video}", exist_ok=True)
os.makedirs("src/narration", exist_ok=True)
model = load_model(MODEL)  # 1回だけロードして全文に使い回す

for i in targets:
    text = NARRATION[i]
    file = f"narration/{video}/{i:02d}.wav"
    raw = f"public/{file}.raw.wav"
    chunks = model.generate(
        text=text, ref_audio=ANCHOR_AUDIO, ref_text=anchor_text, lang_code="japanese"
    )
    audio = np.concatenate([np.array(r.audio) for r in chunks])
    sf.write(raw, audio, SAMPLE_RATE)
    # 行の間で音量をそろえる (Remotion 同梱の ffmpeg)
    subprocess.run(
        ["npx", "remotion", "ffmpeg", "-y", "-v", "error", "-i", raw,
         "-af", "loudnorm=I=-16:TP=-1.5", "-ar", str(SAMPLE_RATE), f"public/{file}"],
        check=True,
    )
    os.remove(raw)
    audio, _ = sf.read(f"public/{file}")
    seconds = len(audio) / SAMPLE_RATE
    silence = longest_silence(audio)
    warn = f"  ⚠ 文中に {silence:.1f} 秒の無音" if silence >= LONG_SILENCE else ""
    print(f"{file}: {seconds:.1f}s ({len(text) / seconds:.1f} 文字/秒){warn}", flush=True)
    result[i] = {"file": file, "frames": math.ceil(seconds * FPS)}

with open(out_json, "w") as f:
    f.write(json.dumps(result, indent="\t", ensure_ascii=False) + "\n")
