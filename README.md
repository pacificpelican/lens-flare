# Lens Flare - Photo Archiver

<img src="src/frontend/public/images/lens-flare-logo-small.png" alt="Lens Flare Logo" width="80" height="80" />

A desktop-first web app for archiving, organizing, and editing digital photos with AI-powered descriptions.

## Project Status

✅ **Core Features Complete** — Photo archiving, AI descriptions, editing, webcam capture, and user management are fully implemented. Continuing refinement and browser compatibility work.

## Architecture Overview

### Tech Stack

**Frontend:**
- React 18 + TypeScript
- Vite (build & dev server)
- Tailwind CSS + custom CSS (design system)
- Axios (API client)

**Backend:**
- Node.js + Express
- TypeScript
- JWT-based authentication with refresh tokens
- Sharp (image processing & resizing)
- ExifParser (EXIF data extraction)

**Database:**
- **Local Dev**: SQLite (zero-config)
- **Production**: MySQL / MariaDB (configurable)
- **Abstraction Layer**: Unified IDatabase interface supporting both

**AI Integration:**
- Ollama (local, configurable model)
- Cloud providers: OpenAI, Anthropic (fallback)
- Configurable via environment variables

### Project Structure

```
lens-flare/
├── src/
│   ├── backend/              # Node.js Express server
│   │   ├── db/               # Database abstraction & schema
│   │   ├── services/         # Business logic (auth, photo, AI)
│   │   ├── controllers/      # Request handlers
│   │   ├── routes/           # API endpoint definitions
│   │   ├── middleware/       # Express middleware (auth, etc)
│   │   ├── config.ts         # Environment & config management
│   │   └── server.ts         # App bootstrap
│   │
│   ├── frontend/             # React + Vite SPA
│   │   ├── src/
│   │   │   ├── components/   # Reusable UI components
│   │   │   ├── pages/        # Page-level components
│   │   │   ├── hooks/        # Custom React hooks
│   │   │   ├── App.tsx       # Root component
│   │   │   └── main.tsx      # Entry point
│   │   ├── vite.config.ts
│   │   ├── tailwind.config.js
│   │   └── index.html
│   │
│   └── shared/               # Shared types & interfaces
│       └── types.ts          # TypeScript type definitions
│
├── .env.example              # Environment template
├── package.json              # Root dependencies
├── tsconfig.json             # TypeScript config
└── README.md
```

## Database Schema

### Users
- `id` (UUID, PK)
- `email` (unique)
- `username` (optional, unique)
- `password_hash` (bcrypt)
- `created_at`, `updated_at`

### Photos
- `id` (UUID, PK)
- `user_id` (FK → users)
- `filename`, `original_filename`
- `title`, `user_description`, `ai_description`
- `exif_data` (JSON)
- `file_size`, `mime_type`
- `upload_date`, `created_at`, `updated_at`

### Tags
- `id` (UUID, PK)
- `user_id` (FK → users)
- `photo_id` (FK → photos)
- `tag_name`
- `created_at`

### Refresh Tokens
- `id` (UUID, PK)
- `user_id` (FK → users)
- `token` (unique, hashed)
- `expires_at`
- `created_at`

## Authentication Flow

1. **Register/Login** → Generate JWT access token + refresh token
2. **Access Token** → 15-minute lifetime, sent in `Authorization: Bearer` header
3. **Refresh Token** → 7-day lifetime, stored in httpOnly cookie
4. **Token Expiry** → Client uses refresh token to silently obtain new access token
5. **Logout** → Revoke all refresh tokens for user

## API Routes

### Auth
- `POST /api/auth/register` — Register new user
- `POST /api/auth/login` — Login user
- `POST /api/auth/logout` — Logout (requires auth)
- `GET /api/auth/me` — Get current user profile (requires auth)
- `GET /api/auth/config` — Get public app configuration (signups, email enabled)
- `POST /api/auth/forgot-password` — Request password reset
- `POST /api/auth/validate-reset-token` — Validate password reset token
- `POST /api/auth/reset-password` — Complete password reset
- `DELETE /api/auth/me` — Delete account (requires password)

### Photos
- `GET /api/photos` — List user photos (paginated, sorted by upload date)
- `GET /api/photos/:id` — Get single photo with EXIF & tags
- `POST /api/photos` — Upload new photo(s)
- `PUT /api/photos/:id` — Update photo title, descriptions, tags
- `DELETE /api/photos/:id` — Delete photo
- `GET /api/photos/print` — Export photos to PDF with metadata
- `POST /api/photos/:id/export` — Export a photo in a chosen format, optionally with bottom-right watermark text (`watermarkText`, up to 200 characters). This does not change the stored photo.

## Setup & Development

### Prerequisites
- Node.js 18+
- npm or yarn
- (Optional) Ollama for local AI descriptions
- (Optional) MySQL 8+ for production database

### Quick Start

1. **Clone and install:**
   ```bash
   npm install
   ```

2. **Configure environment:** Copy the template, then edit `.env` with your settings.
   ```bash
   cp .env.example .env
   ```

3. **Generate JWT secrets:** Run this command twice and put the two different values in `.env` as `JWT_SECRET` and `REFRESH_TOKEN_SECRET`.
   ```bash
   openssl rand -hex 32
   ```

4. **Run dev server:**
   ```bash
   npm run dev
   ```

   This starts:
   - Backend: `http://localhost:3000`
   - Frontend: `http://localhost:5173`

### Individual Development

Run the backend on its own:

```bash
npm run dev:backend
```

This builds the backend and starts it; restart the command after backend changes.

Run the frontend with hot reload:

```bash
npm run dev:frontend
```

### Photo PDF

Use the printer button beside the gallery filters to download a PDF of all photos matching the current search and filters, including results on other gallery pages. Each photo has its own page with its stored metadata; long metadata may continue onto additional pages. The final page contains Lens Flare information and its GitHub URL. Missing or unsupported images are marked in the PDF, while their metadata remains available.

### Building for Production

Outputs to `dist/backend/` and `src/frontend/dist/`

```bash
npm run build
```

## Configuration

### Environment Variables

See `.env.example` for all options. Key variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment | `development` |
| `PORT` | Server port | `3000` |
| `DATABASE_TYPE` | `sqlite` or `mysql` | `sqlite` |
| `SQLITE_PATH` | SQLite file path | `lens-flare.db` |
| `AI_ENABLED` | Enable AI features | `true` |
| `AI_PROVIDER` | `ollama`, `openai`, `anthropic` | `ollama` |
| `OLLAMA_ENDPOINT` | Local Ollama server | `http://localhost:11434` |
| `OLLAMA_MODEL` | Ollama model name | `llava:latest` |

### Database Configuration

**SQLite (default, local dev):**
```env
DATABASE_TYPE=sqlite
SQLITE_PATH=lens-flare.db
```

**MySQL (production):**
```env
DATABASE_TYPE=mysql
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=secret
MYSQL_DATABASE=lens_flare
```

### AI Configuration

#### Setting Up Ollama

Ollama runs a vision model locally to generate photo descriptions. It is optional: uploads still work without it.

1. Download and install Ollama from [ollama.com](https://ollama.com/download). On macOS, open the Ollama app to start its server. On Linux, start the server if it is not already running:

   ```bash
   ollama serve
   ```

2. Download the vision model used by `.env.example`:

   ```bash
   ollama pull llava:latest
   ```

   Model downloads can be large and require sufficient disk space and memory. You can use another Ollama vision model by pulling it and setting `OLLAMA_MODEL` to its name.

3. Check that the server is responding and the model is listed:

   ```bash
   ollama list
   ```

4. Configure the following values in `.env`, then start or restart the backend:

   ```env
   AI_ENABLED=true
   AI_PROVIDER=ollama
   OLLAMA_ENDPOINT=http://localhost:11434
   OLLAMA_MODEL=llava:latest
   ```

The endpoint defaults to `http://localhost:11434`, and the model defaults to `llava:latest`. If Ollama is unavailable or generation fails, the upload continues without an AI description. Set `AI_ENABLED=false` to disable AI descriptions.

**OpenAI (cloud):**
```env
AI_ENABLED=true
AI_PROVIDER=openai
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4-vision
```

## Design System

### Color Palette
- **Primary**: Purple (`#7c3aed`)
- **Backgrounds**: Light grays (`#fafafa`, `#f5f5f5`)
- **Text**: Dark gray (`#1f2937`)
- **Borders**: Subtle translucent gray

### Key Design Principles
- Translucency for depth
- Sharp corners (4-6px radius) on UI elements
- Glassy borders around photo previews (contact sheet)
- Large, readable sans-serif typography
- Purple accent color for interactive elements
- Minimal, clean layout

## Features (Roadmap)

### ✅ Complete
- [x] Project structure & tooling setup
- [x] Database abstraction (SQLite/MySQL)
- [x] Authentication (JWT + refresh tokens)
- [x] User registration & login
- [x] Environment-based configuration
- [x] Photo upload & storage (single & batch)
- [x] Contact sheet grid UI with search & filtering
- [x] Photo detail page with EXIF data display
- [x] Photo tagging system
- [x] AI description generation (Ollama integration with cloud provider fallback)
- [x] Image processing (resize, format conversion, AVIF export)
- [x] Filtered photo PDF export with metadata
- [x] Photo deletion with confirmation
- [x] Image editor (crop, undo/redo, color adjustments)
- [x] Webcam integration (authenticated users)
- [x] User settings & preferences (terms, privacy, debug info)
- [x] Account deletion with photo and account data removal
- [x] Marketing landing page
- [x] Unauthenticated camera access
- [x] Web Share API support (mobile download/share)
- [x] Password reset via email (configurable providers: Mailgun, SMTP)
- [x] Registration controls (open signup, invite codes)
- [x] Email feature toggle (gracefully disable password reset if no email configured)

### 🚧 In Progress
- [ ] Browser compatibility refinements (camera rendering on Edge/Firefox)

### 📋 Planned
- [ ] Batch export options
- [ ] Photo organization by date/album
- [ ] Advanced AI features (auto-tagging, smart organization)
- [ ] Offline sync support
- [ ] Mobile app (Electron/React Native)

## Development Notes

### Deleting an Account
Signed-in users can delete their account from Settings > Account after confirming their password. This removes their account, sessions, photo records, tags, and the photo files referenced by those records. The action cannot be undone. Backups, data sent to external AI providers, and previously orphaned files that are no longer associated with a photo record are not removed.

Photo changes and account deletion are coordinated within one backend process. Deployments running multiple backend processes must stop other instances and active uploads before deleting an account.

### Adding New Database Queries
Use the `db.query<T>()` and `db.run()` methods from the unified `IDatabase` interface. They work identically on both SQLite and MySQL.

### Adding New API Routes
1. Create controller in `src/backend/controllers/`
2. Create routes in `src/backend/routes/`
3. Register routes in `src/backend/server.ts`
4. Add types to `src/shared/types.ts`

### Styling
- Use Tailwind for utility classes
- Custom CSS in component `.css` files for design system compliance
- CSS variables in `src/frontend/src/index.css` for theming

## Testing

Run the account deletion regression tests with:

```bash
npm test
```

Further unit and end-to-end test coverage is planned.

## Deployment

### Docker
```bash
docker build -t lens-flare .
docker run -e DATABASE_TYPE=mysql -p 3000:3000 lens-flare
```

### Standalone (Electron)
The backend can be packaged with Electron for a desktop app using the Node process.

## Credits

**Created by** [Daniel McKeown](https://danieljmckeown.com)

## License

ISC
5. **Testing** — Add test suite for critical paths
