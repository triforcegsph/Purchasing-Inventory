import crypto from 'crypto';
import type { Request, Response, NextFunction } from 'express';
import type { UserAccount, UserRole } from '../src/types/erp';

const TOKEN_SECRET =
  process.env.AUTH_TOKEN_SECRET || 'triforcegs-purchasing-inventory-session-secret-v1';
const TOKEN_TTL_MS = Number(process.env.AUTH_TOKEN_TTL_MS || 8 * 60 * 60 * 1000); // 8 hours

export const MOBILE_ALLOWED_ROLES: UserRole[] = [
  'Applicant/Requestor',
  'REQ Approver',
];

export interface AuthUser {
  id: string;
  username: string;
  fullName: string;
  role: UserRole;
  department: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
  token?: string;
}

export interface TokenPayload extends AuthUser {
  iat: number;
  exp: number;
  jti: string;
  client: 'mobile' | 'web';
}

// Revoked token IDs (in-memory session revocation on logout)
const revokedTokenIds = new Set<string>();

export function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(`triforcegs:${password}`).digest('hex');
}

export function verifyPassword(password: string, storedPasswordOrHash: string): boolean {
  if (storedPasswordOrHash.length === 64 && /^[0-9a-f]+$/.test(storedPasswordOrHash)) {
    const candidate = hashPassword(password);
    return crypto.timingSafeEqual(Buffer.from(candidate), Buffer.from(storedPasswordOrHash));
  }
  const a = Buffer.from(password);
  const b = Buffer.from(storedPasswordOrHash);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

// Default accounts matching src/components/LoginPage.tsx & SCENARIOS.md
export const SEED_ACCOUNTS: (Omit<UserAccount, 'password'> & { passwordHash: string })[] = [
  {
    id: 'usr-applicant',
    username: 'applicant@triforcegs.com.ph',
    passwordHash: hashPassword('1234'),
    fullName: 'Engr. John Doe',
    role: 'Applicant/Requestor',
    department: 'Site Engineering & Operations',
  },
  {
    id: 'usr-applicant-2',
    username: 'applicant2@triforcegs.com.ph',
    passwordHash: hashPassword('1234'),
    fullName: 'Engr. Maria Santos',
    role: 'Applicant/Requestor',
    department: 'Civil & Structural Engineering',
  },
  {
    id: 'usr-applicant-3',
    username: 'applicant3@triforcegs.com.ph',
    passwordHash: hashPassword('1234'),
    fullName: 'Engr. Carlos Reyes',
    role: 'Applicant/Requestor',
    department: 'Electrical & MEPF Operations',
  },
  {
    id: 'usr-req-approver',
    username: 'req.approver@triforcegs.com.ph',
    passwordHash: hashPassword('1234'),
    fullName: 'Engr. Alex Smith',
    role: 'REQ Approver',
    department: 'Engineering Cost & Requisition Control',
  },
  {
    id: 'usr-po-approver',
    username: 'po.approver@triforcegs.com.ph',
    passwordHash: hashPassword('1234'),
    fullName: 'Dir. Jane Doe',
    role: 'PO Approver',
    department: 'Executive Purchasing Authorization',
  },
  {
    id: 'usr-warehouse',
    username: 'warehouse@triforcegs.com.ph',
    passwordHash: hashPassword('1234'),
    fullName: 'Warehouse Manager',
    role: 'Warehouse Manager',
    department: 'Central Warehouse & Inventory Control',
  },
  {
    id: 'usr-purchaser',
    username: 'purchaser@triforcegs.com.ph',
    passwordHash: hashPassword('1234'),
    fullName: 'Purchaser',
    role: 'Purchaser',
    department: 'Procurement & Purchasing',
  },
  {
    id: 'usr-admin',
    username: 'admin@triforcegs.com.ph',
    passwordHash: hashPassword('1234'),
    fullName: 'System Admin',
    role: 'Admin',
    department: 'System Administration & Control',
  },
];

function base64UrlEncode(input: string | Buffer): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecode(input: string): string {
  let str = input.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  return Buffer.from(str, 'base64').toString('utf8');
}

export function signToken(user: AuthUser, client: 'mobile' | 'web' = 'mobile'): {
  token: string;
  expiresAt: string;
} {
  const now = Date.now();
  const exp = now + TOKEN_TTL_MS;
  const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payloadObj: TokenPayload = {
    ...user,
    iat: now,
    exp,
    jti: crypto.randomUUID(),
    client,
  };
  const payload = base64UrlEncode(JSON.stringify(payloadObj));
  const signature = crypto
    .createHmac('sha256', TOKEN_SECRET)
    .update(`${header}.${payload}`)
    .digest();
  return {
    token: `${header}.${payload}.${base64UrlEncode(signature)}`,
    expiresAt: new Date(exp).toISOString(),
  };
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [header, payload, signature] = parts;
    const expectedSig = base64UrlEncode(
      crypto.createHmac('sha256', TOKEN_SECRET).update(`${header}.${payload}`).digest()
    );
    const a = Buffer.from(signature);
    const b = Buffer.from(expectedSig);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return null;
    }
    const decoded = JSON.parse(base64UrlDecode(payload)) as TokenPayload;
    if (!decoded.exp || Date.now() > decoded.exp) return null;
    if (decoded.jti && revokedTokenIds.has(decoded.jti)) return null;
    return decoded;
  } catch {
    return null;
  }
}

export function revokeToken(token: string): void {
  const decoded = verifyToken(token);
  if (decoded?.jti) {
    revokedTokenIds.add(decoded.jti);
  }
}

export function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  if (!token) {
    res.status(401).json({ error: 'Authentication required. Please sign in.' });
    return;
  }
  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: 'Session expired or invalid token. Please sign in again.' });
    return;
  }
  req.user = {
    id: payload.id,
    username: payload.username,
    fullName: payload.fullName,
    role: payload.role,
    department: payload.department,
  };
  req.token = token;
  next();
}

export function requireRoles(allowedRoles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }
    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        error: `Access denied. Role "${req.user.role}" is not authorized for this action.`,
      });
      return;
    }
    next();
  };
}
