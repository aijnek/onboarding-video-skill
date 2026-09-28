// シリーズの動画で共通に使う見た目の部品と、ナレーション付き・字幕付き動画の組み立て
import {
	AbsoluteFill,
	Audio,
	Freeze,
	interpolate,
	Sequence,
	spring,
	staticFile,
	useCurrentFrame,
	useVideoConfig,
} from 'remotion';
import {linearTiming, TransitionSeries} from '@remotion/transitions';
import {fade} from '@remotion/transitions/fade';
import {SERIES, SeriesId} from './series';

export const FONT = '"Hiragino Sans", "Noto Sans JP", sans-serif';
export const MONO = 'Menlo, monospace';
export const BG = '#0b1020';
export const ACCENT = '#fbbf24';
export const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

export const useFadeIn = (start: number, length = 15) =>
	interpolate(useCurrentFrame(), [start, start + length], [0, 1], clamp);

export const usePop = (delay: number) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	return spring({fps, frame: frame - delay, config: {damping: 200}});
};

// 共通レイアウト: 上に見出し、下に説明文。中身は top 190 〜 bottom 170 の領域に収める
export const Scene: React.FC<{
	step?: string;
	title: string;
	caption?: string;
	children?: React.ReactNode;
}> = ({step, title, caption, children}) => {
	const titleIn = usePop(0);
	const captionIn = useFadeIn(25);
	return (
		<AbsoluteFill style={{background: BG, color: '#fff', fontFamily: FONT}}>
			<div
				style={{
					position: 'absolute',
					top: 60,
					left: 90,
					display: 'flex',
					alignItems: 'center',
					gap: 28,
					opacity: titleIn,
					transform: `translateX(${(1 - titleIn) * -60}px)`,
				}}
			>
				{step ? (
					<div
						style={{
							background: ACCENT,
							color: BG,
							fontWeight: 800,
							fontSize: 36,
							padding: '8px 22px',
							borderRadius: 999,
						}}
					>
						{step}
					</div>
				) : null}
				<div style={{fontSize: 60, fontWeight: 800}}>{title}</div>
			</div>
			<AbsoluteFill style={{top: 190, bottom: 170, height: 'auto'}}>{children}</AbsoluteFill>
			{caption ? (
				<div
					style={{
						position: 'absolute',
						left: 90,
						right: 90,
						bottom: 60,
						fontSize: 40,
						lineHeight: 1.5,
						color: '#cbd5e1',
						opacity: captionIn,
					}}
				>
					{caption}
				</div>
			) : null}
		</AbsoluteFill>
	);
};

export const Box: React.FC<{
	children: React.ReactNode;
	color?: string;
	style?: React.CSSProperties;
}> = ({children, color = '#334155', style}) => (
	<div
		style={{
			border: `4px solid ${color}`,
			borderRadius: 20,
			padding: '24px 32px',
			background: 'rgba(255,255,255,0.04)',
			...style,
		}}
	>
		{children}
	</div>
);

// コード表示。highlight に入れた行 (0 始まり) を強調する
export const Code: React.FC<{
	lines: string[];
	label?: string;
	highlight?: number[];
	fontSize?: number;
	style?: React.CSSProperties;
}> = ({lines, label, highlight = [], fontSize = 34, style}) => (
	<Box color="#475569" style={{fontFamily: MONO, fontSize, lineHeight: 1.55, padding: '20px 26px', ...style}}>
		{label ? <div style={{color: '#64748b', fontSize: fontSize * 0.75, marginBottom: 8}}>{label}</div> : null}
		{lines.map((l, i) => {
			const on = highlight.includes(i);
			return (
				<div
					key={i}
					style={{
						whiteSpace: 'pre',
						color: on ? ACCENT : '#e2e8f0',
						background: on ? 'rgba(251,191,36,0.12)' : 'transparent',
						padding: '0 8px',
						borderRadius: 6,
					}}
				>
					{l || ' '}
				</div>
			);
		})}
	</Box>
);

export const Arrow: React.FC<{opacity?: number; vertical?: boolean}> = ({opacity = 1, vertical}) => (
	<div style={{fontSize: 70, color: '#64748b', opacity}}>{vertical ? '↓' : '→'}</div>
);

// 処理の流れ: 箱を矢印でつなぎ、delay から順に 1 つずつ登場させる
export const Flow: React.FC<{
	steps: {label: string; note?: string; color?: string}[];
	delay?: number;
	interval?: number;
	vertical?: boolean;
}> = ({steps, delay = 0, interval = 40, vertical}) => (
	<div
		style={{
			display: 'flex',
			flexDirection: vertical ? 'column' : 'row',
			alignItems: 'center',
			justifyContent: 'center',
			gap: vertical ? 10 : 30,
		}}
	>
		{steps.map((s, i) => {
			const p = usePop(delay + i * interval);
			return [
				i > 0 ? <Arrow key={`a${i}`} opacity={p} vertical={vertical} /> : null,
				<Box key={s.label} color={s.color} style={{opacity: p, transform: `scale(${0.9 + p * 0.1})`, textAlign: 'center'}}>
					<div style={{fontSize: 44, fontWeight: 800, whiteSpace: 'nowrap'}}>{s.label}</div>
					{s.note ? <div style={{fontSize: 28, color: '#94a3b8', marginTop: 6}}>{s.note}</div> : null}
				</Box>,
			];
		})}
	</div>
);

// ディレクトリ構成。depth でインデント、highlight でその行を強調する
export const FileTree: React.FC<{
	entries: {path: string; depth?: number; note?: string; highlight?: boolean}[];
	delay?: number;
	interval?: number;
	fontSize?: number;
}> = ({entries, delay = 0, interval = 12, fontSize = 36}) => (
	<div style={{display: 'flex', flexDirection: 'column', gap: fontSize * 0.35}}>
		{entries.map((e, i) => {
			const o = useFadeIn(delay + i * interval);
			return (
				<div
					key={i}
					style={{
						display: 'flex',
						alignItems: 'baseline',
						gap: 30,
						paddingLeft: (e.depth ?? 0) * fontSize * 1.4,
						opacity: o,
					}}
				>
					<span style={{fontFamily: MONO, fontSize, color: e.highlight ? ACCENT : '#e2e8f0', whiteSpace: 'nowrap'}}>
						{e.path}
					</span>
					{e.note ? <span style={{fontSize: fontSize * 0.8, color: '#94a3b8'}}>{e.note}</span> : null}
				</div>
			);
		})}
	</div>
);

// シリーズの現在地: 一覧で、見ている動画を光らせる
export const JourneyMap: React.FC<{current: SeriesId; delay?: number}> = ({current, delay = 0}) => {
	const index = SERIES.findIndex((s) => s.id === current);
	return (
		<div style={{display: 'flex', flexDirection: 'column', gap: 14}}>
			{SERIES.map((s, i) => {
				const p = usePop(delay + i * 5);
				const on = i === index;
				return (
					<div
						key={s.id}
						style={{
							display: 'flex',
							alignItems: 'center',
							gap: 22,
							padding: '12px 26px',
							borderRadius: 14,
							fontSize: 34,
							whiteSpace: 'nowrap',
							background: on ? 'rgba(251,191,36,0.14)' : 'transparent',
							border: `3px solid ${on ? ACCENT : 'transparent'}`,
							color: on ? '#fff' : i < index ? '#64748b' : '#94a3b8',
							fontWeight: on ? 800 : 400,
							opacity: p,
							transform: `translateX(${(1 - p) * 40}px)`,
						}}
					>
						<span style={{fontFamily: MONO, color: on ? ACCENT : 'inherit', width: 40}}>{i + 1}</span>
						{s.title}
					</div>
				);
			})}
		</div>
	);
};

// シリーズの動画の冒頭: 大きなタイトルと現在地
export const SeriesTitle: React.FC<{current: SeriesId; subtitle: string}> = ({current, subtitle}) => {
	const index = SERIES.findIndex((s) => s.id === current);
	const p = usePop(0);
	const sub = useFadeIn(20);
	return (
		<AbsoluteFill
			style={{
				background: `linear-gradient(135deg, ${BG}, #1e3a8a)`,
				color: '#fff',
				fontFamily: FONT,
				flexDirection: 'row',
				alignItems: 'center',
				justifyContent: 'space-around',
				padding: '0 100px',
			}}
		>
			<div style={{opacity: p, transform: `translateY(${(1 - p) * 30}px)`}}>
				<div style={{fontFamily: MONO, fontSize: 40, color: ACCENT}}>
					{index + 1} / {SERIES.length}
				</div>
				<div
					style={{
						fontSize: SERIES[index].title.length > 9 ? 84 : 110,
						fontWeight: 800,
						margin: '10px 0 24px',
						whiteSpace: 'nowrap',
					}}
				>
					{SERIES[index].title}
				</div>
				<div style={{fontSize: 44, color: '#cbd5e1', opacity: sub}}>{subtitle}</div>
			</div>
			<JourneyMap current={current} delay={15} />
		</AbsoluteFill>
	);
};

// シリーズの動画の最後: 次の動画と、次に読むコード
export const NextUp: React.FC<{
	current: SeriesId;
	files: {path: string; note: string}[];
}> = ({current, files}) => {
	const index = SERIES.findIndex((s) => s.id === current);
	const next = SERIES[index + 1];
	const card = usePop(15);
	return (
		<Scene title="次のステップ">
			<div style={{display: 'flex', justifyContent: 'center', alignItems: 'flex-start', gap: 80, marginTop: 30}}>
				<div style={{width: 700}}>
					<div style={{fontSize: 36, color: '#94a3b8', marginBottom: 20}}>次に読むコード</div>
					{files.map((f, i) => {
						const o = useFadeIn(40 + i * 20);
						return (
							<div key={f.path} style={{opacity: o, marginBottom: 26}}>
								<div style={{fontFamily: MONO, fontSize: 40, color: '#e2e8f0'}}>{f.path}</div>
								<div style={{fontSize: 32, color: '#94a3b8', marginTop: 4}}>{f.note}</div>
							</div>
						);
					})}
				</div>
				{next ? (
					<Box
						color={ACCENT}
						style={{width: 720, opacity: card, transform: `translateY(${(1 - card) * 40}px)`}}
					>
						<div style={{fontSize: 34, color: '#94a3b8'}}>次の動画</div>
						<div style={{fontFamily: MONO, fontSize: 40, color: ACCENT, marginTop: 16}}>
							{index + 2} / {SERIES.length}
						</div>
						<div style={{fontSize: 50, fontWeight: 800, marginTop: 8, whiteSpace: 'nowrap'}}>{next.title}</div>
					</Box>
				) : (
					<Box
						color={ACCENT}
						style={{width: 720, opacity: card, transform: `translateY(${(1 - card) * 40}px)`}}
					>
						<div style={{fontFamily: MONO, fontSize: 40, color: ACCENT}}>
							{SERIES.length} / {SERIES.length}
						</div>
						<div style={{fontSize: 56, fontWeight: 800, marginTop: 8}}>シリーズ完了</div>
						<div style={{fontSize: 34, color: '#cbd5e1', marginTop: 12}}>おつかれさまでした</div>
					</Box>
				)}
			</div>
		</Scene>
	);
};

// 動画の組み立て。ナレーション付き (narratedVideo) と字幕付き (subtitledVideo) がある。
// 各シーンの長さ = max(基本の長さ, ナレーション・字幕が収まる長さ)。
// Check は各シーンの最後 (全要素が出そろった状態) の静止画。崩れの確認に使う
export const NARRATION_START = 10;
export const NARRATION_TAIL = 30;
const TRANSITION = 15;

const assemble = (items: {Play: React.FC; Still: React.FC; duration: number}[]) => {
	const durationInFrames =
		items.reduce((sum, s) => sum + s.duration, 0) - (items.length - 1) * TRANSITION;

	const Video: React.FC = () => (
		<TransitionSeries>
			{items.flatMap(({Play, duration}, i) => [
				...(i > 0
					? [
							<TransitionSeries.Transition
								key={`t${i}`}
								timing={linearTiming({durationInFrames: TRANSITION})}
								presentation={fade()}
							/>,
						]
					: []),
				<TransitionSeries.Sequence key={`s${i}`} durationInFrames={duration}>
					<Play />
				</TransitionSeries.Sequence>,
			])}
		</TransitionSeries>
	);

	const Check: React.FC<{scene: number}> = ({scene}) => {
		const {Still, duration} = items[scene];
		return (
			<Freeze frame={duration - TRANSITION - 1}>
				<Still />
			</Freeze>
		);
	};
	return {Video, durationInFrames, Check, sceneCount: items.length};
};

// ナレーションは tts/narrate.py で生成 (public/narration/<動画>/, src/narration/<動画>.json)
export const narratedVideo = (
	scenes: [React.FC, number][],
	narration: {file: string; frames: number}[],
) => {
	if (scenes.length !== narration.length) {
		throw new Error(
			`シーン数 (${scenes.length}) とナレーション数 (${narration.length}) が一致しません。narrate.py で作り直してください`,
		);
	}
	return assemble(
		scenes.map(([Comp, base], i) => ({
			Play: () => (
				<>
					<Comp />
					<Sequence from={NARRATION_START}>
						<Audio src={staticFile(narration[i].file)} />
					</Sequence>
				</>
			),
			Still: Comp,
			duration: Math.max(base, NARRATION_START + narration[i].frames + NARRATION_TAIL),
		})),
	);
};

// 字幕は「。」「？」「！」で区切って 1 文ずつ出す。表示時間は 1 秒あたり READING_SPEED 文字
export const READING_SPEED = 4;
const MIN_CUE = 45;
const MAX_CUE_CHARS = 80; // 字幕の帯に 2 行で収まる文字数

type Cue = {text: string; from: number};

const Subtitles: React.FC<{cues: Cue[]}> = ({cues}) => {
	const frame = useCurrentFrame();
	// 次の文が出るまで前の文を出しておく (最後の文はシーンの終わりまで)
	const cue = [...cues].reverse().find((c) => frame >= c.from);
	if (!cue) return null;
	return (
		<div
			style={{
				position: 'absolute',
				left: 90,
				right: 90,
				bottom: 30,
				display: 'flex',
				justifyContent: 'center',
			}}
		>
			<div
				style={{
					background: 'rgba(0,0,0,0.72)',
					color: '#fff',
					fontFamily: FONT,
					fontSize: 40,
					lineHeight: 1.45,
					padding: '12px 28px',
					borderRadius: 12,
					textAlign: 'center',
					textWrap: 'balance',
					wordBreak: 'auto-phrase', // 日本語を文節の区切りで折り返す (lang="ja" が要る)
				}}
				lang="ja"
			>
				{cue.text}
			</div>
		</div>
	);
};

// 字幕は src/subtitles/<動画>.json (1 要素 = 1 シーンの原稿)
export const subtitledVideo = (scenes: [React.FC, number][], script: string[]) => {
	if (scenes.length !== script.length) {
		throw new Error(`シーン数 (${scenes.length}) と字幕の原稿数 (${script.length}) が一致しません`);
	}
	return assemble(
		scenes.map(([Comp, base], i) => {
			const sentences = script[i].split(/(?<=[。？！])/).map((s) => s.trim()).filter(Boolean);
			let from = NARRATION_START;
			const cues = sentences.map((text) => {
				if (text.length > MAX_CUE_CHARS) {
					throw new Error(`シーン ${i} の文が長すぎます (${text.length} 文字 > ${MAX_CUE_CHARS}): ${text}`);
				}
				const cue = {text, from};
				from += Math.max(MIN_CUE, Math.ceil((text.length / READING_SPEED) * 30));
				return cue;
			});
			const Scene: React.FC = () => (
				<>
					<Comp />
					<Subtitles cues={cues} />
				</>
			);
			return {Play: Scene, Still: Scene, duration: Math.max(base, from + NARRATION_TAIL)};
		}),
	);
};
