import { useLocalSearchParams } from 'expo-router';

import { GuestInvitationScreen } from '../../features/invitation/GuestInvitationScreen';

/** 하객이 받는 공개 링크. 이 주소 형식은 보낸 뒤에 바꾸면 안 된다 */
export default function GuestInvitationRoute() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  return <GuestInvitationScreen slug={slug} />;
}
