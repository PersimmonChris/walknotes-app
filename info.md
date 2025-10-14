# WalkNotes — Quick Start Guide (No Coding Experience Needed)

This guide walks you through everything required to run WalkNotes locally, from installing tools to debugging common issues. Follow each section in order.

---

## 1. Install the Prerequisites

1. **Node.js 18.18 or newer**  
   - Download from [https://nodejs.org](https://nodejs.org) (choose the Long-Term Support/LTS build).  
   - After installing, open a terminal and run:  
     ```bash
     node -v
     npm -v
     ```  
     Both commands should print version numbers (e.g. `v20.11.1`).

2. **Git** (optional, but helpful for version control)  
   - Download from [https://git-scm.com/downloads](https://git-scm.com/downloads).

---

## 2. Set Up Environment Variables

1. Make a copy of `.env.example` named `.env.local` in the project root:  
   ```bash
   cp .env.example .env.local
   ```
2. Fill in the placeholders:
   - **Clerk (authentication)**
     - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
     - `CLERK_SECRET_KEY`
     - `CLERK_SIGN_IN_URL`, `CLERK_SIGN_UP_URL`, `CLERK_AFTER_SIGN_IN_URL`, `CLERK_AFTER_SIGN_UP_URL` (already set to the recommended routes)
   - **Supabase (database + storage)**
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     - `SUPABASE_SERVICE_ROLE` (keep this key secret — never expose it in the browser)
     - `SUPABASE_NOTES_BUCKET` (default is `notes-audio`)
   - **Google Gemini (AI)**
     - `GEMINI_API_KEY`
     - `GEMINI_MODEL` (defaults to `gemini-2.5-flash-lite`)

> ✅ Tip: `.env.local` is ignored by Git, so your secrets stay on your machine.

---

## 3. Configure Supabase

1. **Create a new project** at [https://app.supabase.com](https://app.supabase.com).
2. **Run the SQL file**:
   - Open your Supabase project → *SQL Editor*.
   - Paste the contents of `Supabase.sql`.
   - Execute the script. This creates the `notes` table, helper trigger, and the security policies WalkNotes expects.
3. **Create the storage bucket** (manual step):
   - Go to *Storage* → *Create bucket*.
   - Name it exactly the same as `SUPABASE_NOTES_BUCKET` (default `notes-audio`).
   - Keep it **private** (recommended). The service-role key used on the server already bypasses Row Level Security.
4. **Grab the keys**:
   - `Project Settings` → `API` → copy the Project URL and anon/service keys for the `.env.local` file.

---

## 4. Configure Clerk

1. Sign in to [https://dashboard.clerk.com](https://dashboard.clerk.com).
2. Copy the **Publishable Key** and **Secret Key** into `.env.local`.
3. Under **Redirect URLs**, set both “After sign in” and “After sign up” to `/dashboard`. This keeps the flow aligned with the app.

---

## 5. Install Project Dependencies

From the project folder (`walknotes-app`), run:

```bash
npm install
```

This downloads everything the frontend and backend need.

---

## 6. Start the App

```bash
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000) in your browser.  
You should see the WalkNotes landing page. Use the **Sign Up** or **Log In** buttons (Clerk handles the modal).

---

## 7. Using WalkNotes

1. **Record a note**  
   - On the dashboard, tap the large floating microphone button.
   - A recording overlay appears with a 10-minute timer.
   - Press Stop when you’re done.
2. **Choose a style**  
   - Pick one of the four preset writing styles. As soon as you click, processing begins (upload → transcribe → rewrite).
3. **Review your note**  
   - When processing finishes, the note pops up in a modal where you can copy, share, delete, or reveal the original transcript.
4. **Free tier limit**  
   - The free plan allows **3 completed notes**. Trying to create a fourth shows a paywall modal (placeholder).

---

## 8. Troubleshooting & Logs

### Where to see logs
- **Terminal running `npm run dev`** — server actions log every major step in JSON form (e.g. `notes.create.audio_uploaded`, `ai.transcription.error`).  
  Copying these logs makes it easy to pinpoint the failing stage (upload, transcribe, rewrite, etc.).
- **Browser console** — shows client-side issues such as microphone permissions or network errors.

### Common issues
| Symptom | Likely Cause | What to Check |
| --- | --- | --- |
| Paywall pops up before recording | You already have 3 completed notes | Delete a note or upgrade the limit later |
| “Microphone permission is required” toast | Browser denied audio access | Allow microphone access in browser/site settings |
| “Unable to load notes” toast | API call failed | Confirm Supabase keys/service role are correct and the SQL ran successfully |
| AI errors in logs (`ai.transcription.error`, `ai.rewrite.error`) | Gemini credentials missing or quota exhausted | Verify `GEMINI_API_KEY` and that the model name is valid |
| `env.invalid` log on startup | `.env.local` missing required values | Double-check all placeholders are filled |

### Re-running lint checks
```bash
npm run lint
```
Run this after making code changes to catch TypeScript or ESLint issues early.

---

## 9. Next Steps (Optional Enhancements)

1. Upgrade to a paid plan once you’re ready to remove the 3-note limit.
2. Wire the “Go Premium” button to your billing provider.
3. Add real storage rules if you plan to expose the bucket publicly (currently only the service role can access it).
4. Connect Supabase Webhooks or Cron jobs if you want background processing.

---

You’re all set! If you run into any step that doesn’t match these instructions, share the exact log message (it includes a code like `notes.create.failed`) so we can zero in on the fix. Happy recording! 🎙️
