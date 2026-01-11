# RallyCoach AI

## Overview

RallyCoach AI is a tennis coaching web application that allows users to upload videos of their tennis swings for AI-powered analysis. The app processes uploaded footage to provide professional-level technical feedback, identifying strengths, weaknesses, and generating personalized improvement recommendations.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack React Query for server state
- **Styling**: Tailwind CSS with shadcn/ui component library (New York style)
- **Animations**: Framer Motion for page transitions and UI animations
- **File Uploads**: Uppy with AWS S3 integration and react-dropzone

The frontend follows a pages-based structure with reusable components. Key pages include Home (landing), Upload (video submission), and Result (analysis display).

### Backend Architecture
- **Runtime**: Node.js with Express
- **Language**: TypeScript with ESM modules
- **Build Tool**: esbuild for server bundling, Vite for client
- **API Style**: RESTful JSON API under `/api/` prefix

The server handles video metadata management, triggers processing jobs, and serves the SPA. Routes are defined in `server/routes.ts` with type-safe schemas in `shared/routes.ts`.

### Data Storage
- **Database**: PostgreSQL with Drizzle ORM
- **Schema Location**: `shared/schema.ts`
- **Migrations**: Drizzle Kit (`drizzle-kit push`)
- **Object Storage**: Google Cloud Storage via Replit Object Storage integration for video files

The `videos` table stores upload metadata, processing status, analysis results, and URLs to original/annotated videos.

### AI Integration
- **Provider**: OpenAI via Replit AI Integrations
- **Environment Variables**: `AI_INTEGRATIONS_OPENAI_API_KEY`, `AI_INTEGRATIONS_OPENAI_BASE_URL`
- **Capabilities**: Text analysis for coaching recommendations, image generation available

### File Upload Flow
1. Client requests presigned URL from `/api/uploads/request-url` (sends JSON metadata)
2. Client uploads file directly to the presigned Google Cloud Storage URL
3. Client creates video record via `/api/videos/upload` with the storage URL
4. Client triggers processing via `/api/videos/:id/process`

### Replit Integrations
The `server/replit_integrations/` directory contains modular utilities:
- **object_storage**: Presigned URL generation and file management
- **batch**: Rate-limited batch processing for LLM calls
- **chat**: Conversation persistence for AI chat features
- **image**: Image generation via OpenAI

## External Dependencies

### Third-Party Services
- **PostgreSQL Database**: Required, configured via `DATABASE_URL` environment variable
- **Google Cloud Storage**: For video file storage (via Replit Object Storage)
- **OpenAI API**: For AI-powered swing analysis (via Replit AI Integrations)

### Key NPM Packages
- `drizzle-orm` / `drizzle-kit`: Database ORM and migrations
- `@tanstack/react-query`: Client-side data fetching
- `@google-cloud/storage`: Object storage client
- `openai`: AI API client
- `@uppy/core`, `@uppy/aws-s3`: File upload handling
- `framer-motion`: Animations
- `wouter`: Client routing
- `zod`: Schema validation

### Environment Variables Required
- `DATABASE_URL`: PostgreSQL connection string
- `AI_INTEGRATIONS_OPENAI_API_KEY`: OpenAI API key
- `AI_INTEGRATIONS_OPENAI_BASE_URL`: OpenAI API base URL