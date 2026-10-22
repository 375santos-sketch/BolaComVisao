import React, { useState } from 'react';
import { AppState, Match } from '../../../types';
import { buildParentsMessage } from '../../../lib/parentsShare';
import { ShareMessageModal } from '../../ShareMessageModal';

interface ParentsShareModalProps {
  match: Match;
  state: AppState;
  onClose: () => void;
  onShowToast?: (msg: string) => void;
}

/** Friendly result message for the parents' group, editable before sending. */
export const ParentsShareModal: React.FC<ParentsShareModalProps> = ({ match, state, onClose, onShowToast }) => {
  const [includeScorers, setIncludeScorers] = useState(true);
  const [text, setText] = useState(() => buildParentsMessage(match, state, { includeScorers: true }));

  const toggleScorers = (value: boolean) => {
    setIncludeScorers(value);
    setText(buildParentsMessage(match, state, { includeScorers: value }));
  };

  return (
    <ShareMessageModal
      title="Partilhar com os pais"
      text={text}
      onTextChange={setText}
      onClose={onClose}
      onShowToast={onShowToast}
    >
      <label className="flex items-center gap-2 text-xs text-slate-300">
        <input type="checkbox" checked={includeScorers} onChange={(e) => toggleScorers(e.target.checked)} />
        Incluir os nomes de quem marcou
      </label>
    </ShareMessageModal>
  );
};
