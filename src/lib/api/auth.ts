import { NextRequest, NextResponse } from 'next/server';

export function requireSettingsWriteAccess(req: NextRequest) {
  const expectedToken = process.env.SETTINGS_API_TOKEN?.trim();

  if (!expectedToken) {
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({
        success: false,
        error: 'Escrita de configurações indisponível.'
      }, { status: 503 });
    }

    return null;
  }

  const authHeader = req.headers.get('authorization') || '';
  const bearerToken = authHeader.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  const headerToken = req.headers.get('x-settings-token')?.trim();

  if ((bearerToken || headerToken) !== expectedToken) {
    return NextResponse.json({
      success: false,
      error: 'Não autorizado.'
    }, { status: 401 });
  }

  return null;
}
