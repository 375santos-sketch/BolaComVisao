import { expect, test } from '@playwright/test';
import { COACH_A, FIRESTORE, owner } from './seed';
import { enterPanel, login, navTo } from './helpers';

// 🎬 Visão de Jogo (VJ1): a session of the team, published, kept as the team's record in the cloud. Fictitious data.
test('visão de jogo: sessão com vídeo e pausa com pergunta, publicar, conduzir no treino e guardar na nuvem', async ({
  page
}) => {
  await login(page, COACH_A);
  await enterPanel(page);
  await navTo(page, /clube/i);
  await page.getByRole('button', { name: /Visão de Jogo/ }).click();
  const library = page.getByRole('dialog', { name: 'Visão de Jogo' });
  await expect(library).toContainText('Ainda sem sessões');
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
  await summary.getByRole('button', { name: 'Guardar e terminar' }).click();
  await expect(page.getByText('Respostas do grupo guardadas ✓')).toBeVisible();
  await expect
    .poll(
      async () => {
        const res = await fetch(`${FIRESTORE}/club_workspace/clubA/records?pageSize=500`, { headers: owner });
        const raw = JSON.stringify(await res.json());
        return raw.includes('"challenge"') && raw.includes('dQw4w9WgXcQ') && raw.includes('"runs"');
      },
      { timeout: 30_000, message: 'a sessão no registo da equipa' }
    )
    .toBe(true);
});
