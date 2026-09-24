# Kitchen Command — Hueytown #06123

Live BOH deployment board: Simple mode for shift leaders, Advanced mode, TV displays, sales-CSV forecast, auto-deploy.
Hosted free on **GitHub Pages**, live data + sign-in on **Firebase** (free tier).

## What's in here

| File | What it is |
|---|---|
| `index.html` | The whole app |
| `firebase-adapter.js` | Connects the app to Firebase + the sign-in screen |
| `firebase-config.js` | **You paste your Firebase keys here** |
| `firestore.rules` | Who can read/write — **you put your emails here** |
| `seed.html` | One-time page that loads your existing data |
| `seed-data.json` | Your sales, forecast, team from claude.ai — **never commit this** (already in `.gitignore`) |

---

## Step 1 — Test it in Cursor first (2 min)

Open the folder in Cursor, then in the terminal:

```
npx serve .
```

Open the link it prints (usually http://localhost:3000). Until `firebase-config.js` is filled in, the app stops on a **Database required** screen. It does not save the board on that device.

## Step 2 — Firebase (10 min)

1. Go to **console.firebase.google.com** → **Add project** → name it `kitchen-command` → you can turn off Analytics.
2. Click the **</> (Web)** icon → name it `kitchen-command` → **Register app**. Copy the `firebaseConfig` values into `firebase-config.js`.
3. **Build → Firestore Database → Create database** → *Production mode* → location `us-central1` (or closest).
4. **Firestore → Rules** tab → paste everything from `firestore.rules`, **replace the two emails** with the real logins you'll make in the next step → **Publish**.
5. **Build → Authentication → Get started → Email/Password → Enable → Save.**
6. **Authentication → Users → Add user**:
   - a store login for the kitchen iPad (example: `store06123@yourdomain.com` + a strong password)
   - your own login
7. **Authentication → Settings → Authorized domains → Add domain** → `YOURNAME.github.io` (add this after Step 3 when you know your GitHub username). `localhost` is already there.

Rerun `npx serve .` — you should now get the sign-in screen. Sign in, and it's live.

## Step 3 — GitHub Pages (5 min)

1. On github.com → **New repository** → name `kitchen-command` → Public → Create.
2. Push from Cursor (Source Control panel → Publish Branch), or upload the files on the website. **Do not upload `seed-data.json`.**
3. Repo → **Settings → Pages** → Source: *Deploy from a branch* → Branch: `main` / `(root)` → Save.
4. Wait ~1 minute. Your site: `https://YOURNAME.github.io/kitchen-command/`
5. Go back to Firebase Step 2.7 and add `YOURNAME.github.io` as an authorized domain.

## Step 4 — Load your data (1 min)

1. Open `https://YOURNAME.github.io/kitchen-command/seed.html`
2. Sign in with **your** login → pick `seed-data.json` from your computer → it loads.
   Team list is checked by default. Uncheck it if you'd rather start the roster fresh from a schedule.

## Step 5 — Set up the screens

- **Store iPad:** open the site → sign in with the store login → Share → **Add to Home Screen**. It stays signed in.
- **TV:** open `https://YOURNAME.github.io/kitchen-command/#/tv-rotate`, sign in with the store login once.
- **Your phone:** your own login.

## Weekly

Monday: **📈 Upload sales** → pick the 15-minute CSV → save. Forecast rebuilds itself.

## Safety

- The code is public (free GitHub Pages). **No store data is in the code** — it all lives in Firebase, locked to the emails in your rules.
- The Firebase config keys are meant to be public; the rules are what protect the data.
- Want the code private too? GitHub Pro ($4/mo) allows Pages from a private repo.
- Run it by your Operator before rollout — it holds team names, schedules and sales.

## What's different from the claude.ai version

- **Schedule PDF reading is off** (it needs an AI key on a server). Add people with **Team list**. See `CONTEXT.md` → Next steps for a schedule-CSV import.
- Everything else works the same, plus it keeps working through Wi-Fi drops and syncs when the connection is back.
