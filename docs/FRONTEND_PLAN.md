# Frontend Development Plan

## Phase 1: Core UI Components & Auth Flow (Current)

### Setup
- [x] Initialize React + Vite + Tailwind
- [x] Create design system tokens (colors, spacing, typography)
- [ ] Set up API client (Axios wrapper with auth interceptor)
- [ ] Create auth context for managing user state and tokens
- [ ] Implement refresh token logic on client

### Authentication UI
- [ ] Landing/marketing page (explain app, call-to-action to login/register)
- [ ] Registration form with validation
- [ ] Login form with "remember me" checkbox
- [ ] Session persistence (load stored tokens, auto-login)
- [ ] Logout flow with token cleanup

### Navigation & Layout
- [ ] Main app shell (header, sidebar/nav)
- [ ] Route protection (redirect unauthenticated users)
- [ ] Top navigation with camera button placeholder, user menu, logout

## Phase 2: Photo Grid & Viewing (Next)

### Contact Sheet
- [ ] Photo grid component (masonry/responsive layout)
- [ ] Photo preview cards with glassy borders
- [ ] Hover state: larger preview + title + EXIF date
- [ ] Click to navigate to photo detail page
- [ ] Sorting (newest first default, option to sort by other fields)

### Photo Detail Page
- [ ] Large photo display (no border per spec)
- [ ] Photo title (editable)
- [ ] EXIF data panel (collapsible)
- [ ] AI description display
- [ ] User description (editable, semi-hidden)
- [ ] Tags section with add/remove functionality
- [ ] Download button
- [ ] Delete button with confirmation dialog

## Phase 3: Photo Upload & Management

- [ ] File upload component (drag-drop, click-to-browse)
- [ ] Image processing preview (show resize/format options)
- [ ] Bulk upload progress
- [ ] Photo editing basic operations
- [ ] Tagging interface

## Phase 4: Polish & Advanced Features

- [ ] Search & filtering
- [ ] Photo export (original, resized, AVIF converted)
- [ ] Bulk operations
- [ ] User settings/preferences
- [ ] Mobile responsive design refinement

## Design System Components (To Build)

- Button (primary, secondary, danger variants)
- Input (text, file, textarea)
- Modal/Dialog (confirmation, alerts)
- Toast notifications
- Loading states
- Card wrapper with glassy border
- Photo preview card
- Grid layout

## Notes

- Focus on desktop-first design
- Purple accent color (#7c3aed) for interactive elements
- Light gray backgrounds (#fafafa, #f5f5f5)
- Sharp corners (4-6px radius)
- Translucency for depth where appropriate
- Reasonable font sizes for readability
