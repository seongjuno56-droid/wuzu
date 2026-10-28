/**
 * 화면 테스트 도우미 (react-test-renderer) — 테스트에서만 쓴다.
 * 글자·입력칸 안내 문구·접근성 이름으로 찾고, 누르기·글자 넣기를 흉내 낸다.
 */
import type { ReactElement } from 'react';
import { act, create, ReactTestInstance, ReactTestRenderer } from 'react-test-renderer';

const textOf = (n: ReactTestInstance): string =>
  n.children.map((c) => (typeof c === 'string' ? c : textOf(c))).join('');

export function render(el: ReactElement) {
  let r!: ReactTestRenderer;
  act(() => {
    r = create(el);
  });
  const root = () => r.root;
  const hosts = (type: string) => root().findAll((n) => n.type === type);
  const api = {
    rerender: (next: ReactElement) => act(() => r.update(next)),
    /** 그 글자를 그린 Text (정확히 같은 글자) */
    queryText: (text: string) => hosts('Text').find((n) => textOf(n) === text) ?? null,
    getText: (text: string) => {
      const n = api.queryText(text);
      if (!n)
        throw new Error(/* i18n-ignore */ `글자 없음: ${text}\n있는 글자: ${hosts('Text').map(textOf).join(' | ')}`);
      return n;
    },
    getByPlaceholder: (placeholder: string) => {
      const n = hosts('TextInput').find((x) => x.props.placeholder === placeholder);
      if (!n) throw new Error(/* i18n-ignore */ `입력칸 없음: ${placeholder}`);
      return n;
    },
    queryLabel: (label: string) =>
      root().findAll((n) => typeof n.type !== 'string' && n.props.accessibilityLabel === label)[0] ?? null,
    getLabel: (label: string) => {
      const n = api.queryLabel(label);
      if (!n) throw new Error(/* i18n-ignore */ `접근성 이름 없음: ${label}`);
      return n;
    },
  };
  return api;
}

/** 가장 가까운 onPress 를 누른다 */
export function press(n: ReactTestInstance) {
  let cur: ReactTestInstance | null = n;
  while (cur && typeof cur.props.onPress !== 'function') cur = cur.parent;
  if (!cur) throw new Error(/* i18n-ignore */ '누를 수 있는 곳이 없음');
  const target = cur;
  act(() => {
    target.props.onPress();
  });
}

export function changeText(input: ReactTestInstance, value: string) {
  act(() => {
    input.props.onChangeText(value);
  });
}
