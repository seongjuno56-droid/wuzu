import { router } from 'expo-router';

/** 인증 화면들을 스택에서 걷어내고 홈 탭으로 돌아간다 (스택에 없으면 replace) */
export function goHome() {
  router.dismissTo('/home');
}
