/**
 * 다국어 — 한국어 원문을 키로 쓰고, 화면에 그릴 때 번역한다.
 * - Txt·IText·입력칸 안내 문구·하단 탭이 그릴 때 translate() 를 거친다 → 화면 코드는 한국어 그대로 둔다.
 * - 키에 {0},{1}… 이 있으면 패턴: 동적 문장(이름·숫자가 끼어든 문장)도 번역한다. 끼어든 값도 다시 번역을 시도한다.
 * - 사전에 없는 문구는 원문(한국어) 그대로 보인다. 빠진 번역은 i18n 테스트가 잡는다.
 * - 사용자가 쓴 내용(이름·인사말·캔버스 글자)은 번역 대상이 아니다(캔버스는 연결 텍스트만 번역).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';
import { useCallback } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { part1 } from './en/part1';
import { part2 } from './en/part2';
import { part3 } from './en/part3';
import { part4 } from './en/part4';

export type Locale = 'ko' | 'en';

/** 언어 선택지 — 이름은 그 언어로 쓴다 */
export const LOCALES: { value: Locale; label: string }[] = [
  { value: 'ko', label: '한국어' },
  { value: 'en', label: 'English' },
];

export const EN: Record<string, string> = { ...part1, ...part2, ...part3, ...part4 };
const DICTS: Record<Exclude<Locale, 'ko'>, Record<string, string>> = { en: EN };

const HANGUL = /[가-힣]/;

/** 기기 언어: 한국어면 ko, 그 밖은 en (해외 사용자 기본) */
export function deviceLocale(): Locale {
  try {
    return getLocales()[0]?.languageCode === 'ko' ? 'ko' : 'en';
  } catch {
    return 'ko';
  }
}

interface LocaleState {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

export const useLocale = create<LocaleState>()(
  persist(
    (set) => ({
      locale: deviceLocale(),
      setLocale: (locale) => set({ locale }),
    }),
    { name: 'wuzu.locale.v1', storage: createJSONStorage(() => AsyncStorage) },
  ),
);

/** 지금 언어 (컴포넌트 밖 — 날짜·시간 서식 등) */
export const currentLocale = (): Locale => useLocale.getState().locale;

// ── 패턴 키 ───────────────────────────────────────────

interface Pattern {
  re: RegExp;
  order: number[];
  value: string;
  /** 고정 글자 길이 — 길수록 먼저 맞춘다(더 구체적인 패턴 우선) */
  weight: number;
  /** 짧은 패턴: 끼어든 값이 숫자·기호여야만 */
  short: boolean;
}

/** 이보다 고정 글자가 짧은 패턴('{0}장', '{0}의 {1} {2}')은 아무 문장에나 걸리므로 끼어든 값이 숫자·기호일 때만 쓴다 */
const MIN_PATTERN_TEXT = 4;
/** 끼어든 값으로 허용: 숫자·기호(금액·날짜·개수). 그 밖은 사전의 정확한 키(공지 제목 등)일 때만 */
const SAFE_CAPTURE = /^[\d\s.,:~/()\-+–₩%#]*$/;

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function compilePatterns(dict: Record<string, string>): Pattern[] {
  const out: Pattern[] = [];
  for (const [key, value] of Object.entries(dict)) {
    if (!/\{\d+\}/.test(key)) continue;
    const order: number[] = [];
    const parts = key.split(/(\{\d+\})/);
    const body = parts
      .map((p) => {
        const m = /^\{(\d+)\}$/.exec(p);
        if (m) {
          order.push(Number(m[1]));
          return '([\\s\\S]*?)';
        }
        return escape(p);
      })
      .join('');
    const weight = key.replace(/\{\d+\}/g, '').trim().length;
    out.push({ re: new RegExp(`^${body}$`), order, value, weight, short: weight < MIN_PATTERN_TEXT });
  }
  return out.sort((a, b) => b.weight - a.weight);
}

const patternCache: Partial<Record<Locale, Pattern[]>> = {};
const resultCache: Partial<Record<Locale, Map<string, string>>> = {};

function lookup(core: string, locale: Exclude<Locale, 'ko'>, depth: number): string | null {
  const dict = DICTS[locale];
  if (core in dict) return dict[core];
  const patterns = (patternCache[locale] ??= compilePatterns(dict));
  for (const p of patterns) {
    const m = p.re.exec(core);
    if (!m) continue;
    // 끼어든 값이 사용자 글(임의 문장)이면 이 패턴이 아니다 — 숫자·기호이거나 사전의 정확한 키여야 한다
    if (!m.slice(1).every((c) => SAFE_CAPTURE.test(c) || (!p.short && c.trim() in dict))) continue;
    // 짧은 패턴은 빈 값으로 맞으면 안 된다 ('장' 이 '{0}장' 에 걸리지 않게)
    if (p.short && m.slice(1).some((c) => !c.trim())) continue;
    return p.value.replace(/\{(\d+)\}/g, (_, n: string) => {
      const captured = m[p.order.indexOf(Number(n)) + 1] ?? '';
      // 사전의 정확한 키(공지 제목 등)였으면 그것도 번역
      return depth < 2 ? translateText(captured, locale, depth + 1) : captured;
    });
  }
  return null;
}

function translateText(text: string, locale: Locale, depth = 0): string {
  if (locale === 'ko' || !HANGUL.test(text)) return text;
  const cache = (resultCache[locale] ??= new Map());
  const hit = cache.get(text);
  if (hit !== undefined) return hit;
  // 앞뒤 공백은 그대로 두고 가운데만 번역 (JSX 에서 {값} 앞뒤로 갈라진 조각)
  const lead = /^\s*/.exec(text)![0];
  const trail = /\s*$/.exec(text)![0];
  const core = text.slice(lead.length, text.length - trail.length);
  const found = lookup(core, locale, depth);
  const out = found === null ? text : `${lead}${found}${trail}`;
  if (depth === 0) {
    // 입력 중인 글처럼 끝없이 쌓이지 않게 상한
    if (cache.size > 2000) cache.clear();
    cache.set(text, out);
  }
  return out;
}

/** 문구 번역 (언어를 직접 지정) */
export const translate = (text: string, locale: Locale) => translateText(text, locale);

/** 문구 번역 (지금 언어) — 컴포넌트 밖에서 */
export const t = (text: string) => translateText(text, currentLocale());

/** 화면용: 언어가 바뀌면 다시 그려지도록 구독 */
export function useT() {
  const locale = useLocale((s) => s.locale);
  return useCallback((text: string) => translateText(text, locale), [locale]);
}

/** React children 안의 문자열 조각을 번역 (숫자·요소는 그대로) */
export function translateChildren<T>(children: T, locale: Locale): T {
  if (locale === 'ko') return children;
  if (typeof children === 'string') return translateText(children, locale) as T;
  if (Array.isArray(children)) return children.map((c) => (typeof c === 'string' ? translateText(c, locale) : c)) as T;
  return children;
}
