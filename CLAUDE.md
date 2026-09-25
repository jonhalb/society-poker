# Society Poker

A private web app for tracking a friend group's home poker games: buy-ins, rebuys, cash-outs, who owes whom, and lifetime stats. Friends open it from a link and add it to their phone's home screen. It is **tracking only**: the app never holds, sends, or processes money.

`prototype.html` in this folder is the approved design and behaviour reference (it still says "Poker Night"; the app is now called **Society Poker**). Match its look, wording, and flows unless this file says otherwise. Open it in a browser to see how anything should work.

## Tech Stack

- **App:** React + TypeScript (strict), built with Vite
- **Routing:** hash-based routes (`#/game/123`) so GitHub Pages refreshes work
- **Installable app:** `vite-plugin-pwa` (manifest, icon, update prompt)
- **Backend:** Supabase (Postgres database, Auth, Storage, Realtime) via `@supabase/supabase-js`
- **Hosting:** GitHub Pages, deployed by a GitHub Action on every push to `main`. Vite `base` must be set to `/society-poker/` (the repo name)
- **Tests:** Vitest for logic; database permission tests against a local or test Supabase project
- **Styling:** plain CSS with design tokens copied from the prototype (no UI framework)

## Design (from the prototype)

- Dark card-room theme: near-black background, gold accents, green for wins, red for losses
- Fonts: Outfit (UI) and JetBrains Mono (large money figures)
- Round avatars with a coloured ring, showing an uploaded photo or an emoji
- Bottom tabs: Games, Players, Stats. Bottom sheets for quick entry. Toasts with Undo
- Phone-first, max width ~480px, respects iPhone safe areas

## Features (all exist in the prototype)

**Games tab**
- Start a game (date, location, stakes default 0.25/0.50, buy-in default $20, pick players, add new players inline)
- "Run it back": new game prefilled from the most recent game
- "Log a finished game": enter each player's total in and out directly, with balance check
- Recent locations as tap-to-fill chips
- "Still owed" section listing every unpaid payment across games, with Mark paid
- Past games grouped by month with game count and total pot, showing each night's winner

**Live game**
- Rebuy (default amount) and Cash out per player; tap a name for custom buy-in, remove last buy-in, put back in, remove from game
- Hero shows "In the pot"; once anyone cashes out it splits into **Total pot** and **Still in play** (red if negative)
- Players still playing on top; cashed-out players in a collapsible section
- Last player's cash-out is pre-filled with what's left in play
- Game timer; duration saved when the game completes
- Undo toast after every change; keep the screen awake while live
- Add a player mid-game; cancel the game

**Settle up and game detail**
- Balance check: if cash-outs ≠ buy-ins, show the difference; completing requires ticking "Complete with this difference"
- Results sorted by net; payments list with Mark paid
- Game detail: pot, results, payments, notes, Share results (copyable text + native share), reopen to edit, delete (with confirm and Undo)

**Players and stats**
- Player profile: lifetime P&L, win rate, ROI, last 5 (W/L/D), avg per session, record, total invested/returned, best/worst session, total buy-ins, top finishes, game history
- Edit player: name, emoji, or photo upload (cropped square, resized to 192px JPEG)
- Stats tab: total through the pot, games, players, biggest single night, leaderboard

**Removed on purpose:** badges, game-by-game chart, any money movement or payment integrations.

## Decisions

- Currency: USD only. Store all money as **integer cents**
- Store the game date as a plain `date`, separate from timestamps, so it never shifts by time zone
- **Editing:** only group admins can create, edit, complete, reopen, or delete games and change results. Members can view everything and edit their own profile (name, emoji, photo)
- **Players without accounts:** allowed. The roster holds players; a player can later be linked to a login ("claimed")
- **One group in the UI**, but the database supports multiple groups
- **Login:** email with a **6-digit one-time code** (not magic links, because iPhone home-screen apps don't share login with Safari)
- **Settle-up algorithm:** greedy, biggest loser pays biggest winner. Mismatched totals are allowed with confirmation and left as-is for now
- **One logger per live game.** Others watch in view-only mode with live updates

## Data Model (Supabase / Postgres)

- `profiles`: id (= auth user id), display_name, created_at
- `groups`: id, name, created_at
- `group_members`: group_id, user_id, role (`admin` | `member`), joined_at
- `invites`: id, group_id, token (long random), created_by, expires_at, revoked
- `players`: id, group_id, name, emoji, photo_path, user_id (nullable, set when claimed), archived (boolean, never hard-delete players), created_at
- `games`: id, group_id, date, location, stakes, default_buy_in_cents, status (`active` | `completed`), started_at, duration_minutes, notes, created_by, created_at, updated_at
- `game_entries`: id, game_id, player_id, cash_out_cents (nullable), created_at (keeps players in join order)
- `buy_ins`: id, entry_id, amount_cents, created_at
- `payments`: id, game_id, from_player_id, to_player_id, amount_cents, paid, paid_at
- `game_edits`: id, game_id, user_id, action, details (json), created_at (edit history)

Constraints: amounts ≥ 0; unique player per game; only one `active` game per group.

## Security Rules (must always hold)

1. **Row-level security is enabled on every table**, including any new ones. Never disable it to "fix" empty results. Empty results mean a missing policy
2. Policies check **group membership**, never just "is logged in"
3. Separate policies for select, insert, update, delete. Admin-only actions are enforced in the database, not just hidden in the UI
4. Open sign-ups are off. People join only through a valid, unexpired, unrevoked invite
5. The **service role key never appears** in app code, the repo, or build settings. Only the public (anon) key and project URL are used, via environment variables
6. `.env*` files are gitignored. Before going live, search the repo for `service_role`
7. Never use `dangerouslySetInnerHTML` for anything a user typed
8. Photo uploads: images only, max 5 MB before resizing, stored under the group's folder; bucket access decided deliberately (private preferred)
9. Auth redirect URLs allow only the GitHub Pages address (and localhost for development)
10. Backup exports contain personal data and are never committed to the repo
11. After any database change, run Supabase Security Advisor and the permission tests (a stranger's account must see nothing)

## Working Rules for Claude Code

- Work on **one phase at a time**. Don't start the next phase unless asked
- Keep changes small. Tell me what you changed and how to test it on my phone
- All database changes go in **migration files** in `supabase/migrations/`, never dashboard-only changes
- Settle-up and stats logic live in `src/lib/` as pure functions with tests. **Do not change existing tests without asking me first**
- Check current official docs (Supabase, Vite, vite-plugin-pwa) when unsure. Don't rely on memory for their APIs
- Explain anything non-obvious in plain language; I'm new to coding
- Update the Status section below when a phase is finished
- Phase 1 is split into steps (see Status). Finish, test, commit and push each step before the next, and tell me what changed and how to test it on my phone
- **Commits are credited to me only:** no `Co-Authored-By: Claude` lines and no "Generated with Claude Code" footers in commits or PRs
- Commits use my private GitHub address (`257576711+jonhalb@users.noreply.github.com`, set in this repo's local git config). Never commit with my real email
- Stage files by path, not `git add -A`, so local files (e.g. `.claude/settings.local.json`) never get committed
- Don't ask me about unfinished list items in my messages; if something looks cut off, carry on

## How the Code Fits Together (Phase 1)

- `src/lib/`: pure logic with tests. `types.ts` holds row types named and shaped like the Supabase tables (snake_case, cents, one row per buy-in). Stats definitions are written out in `stats.ts`
- `src/data/store.ts`: **the only module that reads or saves data.** Screens read with `useAppData()` and change things only through `store.*` functions, which are async and throw `DataError` when refused. It enforces the future database rules (one live game, amounts ≥ 0 cents, unique names). Phase 4 swaps its insides for Supabase without changing screens
- Undo: `useAction().onGame()` snapshots a game before a change; Undo restores that whole snapshot
- `src/data/sampleData.ts`: the 15 sample games, loaded only by the development-only button on the Stats tab. The production build must never contain it (check with a search of `dist/` for "Tom's garage")
- `src/router.ts`: hash routes plus history rules. Tab taps replace history, an open sheet adds a step (back closes it), "← Back" steps back when that's its target, and a sheet button that opens a page reuses the sheet's step. Use `navigate(route, { replace: true })` after finishing a form so back skips it
- `src/styles/app.css`: all prototype styles, using the tokens in `tokens.css`
- Phone testing: `npm run dev:phone`, then open the "Network" address it prints (e.g. `http://192.168.50.53:5173/society-poker/`)
- Screenshots: Playwright at iPhone size, installed in a temporary folder outside the repo. Use Chromium for screenshots: Playwright's Windows WebKit renders the Outfit font too thin (the prototype looks the same there, so it's not an app bug)
- Over plain-HTTP local testing, these don't work until HTTPS (Phase 6): keep-screen-awake, the phone's share menu, the modern copy-to-clipboard method (keep a fallback), installing as an app. IDs use `crypto.getRandomValues`, not `crypto.randomUUID`, for the same reason

## Notes for Upcoming Work

**Step 4 (live game)**
- Use `lastPlayerPrefill` for the last player's cash-out, and `useAction().onGame` for every change so each has Undo
- A reopened game still has its original `started_at`, so a plain timer would show days. Show the saved duration instead, or no timer, for reopened games
- Keep-screen-awake (Wake Lock) only works over HTTPS. Fail quietly on the local network

**Step 5 (settle up and game detail)**
- Call `store.syncPayments(gameId)` when the settle screen opens. If it returns `clearedPaid`, **show a notice listing those payments** (e.g. "Dan's $15 payment to Mike was marked paid, but it's now $10 and unpaid"). Never clear them silently
- **Typing in Notes must dismiss any open Undo toast.** Undo restores the whole game, so it would otherwise wipe notes typed within those few seconds
- `completeGame` keeps the first saved duration when a reopened game is completed again
- Share: the phone's share menu is HTTPS-only. Show that button only when `navigator.share` exists, and keep the older copy method as a fallback for Copy text

**Step 6 (players and stats)**
- Until Phase 5, store a resized photo as a `data:image/jpeg` address in `photo_path`. `Avatar` only shows `photo_path` values starting with `data:image/`. Phase 5 changes this to Storage paths
- Players are archived, never deleted. Pickers already hide archived players
- The Stats tab keeps the development-only tools under `import.meta.env.DEV`

**Phase 2 (database)**
- `game_entries` has `created_at` to keep players in join order
- `games.location` and `games.notes` are `not null default ''` (the app uses empty text, never null)
- Payments have no order column. The app lists them biggest first (`sortPayments`)

## Phases

0. **Setup:** Vite + React + TS project, Git, `.gitignore`, folder structure, design tokens
1. **Local rebuild:** all screens from the prototype using local storage; settle-up and stats in `src/lib/` with tests
2. **Database:** migrations for all tables, constraints, and RLS policies; permission tests
3. **Accounts and group:** email code login, create group (me as admin), invite links, claim a player, remove members, sign out everywhere
4. **Connect to Supabase:** replace local storage; realtime updates for live games; clear offline warning
5. **Photos:** Supabase Storage upload, resize, permissions
6. **Deploy:** GitHub Action to GitHub Pages, env vars, PWA manifest/icon, "update available" prompt
7. **Keep running:** scheduled keep-alive GitHub Action (public key as a GitHub secret), admin Export backup, one-time import of prototype data
8. **Test with the group:** real game nights, fix issues

## Known Pitfalls to Avoid

- Supabase's built-in email is for testing and heavily rate-limited. Set up a custom SMTP provider (e.g. Resend) before inviting friends
- Free Supabase projects pause after a week without activity; the keep-alive action prevents this
- iPhone photos may be HEIC; test uploads with real iPhone photos in Safari and Chrome
- Test every phase on a real iPhone and Android phone, not just a laptop
- Money as cents, dates as plain dates, archive players instead of deleting
- Case-insensitive duplicate name check when adding players

## Later (not now)

- Tournaments and payouts
- Payment links (Venmo, Cash App, PayPal.me)
- Full offline mode with sync
- Admin tool to merge duplicate players

## Status

- [x] Phase 0: Setup
- [ ] Phase 1: Local rebuild
  - [x] Step 1: Core logic in `src/lib/` with tests
  - [x] Step 2: App shell and data module (tabs, routes, sheets, toasts with Undo, dev-only sample data)
  - [x] Step 3: Games tab (start, run it back, log a finished game, still owed, past games)
  - [ ] Step 4: Live game
  - [ ] Step 5: Settle up and game detail
  - [ ] Step 6: Players and Stats
- [ ] Phase 2: Database
- [ ] Phase 3: Accounts and group
- [ ] Phase 4: Connect to Supabase
- [ ] Phase 5: Photos
- [ ] Phase 6: Deploy
- [ ] Phase 7: Keep running
- [ ] Phase 8: Test with the group
