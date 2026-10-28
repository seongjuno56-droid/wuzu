/** 목록형 입력(보호자·성장 이야기 등) 계산 — 화면과 떼어 테스트한다 */
export const addItem = <T>(list: T[], item: T, max: number): T[] => (list.length >= max ? list : [...list, item]);

export const removeItem = <T extends { id: string }>(list: T[], id: string): T[] => list.filter((x) => x.id !== id);

export const updateItem = <T extends { id: string }>(list: T[], id: string, patch: Partial<T>): T[] =>
  list.map((x) => (x.id === id ? { ...x, ...patch } : x));

export const newItemId = () => `it-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
