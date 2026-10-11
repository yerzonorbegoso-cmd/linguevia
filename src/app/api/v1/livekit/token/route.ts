import { NextRequest, NextResponse } from 'next/server';
import { AccessToken } from 'livekit-server-sdk';
import { getPublicEnv, getServerSecrets } from '@/lib/env';
import { livekitTokenRequestSchema } from '@/lib/security/validators';
import { checkRateLimit } from '@/lib/security/rate-limit';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = livekitTokenRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Datos de solicitud de llamada inválidos.',
          details: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    // Validate caller identity header or session
    const callerId = (req.headers.get('x-user-id') ?? '').trim();
    const callerName = (req.headers.get('x-user-name') ?? 'Participant').trim();
    const isParticipantVerified = req.headers.get('x-participant-authorized') === 'true';
    const isBlocked = req.headers.get('x-users-blocked') === 'true';

    if (!callerId) {
      return NextResponse.json(
        { error: 'No autenticado. Inicia sesión para iniciar una llamada.' },
        { status: 401 }
      );
    }

    if (isBlocked || !isParticipantVerified) {
      return NextResponse.json(
        {
          error:
            'Acceso denegado: no tienes autorización para entrar en esta sala o existe un bloqueo activo.',
        },
        { status: 403 }
      );
    }

    // Rate limit call token generation: max 12 call sessions per hour per user
    const rate = checkRateLimit(`livekit-token:${callerId}`, 12, 60 * 60 * 1000);
    if (!rate.allowed) {
      return NextResponse.json(
        {
          error: 'Has alcanzado el límite de llamadas por hora (12). Inténtalo más tarde.',
          resetAt: rate.resetAt,
        },
        { status: 429 }
      );
    }

    const publicEnv = getPublicEnv();
    const secrets = getServerSecrets();
    const roomName = `lc-room-${parsed.data.conversationId}-${parsed.data.sessionId}`;

    // Never invent credentials or expose secrets if LiveKit is not configured
    if (!secrets.isLivekitServerConfigured) {
      return NextResponse.json(
        {
          configured: false,
          mode: 'local_webrtc_signaling',
          roomName,
          recordingEnabled: false,
          message:
            'LiveKit Cloud no está configurado en las variables de entorno del servidor (LIVEKIT_API_KEY / LIVEKIT_API_SECRET / NEXT_PUBLIC_LIVEKIT_URL). Se utilizará el canal WebRTC local de dispositivos y señalización en tiempo real entre pestañas/navegadores.',
        },
        { status: 200 }
      );
    }

    const at = new AccessToken(secrets.livekitApiKey, secrets.livekitApiSecret, {
      identity: callerId,
      name: callerName,
      ttl: '15m', // Strict 15-minute temporary token
    });

    at.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
      roomRecord: false, // Strictly forbid call recording by default
    });

    const jwtToken = await at.toJwt();

    return NextResponse.json({
      configured: true,
      mode: 'livekit_cloud',
      token: jwtToken,
      serverUrl: publicEnv.livekitUrl,
      roomName,
      recordingEnabled: false,
      expiresInSeconds: 900,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Error interno al generar credenciales de llamada.',
        detail: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
