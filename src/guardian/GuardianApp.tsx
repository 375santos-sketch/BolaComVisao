import React, { Suspense, lazy, useEffect, useState } from 'react';
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  User
} from 'firebase/auth';
import { auth } from '../services/firebase';
import { Icon } from '../components/ui/Icon';
import {
  GuardianAccount,
  acceptInvite,
  leaveInvite,
  readFamilyView,
  createAthleteInvite,
  readAthleteView,
  readGuardianAccount,
  readInvite,
  revokeGuardianInvite,
  setVideoConsent
} from '../services/guardians';
import { FamilyView, GuardianInvite, inviteMessage } from '../lib/familyView';
import { AthleteView } from '../lib/athleteView';
import { AthleteMode } from './AthleteMode';
import { VjSession } from '../types';

// VJ6: the player of the Visão de Jogo sessions, loaded only when a session is opened
const ConductSession = lazy(() =>
  import('../components/visaoDeJogo/ConductSession').then((m) => ({ default: m.ConductSession }))
);

/**
 * E1 — Área do encarregado de educação (/encarregado): create the account with the coach's invitation (and the
 * consents), sign in, and «O meu educando» — only the page the coaches' phones publish for that child. It never
 * opens the club's app nor its data.
 */
const ddmm = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
const weekday = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString('pt-PT', { weekday: 'short' }).replace('.', '');
const codeFromUrl = () => new URLSearchParams(window.location.search).get('c') || '';
const authError = (e: unknown) => {
  const code = (e as { code?: string })?.code || '';
  if (code.includes('wrong-password') || code.includes('invalid-credential')) return 'Email ou palavra-passe errados.';
  if (code.includes('email-already-in-use'))
    return 'Este email já tem conta: escolha «Já tenho conta» e entre com a sua palavra-passe.';
  if (code.includes('weak-password')) return 'A palavra-passe precisa de pelo menos 6 caracteres.';
  if (code.includes('invalid-email')) return 'Este email não parece certo.';
  if (code.includes('permission-denied'))
    return 'O convite já foi usado, expirou ou foi retirado. Peça outro ao treinador.';
  return 'Não foi possível continuar (sem ligação?). Tente outra vez.';
};

const GuardianApp: React.FC = () => {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [account, setAccount] = useState<GuardianAccount | null>(null);
  const [code] = useState(codeFromUrl);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => onAuthStateChanged(auth, setUser), []);
  useEffect(() => {
    if (!user) return;
    let gone = false;
    readGuardianAccount(user.uid).then(
      (a) => !gone && setAccount(a),
      () => !gone && setAccount(null)
    );
    return () => {
      gone = true;
    };
  }, [user, refresh]);

  return (
    <div className="min-h-screen bg-ui-bg px-4 py-6 text-ui-text">
      <div className="mx-auto max-w-md space-y-4">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-lg font-extrabold">BolaComVisão</p>
            <p className="text-xs text-ui-muted">Área do encarregado de educação</p>
          </div>
          {user && (
            <button type="button" onClick={() => signOut(auth)} className="ui-btn ui-btn-soft px-3 py-1.5 text-xs">
              Sair
            </button>
          )}
        </header>
        {user === undefined ? (
          <p className="text-sm text-ui-muted">A carregar…</p>
        ) : !user ? (
          <Welcome code={code} />
        ) : code && !(account?.codes || []).includes(code) ? (
          <AcceptInvite code={code} onDone={() => setRefresh((n) => n + 1)} />
        ) : (
          <MyChildren account={account} />
        )}
        <p className="flex items-start gap-1.5 text-xs text-ui-muted">
          <Icon name="lock" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Vê só o seu educando. Nunca notas do treinador, avaliações, contactos nem outros atletas. Pode pedir ao clube
          para ver ou apagar os dados do seu educando.
        </p>
      </div>
    </div>
  );
};

/** Not signed in: create the account with the invitation, or sign in. */
const Welcome: React.FC<{ code: string }> = ({ code }) => {
  const [mode, setMode] = useState<'novo' | 'entrar'>(code ? 'novo' : 'entrar');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (mode === 'novo') await createUserWithEmailAndPassword(auth, email.trim(), password);
      else await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (err) {
      setError(authError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="ui-card space-y-3 p-4" aria-label="Entrar como encarregado">
      <div className="flex gap-1.5" role="tablist">
        {(
          [
            ['novo', 'Tenho um convite'],
            ['entrar', 'Já tenho conta']
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={mode === k}
            onClick={() => setMode(k)}
            className={`rounded-full border px-3 py-1 text-xs ${mode === k ? 'border-ui-brand bg-ui-brand/10' : 'border-ui-line text-ui-muted'}`}
          >
            {label}
          </button>
        ))}
      </div>
      {mode === 'novo' && !code && (
        <p className="text-xs text-ui-warning">
          Abra o link do convite que o treinador lhe enviou (por WhatsApp) para criar a conta.
        </p>
      )}
      <label className="block text-xs text-ui-muted">
        Email
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="ui-input mt-1 w-full text-sm"
        />
      </label>
      <label className="block text-xs text-ui-muted">
        Palavra-passe {mode === 'novo' ? '(mínimo 6 caracteres)' : ''}
        <input
          type="password"
          required
          minLength={6}
          autoComplete={mode === 'novo' ? 'new-password' : 'current-password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="ui-input mt-1 w-full text-sm"
        />
      </label>
      {error && <p className="text-xs text-ui-danger">{error}</p>}
      {note && <p className="text-xs text-ui-success">{note}</p>}
      <button type="submit" disabled={busy || (mode === 'novo' && !code)} className="ui-btn ui-btn-primary w-full">
        {mode === 'novo' ? 'Continuar' : 'Entrar'}
      </button>
      {mode === 'entrar' && (
        <button
          type="button"
          onClick={() =>
            email.trim()
              ? sendPasswordResetEmail(auth, email.trim()).then(
                  () => setNote('Enviámos um email para mudar a palavra-passe.'),
                  () => setError('Não foi possível enviar o email.')
                )
              : setError('Escreva o seu email primeiro.')
          }
          className="min-h-10 w-full text-center text-xs font-semibold text-ui-brand"
        >
          Esqueci-me da palavra-passe
        </button>
      )}
    </form>
  );
};

/** Signed in with an invitation not used yet: who it is for, the consents, accept. */
const AcceptInvite: React.FC<{ code: string; onDone: () => void }> = ({ code, onDone }) => {
  const [invite, setInvite] = useState<GuardianInvite | null | undefined>(undefined);
  const [name, setName] = useState('');
  const [data, setData] = useState(false);
  const [video, setVideo] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [now] = useState(() => Date.now());

  useEffect(() => {
    let gone = false;
    readInvite(code).then(
      (i) => !gone && setInvite(i),
      () => !gone && setInvite(null)
    );
    return () => {
      gone = true;
    };
  }, [code]);

  if (invite === undefined) return <p className="text-sm text-ui-muted">A abrir o convite…</p>;
  const usable = invite && invite.status === 'pending' && invite.expiresAt > now;
  const athlete = invite?.kind === 'atleta';
  if (!usable)
    return (
      <div className="ui-card space-y-2 p-4" role="alert">
        <p className="font-bold">Este convite já não pode ser usado</p>
        <p className="text-xs text-ui-muted">
          Já foi usado, expirou (7 dias) ou foi retirado. Peça um novo convite ao treinador.
        </p>
        <a href="/encarregado" className="ui-btn ui-btn-soft block text-center text-xs">
          Ver o meu educando
        </a>
      </div>
    );

  return (
    <form
      className="ui-card space-y-3 p-4"
      aria-label="Aceitar o convite"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError('');
        try {
          await acceptInvite(code, { video: athlete ? false : video }, { name });
          window.history.replaceState(null, '', '/encarregado');
          onDone();
        } catch (err) {
          setError(authError(err));
        } finally {
          setBusy(false);
        }
      }}
    >
      <div>
        <p className="text-base font-extrabold">Convite · {invite.clubName || 'clube'}</p>
        <p className="text-xs text-ui-muted">
          {athlete ? 'Conta de atleta de ' : 'Encarregado de educação de '}
          <b className="text-ui-text">{invite.athleteName}</b>
          {invite.teamName ? ` · ${invite.teamName}` : ''}
        </p>
      </div>
      <label className="block text-xs text-ui-muted">
        O seu nome
        <input
          required
          maxLength={120}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="ui-input mt-1 w-full text-sm"
        />
      </label>
      <label className="flex items-start gap-2 text-xs">
        <input type="checkbox" required checked={data} onChange={(e) => setData(e.target.checked)} className="mt-0.5" />
        {athlete ? (
          <span>
            Aceito usar a app para o meu percurso no clube. O meu encarregado de educação autorizou este convite e pode
            retirá-lo. <b>(obrigatório)</b>
          </span>
        ) : (
          <span>
            Li e aceito como o clube usa os dados do meu educando nesta app: próximos jogos e treinos, convocatórias e
            presenças. <b>(obrigatório)</b>
          </span>
        )}
      </label>
      {!athlete && (
        <>
          <label className="flex items-start gap-2 text-xs">
            <input type="checkbox" checked={video} onChange={(e) => setVideo(e.target.checked)} className="mt-0.5" />
            <span>Autorizo vídeos de treinos e jogos com o meu educando na Visão de Jogo. (opcional)</span>
          </label>
          <p className="text-xs text-ui-muted">
            Pode retirar a autorização dos vídeos a qualquer momento. Fica registado quando a deu ou retirou.
          </p>
        </>
      )}
      {error && <p className="text-xs text-ui-danger">{error}</p>}
      <button type="submit" disabled={busy || !data} className="ui-btn ui-btn-primary w-full">
        Aceitar o convite
      </button>
    </form>
  );
};

/** «O meu educando»: one card per child, from the pages the coaches publish. */
const MyChildren: React.FC<{ account: GuardianAccount | null }> = ({ account }) => {
  const codes = account?.codes || [];
  if (!codes.length)
    return (
      <div className="ui-card p-4 text-sm text-ui-muted">
        Ainda não tem educandos ligados. Abra o link do convite que o treinador lhe enviou.
      </div>
    );
  return (
    <>
      {codes.map((c) => (
        <ChildCard key={c} code={c} sent={account?.sent || []} />
      ))}
    </>
  );
};

const ChildCard: React.FC<{ code: string; sent: string[] }> = ({ code, sent }) => {
  const [state, setState] = useState<{ invite: GuardianInvite | null; view: FamilyView | null } | undefined>();
  // MC2a: «O Meu Percurso» (only when the club switched it on and the coach's phone published it)
  const [career, setCareer] = useState<AthleteView | null>(null);
  const [athleteMode, setAthleteMode] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [msg, setMsg] = useState('');
  const [watching, setWatching] = useState<VjSession | null>(null);

  useEffect(() => {
    let gone = false;
    Promise.all([
      readInvite(code).catch(() => null),
      readFamilyView(code).catch(() => null),
      readAthleteView(code).catch(() => null)
    ]).then(([invite, page, athletePage]) => {
      if (gone) return;
      setState({ invite, view: page?.view || null });
      setCareer(athletePage?.view || null);
    });
    return () => {
      gone = true;
    };
  }, [code]);

  if (state === undefined) return <p className="text-sm text-ui-muted">A carregar…</p>;
  const { invite, view } = state;
  if (!invite || invite.status !== 'accepted') return null; // revoked or left: nothing to show
  const ownAccount = invite.kind === 'atleta';
  // The athlete's own account (13+): the percurso first
  if (ownAccount && career) return <AthleteMode view={career} />;
  // …and nothing else: the family page is the guardian's, never the athlete's
  if (ownAccount)
    return (
      <section className="ui-card p-4" aria-label={`À espera do percurso: ${invite.athleteName}`}>
        <p className="font-extrabold">{invite.athleteName}</p>
        <p className="text-xs text-ui-muted">
          O teu percurso aparece aqui quando o clube o tiver ligado e o treinador abrir a app.
        </p>
      </section>
    );
  // «Modo atleta» (under 13, on the guardian's phone): the whole screen, and leaving needs the guardian's password
  if (athleteMode && career)
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto bg-ui-bg px-4 py-6">
        <div className="mx-auto max-w-md">
          <AthleteMode view={career} onExit={() => setExiting(true)} exitLabel="Sair do Modo atleta (encarregado)" />
          {exiting && (
            <ExitLock onDone={() => (setExiting(false), setAthleteMode(false))} onCancel={() => setExiting(false)} />
          )}
        </div>
      </div>
    );
  if (!view)
    return (
      <section className="ui-card p-4" aria-label={`O meu educando: ${invite.athleteName}`}>
        <p className="font-extrabold">{invite.athleteName}</p>
        <p className="text-xs text-ui-muted">
          A página aparece assim que o treinador abrir a app (atualiza-se a partir do telemóvel dele).
        </p>
      </section>
    );

  return (
    <section className="space-y-2" aria-label={`O meu educando: ${view.athleteName}`}>
      <div className="ui-card p-4">
        <p className="text-lg font-extrabold">{view.athleteName}</p>
        <p className="text-xs text-ui-muted">
          {[view.clubName, view.teamName, view.season].filter(Boolean).join(' · ')}
        </p>
      </div>
      <div className="ui-card space-y-1 p-4">
        <p className="text-sm font-bold">Próximos</p>
        {view.next.length === 0 && <p className="text-xs text-ui-muted">Sem jogos nem treinos marcados.</p>}
        {view.next.map((e, i) => (
          <p key={i} className="flex justify-between gap-2 border-b border-ui-line py-1 text-xs">
            <span>
              <b>
                {weekday(e.date)} {ddmm(e.date)}
                {e.time ? ` · ${e.time}` : ''}
              </b>{' '}
              · {e.title}
              {e.location ? <span className="block text-[11px] text-ui-muted">{e.location}</span> : null}
            </span>
            {e.calledUp !== undefined && (
              <span className={e.calledUp ? 'text-ui-success' : 'text-ui-muted'}>
                {e.calledUp ? 'Convocado ✓' : 'Não convocado'}
              </span>
            )}
          </p>
        ))}
      </div>
      <div className="ui-card p-4">
        <p className="text-sm font-bold">Esta época</p>
        <p className="text-xs text-ui-muted">
          Treinos: {view.trainings.attended} de {view.trainings.total}
        </p>
      </div>
      {watching && (
        <Suspense fallback={<p className="text-sm text-ui-muted">A abrir…</p>}>
          <ConductSession session={watching} home onClose={() => setWatching(null)} />
        </Suspense>
      )}
      {(view.vjSessions || []).length > 0 && (
        <div className="ui-card space-y-1.5 p-4" aria-label="Para ver em casa">
          <p className="flex items-center gap-2 text-sm font-bold">
            <Icon name="play" className="h-4 w-4 shrink-0 text-ui-muted" />
            Para ver em casa
          </p>
          <p className="text-xs text-ui-muted">
            Sessões da Visão de Jogo da equipa: o vídeo para e faz perguntas. As respostas ficam só neste telemóvel.
          </p>
          {(view.vjSessions || []).map((s) => {
            const n = s.items.reduce((k, i) => k + (i.pauses?.length || 0), 0);
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setWatching(s)}
                className="ui-btn ui-btn-secondary min-h-11 w-full justify-start text-left text-xs"
                aria-label={`Ver em casa: ${s.title}`}
              >
                <Icon name="play" className="h-4 w-4 shrink-0" />
                {s.title} · {n} {n === 1 ? 'pergunta' : 'perguntas'}
              </button>
            );
          })}
        </div>
      )}
      {career && !ownAccount && (
        <CareerCard career={career} invite={invite} sent={sent} onAthleteMode={() => setAthleteMode(true)} />
      )}
      {view.seasonMessage && (
        <div className="ui-card p-4">
          <p className="text-sm font-bold">Mensagem do treinador</p>
          <p className="whitespace-pre-line text-xs">{view.seasonMessage}</p>
        </div>
      )}
      <div className="ui-card space-y-2 p-4">
        <label className="flex items-start gap-2 text-xs">
          <input
            type="checkbox"
            checked={!!invite.consentVideo}
            onChange={async (e) => {
              const video = e.target.checked;
              try {
                await setVideoConsent(code, video);
                setState({ ...state, invite: { ...invite, consentVideo: video } });
                setMsg(video ? 'Autorização dos vídeos dada ✓' : 'Autorização dos vídeos retirada ✓');
              } catch {
                setMsg('Não foi possível guardar (sem ligação?).');
              }
            }}
            className="mt-0.5"
          />
          <span>Autorizo vídeos de treinos e jogos com o meu educando na Visão de Jogo</span>
        </label>
        {msg && <p className="text-[11px] text-ui-success">{msg}</p>}
        <button
          type="button"
          onClick={async () => {
            if (!window.confirm(`Deixar de acompanhar ${view.athleteName} na app?`)) return;
            try {
              await leaveInvite(code);
              setState({ ...state, invite: { ...invite, status: 'left' } });
            } catch {
              setMsg('Não foi possível (sem ligação?).');
            }
          }}
          className="min-h-10 text-xs font-semibold text-ui-danger"
        >
          Deixar de acompanhar este educando
        </button>
      </div>
      <p className="text-xs text-ui-muted">
        Atualizado a {new Date(view.updatedAt).toLocaleDateString('pt-PT')} a partir da app do treinador.
      </p>
    </section>
  );
};

export default GuardianApp;

/**
 * MC2a — on the guardian's page: «O Meu Percurso» of the child, «Passar ao Modo atleta» (the child uses the guardian's
 * phone) and, from 13, inviting the athlete's own account (the guardian's consent is this invitation).
 */
const CareerCard: React.FC<{
  career: AthleteView;
  invite: GuardianInvite;
  sent: string[];
  onAthleteMode: () => void;
}> = ({ career, invite, sent, onAthleteMode }) => {
  const [mine, setMine] = useState<GuardianInvite[]>([]);
  const [now] = useState(() => Date.now());
  const [msg, setMsg] = useState('');
  useEffect(() => {
    let gone = false;
    Promise.all(sent.map((c) => readInvite(c).catch(() => null))).then(
      (list) =>
        !gone &&
        setMine(list.filter((i): i is GuardianInvite => !!i && i.athleteId === invite.athleteId && i.kind === 'atleta'))
    );
    return () => {
      gone = true;
    };
  }, [sent, invite.athleteId]);
  const active = mine.filter((i) => i.status === 'accepted' || (i.status === 'pending' && i.expiresAt > now));
  const share = (i: GuardianInvite) =>
    window.open(`https://wa.me/?text=${encodeURIComponent(inviteMessage(i, window.location.origin))}`, '_blank');

  return (
    <div className="ui-card space-y-2 p-4" aria-label="O Meu Percurso do educando">
      <p className="flex items-center gap-2 text-sm font-bold">
        <Icon name="chart" className="h-4 w-4 shrink-0 text-ui-muted" />O Meu Percurso
      </p>
      <p className="text-xs text-ui-muted">
        {career.assignments.length
          ? `${career.assignments.length} ${career.assignments.length === 1 ? 'missão ou desafio' : 'missões e desafios'} do treinador`
          : 'Ainda sem missões do treinador.'}
      </p>
      <button type="button" onClick={onAthleteMode} className="ui-btn ui-btn-primary min-h-12 w-full text-sm">
        <Icon name="play" className="h-4 w-4 shrink-0" />
        Passar ao Modo atleta
      </button>
      <p className="text-xs text-ui-muted">
        O seu educando usa o seu telemóvel; para sair é preciso a sua palavra-passe. Nada do que faz fica guardado.
      </p>
      {career.canHaveOwnAccount && (
        <div className="space-y-1 border-t border-ui-line pt-2">
          <p className="text-xs font-bold">Conta própria do atleta (13 ou mais anos)</p>
          {active.map((i) => (
            <p key={i.id} className="flex items-center justify-between gap-2 text-xs">
              <span>{i.status === 'accepted' ? '✓ O atleta já tem conta' : 'Convite enviado · à espera'}</span>
              <span className="flex gap-2">
                {i.status === 'pending' && (
                  <button type="button" onClick={() => share(i)} className="font-semibold text-ui-brand">
                    Reenviar
                  </button>
                )}
                <button
                  type="button"
                  onClick={async () => {
                    if (!window.confirm('Retirar a conta do atleta?')) return;
                    try {
                      await revokeGuardianInvite(i.id);
                      setMine((m) => m.map((x) => (x.id === i.id ? { ...x, status: 'revoked' } : x)));
                    } catch {
                      setMsg('Não foi possível (sem ligação?).');
                    }
                  }}
                  className="text-ui-danger"
                  aria-label="Retirar a conta do atleta"
                >
                  Retirar
                </button>
              </span>
            </p>
          ))}
          {active.length === 0 && (
            <button
              type="button"
              onClick={async () => {
                try {
                  const created = await createAthleteInvite(invite);
                  setMine((m) => [...m, created]);
                  setMsg('Convite criado ✓ Envie o link ao seu educando.');
                  share(created);
                } catch {
                  setMsg('Não foi possível criar o convite (sem ligação?).');
                }
              }}
              className="ui-btn ui-btn-soft w-full text-xs"
            >
              Convidar o meu educando (conta própria)
            </button>
          )}
          <p className="text-xs text-ui-muted">
            Ao convidar, autoriza a conta do seu educando. Pode retirá-la a qualquer momento.
          </p>
        </div>
      )}
      {msg && <p className="text-[11px] text-ui-success">{msg}</p>}
    </div>
  );
};

/** Leaving the «Modo atleta» needs the guardian's password (the child uses the guardian's phone). */
const ExitLock: React.FC<{ onDone: () => void; onCancel: () => void }> = ({ onDone, onCancel }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  return (
    <form
      className="ui-card mt-3 space-y-2 p-4"
      aria-label="Sair do Modo atleta"
      onSubmit={async (e) => {
        e.preventDefault();
        const user = auth.currentUser;
        if (!user?.email) return setError('Sem sessão.');
        try {
          await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, password));
          onDone();
        } catch {
          setError('Palavra-passe errada.');
        }
      }}
    >
      <label className="block text-xs text-ui-muted">
        Palavra-passe do encarregado
        <input
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="ui-input mt-1 w-full text-sm"
        />
      </label>
      {error && <p className="text-xs text-ui-danger">{error}</p>}
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={onCancel} className="ui-btn ui-btn-soft text-xs">
          Continuar no Modo atleta
        </button>
        <button type="submit" className="ui-btn ui-btn-primary text-xs">
          Sair
        </button>
      </div>
    </form>
  );
};
