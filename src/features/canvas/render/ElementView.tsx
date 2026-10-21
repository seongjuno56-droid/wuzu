import { Image } from 'expo-image';
import { ReactNode, useState } from 'react';
import { LayoutChangeEvent, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { ICON_SOURCES, Icon3DName } from '../../../components/brand/Icon3D';
import { translate, useLocale } from '../../../i18n';
import type { InvitationContent } from '../../invitation/model';
import { CANVAS_FONTS, resolveBind, SLIDE_RATIO } from '../model';
import type { CanvasElement } from '../types';
import { BrokenMedia } from './BrokenMedia';
import { VideoElement } from './VideoElement';

/** 미디어·스티커·선의 높이(px). 텍스트는 글자 수에 따라 정해지므로 null */
export function elementHeight(el: CanvasElement, slideW: number): number | null {
  return el.kind === 'text' || el.kind === 'bound' ? null : el.w * slideW * el.aspect;
}

const SHAPE_RADIUS = { rect: 0, rounded: 0.08, circle: 0.5 } as const;

/** 요소 종류별 내용 (위치는 ElementView 가 정한다) */
export function ElementContent({
  el,
  content,
  slideW,
  onLayout,
}: {
  el: CanvasElement;
  content: InvitationContent;
  slideW: number;
  onLayout?: (e: LayoutChangeEvent) => void;
}) {
  const [broken, setBroken] = useState(false);
  const locale = useLocale((s) => s.locale);
  const width = el.w * slideW;
  const height = elementHeight(el, slideW) ?? 0;

  if (el.kind === 'text' || el.kind === 'bound') {
    // 연결 텍스트는 지금 언어로(날짜·안내 글자), 직접 쓴 텍스트는 사용자 내용이라 그대로
    const bound = el.kind === 'bound' ? resolveBind(el.bind, content) : null;
    // 이름·예식장은 사용자 글이라 그대로, 비어 있을 때의 안내 문구만 번역 (날짜는 resolveBind 가 언어별로 만든다)
    const resolved = bound
      ? { ...bound, text: bound.placeholder ? translate(bound.text, locale) : bound.text }
      : { text: el.kind === 'text' ? el.text : '', placeholder: false };
    const fontSize = el.size * slideW;
    return (
      <Text
        onLayout={onLayout}
        style={{
          width,
          fontFamily: CANVAS_FONTS[el.font].family,
          fontSize,
          lineHeight: Math.round(fontSize * 1.5),
          color: el.color,
          textAlign: el.align,
          opacity: resolved.placeholder ? 0.45 : 1,
        }}
      >
        {resolved.text}
      </Text>
    );
  }

  let node: ReactNode;
  if (broken) {
    node = <BrokenMedia width={width} height={height} />;
  } else if (el.kind === 'image' || el.kind === 'gif') {
    const radius = el.kind === 'image' ? SHAPE_RADIUS[el.shape] * Math.min(width, height) : 0;
    node = (
      <Image
        source={{ uri: el.uri }}
        style={{ width, height, borderRadius: radius }}
        contentFit="cover"
        autoplay
        onError={() => setBroken(true)}
      />
    );
  } else if (el.kind === 'video') {
    node = <VideoElement uri={el.uri} width={width} height={height} />;
  } else if (el.kind === 'sticker') {
    const source = ICON_SOURCES[el.icon as Icon3DName];
    node = source ? (
      <Image source={source} style={{ width, height }} contentFit="contain" />
    ) : (
      <BrokenMedia width={width} height={height} />
    );
  } else {
    // 선: 상자 대비 좌표를 viewBox(폭 1) 에 그려서 크기를 바꾸면 굵기도 같이 바뀐다
    const d = el.points.reduce(
      (acc, v, i) => (i % 2 === 0 ? `${acc}${i === 0 ? 'M' : ' L'}${v} ` : `${acc}${v * el.aspect}`),
      '',
    );
    node = (
      <Svg width={width} height={height} viewBox={`0 0 1 ${el.aspect}`} style={{ overflow: 'visible' }}>
        <Path
          d={d}
          stroke={el.color}
          strokeWidth={el.width / el.w}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </Svg>
    );
  }
  return (
    <View onLayout={onLayout} style={{ width, height }}>
      {node}
    </View>
  );
}

/**
 * 위치 상자: 높이 0 인 줄을 요소 중심 y 에 두고 내용을 세로 가운데로 넘치게 둔다.
 * 그래서 텍스트처럼 높이를 모르는 요소도 중심 좌표로 놓이고, 회전도 중심 기준이 된다.
 */
export function ElementView({
  el,
  content,
  slideW,
  children,
}: {
  el: CanvasElement;
  content: InvitationContent;
  slideW: number;
  children?: ReactNode;
}) {
  const width = el.w * slideW;
  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        left: el.x * slideW - width / 2,
        top: el.y * slideW * SLIDE_RATIO,
        width,
        height: 0,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'visible',
        transform: [{ rotate: `${el.rotation}deg` }],
      }}
    >
      {children ?? <ElementContent el={el} content={content} slideW={slideW} />}
    </View>
  );
}
