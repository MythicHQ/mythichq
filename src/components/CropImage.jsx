import { useEffect, useState } from 'react';
import {
  DEFAULT_CROP_SETTINGS,
  getCanonicalImageKey,
  getImageCropSettings,
  subscribeToImageCropSettings,
} from '../services/imageCrops';

const CropImage = ({ src, style, ...props }) => {
  const [settings, setSettings] = useState(DEFAULT_CROP_SETTINGS);
  const imageKey = getCanonicalImageKey(src);

  useEffect(() => {
    let active = true;
    if (!src) return undefined;
    getImageCropSettings(src)
      .then((value) => { if (active) setSettings(value); })
      .catch(() => {});
    const update = (event) => {
      if (event.detail?.key === imageKey) setSettings(event.detail.settings);
    };
    const unsubscribe = subscribeToImageCropSettings(update);
    return () => {
      active = false;
      unsubscribe();
    };
  }, [imageKey, src]);

  return (
    <img
      {...props}
      src={src}
      style={{
        ...style,
        objectPosition: `${settings.x}% ${settings.y}%`,
        transform: settings.zoom > 1 ? `scale(${settings.zoom})` : style?.transform,
      }}
    />
  );
};

export default CropImage;
