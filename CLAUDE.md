# CLAUDE.md — TCZ Web (React Frontend)

This file contains React frontend-specific guidance.
Shared rules (git, production, vibe coding) are in `/Users/woifh/tcz/CLAUDE.md`.

---

## Project Overview

React + TypeScript frontend for the TCZ (Tennis Club Zellerndorf) reservation system.
Communicates with tcz-server Flask backend via REST API.

---

## Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 19 | UI framework |
| TypeScript | 5 | Type safety |
| Vite | 7 | Build tool & dev server |
| TanStack Query | 5 | Server state management |
| React Router | 7 | Client-side routing |
| Tailwind CSS | 3 | Styling |
| Axios | 1 | HTTP client |
| Playwright | - | E2E testing |

---

## Project Structure

```
tcz-web/
├── src/
│   ├── api/           # API client and endpoint functions
│   │   ├── client.ts  # Axios instance with auth
│   │   └── auth.ts    # Auth endpoints
│   ├── components/
│   │   ├── ui/        # Reusable UI components
│   │   ├── layout/    # Layout components
│   │   └── features/  # Domain-specific components
│   ├── hooks/         # Custom React hooks
│   ├── pages/         # Page components (routes)
│   ├── stores/        # React Context providers
│   │   └── AuthContext.tsx
│   ├── types/         # TypeScript interfaces
│   │   └── index.ts   # All type definitions
│   └── utils/         # Helper functions
├── e2e/               # Playwright E2E tests
├── vite.config.ts     # Vite configuration
└── tailwind.config.js # Tailwind configuration
```

---

## Authentication

### Strategy: JWT in httpOnly Cookie

- **Login**: POST `/auth/login/api` returns user data and sets `jwt_token` httpOnly cookie
- **Logout**: POST `/auth/logout/api` clears the cookie
- **API calls**: Axios automatically sends cookies with `withCredentials: true`
- **No localStorage**: JWT is never exposed to JavaScript (XSS protection)

### Cookie Configuration

| Setting | Value | Notes |
|---------|-------|-------|
| httpOnly | true | Not accessible via JavaScript |
| SameSite | Lax | CSRF protection |
| Secure | true (prod) | HTTPS only in production |
| Max-Age | 30 days | Matches JWT expiry |

### AuthContext Usage

```typescript
import { useAuth } from '../stores/AuthContext';

function MyComponent() {
  const { user, login, logout, isLoading } = useAuth();

  // user is null if not authenticated
  // isLoading is true while checking session
}
```

---

## API Communication

### API Client (`src/api/client.ts`)

```typescript
import api from './api/client';

// GET request
const response = await api.get('/api/endpoint');

// POST request
const response = await api.post('/api/endpoint', { data });
```

### Error Handling

The client automatically redirects to `/login` on 401 errors.

```typescript
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
```

---

## Development Setup

### Prerequisites

1. Node.js 18+
2. tcz-server running on port 5001

### Running Locally

```bash
# Start tcz-server (in tcz-server directory)
source .venv/bin/activate && flask run --host=0.0.0.0 --port=5001

# Start tcz-web (in this directory)
npm run dev
```

React app runs on http://localhost:5173

### API Proxy

Vite proxies API requests to Flask:
- `/api/*` → `http://localhost:5001`
- `/auth/*` → `http://localhost:5001`

---

## Build Commands

```bash
npm run dev        # Start dev server
npm run build      # Production build
npm run preview    # Preview production build
npm run lint       # Run ESLint
```

---

## State Management

### Server State: TanStack Query

For data that comes from the API (reservations, members, availability):

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Fetching data
const { data, isLoading } = useQuery({
  queryKey: ['availability', date],
  queryFn: () => fetchAvailability(date),
});

// Mutations with cache invalidation
const queryClient = useQueryClient();
const mutation = useMutation({
  mutationFn: createReservation,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['availability'] });
  },
});
```

### UI State: React Context

For UI-only state (auth, modals, theme):

```typescript
// Create context in stores/
// Use React.createContext + useReducer for complex state
// Use React.createContext + useState for simple state
```

---

## Styling

### Tailwind CSS

Tailwind v3 is configured to match tcz-server's color scheme:

```javascript
// tailwind.config.js
colors: {
  'court-available': '#10b981',  // green-500
  'court-reserved': '#ef4444',   // red-500
  'court-blocked': '#6b7280',    // gray-500
}
```

### Usage

```tsx
<div className="bg-court-available text-white p-4 rounded">
  Available
</div>
```

---

## Type Definitions

TypeScript interfaces in `src/types/index.ts` match tcz-server models:

| Interface | Description |
|-----------|-------------|
| `Member` | User profile data |
| `Reservation` | Booking data |
| `Block` | Court block data |
| `Court` | Court data |
| `SlotAvailability` | Dashboard slot state |

---

## Testing

### E2E Tests (Playwright)

```bash
npx playwright test           # Run all tests
npx playwright test --ui      # Interactive mode
npx playwright test --debug   # Debug mode
```

### Test Structure

```
e2e/
├── auth.spec.ts        # Login/logout flows
├── booking.spec.ts     # Reservation flows
└── dashboard.spec.ts   # Dashboard tests
```

---

## Related Projects

| Project | Path | Relationship |
|---------|------|--------------|
| tcz-server | `/Users/woifh/tcz/tcz-server` | Backend API |
| tcz-ios | `/Users/woifh/tcz/tcz-ios` | iOS app (same API) |
| tcz-android | `/Users/woifh/tcz/tcz-android` | Android app (same API) |

---

## Versioning

| Setting | Value |
|---------|-------|
| CHANGELOG | `CHANGELOG.md` (to be created) |
| Version file | `package.json` |
| Test command | `npm run lint && npx playwright test` |

**Note:** This project does not yet have a CHANGELOG.md or git repository configured.

---

## Key Files

| File | Purpose |
|------|---------|
| `vite.config.ts` | Dev server & proxy config |
| `src/api/client.ts` | Axios instance |
| `src/stores/AuthContext.tsx` | Auth state management |
| `src/types/index.ts` | TypeScript interfaces |
| `tailwind.config.js` | Tailwind theme |
