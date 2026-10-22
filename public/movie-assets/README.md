# Movie Assets

Upload local artwork into the matching folders.

- `posters/`: portrait movie posters, preferably JPG or WebP, 2:3 ratio.
- `backdrops/`: wide hero images, preferably JPG or WebP, 16:9 ratio.
- `trailer-thumbnails/`: optional trailer preview images.

Use the exact lowercase filenames listed in `src/data/movieAssets.js`.

Example:

`public/movie-assets/posters/the-odyssey.jpg`

The website paths begin with `/movie-assets/`, so no import is needed for uploaded files.
