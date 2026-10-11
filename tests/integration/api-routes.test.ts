import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as postLivekitToken } from '@/app/api/v1/livekit/token/route';
import { POST as postTranslate } from '@/app/api/v1/learning/translate/route';
import { POST as postReport } from '@/app/api/v1/moderation/report/route';
import { POST as postAdminAction } from '@/app/api/v1/admin/action/route';
import { POST as postDeleteAccount } from '@/app/api/v1/account/delete/route';
import { resetRateLimitBuckets } from '@/lib/security/rate-limit';

function makeJsonRequest(
  url: string,
  body: Record<string, unknown>,
  headers: Record<string, string> = {}
): NextRequest {
  return new NextRequest(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

describe('LinguaConnect Backend API v1 Integration & Security Tests', () => {
  beforeEach(() => {
    resetRateLimitBuckets();
  });

  describe('1. LiveKit WebRTC Token Endpoint (/api/v1/livekit/token)', () => {
    it('denies unauthenticated call token requests (401)', async () => {
      const req = makeJsonRequest('http://localhost:3000/api/v1/livekit/token', {
        conversationId: 'conv-1',
        sessionId: 'call-1',
        callType: 'video',
      });
      const res = await postLivekitToken(req);
      expect(res.status).toBe(401);
    });

    it('denies call token generation if user is not an authorized participant or is blocked (403)', async () => {
      const req = makeJsonRequest(
        'http://localhost:3000/api/v1/livekit/token',
        {
          conversationId: 'conv-1',
          sessionId: 'call-1',
          callType: 'audio',
        },
        {
          'x-user-id': 'intruder-id',
          'x-participant-authorized': 'false',
          'x-users-blocked': 'true',
        }
      );
      const res = await postLivekitToken(req);
      expect(res.status).toBe(403);
    });

    it('issues room configuration with recordingEnabled=false for authorized participants', async () => {
      const req = makeJsonRequest(
        'http://localhost:3000/api/v1/livekit/token',
        {
          conversationId: 'conv-demo-elena-liam',
          sessionId: 'call-demo-1',
          callType: 'video',
        },
        {
          'x-user-id': 'demo-user-elena',
          'x-user-name': 'Elena Vargas',
          'x-participant-authorized': 'true',
          'x-users-blocked': 'false',
        }
      );
      const res = await postLivekitToken(req);
      expect(res.status).toBe(200);
      const payload = (await res.json()) as {
        recordingEnabled: boolean;
        roomName: string;
      };
      expect(payload.recordingEnabled).toBe(false);
      expect(payload.roomName).toContain('conv-demo-elena-liam');
    });
  });

  describe('2. Modular Translation Endpoint (/api/v1/learning/translate)', () => {
    it('never simulates fake AI translations when external provider credentials are not configured (503)', async () => {
      const req = makeJsonRequest(
        'http://localhost:3000/api/v1/learning/translate',
        {
          text: 'Hello friend',
          targetLang: 'es',
        },
        { 'x-user-id': 'demo-user-elena' }
      );
      const res = await postTranslate(req);
      expect(res.status).toBe(503);
      const data = (await res.json()) as { configured: boolean; success: boolean };
      expect(data.configured).toBe(false);
      expect(data.success).toBe(false);
    });
  });

  describe('3. Moderation Report & RBAC Admin Endpoints', () => {
    it('prevents a user from reporting themselves (400)', async () => {
      const req = makeJsonRequest(
        'http://localhost:3000/api/v1/moderation/report',
        {
          reportedUserId: 'demo-user-elena',
          reasonCategory: 'spam',
          description: 'Intentando reportar mi propio usuario.',
          blockUserImmediately: false,
        },
        { 'x-user-id': 'demo-user-elena' }
      );
      const res = await postReport(req);
      expect(res.status).toBe(400);
    });

    it('denies non-admin users from executing administrative actions (403)', async () => {
      const req = makeJsonRequest(
        'http://localhost:3000/api/v1/admin/action',
        {
          actionType: 'SUSPEND_USER',
          targetEntity: 'profiles',
          targetId: 'demo-user-elena',
          details: {},
        },
        {
          'x-user-id': 'demo-user-liam',
          'x-user-role': 'user',
        }
      );
      const res = await postAdminAction(req);
      expect(res.status).toBe(403);
    });

    it('allows admin role to execute and log audited actions (200)', async () => {
      const req = makeJsonRequest(
        'http://localhost:3000/api/v1/admin/action',
        {
          actionType: 'RESOLVE_REPORT',
          targetEntity: 'message_reports',
          targetId: 'rep-demo-1',
          details: { note: 'Reviewed by moderator' },
        },
        {
          'x-user-id': 'demo-user-elena',
          'x-user-role': 'admin',
        }
      );
      const res = await postAdminAction(req);
      expect(res.status).toBe(200);
      const data = (await res.json()) as {
        success: boolean;
        auditLog: { action_type: string };
      };
      expect(data.success).toBe(true);
      expect(data.auditLog.action_type).toBe('RESOLVE_REPORT');
    });

    it('requires exact confirmation phrase to delete an account', async () => {
      const badReq = makeJsonRequest(
        'http://localhost:3000/api/v1/account/delete',
        { confirmPhrase: 'borrar' },
        { 'x-user-id': 'demo-user-liam' }
      );
      const badRes = await postDeleteAccount(badReq);
      expect(badRes.status).toBe(400);

      const validReq = makeJsonRequest(
        'http://localhost:3000/api/v1/account/delete',
        { confirmPhrase: 'ELIMINAR MI CUENTA' },
        { 'x-user-id': 'demo-user-liam' }
      );
      const validRes = await postDeleteAccount(validReq);
      expect(validRes.status).toBe(200);
    });
  });
});
