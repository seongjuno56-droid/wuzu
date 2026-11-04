import type { Invitation } from '../../features/invitation/model';

export type LocalMediaKind = 'image' | 'gif' | 'video' | 'bgm' | 'linkThumb';

export interface LocalMedia {
  uri: string;
  kind: LocalMediaKind;
  /** BGM 은 주소에 확장자가 없을 수 있어(content:) 파일 이름으로 종류를 정한다 */
  fileName?: string;
}

const LOCAL_RE = /^(file|content|data|blob|ph):/i;
export const isLocalMedia = (uri: string) => LOCAL_RE.test(uri);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** 서버가 준 id 인지. 저장 전 초안의 기기 임시 id(inv-...)는 아니다 */
export const isServerId = (id: string) => UUID_RE.test(id);

/**
 * 파일 주소가 들어가는 칸의 이름. 값의 생김새로 찾으면 인사말에 쓴 "data: ..." 같은 글자를 파일로 착각하므로 칸 이름으로 찾는다.
 * 파일 칸을 새로 만들면 여기에 더한다(빠뜨리면 기기 주소가 남아 stripLocalMedia·서비스 검사를 지나친다).
 */
const MEDIA_KEYS = new Set(['photo', 'photos', 'logo', 'mapImages', 'uri']);
const REMOVED = Symbol('removed');

type Visit = (url: string, kind: LocalMediaKind, fileName?: string) => string | null;
type Dict = Record<string, unknown>;

function kindOf(owner: Dict, ownerKey: string): LocalMediaKind {
  if (ownerKey === 'bgm') return 'bgm';
  return owner.kind === 'gif' || owner.kind === 'video' ? owner.kind : 'image';
}

function walk(value: unknown, key: string, visit: Visit): unknown {
  if (Array.isArray(value)) return value.map((v) => walk(v, key, visit)).filter((v) => v !== REMOVED);
  if (typeof value !== 'object' || value === null) return value;

  const owner = value as Dict;
  const out: Dict = {};
  for (const [k, v] of Object.entries(owner)) {
    if (!MEDIA_KEYS.has(k)) {
      out[k] = walk(v, k, visit);
    } else if (typeof v === 'string') {
      const kind = kindOf(owner, key);
      const next = visit(v, kind, kind === 'bgm' && typeof owner.fileName === 'string' ? owner.fileName : undefined);
      if (next === null && k === 'uri' && key === 'background') return { kind: 'template' };
      // 캔버스 요소는 주소 없이 그릴 수 없어 요소째 뺀다
      if (next === null && k === 'uri' && key === 'elements') return REMOVED;
      out[k] = next;
    } else if (Array.isArray(v)) {
      out[k] = v.flatMap((item) => {
        if (typeof item !== 'string') return [item];
        const next = visit(item, 'image');
        return next === null ? [] : [next];
      });
    } else {
      out[k] = v;
    }
  }
  return out;
}

/** content·design·linkThumb 의 파일 주소만 바꾼 복사본. visit 이 null 을 주면 그 파일을 뺀다 */
export function mapInvitationMedia(inv: Invitation, visit: (url: string, kind: LocalMediaKind, fileName?: string) => string | null): Invitation {
  const out: Invitation = {
    ...inv,
    content: walk(inv.content, 'content', visit) as Invitation['content'],
    design: walk(inv.design, 'design', visit) as Invitation['design'],
  };
  if (typeof inv.linkThumb === 'string') out.linkThumb = visit(inv.linkThumb, 'linkThumb');
  return out;
}

/** 아직 서버에 없는 기기 주소를 모두 찾는다. 같은 파일이 두 곳에 있으면 두 번 나온다 */
export function collectLocalMedia(inv: Invitation): LocalMedia[] {
  const found: LocalMedia[] = [];
  mapInvitationMedia(inv, (uri, kind, fileName) => {
    if (isLocalMedia(uri)) found.push(fileName ? { uri, kind, fileName } : { uri, kind });
    return uri;
  });
  return found;
}

/** 기기 주소를 뺀 사본. 새 초대장의 서버 id 를 먼저 받을 때만 쓴다 */
export const stripLocalMedia = (inv: Invitation) => mapInvitationMedia(inv, (uri) => (isLocalMedia(uri) ? null : uri));
