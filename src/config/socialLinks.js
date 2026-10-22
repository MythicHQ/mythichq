export const socialLinks = {
  youtube: 'https://www.youtube.com/@mythichqYT',
  instagram: 'https://www.instagram.com/themythichq/',
  facebook: 'https://www.facebook.com/profile.php?id=61594854027548',
  x: 'https://x.com/TheMythicHQ',
  tiktok: '',
  discord: '',
};

export const getAvailableSocialLinks = () =>
  Object.entries(socialLinks)
    .filter(([, url]) => Boolean(url))
    .map(([platform, url]) => ({
      platform,
      url,
      label: {
        youtube: 'YouTube',
        instagram: 'Instagram',
        facebook: 'Facebook',
        x: 'X',
        tiktok: 'TikTok',
        discord: 'Discord',
      }[platform],
    }));
