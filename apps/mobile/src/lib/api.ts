export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: 'CHEFE' | 'ASSESSOR' | 'APOIO';
};

export type LoginResponse = {
  user: SessionUser;
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
};

const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3333';

export const loginRequest = async (
  email: string,
  password: string,
): Promise<LoginResponse> => {
  const response = await fetch(`${apiUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.error?.message ?? 'Não foi possível entrar.');
  }

  return response.json() as Promise<LoginResponse>;
};

export const meRequest = async (accessToken: string): Promise<SessionUser> => {
  const response = await fetch(`${apiUrl}/auth/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error('Sessão inválida.');
  }

  return response.json() as Promise<SessionUser>;
};
