// 字幕ファイル: ナレーションの原稿と長さから .srt を作る。
// 原稿の {表示|読み} は表示の側を使う。1 文ずつ出し、表示時間は行の中で読みの文字数に比例して割り振る
// 使い方 (<work> で): node scripts/srt.mjs <id> <出力.srt>
import {readFileSync, writeFileSync} from 'node:fs';

// src/ui.tsx の NARRATION_START / NARRATION_TAIL と同じ値
const FPS = 30;
const NARRATION_START = 10;
const NARRATION_TAIL = 30;

const [id, out] = process.argv.slice(2);
const script = readFileSync(`narration/${id}.txt`, 'utf8').split('\n').map((l) => l.trim()).filter(Boolean);
const display = (s) => s.replace(/\{([^|}]*)\|[^}]*\}/g, '$1');
const reading = (s) => s.replace(/\{[^|}]*\|([^}]*)\}/g, '$1');
const time = (frame) => {
	const ms = Math.round((frame / FPS) * 1000);
	const p = (n, w = 2) => String(n).padStart(w, '0');
	return `${p(Math.floor(ms / 3600000))}:${p(Math.floor(ms / 60000) % 60)}:${p(Math.floor(ms / 1000) % 60)},${p(ms % 1000, 3)}`;
};

const narration = JSON.parse(readFileSync(`src/narration/${id}.json`, 'utf8'));
const cues = [];
let start = 0;
narration.forEach(({frames}, i) => {
	const sentences = script[i].split(/(?<=[。？！])/).map((s) => s.trim()).filter(Boolean);
	const total = sentences.reduce((n, s) => n + reading(s).length, 0);
	let from = start + NARRATION_START;
	for (const s of sentences) {
		const to = from + (frames * reading(s).length) / total;
		cues.push(`${cues.length + 1}\n${time(from)} --> ${time(to)}\n${display(s)}\n`);
		from = to;
	}
	start += NARRATION_START + frames + NARRATION_TAIL;
});
writeFileSync(out, cues.join('\n'));
console.log(`${out}: ${cues.length} 件`);
