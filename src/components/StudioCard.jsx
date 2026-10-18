import { ArrowUpRight, Building2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import CropImage from './CropImage';

const StudioMark = ({ studio, className = '' }) => studio.logo_url
  ? <CropImage className={className} src={studio.logo_url} alt={`${studio.name} logo`} loading="lazy" />
  : <span className={`studio-lettermark ${className}`}>{studio.name.split(/\s+/).map((word) => word[0]).slice(0, 3).join('')}</span>;

export const StudioCard = ({ studio, compact = false, titleBelow = false }) => {
  const route = `/studios/${studio.slug}`;
  const artwork = (
    <>
      {studio.background_url && <CropImage className="studio-card-background" src={studio.background_url} alt="" loading="lazy" />}
      <span className="studio-card-overlay" />
      {!compact && <span className="studio-card-kicker"><Building2 size={13} /> STUDIO COLLECTION</span>}
      {!compact && <span className="studio-card-arrow"><ArrowUpRight size={17} /></span>}
      <span className={`studio-card-logo studio-logo-${studio.logo_position || 'center'}`}><StudioMark studio={studio} /></span>
      {!titleBelow && <span className="studio-card-copy"><strong>{studio.name}</strong>{!compact && studio.description && <small>{studio.description}</small>}</span>}
    </>
  );
  const cardClass = `studio-card${compact ? ' is-compact' : ''} studio-text-${studio.text_position || 'left'}`;
  const cardStyle = { '--studio-color': studio.background_color || '#171a24', '--studio-overlay': studio.overlay_opacity ?? 0.48 };

  if (titleBelow) {
    return (
      <div className="studio-card-directory">
        <Link className={cardClass} to={route} style={cardStyle}>{artwork}</Link>
        <Link className="studio-card-directory-title" to={route}>{studio.name}</Link>
      </div>
    );
  }

  return <Link className={cardClass} to={route} style={cardStyle}>{artwork}</Link>;
};

export const StudioFallback = () => <span className="studio-lettermark"><Building2 size={26} /></span>;
