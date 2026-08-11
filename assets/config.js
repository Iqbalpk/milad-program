// ---------------------------------------------------------------------------
// Fill these in before deploying. See README.md, step 2 and step 7.
// ---------------------------------------------------------------------------

export const firebaseConfig = {
  apiKey: "AIzaSyBB6QaWE7PmbcrdoQ957wkIbujJnSJbWts",
  authDomain: "milad-program.firebaseapp.com",
  projectId: "milad-program",
  storageBucket: "milad-program.firebasestorage.app",
  messagingSenderId: "495555398321",
  appId: "1:495555398321:web:5f2e354d18420f35ddb090"
};

// It is safe for these values to be public — Firestore rules control access,
// not this key. Do NOT put any password or secret in this file.

export const site = {
  eventName: "മീലാദ് പ്രോഗ്രാം",
  // Shown in the footer. Swap for "Manarul Huda Madrasa, Chenthrappinni East" if you'd rather show the English form.
  organisation: "മനാറുൽ ഹുദാ മദ്രസ, ചെന്ത്രാപ്പിന്നി ഈസ്റ്റ്",
  eventDate: "തീയതി പിന്നീട് അറിയിക്കും",

  // YouTube channel ID — starts with "UC". Find it at
  // youtube.com > your channel > Settings > Advanced > Channel ID.
  youtubeChannelId: "UCcmXMoW-87JdsYZLImmE4ow",

  // How many recent videos to show in the YouTube grid (needs the API key).
  videoCount: 8,

  // Set true to print why the video grid failed, on the page itself.
  showVideoErrors: true,

  // Optional. Powers the video grid AND automatic live detection — README step 8.
  // Restrict this key to your site's domain in the Google Cloud console.
  youtubeApiKey: "AIzaSyABjpz7yXpEEWKzRSsz0IqTAqKKgJZ4Qf8",

  // Public link to your Google Form for poster submissions (step 6).
  posterFormUrl: "PASTE_GOOGLE_FORM_LINK",

  // Starting value only. You set the real number in the dashboard each time
  // you load questions, so you can decide once you see how long they are.
  questionSeconds: 30
};

// ---------------------------------------------------------------------------
// Everything the page says while the quiz is running. Edit the Malayalam
// freely — it's plain text, and nothing here affects how the site works.
// ---------------------------------------------------------------------------

export const text = {
  quizNotStarted:  "ക്വിസ് തുടങ്ങിയിട്ടില്ല",
  quizRunning:     "ക്വിസ് നടക്കുന്നു",
  quizFinished:    "ക്വിസ് അവസാനിച്ചു",
  streamOffline:   "സ്ട്രീം ഓഫ്‌ലൈൻ",
  streamLive:      "ഇപ്പോൾ ലൈവ്",

  waitingForHost:  "അവതാരകൻ തുടങ്ങാൻ കാത്തിരിക്കുന്നു.",
  secondsLeft:     "സെക്കൻഡ് ബാക്കി",
  timesUp:         "സമയം കഴിഞ്ഞു",



  connectionLost:  "ക്വിസുമായി ബന്ധപ്പെടാൻ കഴിയുന്നില്ല. ഇന്റർനെറ്റ് പരിശോധിക്കുക.",

  // Question counter, e.g. "ചോദ്യം 3 / 15"
  questionLabel:   "ചോദ്യം",

  noNotices:       "പുതിയ അറിയിപ്പുകൾ ഇല്ല.",
  noticeLabel:     "പുതിയ അറിയിപ്പ്",
  answerRecorded:  "ഉത്തരം രേഖപ്പെടുത്തി.",
  moreDetails:     "കൂടുതൽ വിവരങ്ങൾ →",
  studyDefault:    "ഡൗൺലോഡ് ചെയ്യുക",

  joinedAs:        "നിങ്ങൾ ക്വിസിൽ ചേർന്നിരിക്കുന്നു",
  joinNeedName:    "പൂർണ്ണ പേര് നൽകുക.",
  joinNeedHouse:   "വീട്ടുപേര് നൽകുക.",
  joinNeedPhone:   "ശരിയായ 10 അക്ക മൊബൈൽ നമ്പർ നൽകുക.",
  alreadyAnswered: "ഈ നമ്പറിൽ നിന്ന് ഇതിനകം ഉത്തരം നൽകിയിട്ടുണ്ട്."
};
