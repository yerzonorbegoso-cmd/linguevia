import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSecrets } from '@/lib/env';
import { checkRateLimit } from '@/lib/security/rate-limit';

const translateRequestSchema = z.object({
  text: z.string().trim().min(1).max(1500),
  targetLang: z.string().trim().min(2).max(10),
  sourceLang: z.string().trim().min(2).max(10).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const userId = (req.headers.get('x-user-id') ?? '').trim();
    if (!userId) {
      return NextResponse.json({ error: 'Autenticación requerida.' }, { status: 401 });
    }

    const body = await req.json();
    const parsed = translateRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Parámetros de traducción inválidos.', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const secrets = getServerSecrets();

    // Enforce daily per-user consumption limit
    const rate = checkRateLimit(
      `translate:${userId}`,
      secrets.translationDailyLimit,
      24 * 60 * 60 * 1000
    );

    if (!rate.allowed) {
      return NextResponse.json(
        {
          configured: secrets.isTranslationConfigured,
          success: false,
          quotaRemaining: 0,
          errorMessage: `Has alcanzado el límite diario de consumo de traducciones (${secrets.translationDailyLimit}/día).`,
        },
        { status: 429 }
      );
    }

    // Rule (Section 7): Never simulate translations or AI responses if the provider is not configured
    if (!secrets.isTranslationConfigured) {
      return NextResponse.json(
        {
          configured: false,
          success: false,
          quotaRemaining: rate.remaining,
          errorMessage:
            'El proveedor de traducción externa no está configurado en el servidor (TRANSLATION_PROVIDER / TRANSLATION_API_KEY). Configura tus credenciales en .env.local para habilitar la traducción automática.',
        },
        { status: 503 }
      );
    }

    if (secrets.translationProvider === 'libretranslate') {
      const response = await fetch(secrets.translationApiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          q: parsed.data.text,
          source: parsed.data.sourceLang || 'auto',
          target: parsed.data.targetLang,
          format: 'text',
          api_key: secrets.translationApiKey || undefined,
        }),
      });

      if (!response.ok) {
        return NextResponse.json(
          {
            configured: true,
            success: false,
            errorMessage: `El proveedor LibreTranslate devolvió un error HTTP ${response.status}.`,
          },
          { status: 502 }
        );
      }

      const data = (await response.json()) as { translatedText?: string };
      return NextResponse.json({
        configured: true,
        success: true,
        translatedText: data.translatedText ?? '',
        provider: 'libretranslate',
        quotaRemaining: rate.remaining,
      });
    }

    if (secrets.translationProvider === 'deepl') {
      const endpoint = secrets.translationApiUrl || 'https://api-free.deepl.com/v2/translate';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `DeepL-Auth-Key ${secrets.translationApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: [parsed.data.text],
          target_lang: parsed.data.targetLang.toUpperCase(),
        }),
      });

      if (!response.ok) {
        return NextResponse.json(
          {
            configured: true,
            success: false,
            errorMessage: `El proveedor DeepL devolvió un error HTTP ${response.status}.`,
          },
          { status: 502 }
        );
      }

      const data = (await response.json()) as { translations?: Array<{ text: string }> };
      return NextResponse.json({
        configured: true,
        success: true,
        translatedText: data.translations?.[0]?.text ?? '',
        provider: 'deepl',
        quotaRemaining: rate.remaining,
      });
    }

    // Google Cloud Translation v2 REST adapter
    const googleUrl = `https://translation.googleapis.com/language/translate/v2?key=${encodeURIComponent(
      secrets.translationApiKey
    )}`;
    const response = await fetch(googleUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        q: parsed.data.text,
        target: parsed.data.targetLang,
        format: 'text',
      }),
    });

    if (!response.ok) {
      return NextResponse.json(
        {
          configured: true,
          success: false,
          errorMessage: `El proveedor Google Translate devolvió un error HTTP ${response.status}.`,
        },
        { status: 502 }
      );
    }

    const data = (await response.json()) as {
      data?: { translations?: Array<{ translatedText: string }> };
    };

    return NextResponse.json({
      configured: true,
      success: true,
      translatedText: data.data?.translations?.[0]?.translatedText ?? '',
      provider: 'google',
      quotaRemaining: rate.remaining,
    });
  } catch (error) {
    return NextResponse.json(
      {
        configured: false,
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Error de red al traducir.',
      },
      { status: 500 }
    );
  }
}
