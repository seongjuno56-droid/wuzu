import Svg, { Path, Rect } from 'react-native-svg';

import { colors } from '../../theme';

interface Props {
  width: number;
  /** 뚜껑을 연 상태로 그릴지 */
  open?: boolean;
  body?: string;
  flap?: string;
}

/** 일러스트용 정적 봉투. 비율 1 : 0.64 */
export function Envelope({ width, open, body = '#EDEDED', flap = '#D6D6D6' }: Props) {
  const w = 320;
  const h = 205;
  return (
    <Svg width={width} height={(width * (open ? h + 110 : h)) / w} viewBox={`0 ${open ? -110 : 0} ${w} ${open ? h + 110 : h}`}>
      {open && <Path d={`M8 2 L160 -104 L312 2 Z`} fill={flap} />}
      <Rect x={0} y={0} width={w} height={h} rx={14} fill={body} />
      {/* 앞주머니 사선 */}
      <Path d={`M2 ${h - 4} L160 92 L318 ${h - 4}`} stroke={flap} strokeWidth={3} fill="none" />
      {!open && <Path d={`M4 4 L160 112 L316 4`} fill={flap} />}
    </Svg>
  );
}
