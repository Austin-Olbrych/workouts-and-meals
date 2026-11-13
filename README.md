# workouts-and-meals
This web app is to track my workouts with necessary training goals and track dietary numbers on a daily basis.

**Live site:** https://austin-olbrych.github.io/workouts-and-meals/

A single-file React dashboard (`index.html`, using Tailwind and Recharts from CDNs, with no build step) with four tabs:

- **Today**: the day's planned session, water, protein/calories, supplements and weigh-in
- **Workouts**: an editable weekly program, set-by-set logging with progression suggestions, and PR detection
- **Nutrition**: macros against daily targets, a 100 oz water tracker, supplement toggles, saved meals and food suggestions for whatever is left
- **Progress**: weight trend, weekly volume, consistency calendar, PR board, profile and targets, and backup/restore

## Data & sync

Everything saves in the browser right away. When you sign in (the pill in the top-right), the dashboard also syncs to Supabase, so the phone and laptop stay in step.

### One-time Supabase setup
1. Supabase dashboard → **SQL Editor** → paste [`supabase/schema.sql`](supabase/schema.sql) → **Run**.
2. **Authentication → URL Configuration**: set **Site URL** to `https://austin-olbrych.github.io/workouts-and-meals/` and add it under **Redirect URLs**.
3. Create your login, either from the site (**Sign in to sync → Create an account**, then confirm the email) or under **Authentication → Users → Add user** with "Auto Confirm User" ticked.
4. Optional: turn off **Authentication → Sign In / Providers → Allow new users to sign up** once your account exists, so nobody else can create one.

The publishable key in `index.html` is meant to be public. Row Level Security in `schema.sql` limits each signed-in user to their own row, and signed-out visitors get nothing.

## Hosting
GitHub Pages → **Settings → Pages → Deploy from a branch → `main` / root**.
