/** aws4fetch AwsClient 의 쓰는 부분. Deno 와 jest 가 가져오는 방법이 달라 밖에서 넣어 준다 */
export interface AwsSigner {
  sign(
    input: string,
    init: { method: string; headers: Record<string, string>; aws: { signQuery: boolean; allHeaders: boolean } },
  ): Promise<{ url: string }>;
}

const EXPIRES_SECONDS = 600;

/**
 * R2 PUT 서명 주소. content-type·content-length 를 서명에 넣어 요청한 크기·종류와 다른 파일은 R2 가 거부한다.
 * 크기를 서명에 넣지 못하면 서버의 크기 검사가 뜻이 없어지므로 주소를 내주지 않는다.
 */
export async function presignPut(
  signer: AwsSigner,
  r2: { accountId: string; bucket: string },
  key: string,
  contentType: string,
  bytes: number,
): Promise<{ url: string; headers: Record<string, string> }> {
  const headers = { 'content-type': contentType, 'content-length': String(bytes) };
  const target = `https://${r2.accountId}.r2.cloudflarestorage.com/${r2.bucket}/${key}?X-Amz-Expires=${EXPIRES_SECONDS}`;
  const signed = await signer.sign(target, { method: 'PUT', headers, aws: { signQuery: true, allHeaders: true } });
  const signedHeaders = new URL(signed.url).searchParams.get('X-Amz-SignedHeaders')?.split(';') ?? [];
  if (!signedHeaders.includes('content-length') || !signedHeaders.includes('content-type')) {
    throw new Error('크기·종류가 서명에 들어가지 않았다');
  }
  return { url: signed.url, headers };
}
