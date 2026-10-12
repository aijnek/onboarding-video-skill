# onboarding-video

任意のリポジトリを読んで、新しく参加する開発者向けの解説動画シリーズを作る Claude Code スキルです。いきなりコードを読み始めても、全体をつかむのは簡単ではありません。動画でおおまかな全体像をつかんでから、気になる部分や興味のある部分をコードで詳しく読めるようにします。動画は [Remotion](https://www.remotion.dev/) で作ります。日本語のナレーション付きで、字幕ファイル (.srt) も書き出します。ナレーションは [Qwen3-TTS](https://huggingface.co/mlx-community/Qwen3-TTS-12Hz-1.7B-Base-bf16) を [MLX](https://github.com/ml-explore/mlx) でローカル実行して作ります (外部 API は使いません)。

![このスキルで作った動画の一場面](docs/overview-scene.gif)

<sub>このリポジトリ自身を、このスキルで解説した動画 (1 本目「全体像」) の一場面。3 倍速、音声なし。</sub>

流れ: リポジトリを読む → 何本で何を扱うかの計画 (既定 7 本 × 2〜3 分) を提案して承認 → 初回だけ TTS と声のセットアップ → 1 本ずつ「原稿 → 音声 → 映像 → mp4」を作り、見て確認。手順の詳細は [SKILL.md](SKILL.md) にあります。

## 必要なもの

- macOS (Apple Silicon)
- Node.js
- [uv](https://docs.astral.sh/uv/)

## インストール

任意の場所に clone し、Claude Code のスキルディレクトリからリンクします。

```bash
git clone https://github.com/aijnek/onboarding-video-skill.git onboarding-video
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

生成物は対象リポジトリの外に置きます。作業ディレクトリは `~/.cache/onboarding-video/<リポジトリ名>/`、完成した mp4 と字幕ファイル (.srt) は既定で `~/Downloads` です。

## 構成

```
SKILL.md          スキルの手順
template/         作業ディレクトリのひな形 (Remotion プロジェクト。src/ui.tsx が共通部品、scripts/srt.mjs が字幕ファイルの書き出し)
tts/narrate.py    ナレーション生成 (お手本音声を参照して声をそろえる)
tts/voice.py      声 (お手本音声) の候補づくりと選択
```

## ライセンス

MIT。[LICENSE](LICENSE) を参照。
