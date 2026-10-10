import { useState } from 'react';
import CropImage from './CropImage';

const MovieTitleArtwork = ({ title, imageUrl, className = 'movie-title-artwork' }) => {
  const [loadedImageUrl, setLoadedImageUrl] = useState('');
  const imageLoaded = Boolean(imageUrl) && loadedImageUrl === imageUrl;

  return (
    <>
      {imageUrl && (
        <CropImage
          className={className}
          src={imageUrl}
          alt=""
          hidden={!imageLoaded}
          onLoad={() => setLoadedImageUrl(imageUrl)}
          onError={(event) => { event.currentTarget.hidden = true; }}
        />
      )}
      {!imageLoaded && <span>{title}</span>}
    </>
  );
};

export default MovieTitleArtwork;
