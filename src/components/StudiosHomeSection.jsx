import { useEffect, useRef, useState } from 'react';
import { Building2, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { fetchFeaturedStudios, subscribeToStudios } from '../services/studios';
import { StudioCard } from './StudioCard';

const StudiosHomeSection = () => {
  const [studios, setStudios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const railRef = useRef(null);
  useEffect(() => {
    let active = true;
    const refresh = () => fetchFeaturedStudios()
      .then((items) => { if (active) { setStudios(items); setError(''); } })
      .catch((loadError) => {
        console.error('Could not load homepage studios:', loadError);
        if (active) setError('Studios could not be loaded right now.');
      })
      .finally(() => { if (active) setLoading(false); });
    const unsubscribe = subscribeToStudios(refresh);
    void refresh();
    return () => { active = false; unsubscribe(); };
  }, []);
  if (!loading && !error && !studios.length) return null;
  return <section className="home-section studios-home-section">
    <div className="section-header home-section-header">
      <div className="section-title-group home-section-title-group"><div className="section-icon-box purple"><Building2 size={20} color="#a78bfa" /></div><div className="home-section-title-wrap"><h2 className="home-section-title">EXPLORE STUDIOS</h2><span className="home-section-subtitle">Discover movies from your favorite studios.</span></div></div>
      <Link to="/studios" className="section-see-all"><span>View All</span><ChevronRight size={18} /></Link>
    </div>
    {error ? <p className="studios-home-error" role="status">{error}</p> : loading ? <div className="studios-track studios-track-loading" aria-label="Loading studios" aria-busy="true">{Array.from({ length: 4 }, (_, index) => <span className="studio-card-skeleton" key={index} />)}</div> : <div className="studios-rail">
      <button className="browse-arrow browse-arrow-left" onClick={() => railRef.current?.scrollBy({ left: -280, behavior: 'smooth' })} aria-label="Previous studios"><ChevronRight size={28} /></button>
      <div className="studios-track" ref={railRef}>{studios.map((studio) => <StudioCard studio={studio} key={studio.id} compact />)}</div>
      <button className="browse-arrow browse-arrow-right" onClick={() => railRef.current?.scrollBy({ left: 280, behavior: 'smooth' })} aria-label="Next studios"><ChevronRight size={28} /></button>
    </div>}
  </section>;
};

export default StudiosHomeSection;
