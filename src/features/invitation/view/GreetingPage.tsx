import { Image, StyleSheet } from 'react-native';

import { radius } from '../../../theme';
import { givenName, InvitationContent, Person } from '../model';
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

export function GreetingPage({ content }: { content: InvitationContent }) {
  const { basic, greeting } = content;
  const lines = [
    familyLine(basic.groomFather, basic.groomMother, basic.groom),
    familyLine(basic.brideFather, basic.brideMother, basic.bride),
  ].filter(Boolean) as string[];
  const signature =
    greeting.appendNames && basic.groom.name && basic.bride.name
      ? `${givenName(basic.groom.name)}, ${givenName(basic.bride.name)} 드림.`
      : null;

  return (
    <Page>
      <PageTitle>소중한 분들을 초대합니다</PageTitle>
      {greeting.photo && <Image source={{ uri: greeting.photo }} style={styles.photo} resizeMode="cover" />}
      <IText raw={!!greeting.content}>{greeting.content || '인사말을 입력하면 여기에 보여요.'}</IText>
      {lines.map((l) => (
        <IText key={l} tone="sub">
          {l}
        </IText>
      ))}
      {signature && <IText bold>{signature}</IText>}
    </Page>
  );
}

const styles = StyleSheet.create({
  photo: { width: '100%', aspectRatio: 4 / 5, borderRadius: radius.sm },
});
