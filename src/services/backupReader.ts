/**
 * F1.1b — Reads every document of the platform for the encrypted copy. ONLY READS (getDocsFromServer and
 * getDocFromServer, straight from the server); the lint configuration forbids the Firestore write functions here.
 * The documents stay in memory only until they are encrypted.
 */
import { collection, doc, getDocFromServer, getDocsFromServer } from 'firebase/firestore';
import { db } from './firebase';
import { BackupDoc, toPlainValue } from '../lib/encryptedBackup';
import { workspaceIdsToRead } from '../lib/inventory';

const reason = (err: unknown) => {
  const e = err as { code?: string; message?: string };
  return e?.code || e?.message || String(err);
};

/** Collections at the top that are copied whole. */
const TOP_COLLECTIONS = ['users', 'admins', 'invitations', 'audit_logs', 'system', 'team_workspaces', 'clubs'];

export async function readBackupDocuments(
  onProgress?: (text: string) => void
): Promise<{ documents: BackupDoc[]; errors: string[] }> {
  const documents: BackupDoc[] = [];
  const errors: string[] = [];
  const add = (path: string, data: unknown) =>
    documents.push({ path, data: toPlainValue(data) as Record<string, unknown> });

  const readCollection = async (path: string): Promise<string[]> => {
    try {
      const [first, ...rest] = path.split('/');
      const snap = await getDocsFromServer(collection(db, first, ...rest));
      snap.docs.forEach((d) => add(`${path}/${d.id}`, d.data()));
      return snap.docs.map((d) => d.id);
    } catch (err) {
      errors.push(`${path}: ${reason(err)}`);
      return [];
    }
  };

  for (const name of TOP_COLLECTIONS) {
    onProgress?.(`A ler ${name}…`);
    const ids = await readCollection(name);
    if (name === 'clubs' && ids.length > 0) {
      // The rules allow any sub-collection here and the app cannot list sub-collection names: say so
      errors.push(
        `clubs: ${ids.length} documento(s); as subcoleções de clubs/* não são copiadas (nomes desconhecidos)`
      );
    }
  }

  onProgress?.('A ler as bases de dados das equipas…');
  for (const teamId of await readCollection('team_databases')) {
    for (const datasetId of await readCollection(`team_databases/${teamId}/datasets`)) {
      await readCollection(`team_databases/${teamId}/datasets/${datasetId}/rows`);
    }
  }

  // The club workspaces: those listed, plus the clubs named in accounts and invitations, plus "main"
  const listed = await readCollection('club_workspace');
  const users = documents.filter((d) => /^users\/[^/]+$/.test(d.path)).map((d) => ({ id: d.path, data: d.data }));
  const invitations = documents
    .filter((d) => /^invitations\/[^/]+$/.test(d.path))
    .map((d) => ({ id: d.path, data: d.data }));
  for (const ws of workspaceIdsToRead(listed, users, invitations)) {
    onProgress?.(`A ler o espaço «${ws}»…`);
    if (!listed.includes(ws)) {
      try {
        const snap = await getDocFromServer(doc(db, 'club_workspace', ws));
        if (snap.exists()) add(`club_workspace/${ws}`, snap.data());
      } catch (err) {
        errors.push(`club_workspace/${ws}: ${reason(err)}`);
      }
    }
    await readCollection(`club_workspace/${ws}/records`);
    await readCollection(`club_workspace/${ws}/push_subscriptions`);
  }
  errors.push(
    'Links públicos e votações (public_*): as regras não deixam listá-los; não são copiados (refazem-se a partir das equipas)'
  );
  return { documents, errors };
}
