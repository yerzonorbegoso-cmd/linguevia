import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const adminActionSchema = z.object({
  actionType: z.enum([
    'RESOLVE_REPORT',
    'DISMISS_REPORT',
    'SUSPEND_USER',
    'RESTORE_USER',
    'TOGGLE_LANGUAGE',
    'ADD_LANGUAGE',
    'TOGGLE_INTEREST',
    'ADD_INTEREST',
    'UPDATE_PLATFORM_SETTINGS',
  ]),
  targetEntity: z.string().min(2).max(60),
  targetId: z.string().min(1).max(120),
  details: z.record(z.string(), z.unknown()).default({}),
});

export async function POST(req: NextRequest) {
  try {
    const adminId = (req.headers.get('x-user-id') ?? '').trim();
    const adminRole = (req.headers.get('x-user-role') ?? '').trim();

    if (!adminId) {
      return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
    }

    if (adminRole !== 'admin' && adminRole !== 'moderator') {
      return NextResponse.json(
        { error: 'Acceso denegado: se requiere rol de administrador o moderador.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = adminActionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Parámetros de acción administrativa inválidos.', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      auditLog: {
        id: `audit-${Date.now()}`,
        admin_id: adminId,
        action_type: parsed.data.actionType,
        target_entity: parsed.data.targetEntity,
        target_id: parsed.data.targetId,
        details: parsed.data.details,
        created_at: new Date().toISOString(),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error en operación administrativa.' },
      { status: 500 }
    );
  }
}
