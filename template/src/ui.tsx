// シリーズの動画で共通に使う部品と、場面の組み立て。
// 見た目: 黒に近い背景、細い線、図形は「描かれ」、文字は「書き出される」。
// 画面は 1920×1080。要素は座標で置く (Abs / DrawBox など)。Code / FileTree / Table は、
// 置く座標から行・セル・語の位置を返すレイアウト (codeLayout など) と組で使う
import {AbsoluteFill, Audio, Easing, Freeze, interpolate, Sequence, Series, staticFile, useCurrentFrame} from 'remotion';
import {SERIES, SeriesId} from './series';

export const C = {
	bg: '#111316',
	ink: '#e8eaed',
	muted: '#8b929c',
	faint: '#3a3f47',
	blue: '#58c4dd',
	yellow: '#f2d16b',
	brown: '#c8a07a',
	green: '#83c167',
	red: '#fc6255',
};
export const FONT = '"Hiragino Sans", "Noto Sans JP", sans-serif';
export const MONO = 'Menlo, monospace';
export const LINE = 2.5; // 線の太さ
export const CW = 0.602; // MONO の 1 文字の幅 (em)

// 出入りのゆるい動き
export const ease = Easing.bezier(0.45, 0, 0.25, 1);
const clampEase = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease} as const;
// start から length フレームかけて 0 → 1。ループの中ではフックでない progress を使う
export const progress = (frame: number, start: number, length = 20) =>
	interpolate(frame, [start, start + length], [0, 1], clampEase);
export const useT = (start: number, length = 20) => progress(useCurrentFrame(), start, length);
// キーフレーム [フレーム, 値] の間を ease でつなぐ
export const useKeys = (keys: [number, number][]) => {
	const k = keys.length > 1 ? keys : [...keys, [keys[0][0] + 1, keys[0][1]] as [number, number]];
	return interpolate(useCurrentFrame(), k.map((x) => x[0]), k.map((x) => x[1]), clampEase);
};
export const mix = (t: number, a: number, b: number) => a + (b - a) * t;

// ---------------------------------------------------------------- 描く・書き出す・入れ替える・飛ぶ

export const Abs: React.FC<{x: number; y: number; w?: number; style?: React.CSSProperties; children: React.ReactNode}> = ({
	x,
	y,
	w,
	style,
	children,
}) => <div style={{position: 'absolute', left: x, top: y, width: w, whiteSpace: 'pre', ...style}}>{children}</div>;

// 枠線を一筆で描き、描き終わりにかけて中身を出す。中身は既定で中央寄せ
export const DrawBox: React.FC<{
	at: number;
	x: number;
	y: number;
	w: number;
	h: number;
	len?: number;
	color?: string;
	dashed?: boolean;
	style?: React.CSSProperties;
	children?: React.ReactNode;
}> = ({at, x, y, w, h, len = 30, color = C.faint, dashed, style, children}) => {
	const frame = useCurrentFrame();
	const p = progress(frame, at, len);
	const fill = progress(frame, at + len * 0.5, len * 0.6);
	return (
		<div style={{position: 'absolute', left: x, top: y, width: w, height: h}}>
			<svg style={{position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible'}}>
				<rect
					width="100%"
					height="100%"
					rx={8}
					fill="none"
					stroke={color}
					strokeWidth={LINE}
					pathLength={1}
					strokeDasharray={dashed ? undefined : '1 1'}
					strokeDashoffset={dashed ? undefined : 1 - p}
					style={dashed ? {strokeDasharray: '10 8', opacity: p} : {opacity: p > 0 ? 1 : 0}}
				/>
			</svg>
			<div
				style={{
					position: 'relative',
					height: '100%',
					display: 'flex',
					flexDirection: 'column',
					alignItems: 'center',
					justifyContent: 'center',
					opacity: fill,
					...style,
				}}
			>
				{children}
			</div>
		</div>
	);
};

// 文字を先頭から順に、輪郭 → 塗りの順で書き出す (Manim の Write に近い)
export const Write: React.FC<{text: string; at: number; len?: number; color?: string; style?: React.CSSProperties}> = ({
	text,
	at,
	len,
	color = C.ink,
	style,
}) => {
	const frame = useCurrentFrame();
	const chars = [...text];
	const total = len ?? Math.min(40, 8 + chars.length * 1.2);
	const head = ((frame - at) / total) * (chars.length + 3);
	return (
		<span style={{whiteSpace: 'pre', ...style}}>
			{chars.map((ch, i) => {
				const t = Math.max(0, Math.min(1, (head - i) / 3));
				const alpha = Math.round(Math.max(0, t * 2 - 1) * 255)
					.toString(16)
					.padStart(2, '0');
				return (
					<span
						key={i}
						style={{opacity: t > 0 ? 1 : 0, color: `${color}${alpha}`, WebkitTextStroke: t < 1 ? `1px ${color}` : undefined}}
					>
						{ch}
					</span>
				);
			})}
		</span>
	);
};

// 線・矢印を置く画面全体の SVG
export const Svg: React.FC<{children: React.ReactNode}> = ({children}) => (
	<svg style={{position: 'absolute', inset: 0, width: 1920, height: 1080, overflow: 'visible'}}>{children}</svg>
);

// 線 (と矢印) を描く。Svg の中に置く
export const DrawLine: React.FC<{
	points: [number, number][];
	at: number;
	len?: number;
	color?: string;
	arrow?: boolean;
}> = ({points, at, len = 25, color = C.muted, arrow}) => {
	const p = useT(at, len);
	if (p <= 0) return null;
	const d = points.map(([x, y], i) => `${i ? 'L' : 'M'}${x},${y}`).join(' ');
	const [x1, y1] = points[points.length - 2];
	const [x2, y2] = points[points.length - 1];
	const angle = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
	return (
		<g>
			<path d={d} fill="none" stroke={color} strokeWidth={LINE} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - p} />
			{arrow ? (
				<path
					d="M-18,-9 L0,0 L-18,9"
					fill="none"
					stroke={color}
					strokeWidth={LINE}
					transform={`translate(${x2},${y2}) rotate(${angle})`}
					opacity={Math.max(0, p * 5 - 4)}
				/>
			) : null}
		</g>
	);
};

// 文字の入れ替え: 古い文字が上へ抜け、新しい文字が下から入る。
// 幅は長いほうの文字に合わせる。中央寄せの箱の中では align="center" にする (短いほうが左にずれないように)。
// 古い文字は最初から見えている。場面の途中で書き出してから入れ替えるときは、writeAt に書き出すフレームを渡す
export const Swap: React.FC<{
	from: string;
	to: string;
	at: number;
	len?: number;
	fromColor?: string;
	toColor?: string;
	align?: 'left' | 'center';
	writeAt?: number;
	style?: React.CSSProperties;
}> = ({from, to, at, len = 18, fromColor = C.ink, toColor = C.yellow, align = 'left', writeAt, style}) => {
	const t = useT(at, len);
	const pos = {position: 'absolute', left: 0, right: 0, top: 0, textAlign: align} as const;
	return (
		<span style={{position: 'relative', display: 'inline-block', whiteSpace: 'pre', ...style}}>
			<span style={{visibility: 'hidden'}}>{from.length > to.length ? from : to}</span>
			<span style={{...pos, color: fromColor, opacity: 1 - t, transform: `translateY(${-t * 0.6}em)`}}>
				{writeAt === undefined ? from : <Write text={from} at={writeAt} color={fromColor} />}
			</span>
			<span style={{...pos, color: toColor, opacity: t, transform: `translateY(${(1 - t) * 0.6}em)`}}>
				{to}
			</span>
		</span>
	);
};

// 物体の移動: at から from → to へ、少し弧を描いて飛ぶ。scale で大きさも変える (左上が基準)
export const Fly: React.FC<{
	at: number;
	from: [number, number];
	to: [number, number];
	len?: number;
	scale?: [number, number];
	arc?: number;
	style?: React.CSSProperties;
	children: React.ReactNode;
}> = ({at, from, to, len = 28, scale = [1, 1], arc = 60, style, children}) => {
	const frame = useCurrentFrame();
	if (frame < at) return null;
	const t = progress(frame, at, len);
	return (
		<div
			style={{
				position: 'absolute',
				left: mix(t, from[0], to[0]),
				top: mix(t, from[1], to[1]) - Math.sin(Math.PI * t) * arc,
				transform: `scale(${mix(t, scale[0], scale[1])})`,
				transformOrigin: '0 0',
				whiteSpace: 'pre',
				...style,
			}}
		>
			{children}
		</div>
	);
};

// ---------------------------------------------------------------- コード・ファイル構成・表

// コードを (x, y) に置いたときの、行と語の位置。Fly の飛び先・飛び元に使う
export const codeLayout = (x: number, y: number, size = 28) => {
	const lh = Math.round(size * 1.6);
	return {
		x,
		y,
		size,
		lh,
		lineY: (row: number) => y + row * lh,
		// line の中の token (n 番目) の左端の x
		tokenX: (line: string, token: string, nth = 0) => {
			let i = -1;
			for (let k = 0; k <= nth; k++) i = line.indexOf(token, i + 1);
			if (i < 0) throw new Error(`"${token}" が行にありません: ${line}`);
			return x + i * CW * size;
		},
	};
};
export type CodeLayout = ReturnType<typeof codeLayout>;

// 1 行: 文字列か、{text, at (書き出し), color, row (行の位置。小数可。割り込みで押し下げるとき)}
export type CodeLine = string | {text: string; at?: number; color?: string; row?: number};

// コードの抜粋。at から 1 行ずつ書き出す。bar は強調の帯のキーフレーム [フレーム, 行, 行数]
export const Code: React.FC<{
	layout: CodeLayout;
	lines: CodeLine[];
	at: number;
	step?: number;
	label?: string;
	bar?: [number, number, number][];
	dim?: number; // 0〜1。ほかに注目させたいときに薄くする
}> = ({layout: L, lines, at, step = 5, label, bar = [[1e9, 0, 1]], dim = 0}) => {
	const frame = useCurrentFrame();
	const row = useKeys(bar.map((b) => [b[0], b[1]]));
	const rows = useKeys(bar.map((b) => [b[0], b[2]]));
	const barIn = progress(frame, bar[0][0], 12);
	const items = lines.map((l, i) => (typeof l === 'string' ? {text: l} : l));
	const width = Math.max(...items.map((l) => l.text.length)) * CW * L.size + 40;
	return (
		<div style={{fontFamily: MONO, fontSize: L.size, lineHeight: `${L.lh}px`, opacity: 1 - 0.7 * dim}}>
			{label ? (
				<Abs x={L.x} y={L.y - 44} style={{fontFamily: FONT, fontSize: 24}}>
					<Write text={label} at={at - 5} color={C.muted} />
				</Abs>
			) : null}
			<div
				style={{
					position: 'absolute',
					left: L.x - 20,
					top: L.lineY(row),
					width,
					height: rows * L.lh,
					background: 'rgba(242,209,107,0.10)',
					borderLeft: `4px solid ${C.yellow}`,
					opacity: barIn,
				}}
			/>
			{items.map((l, i) => (
				<Abs key={i} x={L.x} y={L.lineY(l.row ?? i)}>
					<Write text={l.text} at={l.at ?? at + i * step} len={Math.min(30, 6 + l.text.length * 0.4)} color={l.color} />
				</Abs>
			))}
		</div>
	);
};

// ファイル構成を (x, y) に置いたときの、行と名前の位置
export const treeLayout = (x: number, y: number, size = 30) => {
	const lh = Math.round(size * 1.7);
	return {
		x,
		y,
		size,
		lh,
		rowY: (row: number) => y + row * lh,
		nameX: (depth = 0) => x + depth * size * 1.4,
	};
};
export type TreeLayout = ReturnType<typeof treeLayout>;

// ファイル構成。at から 1 行ずつ書き出す。color でその行を強調する
export const FileTree: React.FC<{
	layout: TreeLayout;
	entries: {path: string; depth?: number; note?: string; color?: string}[];
	at: number;
	step?: number;
}> = ({layout: L, entries, at, step = 8}) => (
	<div style={{fontSize: L.size, lineHeight: `${L.lh}px`}}>
		{entries.map((e, i) => (
			<Abs key={i} x={L.nameX(e.depth)} y={L.rowY(i)}>
				<Write text={e.path} at={at + i * step} color={e.color} style={{fontFamily: MONO}} />
				{e.note ? (
					<span style={{fontSize: L.size * 0.8, marginLeft: L.size}}>
						<Write text={e.note} at={at + i * step + 8} color={C.muted} />
					</span>
				) : null}
			</Abs>
		))}
	</div>
);

// 表を (x, y) に置いたときの、セルと行の位置。cols は各列の幅 (px)
export const tableLayout = (x: number, y: number, cols: number[], size = 28) => {
	const pad = 28;
	const head = Math.round(size * 0.85 * 1.6) + 24;
	const rowH = Math.round(size * 2.1);
	const w = pad * 2 + cols.reduce((a, b) => a + b, 0);
	return {
		x,
		y,
		w,
		size,
		cellX: (col: number) => x + pad + cols.slice(0, col).reduce((a, b) => a + b, 0),
		headY: y + 14,
		// 行 (0 始まり) の文字の上端
		rowY: (row: number) => y + head + row * rowH + (rowH - size * 1.6) / 2,
		// 行を囲む枠 (強調や、点線で「まだない行」を示すのに使う)
		rowBox: (row: number) => ({x: x + 12, y: y + head + row * rowH + 4, w: w - 24, h: rowH - 8}),
		height: (rows: number) => head + rows * rowH + 10,
	};
};
export type TableLayout = ReturnType<typeof tableLayout>;

// 表。枠を at で描き、行は rows[i].at で書き出す (行が増えると枠も伸びる)。
// セルに文字列以外 (Swap など) を渡すと、そのまま置く
export const Table: React.FC<{
	layout: TableLayout;
	head: string[];
	rows: {cells: React.ReactNode[]; at: number}[];
	at: number;
	label?: string;
}> = ({layout: L, head, rows, at, label}) => {
	const frame = useCurrentFrame();
	const shown = rows.reduce((n, r) => n + progress(frame, r.at - 15, 15), 0);
	return (
		<div style={{fontFamily: MONO, fontSize: L.size, lineHeight: 1.6}}>
			{label ? (
				<Abs x={L.x} y={L.y - 44} style={{fontSize: 26}}>
					<Write text={label} at={at} color={C.blue} />
				</Abs>
			) : null}
			<DrawBox at={at} x={L.x} y={L.y} w={L.w} h={L.height(shown)} len={25} />
			{head.map((h, c) => (
				<Abs key={h} x={L.cellX(c)} y={L.headY} style={{fontSize: L.size * 0.85}}>
					<Write text={h} at={at + 6 + c * 4} color={C.muted} />
				</Abs>
			))}
			{rows.map((r, i) =>
				r.cells.map((cell, c) => (
					<Abs key={`${i}-${c}`} x={L.cellX(c)} y={L.rowY(i)}>
						{typeof cell === 'string' ? <Write text={cell} at={r.at + c * 5} /> : frame >= r.at ? cell : null}
					</Abs>
				)),
			)}
		</div>
	);
};

// ---------------------------------------------------------------- タイトルと次のステップ

// シリーズの動画の冒頭: タイトルと、シリーズの中の現在地
export const SeriesTitle: React.FC<{current: SeriesId; subtitle: string}> = ({current, subtitle}) => {
	const index = SERIES.findIndex((s) => s.id === current);
	const top = 540 - (SERIES.length * 64) / 2;
	return (
		<AbsoluteFill>
			<Abs x={140} y={330} style={{fontFamily: MONO, fontSize: 36}}>
				<Write text={`${index + 1} / ${SERIES.length}`} at={10} color={C.yellow} />
			</Abs>
			<Abs x={140} y={390} style={{fontSize: SERIES[index].title.length > 9 ? 80 : 100, fontWeight: 600}}>
				<Write text={SERIES[index].title} at={18} len={30} />
			</Abs>
			<Abs x={140} y={560} style={{fontSize: 40}}>
				<Write text={subtitle} at={45} color={C.muted} />
			</Abs>
			{SERIES.map((s, i) => {
				const on = i === index;
				return (
					<div key={s.id}>
						{on ? <DrawBox at={40} x={1130} y={top + i * 64 - 8} w={650} h={60} color={C.yellow} /> : null}
						<Abs x={1160} y={top + i * 64} style={{fontSize: 32, fontWeight: on ? 600 : 300}}>
							<span style={{fontFamily: MONO, display: 'inline-block', width: 56}}>
								<Write text={`${i + 1}`} at={20 + i * 4} color={on ? C.yellow : C.muted} />
							</span>
							<Write text={s.title} at={22 + i * 4} color={on ? C.ink : i < index ? C.faint : C.muted} />
						</Abs>
					</div>
				);
			})}
		</AbsoluteFill>
	);
};

// シリーズの動画の最後: 次に読むコードと、次の動画
export const NextUp: React.FC<{current: SeriesId; files: {path: string; note: string}[]}> = ({current, files}) => {
	const index = SERIES.findIndex((s) => s.id === current);
	const next = SERIES[index + 1];
	return (
		<AbsoluteFill>
			<Abs x={140} y={250} style={{fontSize: 30}}>
				<Write text="次に読むコード" at={10} color={C.muted} />
			</Abs>
			{files.map((f, i) => (
				<div key={f.path}>
					<Abs x={140} y={320 + i * 120} style={{fontFamily: MONO, fontSize: 36}}>
						<Write text={f.path} at={25 + i * 15} />
					</Abs>
					<Abs x={140} y={370 + i * 120} style={{fontSize: 28}}>
						<Write text={f.note} at={35 + i * 15} color={C.muted} />
					</Abs>
				</div>
			))}
			<DrawBox at={40} x={1100} y={300} w={680} h={280} color={C.yellow}>
				{next ? (
					<>
						<div style={{fontSize: 30}}>
							<Write text="次の動画" at={60} color={C.muted} />
						</div>
						<div style={{fontFamily: MONO, fontSize: 36, marginTop: 14}}>
							<Write text={`${index + 2} / ${SERIES.length}`} at={66} color={C.yellow} />
						</div>
						<div style={{fontSize: 48, fontWeight: 600, marginTop: 8}}>
							<Write text={next.title} at={72} />
						</div>
					</>
				) : (
					<>
						<div style={{fontFamily: MONO, fontSize: 36}}>
							<Write text={`${SERIES.length} / ${SERIES.length}`} at={60} color={C.yellow} />
						</div>
						<div style={{fontSize: 52, fontWeight: 600, marginTop: 8}}>
							<Write text="シリーズ完了" at={66} />
						</div>
						<div style={{fontSize: 30, marginTop: 12}}>
							<Write text="おつかれさまでした" at={80} color={C.muted} />
						</div>
					</>
				)}
			</DrawBox>
		</AbsoluteFill>
	);
};

// ---------------------------------------------------------------- 場面の組み立て

// 1 行の長さ = 前の余白 + ナレーション + 後ろの余白。scripts/srt.mjs も同じ値で行の区切りを計算する
export const NARRATION_START = 10;
export const NARRATION_TAIL = 30;
const FADE_OUT = 20; // 場面の終わりに、物体を消す長さ (最後の行の後ろの余白に収まる)

// 場面: ナレーション数行分の連続した画面。t[i] は場面の中での i 行目の開始フレーム
export type Scene = React.FC<{t: number[]}>;
type Narration = {file: string; frames: number}[];

const FadeOut: React.FC<{duration: number; children: React.ReactNode}> = ({duration, children}) => (
	<AbsoluteFill style={{opacity: 1 - useT(duration - FADE_OUT, FADE_OUT)}}>{children}</AbsoluteFill>
);

// ナレーションは tts/narrate.py で生成 (public/narration/<動画>/, src/narration/<動画>.json)。
// scenes は [場面, その場面が使うナレーションの行数] の並び
export const video = (scenes: [Scene, number][], narration: Narration) => {
	const used = scenes.reduce((n, [, lines]) => n + lines, 0);
	if (used !== narration.length) {
		throw new Error(`場面が使う行数の合計 (${used}) とナレーションの行数 (${narration.length}) が一致しません`);
	}
	let next = 0;
	const items = scenes.map(([Comp, lines]) => {
		const own = narration.slice(next, next + lines);
		next += lines;
		const lens = own.map((n) => NARRATION_START + n.frames + NARRATION_TAIL);
		const t = lens.map((_, i) => lens.slice(0, i).reduce((a, b) => a + b, 0));
		return {Comp, own, t, duration: lens.reduce((a, b) => a + b, 0)};
	});
	const durationInFrames = items.reduce((n, s) => n + s.duration, 0);

	const Video: React.FC = () => (
		<AbsoluteFill style={{background: C.bg, color: C.ink, fontFamily: FONT, fontWeight: 300}}>
			<Series>
				{items.map(({Comp, own, t, duration}, i) => (
					<Series.Sequence key={i} durationInFrames={duration}>
						<FadeOut duration={duration}>
							<Comp t={t} />
						</FadeOut>
						{own.map((n, k) => (
							<Sequence key={n.file} from={t[k] + NARRATION_START}>
								<Audio src={staticFile(n.file)} />
							</Sequence>
						))}
					</Series.Sequence>
				))}
			</Series>
		</AbsoluteFill>
	);
	// 動きの確認用: フレーム i に、i 行目の 6 コマ (行の頭から、物体が消え始める手前まで) を 3x2 に並べる。
	// コンポジションの長さを超える位置の Sequence は描かれないので、長さは動画と同じにし、先頭の行数分だけ書き出す
	const lines = items.flatMap((s, i) =>
		s.own.map((n, k) => ({
			start: items.slice(0, i).reduce((a, b) => a + b.duration, 0) + s.t[k],
			last: NARRATION_START + n.frames + 9,
		})),
	);
	const Sheet: React.FC = () => {
		const {start, last} = lines[Math.min(useCurrentFrame(), lines.length - 1)];
		return (
			<AbsoluteFill style={{background: '#fff'}}>
				{[0, 1, 2, 3, 4, 5].map((k) => (
					<div
						key={k}
						style={{
							position: 'absolute',
							left: (k % 3) * (SHEET.cell + SHEET.gap),
							top: Math.floor(k / 3) * (SHEET.cell * (9 / 16) + SHEET.gap),
							width: 1920,
							height: 1080,
							transform: `scale(${SHEET.cell / 1920})`,
							transformOrigin: '0 0',
							overflow: 'hidden',
						}}
					>
						<Freeze frame={start + Math.round((k * last) / 5)}>
							<Video />
						</Freeze>
					</div>
				))}
			</AbsoluteFill>
		);
	};
	return {Video, durationInFrames, Sheet};
};

export const SHEET = {cell: 640, gap: 8, width: 640 * 3 + 16, height: 360 * 2 + 8};
