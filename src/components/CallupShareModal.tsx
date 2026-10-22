import React, { useState } from 'react';
import { AppState, ScheduledMatch } from '../types';
import { buildCallupMessage } from '../lib/callupMessage';
import { ShareMessageModal } from './ShareMessageModal';

interface CallupShareModalProps {
  match: ScheduledMatch;
  state: AppState;
  onClose: () => void;
  onShowToast?: (msg: string) => void;
}

/** The call-up for the team's WhatsApp group, editable before sending. */
export const CallupShareModal: React.FC<CallupShareModalProps> = ({ match, state, onClose, onShowToast }) => {
  const [text, setText] = useState(() => buildCallupMessage(match, state));
  return (
    <ShareMessageModal
      title="Enviar convocatória"
      icon="📋"
      text={text}
      onTextChange={setText}
      onClose={onClose}
      onShowToast={onShowToast}
      rows={14}
    />
  );
};
