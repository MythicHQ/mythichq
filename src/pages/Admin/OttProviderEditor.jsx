import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import CropImage from '../../components/CropImage';

const AVAILABILITIES = [
  ['streaming', 'Streaming'],
  ['rent', 'Rent'],
  ['buy', 'Buy'],
  ['coming_soon', 'Coming Soon'],
];

const OttProviderEditor = ({ providers, onChange, platforms, platformsError = '' }) => {
  const update = (index, nextValues) => onChange((current) => current.map((provider, itemIndex) => (
    itemIndex === index ? { ...provider, ...nextValues } : provider
  )));

  const selectPlatform = (index, value) => {
    const platform = platforms.find((item) => String(item.id) === value);
    if (!platform) return;
    update(index, {
      platform_id: platform.id,
      name: platform.name,
      logo_url: platform.logo_url || '',
      url: platform.website_url || '',
    });
  };

  const addProvider = () => onChange((current) => [...current, {
    platform_id: '',
    name: '',
    logo_url: '',
    availability: 'streaming',
    url: '',
  }]);

  return (
    <div className="ott-provider-editor">
      {platformsError && <p className="ott-provider-notice" role="alert">{platformsError}</p>}
      {providers.map((provider, index) => {
        const linkedPlatform = platforms.find((platform) => (
          String(platform.id) === String(provider.platform_id)
          || (provider.platform_id == null && platform.name.toLocaleLowerCase() === String(provider.name || '').toLocaleLowerCase())
        ));
        const selectedValue = linkedPlatform ? String(linkedPlatform.id) : (provider.name ? `legacy:${provider.name}` : '');

        return (
          <article className="movie-provider-card" key={`${provider.platform_id || provider.name || 'provider'}-${index}`}>
            <header>
              <strong>Platform {index + 1}</strong>
              <button type="button" className="movie-provider-remove" onClick={() => onChange((current) => current.filter((_, itemIndex) => itemIndex !== index))} aria-label={`Remove platform ${index + 1}`}>
                <Trash2 size={15} /> Remove
              </button>
            </header>
            <div className="movie-form-grid">
              <label>
                <span>OTT Platform *</span>
                <select
                  value={selectedValue}
                  required
                  onChange={(event) => selectPlatform(index, event.target.value)}
                >
                  <option value="">Select a platform</option>
                  {provider.name && !linkedPlatform && (
                    <option value={`legacy:${provider.name}`}>Saved platform — {provider.name}</option>
                  )}
                  {platforms.map((platform) => (
                    <option key={platform.id} value={platform.id} disabled={!platform.is_active && String(platform.id) !== String(provider.platform_id)}>
                      {platform.name}{platform.is_active ? '' : ' (Disabled)'}
                    </option>
                  ))}
                </select>
              </label>
              <div className="ott-provider-logo-field">
                <span>Platform Logo</span>
                {(linkedPlatform?.logo_url || provider.logo_url)
                  ? <CropImage src={linkedPlatform?.logo_url || provider.logo_url} alt={`${provider.name || 'Platform'} logo`} />
                  : <small>No logo configured</small>}
              </div>
              <label>
                <span>Availability</span>
                <select value={provider.availability || 'streaming'} onChange={(event) => update(index, { availability: event.target.value })}>
                  {AVAILABILITIES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>
              <label>
                <span>Provider URL</span>
                <input type="url" value={provider.url || ''} onChange={(event) => update(index, { url: event.target.value })} placeholder="https://..." />
              </label>
            </div>
          </article>
        );
      })}
      <button type="button" className="admin-button admin-button-secondary movie-form-add-provider" onClick={addProvider} disabled={!platforms.some((platform) => platform.is_active)}>
        <Plus size={15} /> Add OTT Platform
      </button>
      {!platformsError && !platforms.some((platform) => platform.is_active) && (
        <p className="ott-provider-notice">No active platforms are available. Add or enable platforms in Admin → OTT Platform.</p>
      )}
    </div>
  );
};

export default OttProviderEditor;
