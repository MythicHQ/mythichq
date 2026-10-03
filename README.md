# MythicHQ

MythicHQ is a movie discovery website for finding something good to watch. It brings movie browsing, discovery tools, trailers, watchlists, and community features together in one place.

**Live website:** [mythichq.vercel.app](https://mythichq.vercel.app/)

## What you can do

- **Explore the home page** for featured movies, trending titles, top-rated picks, upcoming releases, hidden gems, and curated collections.
- **Browse the catalog** and discover movies by genre, language, popularity, or rating.
- **Search for a movie** and open its details page for its synopsis, cast and crew, ratings, genres, languages, streaming availability, and related titles.
- **Watch trailers** from movie cards and detail pages when a trailer is available.
- **Save movies to a watchlist** so you can come back to them later.
- **Find a random pick** when you are not sure what to watch.
- **Create an account or sign in** to access account features such as your profile and saved watchlist.
- **Leave and read reviews** on movie pages.

## Pages

| Page | What it is for |
| --- | --- |
| Home | Featured titles and curated movie sections |
| Movies | Browse the full movie catalog |
| Discovery | Explore and filter movies |
| Trending | See movies that are popular now |
| Top Rated | Browse highly rated titles |
| Genres and Languages | Find movies by category or spoken language |
| Upcoming | See movies scheduled for release |
| Search | Look up a movie by title |
| Movie details | Read about a movie, view related titles, and check streaming availability |
| Watchlist | Revisit movies you have saved |

## For administrators

Authorized administrators can use the admin area to manage movie listings, featured and curated sections, reviews, users, contact messages, notifications, and site settings. Admin access is restricted to approved accounts.

## Run MythicHQ locally

You need Node.js 20.19+ or 22.12+ and npm.

```bash
npm install
npm run dev
```

Open the URL printed by Vite, usually `http://localhost:5173`. The sign-in page is available at `/login`.

## Connect external services

Create a `.env` file in the project root when you want to connect Supabase:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

Supabase is used for connected account, catalog, review, and admin data. The movie catalog uses TMDB for movie information and artwork. A TMDB key can be set as `VITE_TMDB_API_KEY` or entered in the app's settings. Restart the development server after editing `.env`.

Google sign-in returns to the public production URL `https://mythichq.vercel.app` (local development returns to the local app). Configure the production URL under Supabase Authentication → URL Configuration as the Site URL and allow `https://mythichq.vercel.app/**`, `http://localhost:5173/**`, and `http://127.0.0.1:5173/**` under Redirect URLs. Password-reset emails return to `/reset-password`; make sure the deployed and local reset-password URLs are covered by those Redirect URL entries. The Google OAuth client's authorized redirect URI must be the Supabase callback URL shown in Supabase Authentication → Providers → Google. Keep the production Vercel deployment publicly accessible; Vercel Deployment Protection on the production deployment will interrupt sign-in after Google authentication.

Do not commit private credentials. Values prefixed with `VITE_` are exposed in the browser, so use only public client keys and configure access policies in Supabase.

## Developer commands

| Command | Description |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Build the production site into `dist/` |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run Oxlint |
