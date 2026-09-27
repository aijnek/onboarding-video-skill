# onboarding-video

任意のリポジトリを読んで、新しく参加する開発者向けの解説動画シリーズ (ラーニングジャーニー) を作る Claude Code スキルです。動画は [Remotion](https://www.remotion.dev/) で、日本語ナレーションは [Qwen3-TTS](https://huggingface.co/mlx-community/Qwen3-TTS-12Hz-1.7B-Base-bf16) を [MLX](https://github.com/ml-explore/mlx) でローカル実行して作ります (外部 API は使いません)。

流れ: リポジトリを読む → ジャーニー (既定 7 本 × 2〜3 分) を提案して承認 → 初回だけ TTS と声のセットアップ → 1 本ずつ「原稿 → 音声 → 映像 → mp4」を作り、試聴して確認。手順の詳細は [SKILL.md](SKILL.md) にあります。

## 必要なもの

- macOS (Apple Silicon)
- [uv](https://docs.astral.sh/uv/)、Node.js

## インストール

任意の場所に clone し、Claude Code のスキルディレクトリからリンクします。

```bash
git clone <this repo> onboarding-video
mkdir -p ~/.claude/skills
ln -s "$(pwd)/onboarding-video" ~/.claude/skills/onboarding-video
```

## 使い方

対象リポジトリで Claude Code を起動して:

```
/onboarding-video
/onboarding-video 5本 1-2分 packages/api --out ~/Movies
/onboarding-video voice      # 声を選び直す
```

生成物は対象リポジトリの外に置きます。作業ディレクトリは `~/.cache/onboarding-video/<リポジトリ名>/`、完成した mp4 は既定で `~/Downloads` です。

## 構成

```
SKILL.md          スキルの手順
template/         作業ディレクトリのひな形 (Remotion プロジェクト。src/ui.tsx が共通部品)
tts/narrate.py    ナレーション生成 (お手本音声を参照して声をそろえる)
tts/voice.py      声 (お手本音声) の候補づくりと選択
```
