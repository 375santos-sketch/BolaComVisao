import React, { useId } from 'react';

/**
 * A form field: label, the input (whatever is passed as child, given the right id), a help line and an error line.
 * `children` receives the id and the ids of the help/error lines to wire `aria-describedby`.
 */
export const Field: React.FC<{
  label: string;
  help?: string;
  error?: string;
  children: (ids: { id: string; describedBy?: string }) => React.ReactNode;
}> = ({ label, help, error, children }) => {
  const id = useId();
  const helpId = help ? `${id}-ajuda` : undefined;
  const errorId = error ? `${id}-erro` : undefined;
  const describedBy = [helpId, errorId].filter(Boolean).join(' ') || undefined;
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-ui-caption font-bold text-ui-muted">
        {label}
      </label>
      {children({ id, describedBy })}
      {help && !error && (
        <p id={helpId} className="text-ui-caption text-ui-muted">
          {help}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-ui-caption font-bold text-ui-danger">
          {error}
        </p>
      )}
    </div>
  );
};
