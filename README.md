### Web access:https://project2-tau-eight.vercel.app
### TODOs: 
-prompt chaining feature not done
-something went wrong when fetching user names on profile page
-profile searching not fully functioning
-caption pages should show image instead of image id

# Humor Analytics Dashboard

An analytics dashboard built with **Next.js**, **Supabase**, and **TypeScript** to evaluate which content factors drive user engagement on AI-generated meme captions.

## Overview

This project transforms raw caption data into actionable insights for non-technical users.  
Instead of requiring SQL, R, or Stata, users can directly explore how different factors affect caption performance through an interactive web dashboard.

The goal is to help users understand what makes a caption perform better, using both simple statistical summaries and interactive comparisons.

## LLM Usage

This project used three LLM tools during development:

- **Gemini** — helped generate the rough initial project structure
- **ChatGPT** — assisted with UI suggestions and frontend iteration
- **Grok** — helped optimize parts of the computation logic

These tools were used as development aids, while the final design, integration, debugging, and feature decisions were implemented and refined within the project workflow.

## Features

### 1. Regression Analysis
Analyze the relationship between:

- Caption length (characters / words)
- Number of likes

This helps identify whether shorter or longer captions tend to perform better.

### 2. Factor Impact Analysis
Evaluate how different factors influence engagement, including:

- Image
- Humor flavor
- Profile
- Time bucket

Impact is calculated as:

```text
impact = average(group) - average(overall)
```
This makes it easier to see whether a factor performs above or below the overall average.

### 3. Leaderboard

Rank top-performing:

Profiles
Images
Humor flavors

Supported metrics include:

Average likes
Total likes
Caption count
### 4. Metric Toggle

Users can switch between:

avgLikes
totalLikes

This dynamically updates:

Sorting
Displayed values
UI emphasis and highlights
## Tech Stack
Frontend: Next.js (App Router)
Backend / Database: Supabase
Language: TypeScript
Styling: Tailwind CSS
## Real-World Data Challenges Solved
### 1. Supabase Pagination Limit

Supabase queries return at most 1000 rows by default.
To work around this, the project implemented a custom pagination helper (fetchAllRows) to retrieve the full dataset.

### 2. One-to-Many Join Explosion

Joining caption records with related LLM response tables created duplicated rows and inflated the dataset to roughly 110k rows.
This issue was addressed by avoiding invalid regression inputs and carefully limiting which joined variables were used in the analysis.

### 3. Missing or Unknown Labels

Some foreign key relationships were incomplete or missing.
Fallback labels were used to keep the dashboard readable, for example:

profileNameById.get(id) ?? `User ${id.slice(0, 8)}`
### 4. Data Filtering Decisions

Some variables were excluded from analysis when coverage was too low or the values were unreliable.
For example, fields like processing_time were dropped from certain views to avoid misleading conclusions.

## Purpose

This dashboard is designed to:

Help teams make data-driven decisions about content creation
Identify which factors are associated with higher engagement
Provide usable insights without requiring technical expertise
## Demo

Add screenshots or deployed link here.

## Project Structure
app/
├── api/analytics      # data processing and calculations behind admin pages
├── components         # reusable UI components such as sidebar
├── admin              # admin dashboard
├── main               # main feed
├── upload             # image upload and AI processing flow
├── auth               # login
├── lib                # shared utilities such as profile linking

## Key Insight

This project is not only about visualization.
It is also about turning messy, real-world data into interpretable and usable insights for everyday users.