/**
 * 멈춘 요청을 끝낸다. 저장 중에는 모달을 닫을 수 없어, 끝나지 않는 요청은 화면을 영영 잡아 둔다.
 * 시간이 지나면 signal 을 끊고 TIMEOUT 으로 던진다. 부르는 쪽은 다시 시도할 수 있는 실패로 다룬다.
 */
export function withTimeout<T>(run: (signal: AbortSignal) => Promise<T>, ms: number): Promise<T> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new Error('TIMEOUT'));
    }, ms);
  });
  return Promise.race([run(controller.signal), timeout]).finally(() => clearTimeout(timer));
}
