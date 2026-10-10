import { LOCAL_MOVIES } from './localMovies';

const byTitles = (titles) => titles.map((title) => LOCAL_MOVIES.find((movie) => movie.title === title)).filter(Boolean);

export const TOP_RATED_MOVIES = byTitles([
  'Spider-Man: No Way Home', 'The Odyssey', 'Project Hail Mary', 'Supergirl',
  'Masters of the Universe', 'Spider-Man: Brand New Day', 'Avengers: Endgame',
  'Avengers: Infinity War', 'Guardians of the Galaxy', 'Black Panther',
]);

export const TRENDING_MOVIES = byTitles([
  'Spider-Man: Brand New Day', 'The Odyssey', 'Project Hail Mary', 'Supergirl',
  'Masters of the Universe', 'Avengers: Doomsday', 'KD: The Devil',
  'Toxic: A Fairy Tale for Grown-ups', 'Kantara: A Legend - Chapter 1',
  'Deadpool & Wolverine', 'Spider-Man: No Way Home', 'Avengers: Endgame',
]);

export const UPCOMING_MOVIES = LOCAL_MOVIES
  .filter((movie) => movie.status === 'upcoming')
  .sort((first, second) => first.release_date.localeCompare(second.release_date));

export const PICK_A_MOVIE = byTitles([
  'The Rivals of Amziah King', 'One Night Only', 'Tony', 'Normal', 'Nimrods',
  'Ice Cream Man', 'The Brink of War', 'The Invite', 'Coyote vs. Acme', 'Super Troopers 3',
]);

export const KANNADA_MOVIES = byTitles([
  'KD: The Devil', 'Love Mocktail 3', 'Landlord', 'Karavali', 'Rakkasapuradhol',
  'Ayogya 2', 'Graamaayana', 'Cult', 'Hayagrriva', 'Mother Promise',
  'Toxic: A Fairy Tale for Grown-ups', 'Kantara: A Legend - Chapter 1',
  'Richard Anthony', 'Billa Ranga Baasha: First Blood', '45',
]);

export const MARVEL_MOVIES = byTitles([
  'Iron Man', 'The Incredible Hulk', 'Iron Man 2', 'Thor',
  'Captain America: The First Avenger', 'The Avengers', 'Iron Man 3',
  'Thor: The Dark World', 'Captain America: The Winter Soldier',
  'Guardians of the Galaxy', 'Avengers: Age of Ultron', 'Ant-Man',
  'Captain America: Civil War', 'Doctor Strange', 'Spider-Man: Homecoming',
  'Thor: Ragnarok', 'Black Panther', 'Avengers: Infinity War', 'Captain Marvel',
  'Avengers: Endgame', 'Deadpool & Wolverine', 'Avengers: Doomsday',
]);

export const GENRE_COLLECTIONS = {
  Action: byTitles(['Spider-Man: Brand New Day', 'Coyote vs. Acme', 'The Furious', 'Super Troopers 3', 'KD: The Devil', 'Kantara: A Legend - Chapter 1', 'Iron Man', 'Captain America: Civil War', 'Thor: Ragnarok']),
  Drama: byTitles(['The End of Oak Street', 'The Last House', 'The Invite', 'Obsession', 'The Drama', 'Normal', 'Mother Promise', 'Love Mocktail 3']),
  'Sci-Fi / Fantasy': byTitles(['The Odyssey', 'Backrooms', 'Project Hail Mary', 'Minions & Monsters', 'Masters of the Universe', 'Avengers: Doomsday', 'Doctor Strange', 'Captain Marvel']),
  'Horror / Thriller': byTitles(["Don't Say Good Luck", 'Obsession', 'Backrooms', 'Ice Cream Man', 'Leviticus', 'Nimrods']),
};