// シリーズの目次 (承認したジャーニーの順)。各動画の「現在地」表示と「次の動画」案内に使う。
// id は Composition の id (英数字) と src/videos/<id>.tsx のファイル名を兼ねる
export const SERIES = [
	{id: 'Overview', title: '全体像'},
] as const;

export type SeriesId = (typeof SERIES)[number]['id'];
