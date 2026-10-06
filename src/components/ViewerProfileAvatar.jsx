import React from 'react';
import { Baby, Cat, Clapperboard, CloudSun, Sparkles, UserRound } from 'lucide-react';

const AVATAR_STYLES = {
  'avatar:ember': { className: 'is-ember', Icon: UserRound },
  'avatar:kids': { className: 'is-kids', Icon: Baby },
  'avatar:comet': { className: 'is-comet', Icon: Clapperboard },
  'avatar:cat': { className: 'is-cat', Icon: Cat },
  'avatar:spark': { className: 'is-spark', Icon: Sparkles },
  'avatar:sun': { className: 'is-sun', Icon: CloudSun },
};

const ViewerProfileAvatar = ({ profile, className = '' }) => {
  const avatarUrl = profile?.avatar_url || 'avatar:ember';
  const avatarStyle = AVATAR_STYLES[avatarUrl];

  return (
    <span
      className={`viewer-avatar ${avatarStyle?.className || 'is-photo'} ${className}`.trim()}
      aria-hidden="true"
    >
      {avatarStyle ? (
        <avatarStyle.Icon className="viewer-avatar-icon" strokeWidth={1.6} />
      ) : (
        <img src={avatarUrl} alt="" />
      )}
      {profile?.is_kids && <span className="viewer-avatar-sparkle"><Sparkles size={15} fill="currentColor" /></span>}
    </span>
  );
};

export default ViewerProfileAvatar;
