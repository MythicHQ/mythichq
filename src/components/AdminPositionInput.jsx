import { useRef, useState } from 'react';
import { Check, LoaderCircle } from 'lucide-react';

const AdminPositionInput = ({ position, label, onSave, disabled = false }) => {
  const [draft, setDraft] = useState(null);
  const [state, setState] = useState({ saving: false, message: '', error: '' });
  const savingRef = useRef(false);
  const value = draft?.position === Number(position) ? draft.value : String(position);

  const save = async () => {
    if (savingRef.current || disabled) return;
    const draftValue = draft?.position === Number(position) ? draft.value : String(position);
    const parsed = Number(draftValue);
    if (!/^[1-9]\d*$/.test(draftValue) || !Number.isSafeInteger(parsed)) {
      setState({ saving: false, message: '', error: 'Enter a whole position number greater than zero.' });
      setDraft(null);
      return;
    }
    if (parsed === Number(position)) {
      setDraft(null);
      setState({ saving: false, message: '', error: '' });
      return;
    }

    savingRef.current = true;
    setState({ saving: true, message: '', error: '' });
    try {
      await onSave(parsed);
      setDraft(null);
      setState({ saving: false, message: 'Saved', error: '' });
      window.setTimeout(() => setState((current) => current.message === 'Saved'
        ? { saving: false, message: '', error: '' }
        : current), 1800);
    } catch (error) {
      console.error(`Failed to update position for ${label}:`, error);
      setState({ saving: false, message: '', error: error.message || 'Unable to save position.' });
      setDraft(null);
    } finally {
      savingRef.current = false;
    }
  };

  return (
    <label className="admin-position-editor">
      <span className="sr-only">{label} position</span>
      <input
        type="number"
        min="1"
        step="1"
        inputMode="numeric"
        aria-label={`${label} position`}
        aria-invalid={Boolean(state.error)}
        value={value}
        disabled={disabled || state.saving}
        onChange={(event) => {
          setDraft({ position: Number(position), value: event.target.value });
          setState((current) => ({ ...current, message: '', error: '' }));
        }}
        onBlur={() => void save()}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            event.currentTarget.blur();
          } else if (event.key === 'Escape') {
            setDraft(null);
            setState({ saving: false, message: '', error: '' });
            event.currentTarget.blur();
          }
        }}
      />
      <span className="admin-position-feedback" role={state.error ? 'alert' : 'status'}>
        {state.saving && <><LoaderCircle size={12} className="viewer-spinner" /> Saving</>}
        {!state.saving && state.message && <><Check size={12} /> {state.message}</>}
        {!state.saving && state.error}
      </span>
    </label>
  );
};

export default AdminPositionInput;
