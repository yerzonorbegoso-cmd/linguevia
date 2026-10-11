import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createSupabaseServiceAdminClient } from '@/lib/supabase/server';

const deleteAccountSchema = z.object({
  confirmPhrase: z.literal('ELIMINAR MI CUENTA'),
});

export async function POST(req: NextRequest) {
  try {
    const userId = (req.headers.get('x-user-id') ?? '').trim();
    if (!userId) {
      return NextResponse.json({ error: 'Autenticación requerida.' }, { status: 401 });
    }

    const body = await req.json();
    const parsed = deleteAccountSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Debes escribir exactamente "ELIMINAR MI CUENTA" para confirmar.' },
        { status: 400 }
      );
    }

    // If Supabase service_role is configured on server, execute permanent auth & cascade deletion
    const adminClient = createSupabaseServiceAdminClient();
    if (adminClient) {
      const { error } = await adminClient.auth.admin.deleteUser(userId);
      if (error) {
        return NextResponse.json(
          { error: `No se pudo eliminar la cuenta en Supabase: ${error.message}` },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      deletedUserId: userId,
      purgedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error al eliminar la cuenta.' },
      { status: 500 }
    );
  }
}
