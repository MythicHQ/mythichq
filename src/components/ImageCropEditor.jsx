import { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Crop, Minus, Plus, RotateCcw, X } from 'lucide-react';
import { DEFAULT_CROP_SETTINGS, getImageCropSettings, resetImageCropSettings, saveImageCropSettings } from '../services/imageCrops';

const PRESETS = [
  ['original', 'Original ratio'],
  ['16:9', '16:9'],
  ['4:3', '4:3'],
  ['3:2', '3:2'],
  ['1:1', '1:1'],
  ['2:3', '2:3'],
  ['freeform', 'Freeform'],
];

const ratioValue = (ratio) => {
  if (ratio === 'original' || ratio === 'freeform') return undefined;
  const [width, height] = ratio.split(':').map(Number);
  return width / height;
};

const getCropFrame = (imageRatio, cropRatio) => {
  const maxSide = 78;
  let width = maxSide;
  let height = (width * imageRatio) / cropRatio;
  if (height > maxSide) {
    height = maxSide;
    width = (height * cropRatio) / imageRatio;
  }
  return { width, height, imageSize: Math.max(width, height) };
};

const ImageCropEditor = ({ source, label = 'image', aspectRatio = 'original', onClose }) => {
  const [settings, setSettings] = useState({ ...DEFAULT_CROP_SETTINGS, aspectRatio });
  const [customRatio, setCustomRatio] = useState({ width: 16, height: 9 });
  const [freeformRatio, setFreeformRatio] = useState({ width: 16, height: 9 });
  const [imageDimensions, setImageDimensions] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [croppedPreview, setCroppedPreview] = useState('');
  const [showCroppedPreview, setShowCroppedPreview] = useState(false);
  const previewRef = useRef(null);
  const dragRef = useRef(null);

  useEffect(() => () => {
    if (croppedPreview) URL.revokeObjectURL(croppedPreview);
  }, [croppedPreview]);

  useEffect(() => {
    let active = true;
    getImageCropSettings(source)
      .then((saved) => {
        if (active) {
          setSettings({ ...DEFAULT_CROP_SETTINGS, ...saved, aspectRatio: saved === DEFAULT_CROP_SETTINGS ? aspectRatio : saved.aspectRatio });
          if (saved.aspectRatio === 'custom' && saved.customRatio) setCustomRatio(saved.customRatio);
          if (saved.aspectRatio === 'freeform' && saved.freeformRatio) setFreeformRatio(saved.freeformRatio);
        }
      })
      .catch((loadError) => {
        if (active) setError(loadError.message || 'Unable to load saved crop settings.');
      });
    return () => { active = false; };
  }, [aspectRatio, source]);

  const changePosition = (x, y) => setSettings((current) => ({
    ...current,
    x: Math.max(0, Math.min(100, x)),
    y: Math.max(0, Math.min(100, y)),
  }));

  const onPointerDown = (event) => {
    if (!previewRef.current) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
  };

  const onPointerMove = (event) => {
    if (!dragRef.current || !previewRef.current) return;
    const bounds = previewRef.current.getBoundingClientRect();
    const previous = dragRef.current;
    const naturalWidth = imageDimensions?.width || bounds.width;
    const naturalHeight = imageDimensions?.height || bounds.height;
    const targetRatio = previewAspect || naturalWidth / naturalHeight;
    const baseWidth = Math.min(naturalWidth, naturalHeight * targetRatio);
    const baseHeight = baseWidth / targetRatio;
    const cropWidth = baseWidth / settings.zoom;
    const cropHeight = baseHeight / settings.zoom;
    const frameWidth = bounds.width * (cropFrame.width / 100);
    const frameHeight = bounds.height * (cropFrame.height / 100);
    const scale = Math.max(frameWidth / cropWidth, frameHeight / cropHeight);
    const overflowX = Math.max(0, (naturalWidth - cropWidth) * scale);
    const overflowY = Math.max(0, (naturalHeight - cropHeight) * scale);
    const deltaX = event.clientX - previous.x;
    const deltaY = event.clientY - previous.y;
    changePosition(
      settings.x - (overflowX ? (deltaX / overflowX) * 100 : 0),
      settings.y - (overflowY ? (deltaY / overflowY) * 100 : 0),
    );
    dragRef.current = { ...previous, x: event.clientX, y: event.clientY };
  };

  const cropPreview = async () => {
    setError('');
    try {
      const image = new Image();
      if (/^https?:\/\//i.test(source) && new URL(source, window.location.origin).origin !== window.location.origin) {
        image.crossOrigin = 'anonymous';
      }
      await new Promise((resolve, reject) => {
        image.onload = resolve;
        image.onerror = () => reject(new Error('Unable to load this image for cropping.'));
        image.src = source;
        if (image.complete && image.naturalWidth > 0) resolve();
      });

      const targetRatio = previewAspect || image.naturalWidth / image.naturalHeight;
      if (!Number.isFinite(targetRatio) || targetRatio <= 0) {
        throw new Error('Choose a valid crop aspect ratio.');
      }
      const baseWidth = Math.min(image.naturalWidth, image.naturalHeight * targetRatio);
      const baseHeight = baseWidth / targetRatio;
      const cropWidth = baseWidth / settings.zoom;
      const cropHeight = baseHeight / settings.zoom;
      const sourceX = (image.naturalWidth - cropWidth) * (settings.x / 100);
      const sourceY = (image.naturalHeight - cropHeight) * (settings.y / 100);
      const outputWidth = targetRatio >= 1 ? 1200 : Math.round(1200 * targetRatio);
      const outputHeight = targetRatio >= 1 ? Math.round(1200 / targetRatio) : 1200;
      const canvas = document.createElement('canvas');
      canvas.width = outputWidth;
      canvas.height = outputHeight;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Your browser could not prepare the crop preview.');
      context.drawImage(image, sourceX, sourceY, cropWidth, cropHeight, 0, 0, outputWidth, outputHeight);

      const previewBlob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (!previewBlob) throw new Error('Unable to generate the crop preview for this image.');
      setCroppedPreview(URL.createObjectURL(previewBlob));
      setShowCroppedPreview(true);
    } catch (previewError) {
      setError(previewError.message || 'Unable to generate the crop preview. The image host may not allow local cropping.');
    }
  };

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      await saveImageCropSettings(source, {
        ...settings,
        ...(settings.aspectRatio === 'custom' ? { customRatio } : {}),
        ...(settings.aspectRatio === 'freeform' ? { freeformRatio } : {}),
      });
      onClose();
    } catch (saveError) {
      setError(saveError.message || 'Unable to save crop settings.');
    } finally {
      setSaving(false);
    }
  };

  const reset = async () => {
    setSaving(true);
    setError('');
    try {
      await resetImageCropSettings(source);
      setSettings({ ...DEFAULT_CROP_SETTINGS, aspectRatio });
      setShowCroppedPreview(false);
      setCroppedPreview('');
    } catch (resetError) {
      setError(resetError.message || 'Unable to restore the original image framing.');
    } finally {
      setSaving(false);
    }
  };

  const ratio = settings.aspectRatio === 'custom'
    ? Number(customRatio.width) / Number(customRatio.height)
    : settings.aspectRatio === 'freeform'
      ? Number(freeformRatio.width) / Number(freeformRatio.height)
      : ratioValue(settings.aspectRatio);
  const previewAspect = settings.aspectRatio === 'original'
    ? (imageDimensions ? imageDimensions.width / imageDimensions.height : undefined)
    : ratio;
  const imageAspect = imageDimensions ? imageDimensions.width / imageDimensions.height : previewAspect || 16 / 9;
  const cropFrame = getCropFrame(imageAspect, previewAspect || imageAspect);
  const renderedImageSize = cropFrame.imageSize * settings.zoom;
  const imageOffsetX = ((renderedImageSize - cropFrame.width) / renderedImageSize) * (50 - settings.x);
  const imageOffsetY = ((renderedImageSize - cropFrame.height) / renderedImageSize) * (50 - settings.y);
  const frameLeft = (100 - cropFrame.width) / 2;
  const frameTop = (100 - cropFrame.height) / 2;
  const frameRight = frameLeft + cropFrame.width;
  const frameBottom = frameTop + cropFrame.height;
  const circularViewport = Math.abs((previewAspect || imageAspect) - 1) < 0.01;
  const maskPath = circularViewport
    ? `M0 0H100V100H0Z M50 ${frameTop} A${cropFrame.width / 2} ${cropFrame.height / 2} 0 1 0 50 ${frameBottom} A${cropFrame.width / 2} ${cropFrame.height / 2} 0 1 0 50 ${frameTop}Z`
    : `M0 0H100V100H0Z M${frameLeft} ${frameTop}H${frameRight}V${frameBottom}H${frameLeft}Z`;

  return (
    <div className="image-crop-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !saving) onClose();
    }}>
      <section className="image-crop-dialog" role="dialog" aria-modal="true" aria-labelledby="image-crop-title">
        <header className="image-crop-header">
          <div><span>IMAGE EDITOR</span><h2 id="image-crop-title">Crop / Edit Image</h2><p>Adjust the framing for {label}. The original image stays unchanged.</p></div>
          <button type="button" onClick={onClose} aria-label="Close image editor" disabled={saving}><X size={20} /></button>
        </header>
        <div className="image-crop-layout">
          <div className="image-crop-preview-column">
            {showCroppedPreview && croppedPreview ? (
              <div className="image-crop-result">
                <img src={croppedPreview} alt="Preview of the cropped image" style={{ aspectRatio: previewAspect || undefined }} />
                <span>Crop preview · original image is unchanged</span>
                <button type="button" className="admin-button admin-button-secondary" onClick={() => setShowCroppedPreview(false)} disabled={saving}>Adjust framing</button>
              </div>
            ) : (
              <>
                <div
                  ref={previewRef}
                  className="image-crop-preview"
                  style={{ aspectRatio: imageAspect }}
                  onPointerDown={onPointerDown}
                  onPointerMove={onPointerMove}
                  onPointerUp={() => { dragRef.current = null; }}
                  onPointerCancel={() => { dragRef.current = null; }}
                  aria-label="Drag image to position crop"
                >
                  <img
                    src={source}
                    alt=""
                    draggable="false"
                    onLoad={(event) => setImageDimensions({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })}
                    style={{
                      width: `${cropFrame.imageSize}%`,
                      height: `${cropFrame.imageSize}%`,
                      transform: `translate(calc(-50% + ${imageOffsetX}%), calc(-50% + ${imageOffsetY}%)) scale(${settings.zoom})`,
                    }}
                  />
                  <svg className="image-crop-mask" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                    <path d={maskPath} fill="rgba(4, 7, 12, 0.58)" fillRule="evenodd" />
                  </svg>
                  <span
                    className={`image-crop-viewport${circularViewport ? ' is-circle' : ''}`}
                    style={{ left: `${frameLeft}%`, top: `${frameTop}%`, width: `${cropFrame.width}%`, height: `${cropFrame.height}%` }}
                    aria-hidden="true"
                  />
                  <span className="image-crop-preview-hint">Drag image to reposition</span>
                </div>
                <label className="image-crop-zoom"><span>Zoom</span><input type="range" min="1" max="3" step="0.05" value={settings.zoom} onChange={(event) => setSettings((current) => ({ ...current, zoom: Number(event.target.value) }))} /><strong>{settings.zoom.toFixed(2)}×</strong></label>
                <button type="button" className="admin-button admin-button-secondary image-crop-preview-action" onClick={cropPreview} disabled={!imageDimensions || saving}><Crop size={15} /> Crop image</button>
              </>
            )}
          </div>
          <div className="image-crop-controls">
            <label><span>Aspect ratio</span><select value={settings.aspectRatio} onChange={(event) => setSettings((current) => ({ ...current, aspectRatio: event.target.value }))}>{PRESETS.map(([value, title]) => <option key={value} value={value}>{title}</option>)}<option value="custom">Custom ratio</option></select></label>
            {settings.aspectRatio === 'custom' && <div className="image-crop-custom-ratio"><label><span>Width</span><input type="number" min="1" value={customRatio.width} onChange={(event) => setCustomRatio((current) => ({ ...current, width: Number(event.target.value) || 1 }))} /></label><span>:</span><label><span>Height</span><input type="number" min="1" value={customRatio.height} onChange={(event) => setCustomRatio((current) => ({ ...current, height: Number(event.target.value) || 1 }))} /></label></div>}
            {settings.aspectRatio === 'freeform' && <div className="image-crop-custom-ratio"><label><span>Crop width</span><input type="range" min="1" max="30" value={freeformRatio.width} onChange={(event) => setFreeformRatio((current) => ({ ...current, width: Number(event.target.value) }))} /></label><span>:</span><label><span>Crop height</span><input type="range" min="1" max="30" value={freeformRatio.height} onChange={(event) => setFreeformRatio((current) => ({ ...current, height: Number(event.target.value) }))} /></label></div>}
            <fieldset className="image-crop-position">
              <legend>Position</legend>
              <button type="button" onClick={() => changePosition(settings.x, settings.y - 5)} aria-label="Move image up"><ArrowUp size={17} /></button>
              <button type="button" onClick={() => changePosition(settings.x - 5, settings.y)} aria-label="Move image left"><ArrowLeft size={17} /></button>
              <button type="button" onClick={() => changePosition(settings.x + 5, settings.y)} aria-label="Move image right"><ArrowRight size={17} /></button>
              <button type="button" onClick={() => changePosition(settings.x, settings.y + 5)} aria-label="Move image down"><ArrowDown size={17} /></button>
            </fieldset>
            <div className="image-crop-nudge"><button type="button" onClick={() => setSettings((current) => ({ ...current, zoom: Math.max(1, current.zoom - 0.1) }))}><Minus size={15} /> Zoom out</button><button type="button" onClick={() => setSettings((current) => ({ ...current, zoom: Math.min(3, current.zoom + 0.1) }))}><Plus size={15} /> Zoom in</button></div>
            <p>Framing is applied consistently to this original image anywhere it appears.</p>
          </div>
        </div>
        {error && <p className="image-crop-error" role="alert">{error}</p>}
        <footer className="image-crop-actions">
          <button type="button" className="admin-button admin-button-secondary" onClick={reset} disabled={saving}><RotateCcw size={15} /> Reset to original</button>
          <div><button type="button" className="admin-button admin-button-secondary" onClick={onClose} disabled={saving}>Cancel</button><button type="button" className="admin-button admin-button-primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save crop settings'}</button></div>
        </footer>
      </section>
    </div>
  );
};

export default ImageCropEditor;
