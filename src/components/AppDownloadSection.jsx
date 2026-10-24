import { useState } from 'react';
import { ArrowDownToLine, ArrowUpRight, ChevronDown, Clapperboard, Film, Smartphone } from 'lucide-react';
import BrandMark from './BrandMark';
import './AppDownloadSection.css';

const AppDownloadSection = () => {
  const [downloadNotice, setDownloadNotice] = useState('');

  return (
    <section className="app-download" aria-labelledby="app-download-title">
      <div className="app-download-glow" aria-hidden="true" />
      <div className="app-download-copy">
        <a className="app-download-brand" href="/" aria-label="MythicHQ home">
          <BrandMark />
          <span>MYTHIC<span>HQ</span></span>
        </a>
        <p className="app-download-eyebrow"><Smartphone size={14} /> MADE FOR MOVIE LOVERS</p>
        <h2 id="app-download-title">Your Next Favorite Story Awaits.</h2>
        <p className="app-download-description">Take MythicHQ wherever you go. Discover movies, explore cinematic universes, build your watchlist, and find your next obsession — all from your phone.</p>
      </div>
      <div className="app-download-visual" aria-label="Preview of MythicHQ on a phone">
        <div className="app-download-orbit app-download-orbit-one" aria-hidden="true" />
        <div className="app-download-orbit app-download-orbit-two" aria-hidden="true" />
        <div className="app-download-poster app-download-poster-left" aria-hidden="true"><img src="/movie-assets/posters/avengers-endgame.jpeg" alt="" /></div>
        <div className="app-download-poster app-download-poster-right" aria-hidden="true"><img src="/movie-assets/posters/dune-part-three.jpg" alt="" /></div>
        <div className="app-download-phone">
          <div className="app-download-phone-screen">
            <div className="app-download-phone-status"><span>9:41</span><span>● ● ▰</span></div>
            <div className="app-download-phone-nav"><span>MYTHIC<span>HQ</span></span><span className="app-download-avatar">M</span></div>
            <div className="app-download-phone-hero">
              <img src="/movie-assets/backdrops/spiderman-brandnewday.jpeg" alt="" />
              <div className="app-download-phone-shade" />
              <div className="app-download-phone-caption"><span>YOUR NEXT FAVORITE STORY</span><strong>Find your<br />next obsession.</strong><i><Clapperboard size={12} /> Explore titles</i></div>
            </div>
            <div className="app-download-phone-shelf"><div><strong>Trending now</strong><small>See all →</small></div><div className="app-download-phone-posters"><img src="/movie-assets/posters/avengers-endgame.jpeg" alt="" /><img src="/movie-assets/posters/dune-part-three.jpg" alt="" /><img src="/movie-assets/posters/black-panther.jpeg" alt="" /></div></div>
            <div className="app-download-phone-bottom"><Film size={14} /><span>Home</span><span>Discover</span><span>My List</span></div>
          </div>
          <span className="app-download-phone-island" aria-hidden="true" />
        </div>
      </div>
      <div className="app-download-controls">
        <div className="app-download-actions">
          <a className="app-download-primary" href="/downloads/MythicHQ.apk" download="MythicHQ.apk" onClick={() => setDownloadNotice('Your download is starting.')} aria-describedby="apk-install-note">
            <ArrowDownToLine size={19} /> Download MythicHQ APK
          </a>
          <a className="app-download-secondary" href="https://mythichq.vercel.app">
            <span>Explore MythicHQ</span><ArrowUpRight size={17} />
          </a>
        </div>
        <p className="app-download-note" id="apk-install-note">Android only · Download the APK and follow your device's installation instructions.</p>
        {downloadNotice && <p className="app-download-status" role="status">{downloadNotice}</p>}
        <details className="app-download-help">
          <summary>How to install <ChevronDown size={16} /></summary>
          <ol>
            <li>Download the MythicHQ APK when it becomes available.</li>
            <li>Open the downloaded APK on your Android device.</li>
            <li>If prompted, allow installation from this source in Android settings.</li>
            <li>Follow the on-screen instructions to install MythicHQ.</li>
          </ol>
        </details>
      </div>
    </section>
  );
};

export default AppDownloadSection;
