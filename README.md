# workouts-and-meals
This web app is to track my workouts with necessary training goals and track dietary numbers on a daily basis.

**Live site:** https://austin-olbrych.github.io/workouts-and-meals/

A single-file React dashboard (`index.html`, using Tailwind and Recharts from CDNs, with no build step) with four tabs:

- **Today**: the day's planned session, water, protein/calories, supplements and weigh-in
- **Workouts**: an editable weekly program, set-by-set logging with progression suggestions, and PR detection
- **Nutrition**: macros against daily targets, a 100 oz water tracker, supplement toggles, saved meals and food suggestions for whatever is left
- **Progress**: weight trend, weekly volume, consistency calendar, PR board, profile and targets (3,200 kcal · 185 P · 400 C · 95 F), and backup/restore

## Data

There's no sample data and no sign-in. Every change saves straight to Supabase within about a second. Each open device gets the update live, and the app reloads from the database whenever you come back to the tab. The status pill in the top-right shows **Live**, **Saving…**, or **Not saving** (tap it to see why). If the connection drops, changes stay on the device and save once it's back.

### One-time Supabase setup
Supabase dashboard → **SQL Editor** → paste [`supabase/schema.sql`](supabase/schema.sql) → **Run**. That creates:

- `app_settings`: program, saved meals, supplements, profile and macro targets (one row)
- `daily_logs`: one row per day with the workout, food, water, supplements and weigh-in, plus daily totals (`water_oz`, `calories`, `protein_g`, `carbs_g`, `fat_g`, `workout_done`)

Because there's no sign-in, anyone with the site link can see and edit the data. Use **Progress → Data & backup → Download** now and then to keep a copy.

## Hosting
GitHub Pages → **Settings → Pages → Deploy from a branch → `main` / root**.
