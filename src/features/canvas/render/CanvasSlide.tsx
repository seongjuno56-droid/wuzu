import { Image } from 'expo-image';
import { Fragment, ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import type { InvitationContent } from '../../invitation/model';
import { SLIDE_RATIO } from '../model';
import type { CanvasDoc, CanvasElement } from '../types';
import { ElementView } from './ElementView';

interface Props {
  doc: CanvasDoc;
  content: InvitationContent;
  /** 배경이 '템플릿 기본'일 때 색 */
  templateBg: string;
  width: number;
  /** 편집기: 각 요소를 제스처 래퍼로 감싼다 */
  renderElement?: (el: CanvasElement) => ReactNode;
  /** 편집기: 요소 위에 덮는 층 (가이드선·펜) */
  overlay?: ReactNode;
}

/** 9:16 캔버스 한 장 — 형식 표지·캔버스 표지·편집기·하객 보기가 같이 쓴다 */
export function CanvasSlide({ doc, content, templateBg, width, renderElement, overlay }: Props) {
  const height = Math.round(width * SLIDE_RATIO);
  const bg = doc.background;
  return (
    <View style={[styles.slide, { width, height, backgroundColor: bg.kind === 'color' ? bg.color : templateBg }]}>
      {bg.kind === 'image' && <Image source={{ uri: bg.uri }} style={StyleSheet.absoluteFill} contentFit="cover" />}
      {doc.elements.map((el) => (
        <Fragment key={el.id}>
          {renderElement ? renderElement(el) : <ElementView el={el} content={content} slideW={width} />}
        </Fragment>
      ))}
      {overlay}
    </View>
  );
}

const styles = StyleSheet.create({
  slide: { overflow: 'hidden' },
});
