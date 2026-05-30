import { SignJWT, jwtVerify } from 'jose';

function getSecret(env: any): Uint8Array {
  const secret = env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET not configured');
  return new TextEncoder().encode(secret);
}

export interface TokenPayload {
  userId: string;
  email: string;
}

export async function signToken(payload: TokenPayload, env: any, expiresIn = '24h'): Promise<string> {
  return new SignJWT(payload as any)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(getSecret(env));
}

export async function verifyToken(token: string, env: any): Promise<TokenPayload> {
  const { payload } = await jwtVerify(token, getSecret(env));
  return { userId: payload.userId as string, email: payload.email as string };
}
