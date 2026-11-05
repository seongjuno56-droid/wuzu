/**
 * 공개 웹 빌드에서 `@expo/vector-icons` 대신 쓴다(metro.config.js). 원래 묶음은 모든 아이콘 세트의 글리프 표를 함께 실어
 * JS 가 450KB 늘어난다. 앱 코드가 묶음에서 가져오는 세트는 Ionicons 뿐이다(guestWebConfig.test.ts 가 고정한다).
 */
export { default as Ionicons } from '@expo/vector-icons/Ionicons';
