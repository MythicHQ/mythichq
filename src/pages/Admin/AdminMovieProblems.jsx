import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle, CheckCircle2, Clock3, ExternalLink, Film, RefreshCw, Search,
  ShieldAlert, SlidersHorizontal, Trash2, Wrench,
} from 'lucide-react';
import { auditMoviesForProblems, removeDuplicateMovies, updateMovieProblemHistory } from '../../services/movieProblems';

const formatDate = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Unknown' : date.toLocaleString();
};

const MovieProblemCard = ({ issue, onToggleDetails, detailsOpen }) => (
  <article className={`movie-problem-card is-${issue.severity} ${issue.status === 'resolved' ? 'is-resolved' : ''}`}>
    <div className="movie-problem-poster">
      {issue.poster
        ? <img src={issue.poster} alt="" onError={(event) => { event.currentTarget.hidden = true; }} />
        : <Film size={21} />}
    </div>
    <div className="movie-problem-main">
      <div className="movie-problem-heading">
        <div>
          <h2>{issue.movieTitle}</h2>
          <span className="movie-problem-detected"><Clock3 size={13} /> {issue.status === 'resolved' ? 'Resolved' : 'Detected'} {formatDate(issue.status === 'resolved' ? issue.resolvedAt : issue.detectedAt)}</span>
        </div>
        <div className="movie-problem-badges">
          <span className={`movie-problem-severity is-${issue.status === 'resolved' ? 'resolved' : issue.severity}`}>
            {issue.status === 'resolved' ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}
            {issue.status === 'resolved' ? 'Resolved' : issue.severity === 'critical' ? 'Critical' : 'Warning'}
          </span>
          <span className={`movie-problem-status is-${issue.status}`}>{issue.status === 'resolved' ? 'Resolved' : 'Active'}</span>
        </div>
      </div>
      <strong className="movie-problem-title">{issue.problem}</strong>
      <p className="movie-problem-why">{issue.why}</p>
      <div className="movie-problem-actions">
        <button type="button" className="movie-problem-detail-toggle" onClick={() => onToggleDetails(issue.key)} aria-expanded={detailsOpen}>
          {detailsOpen ? 'Hide details' : 'Problem details'}
        </button>
        <a className="admin-button admin-button-secondary" href={`/movie/${encodeURIComponent(issue.movieId)}`} target="_blank" rel="noreferrer">
          <ExternalLink size={14} /> View Movie
        </a>
        {issue.status !== 'resolved' && (
          <Link
            className="admin-button admin-button-primary"
            to={`/admin/movies/edit/${encodeURIComponent(issue.movieId)}?focus=${encodeURIComponent(issue.field || '')}`}
            state={{ returnTo: '/admin/movie-problems' }}
          >
            <Wrench size={14} /> Fix Problem
          </Link>
        )}
      </div>
      {detailsOpen && (
        <dl className="movie-problem-details">
          <div><dt>Why it is happening</dt><dd>{issue.why}</dd></div>
          <div><dt>Affected field</dt><dd><code>{issue.field || 'Movie record'}</code></dd></div>
          <div><dt>Current movie status</dt><dd>{issue.movieStatus}</dd></div>
          <div><dt>Suggested solution</dt><dd>{issue.solution}</dd></div>
          <div><dt>First detected</dt><dd>{formatDate(issue.detectedAt)}</dd></div>
          {issue.status === 'resolved' && <div><dt>Resolved</dt><dd>{formatDate(issue.resolvedAt)}</dd></div>}
        </dl>
      )}
    </div>
  </article>
);

const AdminMovieProblemsPage = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [creditWarning, setCreditWarning] = useState('');
  const [source, setSource] = useState('');
  const [auditedAt, setAuditedAt] = useState('');
  const [movieCount, setMovieCount] = useState(0);
  const [duplicateCount, setDuplicateCount] = useState(0);
  const [removingDuplicates, setRemovingDuplicates] = useState(false);
  const [duplicateCleanupMessage, setDuplicateCleanupMessage] = useState('');
  const [search, setSearch] = useState('');
  const [type, setType] = useState('all');
  const [severity, setSeverity] = useState('all');
  const [status, setStatus] = useState('active');
  const [sort, setSort] = useState('newest');
  const [openDetails, setOpenDetails] = useState('');

  const runAudit = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await auditMoviesForProblems();
      setHistory(updateMovieProblemHistory(result.issues));
      setCreditWarning(result.creditWarning);
      setSource(result.source);
      setAuditedAt(result.auditedAt);
      setMovieCount(result.movieCount);
      setDuplicateCount(result.duplicateCount);
    } catch (auditError) {
      console.error('Movie problems audit failed:', auditError);
      setError(auditError.message || 'The movie database could not be audited.');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleRemoveDuplicates = async () => {
    if (!duplicateCount || removingDuplicates) return;
    const confirmed = window.confirm(
      `Permanently delete ${duplicateCount} older duplicate movie record${duplicateCount === 1 ? '' : 's'}? The newest record for each matching title and release date will be kept. Related cast, crew, reactions, and placements linked to deleted records may also be removed.`,
    );
    if (!confirmed) return;

    setRemovingDuplicates(true);
    setDuplicateCleanupMessage('');
    setError('');
    try {
      const result = await removeDuplicateMovies();
      setDuplicateCleanupMessage(result.deletedCount
        ? `Removed ${result.deletedCount} duplicate movie record${result.deletedCount === 1 ? '' : 's'}. The newest copy of each movie was kept.`
        : 'No duplicate movie records remain.');
      await runAudit();
    } catch (cleanupError) {
      console.error('Failed to remove duplicate movie records:', cleanupError);
      setError(cleanupError.message || 'Unable to remove duplicate movie records.');
    } finally {
      setRemovingDuplicates(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(runAudit, 0);
    return () => window.clearTimeout(timer);
  }, [runAudit]);

  const activeIssues = history.filter((issue) => issue.status === 'active');
  const criticalCount = activeIssues.filter((issue) => issue.severity === 'critical').length;
  const warningCount = activeIssues.filter((issue) => issue.severity === 'warning').length;
  const resolvedCount = history.filter((issue) => issue.status === 'resolved').length;
  const problemTypes = useMemo(() => [...new Map(history.map((issue) => [issue.code, issue.problem])).entries()], [history]);
  const filteredIssues = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return history
      .filter((issue) => status === 'all' || issue.status === status)
      .filter((issue) => type === 'all' || issue.code === type)
      .filter((issue) => severity === 'all' || (issue.severity === severity && issue.status === 'active'))
      .filter((issue) => !query || `${issue.movieTitle} ${issue.problem} ${issue.why} ${issue.field}`.toLocaleLowerCase().includes(query))
      .sort((first, second) => {
        const firstTime = Date.parse(first.status === 'resolved' ? first.resolvedAt : first.detectedAt) || 0;
        const secondTime = Date.parse(second.status === 'resolved' ? second.resolvedAt : second.detectedAt) || 0;
        return sort === 'newest' ? secondTime - firstTime : firstTime - secondTime;
      });
  }, [history, search, severity, sort, status, type]);

  const toggleDetails = (key) => setOpenDetails((current) => current === key ? '' : key);

  return (
    <div className="admin-page-shell movie-problems-page">
      <div className="admin-header-row">
        <div>
          <p className="admin-kicker">Content health</p>
          <h1>Movie Problems</h1>
          <p className="admin-header-copy">Find catalog issues that can keep titles from appearing correctly on the website.</p>
        </div>
        <div className="movie-problems-header-actions">
          {duplicateCount > 0 && source === 'Database' && <button type="button" className="admin-button movie-problems-clean-duplicates" onClick={handleRemoveDuplicates} disabled={loading || removingDuplicates}>
            <Trash2 size={15} /> {removingDuplicates ? 'Removing duplicates…' : `Remove ${duplicateCount} duplicates`}
          </button>}
          <button type="button" className="admin-button admin-button-secondary movie-problems-refresh" onClick={runAudit} disabled={loading || removingDuplicates}>
            <RefreshCw size={15} className={loading ? 'is-spinning' : ''} /> {loading ? 'Checking movies…' : 'Run check'}
          </button>
        </div>
      </div>

      {duplicateCleanupMessage && <div className="movie-problems-cleanup-success" role="status"><CheckCircle2 size={16} /> {duplicateCleanupMessage}</div>}
      <div className="movie-problems-audit-meta">
        <span><i /> {source || 'Preparing audit'}</span>
        {auditedAt && <span>Checked {movieCount} {movieCount === 1 ? 'movie' : 'movies'}</span>}
        {auditedAt && <span>Last checked {formatDate(auditedAt)}</span>}
      </div>

      {error && (
        <div className="movie-problems-alert is-error" role="alert">
          <ShieldAlert size={18} />
          <div><strong>Movie audit could not be completed</strong><p>{error}</p><span>No problem list was inferred from this failed database request. Check connectivity and try again.</span></div>
          <button type="button" className="admin-button admin-button-secondary" onClick={runAudit}>Retry</button>
        </div>
      )}
      {!error && creditWarning && (
        <div className="movie-problems-alert is-warning" role="status">
          <AlertTriangle size={18} />
          <div><strong>Cast and crew data could not be verified</strong><p>{creditWarning}</p><span>This is a data-source warning, not an error attributed to every movie.</span></div>
        </div>
      )}

      <div className="movie-problems-overview" aria-label="Movie problem overview">
        <article><span className="movie-problems-stat-icon is-red"><ShieldAlert size={18} /></span><div><strong>{activeIssues.length}</strong><span>Active problems</span></div></article>
        <article><span className="movie-problems-stat-icon is-critical"><AlertTriangle size={18} /></span><div><strong>{criticalCount}</strong><span>Critical issues</span></div></article>
        <article><span className="movie-problems-stat-icon is-warning"><AlertTriangle size={18} /></span><div><strong>{warningCount}</strong><span>Warnings</span></div></article>
        <article><span className="movie-problems-stat-icon is-resolved"><CheckCircle2 size={18} /></span><div><strong>{resolvedCount}</strong><span>Resolved on this browser</span></div></article>
      </div>

      <section className="movie-problems-panel">
        <div className="movie-problems-toolbar">
          <div><h2>Detected problems</h2><span>{filteredIssues.length} {filteredIssues.length === 1 ? 'result' : 'results'}</span></div>
          <label className="movie-problems-search"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search movies or problems" /></label>
        </div>
        <div className="movie-problems-filters">
          <label><span><SlidersHorizontal size={13} /> Problem type</span><select value={type} onChange={(event) => setType(event.target.value)}><option value="all">All problem types</option>{problemTypes.map(([code, label]) => <option key={code} value={code}>{label}</option>)}</select></label>
          <label><span>Severity</span><select value={severity} onChange={(event) => setSeverity(event.target.value)}><option value="all">All severities</option><option value="critical">Critical</option><option value="warning">Warning</option></select></label>
          <label><span>Status</span><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="active">Active problems</option><option value="resolved">Resolved</option><option value="all">All statuses</option></select></label>
          <label><span>Sort</span><select value={sort} onChange={(event) => setSort(event.target.value)}><option value="newest">Newest first</option><option value="oldest">Oldest first</option></select></label>
        </div>

        {loading && history.length === 0 ? (
          <div className="movie-problems-state"><RefreshCw size={19} className="is-spinning" /><strong>Checking movie records and image URLs…</strong><span>This may take a moment while image availability is verified.</span></div>
        ) : filteredIssues.length ? (
          <div className="movie-problems-list">
            {filteredIssues.map((issue) => (
              <MovieProblemCard
                key={issue.key}
                issue={issue}
                detailsOpen={openDetails === issue.key}
                onToggleDetails={toggleDetails}
              />
            ))}
          </div>
        ) : (
          <div className="movie-problems-state">
            <CheckCircle2 size={23} />
            <strong>{error ? 'Audit unavailable' : status === 'resolved' ? 'No resolved problems yet' : 'No movie problems found'}</strong>
            <span>{error ? 'Fix the data connection and run the audit again.' : 'The latest completed check found no matching movie issues.'}</span>
          </div>
        )}
      </section>
      <p className="movie-problems-history-note">Resolved history is retained in this browser. Each successful check re-evaluates the current movie data and marks cleared findings as resolved.</p>
    </div>
  );
};

export default AdminMovieProblemsPage;
