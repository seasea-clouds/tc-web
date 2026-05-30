import { SignJWT, jwtVerify, type JWTPayload } from 'jose';

const getSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET not configured');
  return new TextEncoder().encode(secret);
};

export interface TokenPayload extends JWTPayload {
  userId: string;
  email: string;
}

export async function signToken(payload: TokenPayload, expiresIn = '24h'): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(getSecret());
}

export async function verifyToken(token: string): Promise<TokenPayload> {
  const { payload } = await jwtVerify(token, getSecret());
  return payload as TokenPayload;
}
