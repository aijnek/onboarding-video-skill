import {Composition} from 'remotion';
import type {narratedVideo} from './ui';

// 作った動画をここに足す: import Overview from './videos/Overview'; → VIDEOS に {id: 'Overview', ...Overview}
const VIDEOS: ({id: string} & ReturnType<typeof narratedVideo>)[] = [];

export const Root: React.FC = () => (
	<>
		{VIDEOS.map((v) => (
			<Composition
				key={v.id}
				id={v.id}
				component={v.Video}
				durationInFrames={v.durationInFrames}
				width={1920}
				height={1080}
				fps={30}
				defaultProps={{}}
			/>
		))}
		{/* 崩れ確認用: npx remotion still <id>-check out/check/NN.png --props='{"scene":N}' */}
		{VIDEOS.map((v) => (
			<Composition
				key={`${v.id}-check`}
				id={`${v.id}-check`}
				component={v.Check}
				durationInFrames={v.durationInFrames} // Freeze の指定フレームが収まる長さが要る
				width={1920}
				height={1080}
				fps={30}
				defaultProps={{scene: 0}}
			/>
		))}
	</>
);
