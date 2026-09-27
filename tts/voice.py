# ナレーションの声 (お手本音声) を選ぶ。選んだ声は全リポジトリ共通で使う。
#   uv run --project <skill>/tts python <skill>/tts/voice.py speakers                              # CustomVoice の話者一覧
#   uv run --project <skill>/tts python <skill>/tts/voice.py candidate anna --speaker ono_anna --instruct "落ち着いた解説のトーンで"
#   uv run --project <skill>/tts python <skill>/tts/voice.py candidate calm --design "落ち着いた低めの女性の声。ゆっくり、はっきり話す"
#   uv run --project <skill>/tts python <skill>/tts/voice.py choose anna                           # 候補をお手本にする
import argparse
import os
import shutil
import sys

VOICE_DIR = os.path.expanduser("~/.cache/onboarding-video/voice")
ANCHOR_AUDIO = f"{VOICE_DIR}/anchor.wav"
ANCHOR_TEXT = f"{VOICE_DIR}/anchor.txt"  # お手本音声で話している文 (参照時に音声と対で渡す)
CANDIDATES = f"{VOICE_DIR}/candidates"
SAMPLE_TEXT = "このリポジトリは、設定ファイルを読み込み、データを変換して、結果を画面に表示します。まずは全体の流れをつかみ、そのあと、大事な部分を順番に見ていきましょう。"
SAMPLE_RATE = 24000

if __name__ == "__main__":
    p = argparse.ArgumentParser()
    sub = p.add_subparsers(dest="cmd", required=True)
    sub.add_parser("speakers")
    c = sub.add_parser("candidate")
    c.add_argument("name")
    c.add_argument("--speaker")
    c.add_argument("--instruct")
    c.add_argument("--design")
    sub.add_parser("choose").add_argument("name")
    args = p.parse_args()

    if args.cmd == "choose":
        src = f"{CANDIDATES}/{args.name}.wav"
        if not os.path.exists(src):
            sys.exit(f"候補がありません: {src}")
        shutil.copy(src, ANCHOR_AUDIO)
        with open(ANCHOR_TEXT, "w") as f:
            f.write(SAMPLE_TEXT + "\n")
        print(f"お手本にしました: {ANCHOR_AUDIO}")
        sys.exit()

    import numpy as np
    import soundfile as sf
    from mlx_audio.tts.utils import load_model

    if args.cmd == "speakers":
        model = load_model("mlx-community/Qwen3-TTS-12Hz-1.7B-CustomVoice-bf16")
        print("\n".join(model.get_supported_speakers()))
        sys.exit()

    if bool(args.speaker) == bool(args.design):
        sys.exit("--speaker か --design のどちらか 1 つを指定する")
    if args.speaker:
        model = load_model("mlx-community/Qwen3-TTS-12Hz-1.7B-CustomVoice-bf16")
        results = model.generate_custom_voice(
            text=SAMPLE_TEXT, speaker=args.speaker, language="japanese", instruct=args.instruct
        )
    else:
        model = load_model("mlx-community/Qwen3-TTS-12Hz-1.7B-VoiceDesign-bf16")
        results = model.generate_voice_design(text=SAMPLE_TEXT, language="japanese", instruct=args.design)
    os.makedirs(CANDIDATES, exist_ok=True)
    out = f"{CANDIDATES}/{args.name}.wav"
    sf.write(out, np.concatenate([np.array(r.audio) for r in results]), SAMPLE_RATE)
    print(out)
