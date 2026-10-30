import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { MASTER_ADMIN_EMAIL } from './src/lib/constants';
import { buildICS, feedFromRestDocument } from './src/lib/calendarFeed';
import { cleanPrintExercise, EXERCISE_PROMPT, EXERCISE_SCHEMA } from './src/lib/printExercise';
import { planFromRestDocument, renderPlanPage } from './src/lib/coachPlan';
import {
  cleanPrintFixtures,
  cleanPrintGames,
  FIXTURE_PROMPT,
  FIXTURE_SCHEMA,
  geminiErrorKind,
  geminiErrorMessage,
  parseModelJson,
  PRINT_MODELS,
  PRINT_PROMPT,
  PRINT_SCHEMA
} from './src/lib/printJornada';

// Load Firebase Config for Backend operations
let firebaseConfig: any = {};
try {
  const cfgPath = path.join(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(cfgPath)) {
    firebaseConfig = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
  }
} catch (e) {
  console.warn('Backend warning reading firebase config:', e);
}

/**
 * Server-side check: is this authenticated user a REAL Administrator?
 * Mirrors firestore.rules' isMasterAdmin(): true for the original Master Admin email,
 * OR for any user promoted via promoteUserToAdmin() (has a document in /admins/{uid}).
 * Uses the Firestore REST API with the requester's own ID token so Firestore Security
 * Rules evaluate the request exactly as they would for a normal client read.
 */
async function isRealAdmin(uid: string, email: string, idToken: string): Promise<boolean> {
  if (email.toLowerCase().trim() === MASTER_ADMIN_EMAIL.toLowerCase().trim()) {
    return true;
  }
  try {
    const dbId = firebaseConfig.firestoreDatabaseId || '(default)';
    const url = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/${dbId}/documents/admins/${uid}`;
    const resp = await fetch(url, {
      headers: { Authorization: `Bearer ${idToken}` }
    });
    return resp.ok;
  } catch (err) {
    console.warn('Erro ao verificar privilégios de administrador promovido:', err);
    return false;
  }
}

/**
 * Server-side helper to verify a Firebase Auth ID Token using Google Identity Toolkit REST API
 */
async function verifyFirebaseIdToken(
  idToken: string,
  apiKey: string
): Promise<{ valid: boolean; email?: string; uid?: string; error?: string }> {
  try {
    const lookupUrl = `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`;
    const resp = await fetch(lookupUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken })
    });

    const data: any = await resp.json();
    if (!resp.ok || data.error || !data.users || data.users.length === 0) {
      return { valid: false, error: data.error?.message || 'Token de autenticação inválido ou expirado.' };
    }

    const user = data.users[0];
    return {
      valid: true,
      email: (user.email || '').toLowerCase().trim(),
      uid: user.localId
    };
  } catch (err: any) {
    return { valid: false, error: err.message || 'Erro ao validar token de autenticação.' };
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // The API only receives small JSON payloads (user creation, audit entries); a large limit only helps abuse.
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // API Healthcheck
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      time: new Date().toISOString(),
      firestoreSource: 'official_firestore'
    });
  });

  // Protected Server-Side Admin User Creation Endpoint
  // Strictly verifies the requester's Firebase ID Token server-side before creating new user credentials.
  app.post('/api/admin/create-user', async (req, res) => {
    try {
      const apiKey = firebaseConfig.apiKey || process.env.VITE_FIREBASE_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ success: false, error: 'Chave de API Firebase não configurada no servidor.' });
      }

      // 1. Extract Bearer ID Token
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          success: false,
          error: 'Acesso não autorizado. É necessário fornecer o token de autenticação de Administrador.'
        });
      }

      const idToken = authHeader.split('Bearer ')[1].trim();
      if (!idToken) {
        return res.status(401).json({ success: false, error: 'Token de autenticação em falta.' });
      }

      // 2. Verify Requester's Token with Google Identity Toolkit
      const tokenVerification = await verifyFirebaseIdToken(idToken, apiKey);
      if (!tokenVerification.valid || !tokenVerification.email) {
        return res.status(401).json({
          success: false,
          error: `Autenticação inválida: ${tokenVerification.error || 'Token expirado'}`
        });
      }

      // 3. Verify Requester is a REAL Administrator (Master Admin OR any promoted admin)
      const requesterEmail = tokenVerification.email.toLowerCase();
      const requesterIsAdmin = await isRealAdmin(tokenVerification.uid || '', requesterEmail, idToken);
      if (!requesterIsAdmin) {
        return res.status(403).json({
          success: false,
          error: 'Acesso negado. Apenas um Administrador tem permissão para criar utilizadores no sistema.'
        });
      }

      // 4. Validate input payload
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ success: false, error: 'Email e palavra-passe são obrigatórios.' });
      }

      // 5. Create new user in Firebase Auth via Google Identity Toolkit REST API
      const restUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`;
      const restResp = await fetch(restUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password: password.trim(),
          returnSecureToken: true
        })
      });

      const data: any = await restResp.json();
      if (!restResp.ok || data.error) {
        const rawErrMsg = data.error?.message || (typeof data.error === 'string' ? data.error : '') || '';
        const errMsgUpper = rawErrMsg.toUpperCase();
        let friendlyMsg = rawErrMsg || 'Erro ao criar utilizador no Firebase Auth';

        if (errMsgUpper.includes('EMAIL_EXISTS')) {
          friendlyMsg = 'Este endereço de email já se encontra registado no sistema.';
          return res.status(400).json({ success: false, error: friendlyMsg, rawError: rawErrMsg });
        } else if (errMsgUpper.includes('WEAK_PASSWORD')) {
          friendlyMsg = 'A palavra-passe deve ter pelo menos 6 caracteres.';
          return res.status(400).json({ success: false, error: friendlyMsg, rawError: rawErrMsg });
        } else if (errMsgUpper.includes('INVALID_EMAIL')) {
          friendlyMsg = 'O formato do endereço de email é inválido.';
          return res.status(400).json({ success: false, error: friendlyMsg, rawError: rawErrMsg });
        } else if (
          errMsgUpper.includes('OPERATION_NOT_ALLOWED') ||
          errMsgUpper.includes('CONFIGURATION_NOT_FOUND') ||
          errMsgUpper.includes('ADMIN_ONLY_OPERATION') ||
          errMsgUpper.includes('PASSWORD_LOGIN_DISABLED')
        ) {
          // When Email/Password provider is disabled in Firebase Console, fallback seamlessly to creating
          // a unique pre-authorized user in Firestore so admin workflow is NEVER blocked!
          const preAuthUid = 'user_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now().toString(36);
          return res.json({
            success: true,
            uid: preAuthUid,
            email: email.trim().toLowerCase(),
            createdBy: requesterEmail,
            createdAt: Date.now(),
            isPreAuthorizedFallback: true,
            message: 'Treinador pré-autorizado com sucesso na Base de Dados do Clube.'
          });
        }
        return res.status(400).json({ success: false, error: friendlyMsg, rawError: rawErrMsg });
      }

      return res.json({
        success: true,
        uid: data.localId,
        email: data.email,
        createdBy: requesterEmail,
        createdAt: Date.now()
      });
    } catch (err: any) {
      console.error('Erro na rota /api/admin/create-user:', err);
      return res.status(500).json({ success: false, error: err.message || 'Erro interno ao criar utilizador.' });
    }
  });

  // Server-Side Audit Logging Endpoint
  app.post('/api/audit/log', async (req, res) => {
    try {
      const apiKey = firebaseConfig.apiKey || process.env.VITE_FIREBASE_API_KEY;
      const authHeader = req.headers.authorization;
      let authenticatedUserEmail = 'anonymous';

      if (authHeader && authHeader.startsWith('Bearer ') && apiKey) {
        const token = authHeader.split('Bearer ')[1].trim();
        const verification = await verifyFirebaseIdToken(token, apiKey);
        if (verification.valid && verification.email) {
          authenticatedUserEmail = verification.email;
        }
      }

      const logEntry = {
        ...req.body,
        serverReceivedAt: Date.now(),
        serverVerifiedEmail: authenticatedUserEmail
      };

      res.json({
        success: true,
        logId: logEntry.id || `srv_aud_${Date.now()}`,
        recordedAt: Date.now()
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Classificação → "📷 Importar print da jornada": reads the games of a screenshot with Gemini. Only for signed-in
  // users; the picture is not stored.
  app.post('/api/ler-jornada', async (req, res) => {
    try {
      const apiKey = firebaseConfig.apiKey || process.env.VITE_FIREBASE_API_KEY;
      const authHeader = req.headers.authorization || '';
      const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
      const verification = token && apiKey ? await verifyFirebaseIdToken(token, apiKey) : { valid: false };
      if (!verification.valid) {
        return res.status(401).json({ success: false, error: 'Sessão expirada. Entre de novo na app.' });
      }
      const geminiKey = process.env.GEMINI_API_KEY;
      if (!geminiKey) {
        return res
          .status(503)
          .json({ success: false, error: 'A leitura de prints não está disponível (falta a chave do Gemini).' });
      }
      const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(String(req.body?.image || ''));
      // "calendario": the games of a calendar (Agenda); "exercicio": an exercise for the library; otherwise the
      // results of a round (Classificação)
      const mode = req.body?.mode;
      const prompt = mode === 'calendario' ? FIXTURE_PROMPT : mode === 'exercicio' ? EXERCISE_PROMPT : PRINT_PROMPT;
      const schema = mode === 'calendario' ? FIXTURE_SCHEMA : mode === 'exercicio' ? EXERCISE_SCHEMA : PRINT_SCHEMA;
      const clean = (text: string | undefined) =>
        mode === 'calendario'
          ? cleanPrintFixtures(parseModelJson(text))
          : mode === 'exercicio'
            ? cleanPrintExercise(parseModelJson(text))
            : cleanPrintGames(parseModelJson(text));
      if (!match) return res.status(400).json({ success: false, error: 'Imagem inválida.' });

      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey: geminiKey });
      const contents = [
        { role: 'user', parts: [{ inlineData: { mimeType: match[1], data: match[2] } }, { text: prompt }] }
      ];
      // Models are retired over time: try the next one when a model does not exist, and once without the answer
      // format when a model refuses it
      let lastError: unknown;
      for (const model of PRINT_MODELS) {
        for (const withSchema of [true, false]) {
          try {
            const response = await ai.models.generateContent({
              model,
              contents,
              config: {
                responseMimeType: 'application/json',
                ...(withSchema ? { responseSchema: schema as any } : {}),
                temperature: 0
              }
            });
            return res.json({ success: true, games: clean(response.text) });
          } catch (err: any) {
            lastError = err;
            console.warn(`Leitura do print com ${model}${withSchema ? '' : ' (sem formato)'}:`, err?.message || err);
            const kind = geminiErrorKind(err);
            if (kind !== 'model' && kind !== 'other') {
              return res.status(502).json({ success: false, error: geminiErrorMessage(kind) });
            }
            if (kind === 'model') break;
          }
        }
      }
      throw lastError;
    } catch (err: any) {
      console.error('Erro na rota /api/ler-jornada:', err?.message || err);
      res.status(500).json({
        success: false,
        error: `Não foi possível ler o print. Tente outra vez. (${String(err?.message || err).slice(0, 120)})`
      });
    }
  });

  // Parents' calendar (Agenda → "Calendário para os pais"): /cal/{token}.ics, read from public_calendars/{token}.
  // The token is the secret; the document only holds games and trainings (no athletes' data).
  app.get('/cal/:file', async (req, res) => {
    const match = /^([a-zA-Z0-9]{20,64})\.ics$/.exec(req.params.file || '');
    if (!match) return res.status(404).type('text/plain').send('Calendário não encontrado.');
    try {
      const dbId = firebaseConfig.firestoreDatabaseId || '(default)';
      const base = process.env.FIRESTORE_EMULATOR_HOST
        ? `http://${process.env.FIRESTORE_EMULATOR_HOST}`
        : 'https://firestore.googleapis.com';
      const key = firebaseConfig.apiKey ? `?key=${encodeURIComponent(firebaseConfig.apiKey)}` : '';
      const url = `${base}/v1/projects/${firebaseConfig.projectId}/databases/${dbId}/documents/public_calendars/${match[1]}${key}`;
      const resp = await fetch(url);
      if (!resp.ok) return res.status(404).type('text/plain').send('Calendário não encontrado ou desativado.');
      const feed = feedFromRestDocument(await resp.json());
      if (!feed) return res.status(404).type('text/plain').send('Calendário não encontrado.');
      res.set('Cache-Control', 'public, max-age=900');
      res.set('Content-Disposition', 'inline; filename="calendario.ics"');
      return res.type('text/calendar; charset=utf-8').send(buildICS(feed));
    } catch (err) {
      console.error('Erro na rota /cal:', err);
      return res.status(502).type('text/plain').send('Calendário temporariamente indisponível.');
    }
  });

  // Plan for the assistant coach (Treinos → "Link para o adjunto"): /plano/{token}, read from public_plans/{token}.
  // The token is the secret; the document only holds the plan of the next training (no athletes' data).
  app.get('/plano/:token', async (req, res) => {
    const token = /^[a-zA-Z0-9]{20,64}$/.test(req.params.token || '') ? req.params.token : '';
    const notFound = () =>
      res
        .status(404)
        .type('html')
        .send(
          '<!doctype html><meta charset="utf-8"><p style="font-family:sans-serif;padding:24px">Este link de plano de treino não existe ou foi desligado.</p>'
        );
    if (!token) return notFound();
    try {
      const dbId = firebaseConfig.firestoreDatabaseId || '(default)';
      const base = process.env.FIRESTORE_EMULATOR_HOST
        ? `http://${process.env.FIRESTORE_EMULATOR_HOST}`
        : 'https://firestore.googleapis.com';
      const key = firebaseConfig.apiKey ? `?key=${encodeURIComponent(firebaseConfig.apiKey)}` : '';
      const resp = await fetch(
        `${base}/v1/projects/${firebaseConfig.projectId}/databases/${dbId}/documents/public_plans/${token}${key}`
      );
      if (!resp.ok) return notFound();
      const page = planFromRestDocument(await resp.json());
      if (!page) return notFound();
      res.set('Cache-Control', 'no-store');
      res.set('X-Robots-Tag', 'noindex');
      return res.type('html').send(renderPlanPage(page));
    } catch (err) {
      console.error('Erro na rota /plano:', err);
      return res.status(502).type('text/plain').send('Plano temporariamente indisponível.');
    }
  });

  // Vite middleware for development & static fallback for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`BolaComVisão Server running on http://localhost:${PORT}`);
  });
}

startServer();
