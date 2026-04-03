# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

There are no tests in this project.

## Environment Variables

Requires a `.env.local` file with:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Architecture

This is a **Next.js 16 App Router** project — a meme voting/captioning app called "MemeLab". It uses Supabase for auth and database, and calls an external AI API (`api.almostcrackd.ai`) for caption generation.

### Auth Flow

- Login: Google OAuth via Supabase (`/login`)
- Callback: `/auth/callback/route.ts` exchanges the OAuth code for a session, then redirects to `/`
- Session guard: Pages check `supabase.auth.getSession()` client-side and redirect to `/login` if no session
- `Sidebar.tsx` hides itself on the `/login` route

### Supabase Usage Pattern

- **Client components** use `createBrowserClient` from `@supabase/ssr`, typically memoized in `useMemo`
- **Server/API routes** use `createClient` from `@supabase/supabase-js` directly
- The `createServerClient` pattern (with cookie handling) is only used in the auth callback route

### Key Database Tables

- `captions` — meme captions with `like_count`, `image_id`, `profile_id`, `humor_flavor_id`, `is_public`
- `caption_votes` — vote records with `vote_value` (+1/-1), unique on `(profile_id, caption_id)`
- `images` — image records with `url`
- `humor_flavors` — AI humor style options
- `profiles` — user profiles with `first_name`, `last_name`
- Additional admin tables: `caption_examples`, `llm_models`, `llm_providers`, `llm_responses`, `llm_prompt_chain`, `sign_up_domains`, `whitelist_emails`, `term`

### Voting Logic

`like_count` on `captions` is not incremented directly — after every vote/unvote, `refreshCaptionLikeCount()` in `app/main/page.tsx` re-sums all `caption_votes` rows for that caption and updates `captions.like_count` to the computed sum.

### Upload & Caption Generation Flow (`/upload`)

1. Get a presigned S3 URL from `api.almostcrackd.ai/pipeline/generate-presigned-url`
2. PUT the file directly to S3
3. Register the CDN URL with `api.almostcrackd.ai/pipeline/upload-image-from-url` → get `imageId`
4. Call `api.almostcrackd.ai/pipeline/generate-captions` with `imageId` and `humorFlavorId`
5. User can edit the caption, revise with a different humor flavor, or save to the `captions` table

### Analytics API (`/api/analytics`)

Server-side route that fetches all captions/flavors/profiles from Supabase, computes simple linear regressions (caption length vs likes, word count vs likes) and group-average impact scores for image, flavor, time-of-day, and user dimensions. All computed in-process — no external analytics service.

### Route Structure

- `/` — Dashboard (requires auth)
- `/login` — Google OAuth login
- `/main` — Meme voting feed (scroll-based active card highlighting)
- `/upload` — Upload image + AI caption generation
- `/least-favored` — Bottom 25 memes by score
- `/list` — Recent voting activity feed
- `/admin/*` — Admin panel pages (analytics, users, images, captions, LLM config, etc.)
- `/auth/callback` — OAuth callback handler
- `/api/analytics` — Analytics computation endpoint
- `/api/analytics/multi-regression` — Additional regression endpoint
