import { Image, StyleSheet } from 'react-native';

import { radius } from '../../../theme';
import { guardianNames } from '../dol';
import { asWedding, givenName, InvitationContent, isDol, Person } from '../model';
import { IText, Page, PageTitle } from './look';

/** "홍철수 · 이순자의 아들 홍길동" — 故人이면 이름 앞에 故 */
function familyLine(father: Person, mother: Person, child: Person): string | null {
  const parents = [father, mother]
    .filter((p) => p.name.trim())
    .map((p) => `${p.deceased ? '故 ' : ''}${p.name.trim()}`);
  if (!child.name.trim()) return null;
  // 부모님 정보가 없으면 '딸 성춘향'처럼 어색해지므로 이름만 쓴다
  return parents.length ? `${parents.join(' · ')}의 ${child.title} ${child.name}` : child.name;
}

/** 인사말 아래 이름 줄과 서명 — 테마별 */
function namesFor(content: InvitationContent): { lines: string[]; signature: string | null } {
  if (isDol(content)) {
    const b = content.basic;
    // 돌잔치: '아빠 이윤종 · 엄마 이다영' 한 줄, 서명은 '이윤종 · 이다영 드림.'
    const line = b.guardians
      .filter((g) => g.name.trim())
      .map((g) => `${g.relation.trim()} ${g.name.trim()}`.trim())
      .join(' · ');
    const names = guardianNames(b);
    return {
      lines: line ? [line] : [],
      signature: content.greeting.appendNames && names ? /* i18n-ignore */ `${names} 드림.` : null,
    };
  }
  const { basic, greeting } = asWedding(content);
  const lines = [
    familyLine(basic.groomFather, basic.groomMother, basic.groom),
    familyLine(basic.brideFather, basic.brideMother, basic.bride),
  ].filter(Boolean) as string[];
  const signature =
    greeting.appendNames && basic.groom.name && basic.bride.name
      ? `${givenName(basic.groom.name)}, ${givenName(basic.bride.name)} 드림.`
      : null;
  return { lines, signature };
}

export function GreetingPage({ content }: { content: InvitationContent }) {
  const { greeting } = content;
  const { lines, signature } = namesFor(content);
  // 돌잔치 이름 줄은 사용자 글 그대로 (번역하지 않음)
  const raw = isDol(content);

  return (
    <Page>
      <PageTitle>소중한 분들을 초대합니다</PageTitle>
      {greeting.photo && <Image source={{ uri: greeting.photo }} style={styles.photo} resizeMode="cover" />}
      <IText raw={!!greeting.content}>{greeting.content || '인사말을 입력하면 여기에 보여요.'}</IText>
      {lines.map((l) => (
        <IText key={l} tone="sub" raw={raw}>
          {l}
        </IText>
      ))}
      {signature && (
        <IText bold raw={raw}>
          {signature}
        </IText>
      )}
    </Page>
  );
}

const styles = StyleSheet.create({
  photo: { width: '100%', aspectRatio: 4 / 5, borderRadius: radius.sm },
});
