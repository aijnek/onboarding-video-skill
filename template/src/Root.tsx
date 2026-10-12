import {Composition} from 'remotion';
import {SHEET, type video} from './ui';

// 作った動画をここに足す: import Overview from './videos/Overview'; → VIDEOS に {id: 'Overview', ...Overview}
const VIDEOS: ({id: string} & ReturnType<typeof video>)[] = [];

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
		{/* 動きの確認用: npx remotion render <id>-sheet out/check/<id> --sequence --image-format=png --frames=0-<行数-1> */}
		{VIDEOS.map((v) => (
			<Composition
				key={`${v.id}-sheet`}
				id={`${v.id}-sheet`}
				component={v.Sheet}
				durationInFrames={v.durationInFrames}
				width={SHEET.width}
				height={SHEET.height}
				fps={30}
				defaultProps={{}}
			/>
		))}
	</>
);
