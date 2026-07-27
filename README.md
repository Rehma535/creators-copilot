# Creator Copilot

**Your AI assistant for planning, writing, and organizing content across YouTube, Instagram, and TikTok.**

## a. What it does & the problem it solves

Small and independent content creators rarely struggle with *ideas alone* — they struggle with the sheer number of separate tasks required to turn one idea into finished content for multiple platforms: writing a YouTube script, adapting the same idea into an Instagram carousel, rewriting it again for a 30-second TikTok, generating hashtags, planning when to post it all, and keeping track of what's already been made.

**Creator Copilot** solves this for solo creators and small creator teams by combining idea generation, platform-specific script/caption writing, cross-platform repurposing, a content library, and a scheduling calendar into one workflow — personalized to each creator's own niche, audience, and tone of voice, rather than generic AI output.

**Who it's for:** individual content creators and small creator teams managing 2–3 platforms at once without a dedicated social media team or paid multi-tool subscription stack.

## b. Live URL

* **Deployed App (Vercel):** https://creators-copilot.vercel.app
* **Lovable Published App:** https://creators-copilot.lovable.app 

## c. Features

- **Email/password authentication** (Supabase Auth) with a dedicated Sign Up and Login flow
- **Creator Profile** — channel name, niche, target audience, and tone of voice, saved per user and used to personalize every AI generation
- **Profile picture upload**, shown as the user's avatar across the app
- **AI Content Generation** across three platforms from a single topic input:
  - **YouTube** — title options, hook, full timestamped script, thumbnail concepts, SEO tags
  - **Instagram** — caption, carousel outline, CTA, hashtags
  - **TikTok** — 30-second script, hook, caption, trending style suggestion
- **Voice input** on the topic field via the browser's Web Speech API
- **AI Repurposing** — convert any saved piece of content into a different platform's format with one click, preserving the core message
- **Content History / Library** — view, filter (by platform or favorites), edit, delete, and favorite past generations
- **Content Calendar** — Weekly, Monthly, and List views, with manual scheduling of saved content to specific dates
- **AI Auto-Schedule** — suggests an optimal publishing schedule for unscheduled content based on platform best practices, shown as a preview for the user to accept before anything is committed
- **Dark, neon, creator-studio-themed UI**, designed for a gen-z creator audience

## d. The AI feature

Creator Copilot uses **Google's Gemini API** for two distinct AI-driven features, both grounded in the creator's saved profile so outputs are personalized rather than generic.

### 1. Platform-specific content generation

**System instruction:**
```
You are a content strategist for a creator with this profile:
- Channel: {channel_name}
- Niche: {niche}
- Audience: {target_audience}
- Tone: {tone_of_voice}

Generate platform-specific content for {platform}, writing in the
creator's tone and speaking to their stated audience.

For YouTube return: title options, hook, a complete timestamped
script (full narration text, not just an outline), thumbnail
concepts, and SEO tags.

For Instagram return: caption, carousel outline, CTA, and hashtags.

For TikTok return: a 30-second script, hook, caption, and a
trending style suggestion.

Return clean plain text with no markdown formatting symbols.
```

### 2. Cross-platform repurposing

**Instruction:**
```
Rewrite this existing {source_platform} content as {target_platform}
content, adapting format and length to platform norms while
preserving the core message.
```

### 3. AI-suggested publishing schedule

**Instruction:**
```
You are a social media scheduling assistant. Given this list of
content items, suggest an optimal publishing schedule for the next
7 days based on general platform best practices (e.g. consistent
weekly YouTube upload slots, midday/early-evening Instagram posts,
multiple lighter TikTok posts spread through the week), avoiding
same-day overlaps per platform where possible. Return a specific
date and time for each item.
```
This feature is explicitly framed as best-practice recommendations, not real audience analytics, since no platform analytics data is connected — and suggestions are shown to the user as a preview to accept, never committed automatically.

## e. Tools, services, and models used

| Category | Tool |
|---|---|
| App builder | [Lovable](https://lovable.dev) |
| UI design | [Google Stitch](https://stitch.withgoogle.com) |
| Backend / Auth / Database / Storage | [Supabase](https://supabase.com) |
| AI model | Google Gemini API |
| Deployment | [Vercel](https://vercel.com) |
| AI pair-programming / planning | Claude (Anthropic) |

## f. Screenshots

![Landing Page](landing-page.png)

![Generate Page](Generate-page-1.png)

![Generate Page with voice input](Generate-page-2.png)

![Calendar Page](Calendar-page.png)

![History Page](History-page.png)

![Profile page](Profile-page.png)

## g. How to run this project locally

1. **Clone the repository**
   ```bash
   git clone https://github.com/Rehma535/creators-copilot
   cd creators-copilot
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**

   Create a `.env` file in the project root with:
   ```
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

   > The Gemini API key is **not** stored in this file — it's configured as a server-side secret (`GEMINI_API_KEY`) inside the Supabase Edge Function that handles content generation, so it's never exposed to the browser. If you're running your own instance, add it under your Supabase project's Edge Function secrets.

4. **Run the development server**
   ```bash
   npm run dev
   ```
   The app will be available at `http://localhost:5173` (or the port shown in your terminal).

5. **Database setup**

   This project uses Supabase for authentication and data storage, with tables for `profiles` and `content_items`, both protected by Row Level Security so users can only access their own data. If setting up a fresh Supabase project, run the schema migrations found in the `/supabase` folder (or recreate the tables as described above) before first use.

---

Built as a final project — an end-to-end AI-powered app designed, built, and shipped independently.
