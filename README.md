# Alcohol Origins Map

An interactive geographic map visualizing the historical origins and evolution of alcoholic beverages. A collaborative wiki-style platform where users can contribute to tracing the family tree of beer, wine, spirits, and more.

## Features

- **Interactive Map**: Explore beverage origins on a world map with timeline filtering
- **Family Tree Visualization**: See parent-child relationships between beverages
- **Wiki-Style Collaboration**: Anyone can contribute with full revision history
- **User Authentication**: Email/password and Google OAuth
- **Role-Based Access**: Viewer, Contributor, Editor, Admin tiers

## Tech Stack

- **Frontend**: Next.js 14+ with App Router, TypeScript, Tailwind CSS
- **UI Components**: shadcn/ui
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Maps**: React-Leaflet
- **Hosting**: Vercel

## Getting Started

### Prerequisites

- Node.js 18+
- A Supabase account (free tier works)

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd alcohol-origins-app
npm install
```

### 2. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **Project Settings > API**
3. Copy the **Project URL** and **anon public** key

### 3. Configure Environment Variables

Copy the example environment file:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### 4. Run Database Migrations

In your Supabase dashboard:

1. Go to **SQL Editor**
2. Create a new query
3. Copy the contents of `supabase/migrations/001_initial_schema.sql`
4. Run the query

### 5. Enable Google OAuth (Optional)

1. In Supabase, go to **Authentication > Providers**
2. Enable Google
3. Follow the instructions to set up OAuth credentials in Google Cloud Console
4. Add your site URL to the redirect URLs

### 6. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

### 7. Optional: Google Drive Bottle Image Uploads (Phase 1)

If you want beverage image uploads to store in Google Drive:

1. Create a Google Cloud service account with Drive API enabled.
2. Create a Drive folder for uploads.
3. Share that folder with the service account email.
4. Add these environment variables:

```env
GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL=service-account@project-id.iam.gserviceaccount.com
GOOGLE_DRIVE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_DRIVE_FOLDER_ID=your-drive-folder-id
```

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── (auth)/            # Auth pages (login, register)
│   ├── beverages/         # Beverage list/detail/edit pages
│   ├── admin/             # Admin dashboard
│   ├── recent-changes/    # Activity feed
│   └── api/               # API routes
├── components/
│   ├── ui/                # shadcn/ui components
│   ├── layout/            # Header, Footer
│   ├── map/               # Map components
│   ├── beverages/         # Beverage forms/cards
│   └── auth/              # Auth forms
├── lib/
│   ├── supabase/          # Supabase client setup
│   ├── utils/             # Utility functions
│   └── constants.ts       # App constants
├── providers/             # React context providers
├── hooks/                 # Custom React hooks
└── types/                 # TypeScript types
```

## User Roles

| Role | Capabilities |
|------|--------------|
| **Viewer** | Browse map and data |
| **Contributor** | Create and edit entries (default for new users) |
| **Editor** | All above + revert edits |
| **Admin** | All above + manage users, delete entries, bulk import |

## Data Migration

To import data from the original Google Sheets:

1. Export your Google Sheet as CSV
2. Use the admin import tool at `/admin/import`
3. Map the columns to the database fields
4. Review and import

## Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Import the project in Vercel
3. Add environment variables in Vercel settings
4. Deploy

The app will automatically deploy on every push to the main branch.

## Contributing

This is a wiki-style collaborative project. After creating an account, you can:

1. Browse existing beverages
2. Add new entries with geographic and historical data
3. Edit existing entries (with full revision history)
4. View the activity feed to see recent changes

## License

MIT
