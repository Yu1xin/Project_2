#Web access:https://project2-tau-eight.vercel.app
# TODOs: 
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