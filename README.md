### Web access: https://project2-tau-eight.vercel.app

### TODOs:
- Letting regular users download memes

# MemeLab

A full-stack meme creation and voting platform built with **Next.js 16**, **Supabase**, and **TypeScript**. Users can browse memes, vote on them, generate AI-powered captions, and explore engagement analytics.

## Overview

MemeLab combines a social meme voting feed with an AI caption generation studio. Users pick an image, choose a humor personality ("flavor"), and get 5 AI-generated captions to choose from. Admins get a full analytics dashboard to understand what makes captions perform well.

## LLM Usage

This project used three LLM tools during development:

- **Gemini** — helped generate the rough initial project structure
- **ChatGPT** — assisted with UI suggestions and frontend iteration
- **Grok** — helped optimize parts of the computation logic
- **Claude** — used for ongoing feature development, bug fixes, and refactoring throughout the project

These tools were used as development aids, while the final design, integration, debugging, and feature decisions were implemented and refined within the project workflow.

## Features

### User-Facing

#### 1. Meme Board (`/main`)
- Scrollable meme voting feed with pile and grid view modes
- Pile mode: swipe-style card-by-card browsing with slide animations
- Grid mode: see all memes at once; click a card to vote inline (👍 / 👎 / ✨ make similar)
- Vote up or down on captions; voted memes move to the end of the pile
- "Make Similar" button pre-fills Meme Lab with the same image + caption for remixing
- Search bar to filter by caption text
- Pile selector (All / Liked / Disliked)

#### 2. Meme Lab (`/upload`)
- **Gallery mode**: pick from the top 50 highest-rated images
- **Upload mode**: drag-and-drop or click to upload your own image
- Choose a humor flavor (AI personality) from a searchable dropdown
- Generate 5 AI captions at once — pick the one you like, edit it, then publish
- Generated captions are hidden (draft) until you explicitly click "Add to Meme Board"
- "Generate 5 New Captions" to get a fresh batch with a different flavor
- **My Memes sidebar**: view and delete your own published memes

#### 3. Home Page (`/`)
- Quick-launch buttons to Meme Board and Meme Lab
- Superadmin users see their Humor Flavor collection

#### 4. Least Favored (`/least-favored`)
- Displays the bottom 25 memes by score

#### 5. Who Is Online (`/list`) *(admin only)*
- Recent voting activity feed

---

### Admin Panel (`/admin`)

Access via sidebar for superadmin / matrix admin users.

#### Analytics (`/admin/analytics`)
- **Overview**: regression analysis of caption length vs. likes; leaderboard of top profiles, images, and humor flavors ranked by average likes, total likes, or caption count; metric toggle between avgLikes / totalLikes
- **Factors Impacting Scores** (`/admin/analytics/factors`): per-factor impact scores (image, humor flavor, user profile, time of day) calculated as `group average − overall average`
- **Flavor Intelligence** (`/admin/analytics/flavor`): per-flavor performance breakdown

#### LLM Related
- **Humor Flavors** (`/admin/humor-flavors`): manage AI personality options used during caption generation
- **LLM Models** (`/admin/llm_models`): manage model configurations
- **Prompt Chains** (`/admin/llm_prompt_chain`): view and edit the multi-step prompt pipelines
- **LLM Providers** (`/admin/llm_providers`): manage AI provider settings
- **LLM Responses** (`/admin/llm_responses`): inspect raw model outputs
- **Caption Requests** (`/admin/caption_requests`): view generation request logs

#### Materials
- **Images** (`/admin/images`): manage the image library
- **Caption Examples** (`/admin/caption_examples`): manage few-shot examples used in prompts
- **Meme Captions** (`/admin/captions`): browse and manage all captions
- **Terms** (`/admin/term`): manage glossary / term definitions

#### User Related
- **User Profiles** (`/admin/users`): view and manage user accounts
- **Sign Up Domains** (`/admin/sign_up_domains`): restrict which email domains can register
- **Whitelist Emails** (`/admin/whitelist_emails`): allow specific emails outside permitted domains

---

## Tech Stack

- **Frontend**: Next.js 16 (App Router), React, Tailwind CSS
- **Backend / Database**: Supabase (Postgres + Auth + Storage)
- **Language**: TypeScript
- **AI API**: `api.almostcrackd.ai` — image description (Gemini 2.5 Flash) + caption generation (GPT-4.1), returns 5 captions per request
- **Deployment**: Vercel

## AI Caption Generation Flow

1. Get a presigned S3 URL from the AI API
2. Upload the image directly to S3
3. Register the CDN URL with the AI API → receive an `imageId`
4. Call the caption generation endpoint with `imageId` + `humorFlavorId`
5. API runs a 2-step prompt chain: image description → 5 captions
6. All 5 captions are shown to the user to pick from
7. Auto-saved drafts are immediately hidden server-side (service role bypasses RLS)
8. User picks, optionally edits, and clicks "Add to Meme Board" to publish

## Real-World Data Challenges Solved

### 1. Supabase Pagination Limit
Supabase queries return at most 1000 rows by default. A custom pagination helper (`fetchAllRows`) retrieves the full dataset for analytics.

### 2. One-to-Many Join Explosion
Joining captions with LLM response tables inflated the dataset to ~110k rows. This was addressed by limiting joined variables and filtering invalid regression inputs.

### 3. Missing or Unknown Labels
Some foreign key relationships were incomplete. Fallback labels keep the dashboard readable:
```ts
profileNameById.get(id) ?? `User ${id.slice(0, 8)}`
```

### 4. Supabase RLS on Auto-Saved Records
The external AI API saves captions via service role with `is_public: true`. Client-side updates to hide them were blocked by Row Level Security. Fixed by routing the hide operation through a server-side API route (`/api/hide-draft-captions`) that uses the service role key.

### 5. Rotating Refresh Tokens
Multiple `createBrowserClient` instances competed for token refreshes, causing "Invalid Refresh Token" crashes. Fixed by memoizing the Supabase client with `useMemo`.

## Project Structure

```
app/
├── page.tsx               # Home page
├── main/                  # Meme Board (voting feed)
├── upload/                # Meme Lab (AI caption generation)
├── least-favored/         # Bottom 25 memes
├── list/                  # Activity feed (admin only)
├── login/                 # Google OAuth login
├── auth/callback/         # OAuth callback handler
├── admin/                 # Admin panel
│   ├── analytics/         # Analytics dashboard
│   ├── humor-flavors/     # Flavor management
│   ├── images/            # Image library
│   ├── captions/          # Caption management
│   ├── users/             # User profiles
│   └── ...                # Other admin pages
├── api/
│   ├── analytics/         # Analytics computation (regression, factors)
│   ├── hide-draft-captions/  # Server-side draft hiding (service role)
│   ├── top-images/        # Top-rated images for gallery
│   ├── user-center/       # User memes, votes, flavors
│   └── ...
└── components/
    └── Sidebar.tsx        # Collapsible nav sidebar
```

## Demo

Home page:
![img.png](img.png)
Meme voting:
![img_1.png](img_1.png)
Create new meme:
![img_2.png](img_2.png)
25 memes with lowest score:
![img_3.png](img_3.png)
Admin page:
![img_4.png](img_4.png)
Data analysis panel:
![img_5.png](img_5.png)
