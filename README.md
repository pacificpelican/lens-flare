# Lens Flare - Photo Archiver

A desktop-first web app for archiving, organizing, and editing digital photos with AI-powered descriptions.

## Project Status

🚧 **In Development** — Architecture & foundation layer complete, moving to frontend UI and core photo features.

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

## API Routes (Planned)

### Auth
- `POST /api/auth/register` — Register new user
- `POST /api/auth/login` — Login user
- `POST /api/auth/logout` — Logout (requires auth)
- `GET /api/auth/me` — Get current user profile (requires auth)

### Photos (Coming)
- `GET /api/photos` — List user photos (paginated, sorted by upload date)
- `GET /api/photos/:id` — Get single photo with EXIF & tags
- `POST /api/photos` — Upload new photo
- `PUT /api/photos/:id` — Update photo title, descriptions, tags
- `DELETE /api/photos/:id` — Delete photo

### AI Descriptions (Coming)
- `POST /api/photos/:id/generate-description` — Generate AI description for photo

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

2. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your settings (defaults work for local dev)
   ```

3. **Generate JWT secrets:**
   ```bash
   # Generate two random hex strings for JWT_SECRET and REFRESH_TOKEN_SECRET
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

```bash
# Backend only (with watch)
npm run dev:backend

# Frontend only (with hot reload)
npm run dev:frontend
```

### Building for Production

```bash
npm run build
# Outputs: dist/backend/ and src/frontend/dist/
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
| `OLLAMA_MODEL` | Ollama model name | `llava-phi` |

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

**Ollama (local, recommended):**
```env
AI_ENABLED=true
AI_PROVIDER=ollama
OLLAMA_ENDPOINT=http://localhost:11434
OLLAMA_MODEL=llava-phi
```

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

### 🚧 In Progress
- [ ] Photo upload & storage
- [ ] Contact sheet grid UI
- [ ] Photo detail page
- [ ] EXIF data extraction & display
- [ ] Photo tagging system
- [ ] AI description generation

### 📋 Planned
- [ ] Image processing (resize, format conversion)
- [ ] Photo search & filtering
- [ ] Bulk export options
- [ ] Webcam integration
- [ ] User settings & preferences
- [ ] Photo deletion with confirmation
- [ ] Marketing landing page

## Development Notes

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

## Testing (Coming)
- Unit tests: Jest
- Integration tests: Supertest (for API)
- E2E tests: Playwright (for UI)

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

MIT

---

## Next Steps

1. **Frontend UI** — Build contact sheet grid component and photo detail page
2. **Photo Service** — Implement upload, storage, and processing logic
3. **EXIF Extraction** — Parse and display EXIF data on photo pages
4. **AI Integration** — Wire up Ollama or cloud AI for descriptions
5. **Testing** — Add test suite for critical paths
