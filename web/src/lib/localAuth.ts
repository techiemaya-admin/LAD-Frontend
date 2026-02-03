import { SignJWT, jwtVerify } from 'jose';
const ALG = 'HS256';
export async function signLocalJWT(payload: Record<string, any>, expiresInSeconds: number) {
  const secret = getSecret();
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + expiresInSeconds;
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt(iat)
    .setExpirationTime(exp)
    .sign(secret);
}
export async function verifyLocalJWT(token: string) {
  const secret = getSecret();
  const { payload } = await jwtVerify(token, secret);
  return payload as Record<string, any>;
}
function getSecret() {
  const key = process.env.LOCAL_JWT_SECRET;
  if (!key) throw new Error('LOCAL_JWT_SECRET is not set');
  return new TextEncoder().encode(key);
}