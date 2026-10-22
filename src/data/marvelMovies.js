const MARVEL_MOVIES = [
  { id: 930001, title: 'Iron Man', release_date: '2008-05-02', vote_average: 8.0, vote_count: 1000, genre_ids: [28, 878], overview: 'A captured inventor builds an armored escape suit and turns his technology toward protecting others.', director: 'Jon Favreau', cast: ['Robert Downey Jr.', 'Gwyneth Paltrow', 'Jeff Bridges'] },
  { id: 930002, title: 'The Incredible Hulk', release_date: '2008-06-13', vote_average: 7.0, vote_count: 900, genre_ids: [28, 878], overview: 'A scientist hiding from the government searches for a cure while struggling to control his destructive alter ego.', director: 'Louis Leterrier', cast: ['Edward Norton', 'Liv Tyler', 'Tim Roth'] },
  { id: 930003, title: 'Iron Man 2', release_date: '2010-05-07', vote_average: 7.2, vote_count: 900, genre_ids: [28, 878], overview: 'With his identity public and his health failing, Tony faces pressure from rivals and a dangerous new enemy.', director: 'Jon Favreau', cast: ['Robert Downey Jr.', 'Gwyneth Paltrow', 'Mickey Rourke'] },
  { id: 930004, title: 'Thor', release_date: '2011-05-06', vote_average: 7.5, vote_count: 950, genre_ids: [28, 12, 14], overview: 'An arrogant Asgardian prince is exiled to Earth and must learn humility before he can reclaim his power.', director: 'Kenneth Branagh', cast: ['Chris Hemsworth', 'Anthony Hopkins', 'Natalie Portman'] },
  { id: 930005, title: 'Captain America: The First Avenger', release_date: '2011-07-22', vote_average: 7.8, vote_count: 950, genre_ids: [28, 12, 878], overview: 'A determined soldier becomes a super-powered symbol and joins the fight against a wartime enemy.', director: 'Joe Johnston', cast: ['Chris Evans', 'Hayley Atwell', 'Hugo Weaving'] },
  { id: 930006, title: 'The Avengers', release_date: '2012-05-04', vote_average: 8.0, vote_count: 1000, genre_ids: [28, 878], overview: 'Earths strongest heroes must overcome their differences and unite against an invading force.', director: 'Joss Whedon', cast: ['Robert Downey Jr.', 'Chris Evans', 'Scarlett Johansson'] },
  { id: 930007, title: 'Iron Man 3', release_date: '2013-05-03', vote_average: 7.6, vote_count: 950, genre_ids: [28, 878], overview: 'After a devastating attack, Tony rebuilds his confidence and confronts the threat behind the destruction.', director: 'Shane Black', cast: ['Robert Downey Jr.', 'Guy Pearce', 'Gwyneth Paltrow'] },
  { id: 930008, title: 'Thor: The Dark World', release_date: '2013-11-08', vote_average: 7.0, vote_count: 900, genre_ids: [28, 12, 14], overview: 'Thor races to protect the realms when an ancient force seeks to spread darkness across the universe.', director: 'Alan Taylor', cast: ['Chris Hemsworth', 'Natalie Portman', 'Tom Hiddleston'] },
  { id: 930009, title: 'Captain America: The Winter Soldier', release_date: '2014-04-04', vote_average: 8.0, vote_count: 1000, genre_ids: [28, 53, 878], overview: 'Steve Rogers and Natasha Romanoff uncover a conspiracy inside their own agency while facing a mysterious assassin.', director: 'Anthony & Joe Russo', cast: ['Chris Evans', 'Scarlett Johansson', 'Sebastian Stan'] },
  { id: 930010, title: 'Guardians of the Galaxy', release_date: '2014-08-01', vote_average: 8.0, vote_count: 1000, genre_ids: [28, 12, 878], overview: 'A band of unlikely space outlaws must work together to stop a ruthless enemy from destroying worlds.', director: 'James Gunn', cast: ['Chris Pratt', 'Zoe Saldana', 'Dave Bautista'] },
  { id: 930011, title: 'Avengers: Age of Ultron', release_date: '2015-05-01', vote_average: 7.8, vote_count: 1000, genre_ids: [28, 878], overview: 'An automated peacekeeping project becomes a global threat, forcing the Avengers into another desperate battle.', director: 'Joss Whedon', cast: ['Robert Downey Jr.', 'Chris Evans', 'Chris Hemsworth'] },
  { id: 930012, title: 'Ant-Man', release_date: '2015-07-17', vote_average: 7.5, vote_count: 950, genre_ids: [28, 35, 878], overview: 'A skilled thief receives a shrinking suit and must become a hero to protect a revolutionary invention.', director: 'Peyton Reed', cast: ['Paul Rudd', 'Michael Douglas', 'Evangeline Lilly'] },
  { id: 930013, title: 'Captain America: Civil War', release_date: '2016-05-06', vote_average: 7.8, vote_count: 1000, genre_ids: [28, 878], overview: 'A dispute over superhero oversight divides the Avengers and places former allies on opposite sides.', director: 'Anthony & Joe Russo', cast: ['Chris Evans', 'Robert Downey Jr.', 'Scarlett Johansson'] },
  { id: 930014, title: 'Doctor Strange', release_date: '2016-11-04', vote_average: 7.9, vote_count: 950, genre_ids: [28, 12, 14], overview: 'A gifted surgeon discovers mystical forces after an accident changes the course of his life.', director: 'Scott Derrickson', cast: ['Benedict Cumberbatch', 'Chiwetel Ejiofor', 'Rachel McAdams'] },
  { id: 930015, title: 'Spider-Man: Homecoming', release_date: '2017-07-07', vote_average: 7.8, vote_count: 1000, genre_ids: [28, 12, 878], overview: 'A teenage hero balances school life with a dangerous mission to prove he belongs among the Avengers.', director: 'Jon Watts', cast: ['Tom Holland', 'Michael Keaton', 'Robert Downey Jr.'] },
  { id: 930016, title: 'Thor: Ragnarok', release_date: '2017-11-03', vote_average: 7.9, vote_count: 1000, genre_ids: [28, 12, 35], overview: 'Trapped far from home, Thor must escape a gladiator world and stop the destruction of Asgard.', director: 'Taika Waititi', cast: ['Chris Hemsworth', 'Tom Hiddleston', 'Cate Blanchett'] },
  { id: 930017, title: 'Black Panther', release_date: '2018-02-16', vote_average: 8.0, vote_count: 1000, genre_ids: [28, 12, 878], overview: 'A new king returns to Wakanda and faces a challenger whose history is tied to the nation’s future.', director: 'Ryan Coogler', cast: ['Chadwick Boseman', 'Michael B. Jordan', 'Lupita Nyong’o'] },
  { id: 930018, title: 'Avengers: Infinity War', release_date: '2018-04-27', vote_average: 8.4, vote_count: 1000, genre_ids: [28, 12, 878], overview: 'The Avengers and their allies make a costly stand against a warlord seeking ultimate power.', director: 'Anthony & Joe Russo', cast: ['Robert Downey Jr.', 'Chris Hemsworth', 'Chris Evans'] },
  { id: 930019, title: 'Captain Marvel', release_date: '2019-03-08', vote_average: 7.8, vote_count: 950, genre_ids: [28, 12, 878], overview: 'A powerful pilot uncovers fragments of her past while becoming Earth’s key defender in an interstellar conflict.', director: 'Anna Boden & Ryan Fleck', cast: ['Brie Larson', 'Samuel L. Jackson', 'Jude Law'] },
  { id: 930020, title: 'Avengers: Endgame', release_date: '2019-04-26', vote_average: 8.6, vote_count: 1000, genre_ids: [28, 12, 878], overview: 'The surviving heroes attempt one final mission to undo the devastation left by their greatest enemy.', director: 'Anthony & Joe Russo', cast: ['Robert Downey Jr.', 'Chris Evans', 'Mark Ruffalo'] },
  { id: 930021, title: 'Deadpool & Wolverine', release_date: '2024-07-26', vote_average: 7.8, vote_count: 950, genre_ids: [28, 35, 878], overview: 'A bored Wade Wilson is pulled into a multiverse mission alongside a reluctant Wolverine.', director: 'Shawn Levy', cast: ['Ryan Reynolds', 'Hugh Jackman', 'Emma Corrin'] },
  { id: 930022, title: 'Avengers: Doomsday', release_date: '2026-12-18', trailer_key: 'irVNGjRFZGk', vote_average: 8.5, vote_count: 1000, genre_ids: [28, 12, 878], overview: 'The Avengers face a world-shaking threat in a new chapter of the Marvel saga.', director: 'Anthony Russo & Joe Russo', writers: ['Stephen McFeely', 'Michael Waldron', 'Chris McKenna', 'Erik Sommers'], production_company: 'Marvel Studios', distributor: 'Walt Disney Studios Motion Pictures', cast: [] },
];

const MARVEL_POSTER_FILES = {
  'Iron Man': 'iron-man.jpeg',
  'The Incredible Hulk': 'the-incredible-hulk.jpeg',
  'Iron Man 2': 'iron-man-2.jpeg',
  Thor: 'thor.jpeg',
  'Captain America: The First Avenger': 'captain-america-the-first-avenger.jpeg',
  'The Avengers': 'the-avengers.jpeg',
  'Iron Man 3': 'iron-man-3.jpeg',
  'Thor: The Dark World': 'thor-the-dark-world.jpeg',
  'Captain America: The Winter Soldier': 'captain-america-the-winter-soldier.jpeg',
  'Guardians of the Galaxy': 'guardians-of-the-galaxy.jpeg',
  'Avengers: Age of Ultron': 'avengers-age-of-ultron.jpeg',
  'Ant-Man': 'ant-man.jpeg',
  'Captain America: Civil War': 'captain-america-civil-war.jpeg',
  'Doctor Strange': 'doctor-strange.jpeg',
  'Spider-Man: Homecoming': 'spider-man-homecoming.jpeg',
  'Thor: Ragnarok': 'thor-ragnarok.jpeg',
  'Black Panther': 'black-panther.jpeg',
  'Avengers: Infinity War': 'avengers-infinity-war.jpeg',
  'Captain Marvel': 'captain-marvel.jpeg',
  'Avengers: Endgame': 'avengers-endgame.jpeg',
  'Deadpool & Wolverine': 'deadpool-and-wolverine.jpeg.jpeg',
  'Avengers: Doomsday': 'AvengerDoomsday.jpeg',
};

const withMarvelArtwork = (movie) => {
  const posterPath = MARVEL_POSTER_FILES[movie.title];
  return posterPath
    ? { ...movie, poster_path: `/movie-assets/posters/${posterPath}`, backdrop_path: `/movie-assets/posters/${posterPath}` }
    : movie;
};

export default MARVEL_MOVIES.map(withMarvelArtwork);