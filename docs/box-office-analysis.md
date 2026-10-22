# Box office verdict

The admin movie form and movie details page use only the production budget and worldwide box office collection to calculate a verdict. Both figures must use the movie's selected three-letter currency. The calculation is:

`worldwide box office collection / production budget`

The fixed ratio bands are:

| Verdict | Collection-to-budget ratio |
| --- | ---: |
| Disaster | Less than 0.5× |
| Flop | 0.5× to less than 0.8× |
| Below Average | 0.8× to less than 1× |
| Average | 1× to less than 1.2× |
| Above Average | 1.2× to less than 1.5× |
| Hit | 1.5× to less than 2× |
| Super Hit | 2× to less than 3× |
| Blockbuster | 3× to less than 5× |
| All-Time Blockbuster | 5× or more |

If either amount is missing, invalid, or the budget is zero, no verdict is shown. These bands are simple ratio-based estimates, not a confirmation of actual profit or industry-reported performance.

For an existing Supabase database, run `supabase/box_office_analysis.sql` after `supabase/movie_details_features.sql`. It adds the worldwide collection field and allows three-letter currency codes.

The existing movie fields for other collection types and financial notes may remain in older databases for compatibility, but they do not affect the verdict and are no longer edited by this feature.
