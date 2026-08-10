# Milad program website

A two-part site: a public page anyone can open, and an organiser dashboard behind a login.
Everything is static files, so it runs on GitHub Pages for free. The only moving part is
Firebase, which carries the live quiz state between the dashboard and the public page.

```
index.html              public page
admin.html              organiser dashboard
assets/config.js        the one file you must edit
assets/styles.css
assets/public.js
assets/admin.js
assets/logo.svg         placeholder — swap in your own
firestore.rules         paste into Firebase console
sample-questions.csv    the CSV format for quiz questions
```

---

## Before you start: one thing to change in your plan

The original spec collected each participant's **Gmail password** on the poster form.
Don't do this. A form asking for someone's Google password, with the answers landing in a
spreadsheet, is credential harvesting — it breaks Google's terms, it's very likely illegal
under India's DPDP Act, and one leaked sheet compromises every participant's entire Google
account.

You don't need it. Google Forms can capture a verified email address on its own (step 6).

---

## Step 1 — Get the files online

1. Create a free GitHub account.
2. Make a new **public** repository, e.g. `milad-program`.
3. Upload every file here, keeping the `assets/` folder structure.
4. Repository **Settings → Pages → Source: deploy from branch `main`, folder `/ (root)`**.
5. After a minute your site is live at `https://YOURNAME.github.io/milad-program/`.

Use GitHub Pages rather than InfinityFree — nothing here needs PHP, and InfinityFree's
forced downtime would take your site offline mid-event.

## Step 2 — Create the Firebase project

1. Go to `console.firebase.google.com` and sign in with a Google account.
2. **Create a project**. Name it anything. You can switch off Google Analytics.
3. On the project overview, click the **web icon (`</>`)** to register an app. Give it a
   nickname; don't tick Firebase Hosting.
4. Firebase shows you a `firebaseConfig` block. Copy those values into `assets/config.js`.

That config is safe to keep in a public repo. It identifies your project, it doesn't grant
access — the rules in step 5 do that.

## Step 3 — Turn on Firestore

1. Left sidebar → **Build → Firestore Database → Create database**.
2. Choose **production mode**.
3. Pick a location near you (`asia-south1` is Mumbai).

Firestore, not Realtime Database. The free Realtime Database caps you at 100 people
connected at once, which your quiz would blow straight past. Firestore has no such cap.

## Step 4 — Create the organiser login

1. **Build → Authentication → Get started**.
2. Enable **Email/Password**. Leave the passwordless option off.
3. **Users → Add user**. Enter the organiser's email and a strong password.

Only accounts you create here can sign in. There is no public sign-up.

## Step 5 — Lock down the database

1. **Firestore Database → Rules**.
2. Delete what's there and paste in the contents of `firestore.rules`.
3. Change `organiser@example.com` to the email from step 4.
4. **Publish**.

Do this before the event. Without it, anyone could push their own quiz questions to your
public page.

## Step 6 — Build the poster form

1. Create a Google Form.
2. **Settings → Responses → Collect email addresses: Verified**.
3. Add: full name (short answer), phone number (short answer), entry title (short answer),
   and a **File upload** question. Restrict it to images and PDF, one file, 10&nbsp;MB max.
4. **Responses → Link to Sheets**. Uploads land in a Drive folder automatically.
5. Copy the form's share link into `posterFormUrl` in `config.js`.

Never add a password field.

## Step 7 — Fill in the rest of the config

Open `assets/config.js` and set your event name, organisation, date, YouTube channel ID
(**youtube.com → your channel → Settings → Advanced**, starts with `UC`), and the Drive
share link for your study PDF.

Replace `assets/logo.svg` with your own logo, keeping the filename.

### Fixing the Malayalam wording

The page is in Malayalam. Two places hold the words:

- **`index.html`** — the headings and paragraphs. Open it in any text editor, find the
  Malayalam, type over it. Don't touch anything inside `<` `>` brackets.
- **`assets/config.js`**, the `text = { … }` block at the bottom — everything the page says
  *while the quiz is running* ("ശരി.", "സെക്കൻഡ് ബാക്കി", and so on). Change only what's
  between the quotation marks.

In `config.js`, `{n}`, `{score}` and `{total}` get replaced by numbers, so keep those as
they are.

The organiser dashboard is in English. It's only used by one or two people who already know
what the buttons do, so translating it wasn't worth the risk of a wrong word in the middle
of a live event.

---

## Running the quiz

**Beforehand.** Put your questions in a spreadsheet with these columns:

| question | option1 | option2 | option3 | option4 | answer | explanation |
|---|---|---|---|---|---|---|

`answer` is a letter (`A`–`D`) or a number (`1`–`4`). `explanation` is optional.
See `sample-questions.csv`, which has five Malayalam questions in the right shape.

Then **File → Download → Comma-separated values (.csv)**, and upload that file in the
dashboard.

**Malayalam and CSV files — one thing to avoid.** Download straight from Google Sheets and
upload that file as-is. If you open it in Microsoft Excel and save it again, Excel can
rewrite the file in an encoding that turns Malayalam into question marks or boxes. If you
ever see mangled text in the dashboard's question list, this is why — go back to Sheets and
download a fresh copy.

There's also a "published Google Sheet CSV link" box, which is handy while testing — but
publishing a sheet makes it readable by anyone with the link, **including your answer
column**. For the real event, upload the file.

**Fitting it into a four-hour programme.** Fifteen questions is roughly eight to twelve
minutes. Don't ask people to keep the page open all evening — announce a time from the
stage ("ക്വിസ് 7:30-ന്"), and put the link on a projected slide as a QR code so nobody has
to type it. People who arrive late just open the page and join the question in progress.

**On the night.**

1. Open the dashboard by typing the address yourself — `your-site-url/admin.html`.
   It is deliberately not linked from anywhere on the public page, so bookmark it.
   Sign in and upload your CSV.
2. Set **seconds per question**. You can change this any time between questions — it's
   locked only while a question is on screen. 30 seconds suits short questions; 45 is
   easier if your Malayalam questions run long or your audience is mostly parents.
3. Press **Start quiz**. The first question appears on everyone's screen with the
   countdown.
4. When the timer ends the question closes. **No answer is ever shown on the public page** —
   announce it from the stage if you want to.
5. Press **Next question**. Repeat.
6. **End quiz** at the finish.

Two things about how people answer. A choice is final: the first tap locks all four buttons,
so nobody can change their mind or work backwards through the options. And nothing they tap
leaves their phone — no answers are sent anywhere, which is what keeps this free.

The correct answer never reaches the public page at all. It stays in the dashboard browser
and is shown only to you, under the question preview.

## Judging posters

Download your form's response sheet as CSV, upload it under **Judging**, pick which columns
hold the name and entry title, type marks, and press **Publish results**. The public page
updates immediately. **Unpublish** hides them again.

## Step 8 — Automatic live detection (optional)

Without this, flip the **Live banner** switch by hand when you start streaming. That always
works and needs no setup.

To have it detect the stream by itself:

1. Go to `console.cloud.google.com`, pick the same project Firebase created.
2. **APIs & Services → Library → YouTube Data API v3 → Enable**.
3. **Credentials → Create credentials → API key**.
4. Click the new key → **Application restrictions → Websites** → add
   `https://YOURNAME.github.io/*`. Then **API restrictions → Restrict key → YouTube Data
   API v3**. Save. This matters: an unrestricted key can be lifted from your page and spent
   by anyone.
5. Paste the key into `youtubeApiKey` in `assets/config.js`.
6. In the dashboard, switch on **Detect the live stream automatically**.

**Only the dashboard polls**, once a minute, and writes the result to Firestore for everyone
else to read. Two cheap calls are used rather than one expensive one: `search.list` costs 100
quota units per check, while `playlistItems.list` plus `videos.list` cost 1 each. That works
out under 3,000 units a day against a 10,000 budget. If every visitor polled YouTube directly
you would exhaust the quota in about two minutes.

Leave the dashboard open on some device during the programme for this to keep working. The
manual switch stays available as an override, and is what you need if your stream is unlisted.

## The programme date

Set it under **Public page → Programme date and time**, then **Save date**.

It drives two things: the date shown on the site, and the study material, which disappears
from the public page automatically **24 hours before** the start time. If you would rather
write the date in your own words ("സെപ്റ്റംബർ 12, വൈകിട്ട് 6 മണി"), fill the optional label
field and that is displayed instead.

## Notifications

Post them from **Public page → New notification**. They show up under the bell in the header
with an unread badge, newest first, and the six most recent are kept.

You can attach an image. **1200 × 675 px (16:9)** is the size to aim for — that shape fits
phones, tablets and desktops without awkward cropping. You do not have to prepare it exactly:
whatever you upload is scaled and centre-cropped to 16:9 in your browser, then compressed to
around 100 KB before it is sent. Keep any text in the image away from the edges, since the
crop takes from the sides on very tall images.

---

## What this costs, and where the ceiling is

Everything above is free. The limit worth knowing is Firestore's **50,000 document reads
per day** on the free plan.

Each person's browser watching the quiz uses one read per update. For a 15-question round:

```
300 people × 15 questions × 2 updates each  =  9,000 reads
```

That's well under the limit — you could run the whole quiz five times in one day and still
be inside it, so rehearse on event day if you want to.

Two things that do *not* cost you anything, in case you were worried:

- **Time doesn't count.** A page left open for the full four hours costs nothing while
  nothing is changing. You're charged per update delivered, not per minute connected.
- **People joining late.** Each person who opens the page uses about three reads.

The only scenario that would push you over is several thousand people. If that happens, add
a billing account (Blaze plan) as insurance — actual cost at this scale is a few cents, and
you can set a budget alert.

## Testing it locally

Browsers block ES modules opened as `file://`, so run a small server:

```bash
cd milad-site
python3 -m http.server 8000
```

Then open `http://localhost:8000`. Open `admin.html` in a second window and drive the quiz
while watching the public page update.

## If something goes wrong

**Public page stuck on "Waiting for the host".** The rules aren't published, or `config.js`
still has placeholder values. Open the browser console (F12) — a `permission-denied` error
points at step 5.

**Can't sign in to the dashboard.** The account has to be created by hand in Firebase
Authentication (step 4).

**Dashboard buttons do nothing.** The email in `firestore.rules` must match the signed-in
account exactly.

**Timer looks a second or two off on some phones.** Expected. The countdown is anchored to a
server timestamp, but each device draws it against its own clock. It's clamped so it can
never exceed 30 seconds or go negative.
