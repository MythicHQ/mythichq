import { useState } from 'react';
import { Crop } from 'lucide-react';
import ImageCropEditor from './ImageCropEditor';

const ImageCropButton = ({ source, label, aspectRatio = 'original', className = 'admin-button admin-button-secondary' }) => {
  const [open, setOpen] = useState(false);
  if (!source) return null;
  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)}><Crop size={15} /> Crop / Edit Image</button>
      {open && <ImageCropEditor source={source} label={label} aspectRatio={aspectRatio} onClose={() => setOpen(false)} />}
    </>
  );
};

export default ImageCropButton;
