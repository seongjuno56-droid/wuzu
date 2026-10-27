/**
 * 확인 창을 거치는 서버 액션이 돌려주는 값. 실패하면 message 를 화면에 보여 준다.
 * ConfirmButton·ReasonConfirmForm 이 이 모양을 받는다.
 */
export type ActionResult = { ok: true } | { ok: false; message: string };

/** 사유(memo) 칸 최대 길이. 폼과 서버 액션이 같은 값을 쓴다 */
export const REASON_MAX_LENGTH = 500;
