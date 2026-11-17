import { expect, test } from '@playwright/test';
import { COACH_A, FIRESTORE, owner } from './seed';
import { enterPanel, login, navTo, setRights } from './helpers';
import { PLATFORM_ADMIN, ensurePlatformAdmin } from './emulatorData';

// 🎬 Visão de Jogo (VJ1): a session of the team, published, kept as the team's record in the cloud. Fictitious data.
test('visão de jogo: sessão com vídeo e pausa com pergunta, publicar, conduzir no treino e guardar na nuvem', async ({
  page
}) => {
  await login(page, COACH_A);
  await enterPanel(page);
  await navTo(page, /clube/i);
  await page.getByRole('button', { name: /Visão de Jogo/ }).click();
  const library = page.getByRole('dialog', { name: 'Visão de Jogo' });
  await library.getByRole('button', { name: '+ Nova sessão' }).click();
  const editor = page.getByRole('dialog', { name: 'Nova sessão' });
  await editor.getByPlaceholder(/Onde receber/).fill('Onde receber? (receção orientada)');
  await editor.getByLabel('Juntar competência').selectOption('rececao_orientada');
  await editor.getByLabel('Link do vídeo do YouTube').fill('não é um link');
  await editor.getByRole('button', { name: '+ Vídeo' }).click();
  await expect(editor).toContainText('Este link não é de um vídeo do YouTube.');
  await editor.getByLabel('Link do vídeo do YouTube').fill('https://youtu.be/dQw4w9WgXcQ');
  await editor.getByLabel('O que é o vídeo').fill('jogo profissional');
  await editor.getByRole('button', { name: '+ Vídeo' }).click();
  // VJ2: a pause with a question (two right answers, each with its explanation)
  await editor.getByRole('button', { name: '+ Parar aqui (pausa com pergunta)' }).click();
  const pause = editor.getByRole('form', { name: 'Pausa com pergunta' });
  await pause.getByLabel('Momento da pausa').fill('0:42');
  await pause.getByLabel('Pergunta', { exact: true }).fill('Onde deve o médio receber?');
  await pause.getByLabel('Resposta A', { exact: true }).fill('Entre linhas');
  await pause.getByLabel('Resposta A certa').check();
  await pause.getByLabel('Explicação da resposta A').fill('Fica ligado ao jogo e vira para a frente');
  await pause.getByLabel('Resposta B', { exact: true }).fill('Junto à linha lateral');
  await pause.getByLabel('Resposta B certa').check();
  await pause.getByLabel('Resposta C', { exact: true }).fill('Recuar para o central');
  await pause.getByRole('button', { name: 'Guardar a pausa' }).click();
  await expect(editor).toContainText('0:42 · «Onde deve o médio receber?» · 3 opções · 2 certas');
  // MC1a: publishing needs the rights (a public video: external, without identifiable children)
  await editor.getByRole('button', { name: 'Publicar na equipa' }).click();
  await expect(editor.getByRole('alert')).toContainText('Indique os direitos do conteúdo.');
  await setRights(editor);
  await editor.getByRole('button', { name: 'Publicar na equipa' }).click();
  await expect(page.getByText('Publicada ✓')).toBeVisible();
  const list = page.getByRole('dialog', { name: 'Visão de Jogo' }).getByRole('list', { name: 'Sessões' });
  await expect(list).toContainText('Onde receber? (receção orientada)');
  await expect(list).toContainText('Publicada');
  await expect(list).toContainText('Receção orientada');
  // Conduct with the team (without the video: «Ir à próxima pergunta»)
  await page.getByRole('button', { name: 'Conduzir no treino: Onde receber? (receção orientada)' }).click();
  const conduct = page.getByRole('dialog', { name: 'Conduzir no treino' });
  await conduct.getByRole('button', { name: 'Ir à próxima pergunta' }).click();
  const question = conduct.getByRole('region', { name: 'Pergunta' });
  await expect(question).toContainText('Onde deve o médio receber?');
  await question.getByRole('button', { name: /^A · Entre linhas/ }).click();
  await question.getByRole('button', { name: 'Mostrar explicação' }).click();
  await expect(question).toContainText('Fica ligado ao jogo e vira para a frente');
  await question.getByRole('button', { name: 'Continuar ▶' }).click();
  await conduct.getByRole('button', { name: 'Terminar' }).click();
  const summary = page.getByRole('dialog', { name: 'Resumo da sessão' });
  await expect(summary).toContainText('Grupo: Entre linhas · ✗ ainda não'); // the two right answers were not both chosen
  // VJ5: who was in the session (ticked with today's attendance), for each athlete's competencies
  const present = summary.getByRole('group', { name: 'Quem esteve na sessão?' });
  // (comes ticked with today's attendance — unit-tested; another test may mark today's absences, so tick it here)
  await present.getByLabel('Rui Silva').check();
  await summary.getByRole('button', { name: 'Guardar e terminar' }).click();
  await expect(page.getByText('Respostas do grupo guardadas ✓')).toBeVisible();
  await expect
    .poll(
      async () => {
        const res = await fetch(`${FIRESTORE}/club_workspace/clubA/records?pageSize=500`, { headers: owner });
        const raw = JSON.stringify(await res.json());
        return (
          raw.includes('"challenge"') &&
          raw.includes('dQw4w9WgXcQ') &&
          raw.includes('"runs"') &&
          raw.includes('presentIds')
        );
      },
      { timeout: 30_000, message: 'a sessão no registo da equipa' }
    )
    .toBe(true);
  // …and the athlete's sheet shows it under the session's competency (beside the coach's evaluation, unchanged)
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');
  await navTo(page, /equipa/i);
  await page.getByRole('heading', { name: 'Rui Silva' }).click();
  await page.getByRole('navigation', { name: 'Secções da ficha' }).getByRole('button', { name: 'Avaliação' }).click();
  const evaluations = page.getByRole('region', { name: 'Avaliações' });
  // (under the competency's evaluation, or in «Só na Visão de Jogo» when it has none yet: another test may evaluate it)
  await expect(evaluations.getByLabel('Visão de Jogo', { exact: true }).first()).toContainText(
    /esteve em \d+ sess(ão|ões) · o grupo acertou \d+ de \d+ pergunta/
  );
});

// 🎬 VJ4: the platform Administrator publishes a session in the BolaComVisão library; a coach of any club uses it
test('biblioteca BolaComVisão: o Administrador publica, o treinador usa na sua equipa', async ({ page, browser }) => {
  await ensurePlatformAdmin();
  await login(page, PLATFORM_ADMIN);
  await enterPanel(page);
  await navTo(page, /clube/i);
  await page.getByRole('button', { name: /Visão de Jogo/ }).click();
  const library = page.getByRole('dialog', { name: 'Visão de Jogo' });
  await library.getByRole('tab', { name: 'BolaComVisão' }).click();
  await library.getByRole('button', { name: '+ Nova sessão BolaComVisão' }).click();
  const editor = page.getByRole('dialog', { name: 'Nova sessão' });
  await editor.getByPlaceholder(/Onde receber/).fill('Largura e profundidade');
  await editor.getByLabel('Link do vídeo do YouTube').fill('https://youtu.be/dQw4w9WgXcQ');
  await editor.getByRole('button', { name: '+ Vídeo' }).click();
  await setRights(editor);
  await editor.getByRole('button', { name: 'Publicar para todos os clubes' }).click();
  await expect(page.getByText('Publicada ✓')).toBeVisible();
  await expect(library.getByRole('list', { name: 'Sessões' })).toContainText('Largura e profundidade');

  const coach = await (await browser.newContext()).newPage();
  await login(coach, COACH_A);
  await enterPanel(coach);
  await navTo(coach, /clube/i);
  await coach.getByRole('button', { name: /Visão de Jogo/ }).click();
  const coachLibrary = coach.getByRole('dialog', { name: 'Visão de Jogo' });
  await coachLibrary.getByRole('tab', { name: 'BolaComVisão' }).click();
  await expect(coachLibrary.getByRole('button', { name: '+ Nova sessão BolaComVisão' })).toHaveCount(0);
  await coachLibrary.getByRole('button', { name: 'Usar na minha equipa: Largura e profundidade' }).click();
  await expect(coachLibrary.getByText('✓ Na minha equipa')).toBeVisible();
  await coachLibrary.getByRole('tab', { name: 'Da equipa' }).click();
  await expect(coachLibrary.getByRole('list', { name: 'Sessões' })).toContainText('Largura e profundidade');
});

// MC1a: the new kinds of challenge for the coaches (question, practical, reflection), with the rights to publish,
// «Mostrar no treino» (nothing saved) and a goal linked to a competency. Fictitious data.
test('desafios: pergunta, prático e reflexão; direitos para publicar; objetivo com competência', async ({ page }) => {
  test.setTimeout(150_000);
  // An exercise in the team's library (the practical challenge points to it, never copies it)
  const res = await fetch(`${FIRESTORE}/club_workspace/clubA/records/exercise__sub11__exMc1a`, {
    method: 'PATCH',
    headers: owner,
    body: JSON.stringify({
      fields: {
        kind: { stringValue: 'exercise' },
        teamId: { stringValue: 'sub11' },
        entityId: { stringValue: 'exMc1a' },
        updatedAt: { integerValue: String(Date.now()) },
        deleted: { booleanValue: false },
        data: {
          mapValue: {
            fields: {
              id: { stringValue: 'exMc1a' },
              name: { stringValue: 'Receção orientada em triângulo' },
              category: { stringValue: 'tecnica' },
              durationMinutes: { integerValue: '12' },
              createdAt: { stringValue: '2026-11-01' },
              objective: { stringValue: 'Receber orientado para a frente' }
            }
          }
        }
      }
    })
  });
  expect(res.ok).toBe(true);
  await login(page, COACH_A);
  await enterPanel(page);
  await navTo(page, /clube/i);
  await page.getByRole('button', { name: /Visão de Jogo/ }).click();
  const library = page.getByRole('dialog', { name: 'Visão de Jogo' });
  const add = (label: string) =>
    library.getByRole('group', { name: 'Outros desafios' }).getByRole('button', { name: label }).click();

  // Question: needs the question, a right answer and the rights to publish
  await add('+ Pergunta');
  let editor = page.getByRole('dialog', { name: 'Novo desafio · Pergunta' });
  await editor.getByPlaceholder(/Onde receber/).fill('MC1a: para onde receber?');
  await editor.getByRole('group', { name: 'Escalões recomendados' }).getByRole('button', { name: 'Sub-11' }).click();
  await editor.getByLabel('Dificuldade').selectOption('2');
  await editor.getByRole('button', { name: 'Publicar na equipa' }).click();
  await expect(editor.getByRole('alert')).toContainText('Escreva a pergunta.');
  await editor.getByLabel('Pergunta', { exact: true }).fill('Para onde orientar a receção?');
  await editor.getByLabel('Resposta A', { exact: true }).fill('Para a frente');
  await editor.getByLabel('Resposta A certa').check();
  await editor.getByLabel('Explicação da resposta A').fill('Ganha tempo e espaço');
  await editor.getByLabel('Resposta B', { exact: true }).fill('Para trás');
  await editor.getByRole('button', { name: 'Publicar na equipa' }).click();
  await expect(editor.getByRole('alert')).toContainText('Indique os direitos do conteúdo.');
  await setRights(editor, 'proprio');
  await editor.getByRole('button', { name: 'Publicar na equipa' }).click();
  await expect(page.getByText('Publicada ✓')).toBeVisible();
  const list = library.getByRole('list', { name: 'Sessões' });
  await expect(list).toContainText('MC1a: para onde receber?');
  await expect(list).toContainText('❓ Pergunta · Intermédio · Sub-11');
  // Shown in training: the explanation on the screen, nothing saved
  await library.getByRole('button', { name: 'Mostrar no treino: MC1a: para onde receber?' }).click();
  const show = page.getByRole('dialog', { name: 'Mostrar no treino' });
  await expect(show).toContainText('Para onde orientar a receção?');
  await show.getByRole('button', { name: 'Mostrar explicação' }).click();
  await expect(show).toContainText('Ganha tempo e espaço');
  await expect(show).toContainText('Nada fica guardado');
  await show.getByRole('button', { name: 'Terminar' }).click();

  // Practical: an exercise of the team's library
  await add('+ Prático');
  editor = page.getByRole('dialog', { name: 'Novo desafio · Prático' });
  await editor.getByPlaceholder(/Onde receber/).fill('MC1a: receção em triângulo');
  await editor.getByLabel('Exercício da biblioteca da equipa').selectOption('exMc1a');
  await expect(editor.getByLabel('Exercício da biblioteca', { exact: true })).toContainText(
    'Receção orientada em triângulo'
  );
  await editor.getByLabel('Critério de conclusão').fill('5 receções orientadas seguidas');
  await setRights(editor, 'proprio');
  await editor.getByRole('button', { name: 'Publicar na equipa' }).click();
  await expect(page.getByText('Publicada ✓')).toBeVisible();

  // Reflection: only the questions (there is nowhere to answer)
  await add('+ Reflexão');
  editor = page.getByRole('dialog', { name: 'Novo desafio · Reflexão' });
  await editor.getByPlaceholder(/Onde receber/).fill('MC1a: depois do treino');
  await editor.getByLabel('Pergunta de reflexão 1').fill('Que decisão gostavas de mudar?');
  await editor.getByRole('button', { name: 'Guardar' }).click();
  await expect(page.getByText('Desafio guardado ✓')).toBeVisible();
  await library.getByLabel('Tipo de desafio').selectOption('reflexao');
  await expect(list).toContainText('MC1a: depois do treino');
  await expect(list).not.toContainText('MC1a: para onde receber?');

  // In the cloud: the same «challenge» record, format «sessao», the exercise only by its id, no answers
  await expect
    .poll(
      async () => {
        const r = await fetch(`${FIRESTORE}/club_workspace/clubA/records?pageSize=500`, { headers: owner });
        const raw = JSON.stringify(await r.json());
        return (
          raw.includes('"pratico"') &&
          raw.includes('"exMc1a"') &&
          raw.includes('"reflexao"') &&
          raw.includes('Para onde orientar a receção?')
        );
      },
      { timeout: 30_000, message: 'os desafios na nuvem' }
    )
    .toBe(true);

  // A goal linked to a competency
  await page.keyboard.press('Escape');
  await navTo(page, /equipa/i);
  await page.getByRole('heading', { name: 'Rui Silva' }).click();
  await page.getByRole('navigation', { name: 'Secções da ficha' }).getByRole('button', { name: 'Avaliação' }).click();
  const goals = page.getByRole('region', { name: 'Objetivos individuais' });
  await goals.getByLabel('Novo objetivo').fill('MC1a: receber orientado');
  await goals.getByLabel('Competência do objetivo').first().selectOption('rececao_orientada');
  await goals.getByRole('button', { name: 'Adicionar' }).click();
  await expect(goals).toContainText('🧩 Receção orientada');
});
