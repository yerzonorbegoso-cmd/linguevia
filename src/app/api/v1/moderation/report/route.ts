import { NextRequest, NextResponse } from 'next/server';
import { createReportSchema } from '@/lib/security/validators';
import { checkRateLimit } from '@/lib/security/rate-limit';

export async function POST(req: NextRequest) {
  try {
    const reporterId = (req.headers.get('x-user-id') ?? '').trim();
    if (!reporterId) {
      return NextResponse.json({ error: 'Autenticación requerida.' }, { status: 401 });
    }

    const rate = checkRateLimit(`report:${reporterId}`, 10, 60 * 60 * 1000);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: 'Has enviado demasiadas denuncias recientemente. Espera antes de enviar otra.' },
        { status: 429 }
      );
    }

    const body = await req.json();
    const parsed = createReportSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos de denuncia inválidos.', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    if (parsed.data.reportedUserId === reporterId) {
      return NextResponse.json(
        { error: 'No puedes denunciar tu propio perfil.' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      reportId: `rep-${Date.now()}`,
      status: 'pending',
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error al procesar denuncia.' },
      { status: 500 }
    );
  }
}
