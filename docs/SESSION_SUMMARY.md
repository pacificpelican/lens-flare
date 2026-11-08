# Lens Flare - Architecture Decision & Setup Complete ✓

## Session Summary

You and I just completed the **architecture discussion** and **foundational project setup** for Lens Flare Photo Archiver. Here's what we built:

---

## 🏗️ Architecture Decisions Made

### 1. **Authentication: JWT + Refresh Tokens**
- **Access tokens** (15-min lifetime) sent via `Authorization: Bearer` header
- **Refresh tokens** (7-day lifetime) stored in httpOnly cookies
- Passwords hashed with bcryptjs (10 rounds)
- Supports "remember me" via persistent refresh tokens
- Stateless API design (scales horizontally, works for Electron)

### 2. **Database Abstraction Layer**
- Unified `IDatabase` interface supporting both SQLite and MySQL
- **Local dev**: SQLite (zero-config, single file)
- **Production**: MySQL/MariaDB (via .env config)
- Same queries work on both implementations
- Schema: Users, Photos, Tags, Refresh Tokens

### 3. **Tech Stack**
| Layer | Choice | Why |
|-------|--------|-----|
| Frontend | React 18 + TypeScript + Vite | Fast, familiar, Electron-ready |
| Backend | Node.js + Express + TypeScript | Lightweight, JavaScript full-stack |
| Styling | Tailwind CSS + custom CSS | Utility-first + design system flexibility |
| Images | Sharp + ExifParser | Modern format support + EXIF extraction |
| AI | Ollama (local) + cloud fallback | Privacy-first, configurable |

### 4. **Project Structure**
```
lens-flare/
├── src/
│   ├── backend/       # Express server, services, routes
│   ├── frontend/      # React SPA with Vite
│   └── shared/        # TypeScript type definitions
├── docs/              # Architecture decisions, plans
└── package.json       # Root dependencies
```

### 5. **Configuration**
- Environment-based via `.env` file
- No secrets in code
- Template provided: `.env.example`
- Works locally, Docker, production, Electron

---

## ✅ What We Built

### Backend Foundation
- ✅ Database abstraction (SqliteDatabase + MysqlDatabase classes)
- ✅ Schema initialization (users, photos, tags, refresh_tokens tables)
- ✅ AuthService (password hashing, JWT generation, token management)
- ✅ Auth middleware (protect routes with Bearer token validation)
- ✅ Auth controller (register, login, logout, get current user)
- ✅ Auth routes (POST /api/auth/register, /login, /logout, /me)
- ✅ Config management with environment variables
- ✅ Express server bootstrap with CORS, cookies, error handling

### Frontend Foundation
- ✅ React + TypeScript + Vite setup
- ✅ Tailwind CSS configuration with design system tokens
- ✅ CSS variables for theming (colors, spacing, shadows)
- ✅ Base styles (typography, form elements, layout)
- ✅ Project structure (components, pages, hooks directories)

### Shared Types
- ✅ TypeScript interfaces for all domain models
- ✅ API response types (success/error patterns)
- ✅ Auth request/response types
- ✅ Photo, tag, user types

### Documentation
- ✅ Comprehensive README with setup instructions
- ✅ Architecture Decisions Record (ADR) for key choices
- ✅ Frontend Development Plan (roadmap)
- ✅ Environment template (.env.example)

---

## 🚀 Next Steps (What to Build)

### **Phase 1: Frontend Auth & Navigation** (Ready to Start)
1. **API Client** — Axios wrapper with automatic token refresh
2. **Auth Context** — Global user state, token management
3. **Auth Pages** — Registration, login, landing/marketing page
4. **Main Layout** — Header with nav, sidebar, user menu
5. **Route Protection** — Redirect unauthenticated users

### **Phase 2: Photo Management**
1. **Contact Sheet Grid** — Masonry layout with hover previews
2. **Photo Detail Page** — Large view, EXIF, descriptions, tags
3. **Photo Upload** — Backend photo service + API routes
4. **Image Processing** — Sharp-based resizing, format conversion

### **Phase 3: AI Integration**
1. **AI Description Service** — Ollama/OpenAI integration
2. **Description UI** — Display + regenerate on photo page
3. **Background Processing** — Queue photo descriptions

### **Phase 4: Polish & Deployment**
1. **Testing** — Unit + integration tests
2. **Performance** — Image optimization, caching
3. **Docker** — Multi-stage build for full stack
4. **Electron** — Package as desktop app

---

## 📁 Key Files Reference

| File | Purpose |
|------|---------|
| [src/backend/server.ts](file:///C:/Users/d/Developer/lens-flare/src/backend/server.ts) | App bootstrap, middleware setup |
| [src/backend/db/database.ts](file:///C:/Users/d/Developer/lens-flare/src/backend/db/database.ts) | SQLite + MySQL abstraction |
| [src/backend/services/auth.service.ts](file:///C:/Users/d/Developer/lens-flare/src/backend/services/auth.service.ts) | Auth logic (hashing, JWT, tokens) |
| [src/backend/controllers/auth.controller.ts](file:///C:/Users/d/Developer/lens-flare/src/backend/controllers/auth.controller.ts) | Request handlers |
| [src/shared/types.ts](file:///C:/Users/d/Developer/lens-flare/src/shared/types.ts) | TypeScript interfaces |
| [src/frontend/src/App.tsx](file:///C:/Users/d/Developer/lens-flare/src/frontend/src/App.tsx) | React root component |
| [src/frontend/src/index.css](file:///C:/Users/d/Developer/lens-flare/src/frontend/src/index.css) | Design tokens + base styles |
| [README.md](file:///C:/Users/d/Developer/lens-flare/README.md) | Setup & development guide |
| [docs/ARCHITECTURE_DECISIONS.md](file:///C:/Users/d/Developer/lens-flare/docs/ARCHITECTURE_DECISIONS.md) | Architecture decisions (ADRs) |

---

## 💡 Design System Established

- **Colors**: Purple accent (#7c3aed), light grays (#fafafa, #f5f5f5), dark text (#1f2937)
- **Typography**: Large, readable sans-serif (16-18px body)
- **Borders**: Glassy, translucent on photo previews; sharp corners (4-6px)
- **Spacing**: 4px/8px base units
- **Elevation**: Subtle shadows for depth

---

## 🛠️ Development Commands

```bash
# Install dependencies
npm install

# Run dev server (both frontend + backend)
npm run dev

# Frontend only (http://localhost:5173)
npm run dev:frontend

# Backend only (http://localhost:3000)
npm run dev:backend

# Type check
npm run type-check

# Build both
npm run build
```

---

## 🎯 Ready for Next Phase

The foundation is solid. You can now:

1. **Start the dev server** with `npm run dev`
2. **Begin building the auth UI** (login/register forms)
3. **Create the API client** with token refresh logic
4. **Implement the contact sheet grid** component

All decisions are documented, types are shared, and both data stores support SQLite (local) and MySQL (production).

**Current Status**: Architecture & Backend Foundation Complete ✓  
**Next Phase**: Frontend Authentication UI & Navigation

---

**Questions or changes to the plan?** Let me know before we start the frontend UI work!
