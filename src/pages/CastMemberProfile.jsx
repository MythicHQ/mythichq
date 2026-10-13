import React, { useCallback, useEffect, useState } from 'react';
import CropImage from '../components/CropImage';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Film, UserRound } from 'lucide-react';
import LoadingIndicator from '../components/LoadingIndicator';
import { getCastMember, loadCastMemberMovies } from '../services/castMembers';
import { getPosterDisplayUrl } from '../services/tmdb';
import { formatDate } from '../utils/helpers';

const movieYear = (releaseDate) => releaseDate ? String(releaseDate).slice(0, 4) : 'Year unknown';

const CastMemberProfile = () => {
  const { castMemberIdentifier } = useParams();
  const [member, setMember] = useState(null);
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const nextMember = await getCastMember(castMemberIdentifier);
      const nextMovies = await loadCastMemberMovies(nextMember.id, { publishedOnly: true });
      setMember(nextMember);
      setMovies(nextMovies);
    } catch (loadError) {
      console.error('Failed to load cast member profile:', loadError);
      setError(loadError.message || 'Unable to load this cast profile.');
    } finally {
      setLoading(false);
    }
  }, [castMemberIdentifier]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  if (loading) return <div className="page-container cast-public-state"><LoadingIndicator label="Loading cast profile..." /></div>;
  if (error || !member) {
    return (
      <div className="page-container cast-public-state">
        <div className="cast-public-error" role="alert">{error || 'Cast member not found.'}</div>
        <Link className="cast-public-back" to="/movies"><ArrowLeft size={16} /> Back to movies</Link>
      </div>
    );
  }

  return (
    <div className="page-container cast-public-page">
      <Link className="cast-public-back" to="/movies"><ArrowLeft size={16} /> Back to movies</Link>
      <section className="cast-public-hero">
        <div className="cast-public-portrait">
          {member.profile_image_url
            ? <CropImage src={member.profile_image_url} alt={member.full_name} />
            : <UserRound size={42} aria-hidden="true" />}
        </div>
        <div className="cast-public-copy">
          <p className="cast-public-eyebrow">{member.profession || 'Cast member'}</p>
          <h1>{member.full_name}</h1>
          {member.nationality && <p className="cast-public-nationality">{member.nationality}</p>}
          {member.biography
            ? <p className="cast-public-biography">{member.biography}</p>
            : <p className="cast-public-biography-empty">No biography available.</p>}
          {member.date_of_birth && <p className="cast-public-birthdate">Born {formatDate(member.date_of_birth)}</p>}
          <div className="cast-public-movie-count"><Film size={16} /> {movies.length} {movies.length === 1 ? 'title' : 'titles'}</div>
        </div>
      </section>

      <section className="cast-public-filmography" aria-labelledby="cast-filmography-heading">
        <div className="cast-public-section-heading">
          <div>
            <p className="cast-public-eyebrow">FILMOGRAPHY</p>
            <h2 id="cast-filmography-heading">Movies & TV Shows featuring {member.full_name}</h2>
          </div>
          <span>{movies.length} {movies.length === 1 ? 'title' : 'titles'}</span>
        </div>
        {movies.length ? (
          <div className="cast-public-movie-grid">
            {movies.map(({ movie_record: movie, id }) => {
              const posterUrl = getPosterDisplayUrl(movie.poster_url, 'w500');
              return (
                <Link className="cast-public-movie-card" to={movie.content_type === 'tv_show' ? `/tv-show/${movie.id}` : `/movie/${movie.id}`} key={id}>
                  <div className="cast-public-movie-poster">
                    {posterUrl
                      ? <CropImage src={posterUrl} alt={`${movie.title} poster`} loading="lazy" />
                      : <Film size={28} aria-hidden="true" />}
                  </div>
                  <strong>{movie.title}</strong>
                  <span>{movieYear(movie.release_date)}</span>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="cast-public-empty">
            <Film size={28} aria-hidden="true" />
            <strong>No titles available</strong>
            <span>There are no published movies or TV Shows linked to this cast member yet.</span>
          </div>
        )}
      </section>
    </div>
  );
};

export default CastMemberProfile;
