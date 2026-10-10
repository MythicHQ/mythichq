import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  BadgeCheck,
  Bookmark,
  Calendar,
  Film,
  Globe,
  Image,
  Pencil,
  Play,
  Star,
  Tv,
  UserCheck,
} from 'lucide-react';
import { fetchPublicTvShowDetails, fetchPublicTvShows } from '../services/tvShows';
import CropImage from '../components/CropImage';
import MovieTitleArtwork from '../components/MovieTitleArtwork';
import MovieCard from '../components/MovieCard';
import RatingBadge from '../components/RatingBadge';
import { useWatchlist } from './Admin/WatchlistContext';
import { useAuth } from './Admin/AuthContext';
import LoadingIndicator from '../components/LoadingIndicator';

const BADGE_LABELS = {
  trending: 'Trending',
  popular: 'Popular',
  rising: 'Rising',
  new: 'New',
  top_rated: 'Top rated',
  editors_pick: "Editor's pick",
};

const getYouTubeVideoId = (value) => {
  if (!value || typeof value !== 'string') return '';
  if (/^[A-Za-z0-9_-]{11}$/.test(value.trim())) return value.trim();

  try {
    const url = new URL(value.trim());
    const host = url.hostname.toLowerCase().replace(/^www\./, '');
    if (!['youtube.com', 'youtube-nocookie.com', 'm.youtube.com', 'youtu.be'].includes(host)) return '';
    const id = host === 'youtu.be'
      ? url.pathname.split('/').filter(Boolean)[0]
      : url.searchParams.get('v') || url.pathname.match(/^\/(?:embed|shorts|live)\/([^/?]+)/)?.[1];
    return /^[A-Za-z0-9_-]{11}$/.test(id || '') ? id : '';
  } catch {
    return '';
  }
};

const safeHttpUrl = (value) => /^https?:\/\//i.test(String(value || '').trim());

const TvShowDetails = ({ onPlayTrailer }) => {
  const { identifier } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { isInWatchlist, toggleWatchlist } = useWatchlist();
  const { profile } = useAuth();
  const [show, setShow] = useState(null);
  const [relatedShows, setRelatedShows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setShow(null);
    setLoading(true);
    setError('');
    window.scrollTo(0, 0);

    fetchPublicTvShowDetails(identifier)
      .then((record) => {
        if (active) setShow(record);
      })
      .catch((loadError) => {
        console.error('Failed to load TV Show details:', loadError);
        if (active) setError('Unable to load this TV Show right now.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [identifier]);

  useEffect(() => {
    if (!show) return undefined;
    let active = true;
    fetchPublicTvShows()
      .then((records) => {
        const genres = new Set((show.genres || []).map((genre) => String(typeof genre === 'string' ? genre : genre?.name || '').toLowerCase()));
        const related = records
          .filter((record) => record.id !== show.id)
          .map((record) => ({
            record,
            overlap: (record.genres || []).filter((genre) => genres.has(String(typeof genre === 'string' ? genre : genre?.name || '').toLowerCase())).length,
          }))
          .filter(({ overlap }) => overlap > 0)
          .sort((first, second) => second.overlap - first.overlap || Number(second.record.vote_average) - Number(first.record.vote_average))
          .slice(0, 6)
          .map(({ record }) => record);
        if (active) setRelatedShows(related);
      })
      .catch((loadError) => {
        console.error('Failed to load similar TV shows:', loadError);
        if (active) setRelatedShows([]);
      });
    return () => { active = false; };
  }, [show]);

  const badges = useMemo(() => {
    if (!show) return [];
    const values = [
      ...(Array.isArray(show.badges) ? show.badges : []),
      ...(show.is_trending ? ['trending'] : []),
      ...(show.is_popular ? ['popular'] : []),
      ...(show.is_rising ? ['rising'] : []),
      ...(show.is_new ? ['new'] : []),
      ...(show.is_top_rated ? ['top_rated'] : []),
      ...(show.editors_pick ? ['editors_pick'] : []),
      ...(show.show_status === 'Upcoming' ? ['coming_soon'] : []),
    ];
    return [...new Set(values)];
  }, [show]);

  if (loading) {
    return <div className="page-container movie-details-loading"><LoadingIndicator label="Loading TV show details..." /></div>;
  }

  if (error || !show) {
    return (
      <div className="page-container">
        <div className="empty-state">
          <h3>TV Show Not Available</h3>
          <p>{error || 'The requested TV show is unpublished or could not be found.'}</p>
          <Link className="btn-primary" to="/tv-shows">Back to TV Shows</Link>
        </div>
      </div>
    );
  }

  const inWatchlist = isInWatchlist(show);
  const trailerUrl = safeHttpUrl(show.trailer_url) ? show.trailer_url.trim() : '';
  const teaserUrl = safeHttpUrl(show.teaser_url) ? show.teaser_url.trim() : '';
  const trailerPlayerUrl = trailerUrl || teaserUrl;
  const trailerVideoId = getYouTubeVideoId(trailerPlayerUrl);
  const isDirectVideo = /\.(mp4|webm|ogg)(?:$|[?#])/i.test(trailerPlayerUrl);
  const genres = [...new Set((show.genres || [])
    .map((genre) => String(typeof genre === 'string' ? genre : genre?.name || '').trim())
    .filter(Boolean))];
  const languages = [...new Set((show.languages || []).map((language) => String(language).trim()).filter(Boolean))];
  const seasonCount = Number(show.number_of_seasons) || show.seasons?.length || 0;
  const episodeCount = Number(show.total_episodes)
    || (show.seasons || []).reduce((count, season) => count + (season.episodes?.length || 0), 0);
  const airDate = show.first_air_date || show.premiere_date || '';
  const lastAirDate = show.last_air_date || show.end_date || '';
  const creators = show.crew?.filter((person) => /creator/i.test(`${person.department || ''} ${person.job || ''}`)) || [];
  const detailTitleImage = show.title_image_display_url || show.title_image_url || '';
  const adminEditRoute = `/admin/tv-shows/edit/${encodeURIComponent(show.id)}`;

  return (
    <div className="movie-details-page tv-show-details-page">
      <div className="details-hero">
        <div className="details-hero-backdrop">
          {show.backdrop_path && <CropImage className="details-hero-backdrop-image" src={show.backdrop_path} alt="" />}
          <div className="details-hero-gradient" />
        </div>
        <div className="tv-show-mobile-poster-backdrop" aria-hidden="true">
          {show.poster_path && <CropImage src={show.poster_path} alt="" />}
        </div>

        <div className="details-hero-container">
          <button type="button" className="btn-back-floating" onClick={() => navigate(-1)}>
            <ArrowLeft size={20} />
            <span>Back</span>
          </button>

          <div className="details-hero-content">
            <div className="details-poster-box">
              {show.poster_path && <CropImage src={show.poster_path} alt={`${show.title} poster`} className="details-poster-img" />}
              {profile?.role === 'admin' && (
                <Link
                  className="details-media-update-link"
                  to={adminEditRoute}
                  state={{ returnTo: `${location.pathname}${location.search}` }}
                >
                  <Image size={16} />
                  <span>Update images</span>
                </Link>
              )}
              <button
                type="button"
                className={`btn-watchlist-hero ${inWatchlist ? 'active' : ''}`}
                onClick={() => toggleWatchlist(show)}
              >
                <Bookmark size={20} fill={inWatchlist ? '#E50914' : 'none'} color={inWatchlist ? '#E50914' : '#FFFFFF'} />
                <span>{inWatchlist ? 'In Watchlist' : 'Add to Watchlist'}</span>
              </button>
            </div>

            <div className="details-info-col">
              <h1 className="details-title">
                <MovieTitleArtwork title={show.title} imageUrl={detailTitleImage} />
              </h1>
              {show.tagline && <p className="details-tagline">"{show.tagline}"</p>}

              <div className="details-rating-row">
                {Number.isFinite(Number(show.vote_average)) && Number(show.vote_average) > 0
                  ? <RatingBadge rating={Number(show.vote_average)} size="large" />
                  : null}
                {badges.length > 0 && (
                  <div className="movie-detail-badges">
                    {badges.map((badge) => (
                      <span className={`movie-detail-badge is-${badge}`} key={badge}>
                        {badge === 'trending' ? '🔥 ' : badge === 'popular' ? '⚡ ' : '✦ '}
                        {BADGE_LABELS[badge] || badge.replaceAll('_', ' ')}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="details-meta-row">
                <span className="meta-item"><Tv size={16} /><span>TV Show</span></span>
                {airDate && <span className="meta-item"><Calendar size={16} /><span>First aired {airDate}</span></span>}
                {lastAirDate && <span className="meta-item"><Calendar size={16} /><span>Last aired {lastAirDate}</span></span>}
                {seasonCount > 0 && <span className="meta-item"><Film size={16} /><span>{seasonCount} {seasonCount === 1 ? 'season' : 'seasons'}</span></span>}
                {episodeCount > 0 && <span className="meta-item"><Film size={16} /><span>{episodeCount} {episodeCount === 1 ? 'episode' : 'episodes'}</span></span>}
                {Number(show.average_episode_runtime) > 0 && <span className="meta-item"><span>{show.average_episode_runtime} min per episode</span></span>}
                {show.age_rating && <span className="meta-item movie-age-rating"><BadgeCheck size={16} /><span>{show.age_rating}</span></span>}
                {show.show_status && <span className="meta-item"><span>{show.show_status}</span></span>}
                {creators.map((creator) => (
                  <span className="meta-item" key={creator.id}><UserCheck size={16} /><span>{creator.job || creator.department}: <strong>{creator.person_name}</strong></span></span>
                ))}
              </div>

              {(genres.length > 0 || languages.length > 0) && (
                <div className="details-taxonomy-grid">
                  {genres.length > 0 && <div className="details-taxonomy-section"><span className="details-taxonomy-label"><Film size={14} /> Genres</span><div className="details-taxonomy-list">{genres.map((genre) => <span key={genre} className="details-taxonomy-chip genre-chip"><Film size={13} /> {genre}</span>)}</div></div>}
                  {languages.length > 0 && <div className="details-taxonomy-section"><span className="details-taxonomy-label"><Globe size={14} /> Languages</span><div className="details-taxonomy-list">{languages.map((language) => <span key={language} className="details-taxonomy-chip language-chip"><Globe size={13} /> {language}</span>)}</div></div>}
                </div>
              )}

              {(show.short_description || show.description) && (
                <section className="details-hero-synopsis" aria-label="TV show overview">
                  <p>{show.short_description || show.description}</p>
                </section>
              )}

              <div className="details-cta-buttons">
                {(trailerUrl || teaserUrl) && (
                  <button
                    type="button"
                    className="btn-primary btn-cta-large"
                    onClick={() => {
                      if (trailerVideoId && onPlayTrailer) onPlayTrailer(show, trailerVideoId);
                      else if (trailerUrl) window.open(trailerUrl, '_blank', 'noopener,noreferrer');
                      else window.open(teaserUrl, '_blank', 'noopener,noreferrer');
                    }}
                  >
                    <Play size={22} fill="currentColor" />
                    <span>Watch {trailerUrl ? 'Trailer' : 'Teaser'}</span>
                  </button>
                )}
                <button
                  type="button"
                  className={`btn-secondary btn-cta-large ${inWatchlist ? 'active' : ''}`}
                  onClick={() => toggleWatchlist(show)}
                >
                  <Bookmark size={20} fill={inWatchlist ? 'currentColor' : 'none'} />
                  <span>{inWatchlist ? 'Saved in Watchlist' : 'Add to Watchlist'}</span>
                </button>
                {profile?.role === 'admin' && (
                  <Link
                    className="btn-outline btn-cta-large movie-admin-edit-link"
                    to={adminEditRoute}
                    state={{ returnTo: `${location.pathname}${location.search}` }}
                  >
                    <Pencil size={18} />
                    <span>Edit TV Show</span>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="main-content-wrapper">
        {(show.user_rating != null || show.tmdb_rating != null || show.imdb_rating != null || Number(show.popularity) > 0 || show.initial_hype != null) && (
          <section className="movie-detail-engagement-section tv-show-rating-section" aria-label="TV show ratings and popularity">
            <div className="movie-detail-rating-hype">
              {show.user_rating != null && <div className="movie-detail-rating-card"><span className="movie-detail-metric-label"><Star size={15} fill="currentColor" /> MythicHQ rating</span><strong>{Number(show.user_rating).toFixed(1)}<small>/10</small></strong><span className="movie-detail-rating-note">MythicHQ rating</span></div>}
              {show.tmdb_rating != null && <div className="movie-detail-rating-card"><span className="movie-detail-metric-label"><Star size={15} fill="currentColor" /> TMDB</span><strong>{Number(show.tmdb_rating).toFixed(1)}<small>/10</small></strong><span className="movie-detail-rating-note">External rating</span></div>}
              {show.imdb_rating != null && <div className="movie-detail-rating-card is-imdb"><span className="movie-detail-metric-label"><Star size={15} fill="currentColor" /> IMDb</span><strong>{Number(show.imdb_rating).toFixed(1)}<small>/10</small></strong><span className="movie-detail-rating-note">Independent rating</span></div>}
              {Number(show.popularity) > 0 && <div className="movie-detail-rating-card"><span className="movie-detail-metric-label"><Star size={15} /> Popularity</span><strong>{Number(show.popularity).toLocaleString()}</strong></div>}
              {show.initial_hype != null && <div className="movie-detail-hype-card"><span className="movie-detail-metric-label">Initial hype</span><strong>{Number(show.initial_hype).toFixed(0)}%</strong><div className="movie-detail-hype-track"><span style={{ width: `${Math.max(0, Math.min(100, Number(show.initial_hype)))}%` }} /></div></div>}
            </div>
          </section>
        )}

        {trailerPlayerUrl && (
          <section className="movie-detail-section movie-detail-trailer" id="tv-show-trailer" aria-labelledby="tv-show-trailer-heading">
            <div className="section-header"><h2 id="tv-show-trailer-heading">{trailerUrl ? 'Trailer' : 'Teaser'}</h2></div>
            <div className="movie-detail-trailer-player">
              {trailerVideoId ? (
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${trailerVideoId}?rel=0`}
                  title={`${show.title} ${trailerUrl ? 'trailer' : 'teaser'}`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allowFullScreen
                />
              ) : isDirectVideo ? (
                <video src={trailerPlayerUrl} controls preload="metadata" />
              ) : (
                <a href={trailerPlayerUrl} target="_blank" rel="noopener noreferrer">
                  <Play size={22} fill="currentColor" />
                  <span>Open {trailerUrl ? 'trailer' : 'teaser'}</span>
                </a>
              )}
            </div>
          </section>
        )}

        {relatedShows.length > 0 && (
          <section className="home-section movie-related-section">
            <div className="movie-related-heading">
              <div className="section-header"><h2>Similar TV Shows</h2></div>
              <p className="movie-related-subtitle">More series you may enjoy based on genre and rating.</p>
            </div>
            <div className="movie-related-grid">
              {relatedShows.map((relatedShow) => (
                <MovieCard
                  key={`tv_show-${relatedShow.id}`}
                  movie={relatedShow}
                  showTitle={false}
                  showMetadata={false}
                  recommendationCard
                  onPlayTrailer={onPlayTrailer}
                />
              ))}
            </div>
          </section>
        )}

        {(show.description || show.story || show.season_overview) && (
          <section className="movie-detail-section movie-detail-synopsis">
            <div className="section-header"><h2>Story &amp; Description</h2></div>
            {show.description && <p>{show.description}</p>}
            {show.story && <div className="tv-show-long-copy"><h3>Story / Premise</h3><p>{show.story}</p></div>}
            {show.season_overview && <div className="tv-show-long-copy"><h3>Season Overview</h3><p>{show.season_overview}</p></div>}
          </section>
        )}

        {!!show.seasons?.length && (
          <section className="movie-detail-section tv-show-seasons-section">
            <div className="section-header"><h2>Seasons &amp; Episodes</h2></div>
            <div className="tv-show-seasons">
              {show.seasons.map((season) => (
                <details className="tv-show-season" key={season.id}>
                  <summary>
                    {(season.poster_display_url || season.poster_url) && <CropImage className="tv-show-season-poster" src={season.poster_display_url || season.poster_url} alt="" loading="lazy" />}
                    <span>Season {season.season_number}{season.title ? ` — ${season.title}` : ''}</span>
                    <span>{season.episodes?.length || 0} episodes</span>
                  </summary>
                  {season.overview && <p className="tv-show-season-overview">{season.overview}</p>}
                  {!!season.episodes?.length && <div className="tv-show-episodes">{season.episodes.map((episode) => (
                    <article key={episode.id}>
                      {(episode.still_display_url || episode.still_url) && <CropImage src={episode.still_display_url || episode.still_url} alt="" loading="lazy" />}
                      <div><h3>{episode.episode_number}. {episode.title}</h3>{episode.air_date && <small>{episode.air_date}</small>}{episode.overview && <p>{episode.overview}</p>}{Number(episode.runtime) > 0 && <small>{episode.runtime} min</small>}</div>
                    </article>
                  ))}</div>}
                </details>
              ))}
            </div>
          </section>
        )}

        {!!show.centralCast?.length && (
          <section className="movie-detail-section">
            <div className="section-header"><h2>Cast</h2></div>
            <div className="cast-grid tv-show-cast-grid">
              {show.centralCast.map((person) => (
                <Link to={`/cast/${encodeURIComponent(person.id)}`} key={person.id} className="cast-card movie-credits-card movie-cast-profile-link">
                  {person.profile_image_url
                    ? <CropImage className="cast-avatar" src={person.profile_image_url} alt="" loading="lazy" />
                    : <div className="cast-avatar-fallback"><UserCheck size={25} /></div>}
                  <div className="cast-info"><h4>{person.full_name}</h4>{person.character_name && <p>{person.character_name}</p>}</div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {!!show.crew?.length && (
          <section className="movie-detail-section movie-crew-section">
            <div className="section-header"><h2>Crew</h2></div>
            <div className="cast-grid">
              {show.crew.map((person) => (
                <article key={person.id} className="cast-card movie-credits-card">
                  {person.image_url
                    ? <CropImage src={person.image_url} alt="" className="cast-avatar" loading="lazy" />
                    : <div className="cast-avatar-fallback"><UserCheck size={25} /></div>}
                  <div className="cast-info"><h4>{person.person_name}</h4><p>{[person.department, person.job].filter(Boolean).join(' · ')}</p></div>
                </article>
              ))}
            </div>
          </section>
        )}

        {!!show.watch_providers?.length && (
          <section className="movie-detail-section">
            <div className="section-header"><h2>Where to Watch</h2></div>
            <div className="movie-provider-grid">
              {show.watch_providers.filter((provider) => provider?.name).map((provider, index) => {
                const providerUrl = safeHttpUrl(provider.url) ? provider.url.trim() : '';
                const providerLogo = safeHttpUrl(provider.logo_url) ? provider.logo_url.trim() : '';
                const ProviderTag = providerUrl ? 'a' : 'div';
                return (
                  <ProviderTag
                    className="movie-provider-card"
                    data-platform={provider.name.toLowerCase()}
                    href={providerUrl || undefined}
                    target={providerUrl ? '_blank' : undefined}
                    rel={providerUrl ? 'noopener noreferrer' : undefined}
                    key={`${provider.platform_id || provider.name}-${index}`}
                  >
                    <span className="movie-provider-art"><span className="movie-provider-logo">
                      {providerLogo && <CropImage src={providerLogo} alt="" loading="lazy" onError={(event) => { event.currentTarget.hidden = true; event.currentTarget.nextElementSibling.hidden = false; }} />}
                      <span className="movie-provider-mark" hidden={Boolean(providerLogo)}>{provider.name.slice(0, 2).toUpperCase()}</span>
                    </span></span>
                    <span className="movie-provider-footer"><span className="movie-provider-copy"><strong>{provider.name}</strong><small>{(provider.availability || 'Streaming').replaceAll('_', ' ')}</small></span>{providerUrl && <span className="movie-provider-action">Watch</span>}</span>
                  </ProviderTag>
                );
              })}
            </div>
          </section>
        )}

        <section className="movie-detail-section" aria-labelledby="tv-show-information-heading">
          <div className="section-header"><h2 id="tv-show-information-heading">TV Show Information</h2></div>
          <dl className="movie-information-grid">
            {[
              ['Series type', show.series_type],
              ['Status', show.show_status],
              ['First aired', airDate],
              ['Last aired', lastAirDate],
              ['Seasons', seasonCount || ''],
              ['Episodes', episodeCount || ''],
              ['Episode runtime', Number(show.average_episode_runtime) > 0 ? `${show.average_episode_runtime} min` : ''],
              ['Release schedule', show.episode_release_schedule],
              ['Genres', genres.join(', ')],
              ['Languages', languages.join(', ')],
              ['Country', show.country],
              ['Age rating', show.age_rating],
              ['Network', show.network],
              ['Production company', show.production_company],
            ].filter(([, value]) => value !== '' && value != null)
              .map(([label, value]) => <div className="movie-information-item" key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
          </dl>
        </section>
      </div>
    </div>
  );
};

export default TvShowDetails;
