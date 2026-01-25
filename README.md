# TCZ Web

React frontend for the TCZ (Tennis Club Zellerndorf) court reservation system.

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

## Development

### Prerequisites

- Node.js 18+
- tcz-server running on port 5001

### Setup

```bash
npm install
npm run dev
```

The app runs on http://localhost:5173. API requests are proxied to localhost:5001.

### Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |

## Deployment

Deployed via **Cloudflare Pages** (auto-builds from GitHub).

### Cloudflare Pages Settings

| Setting | Value |
|---------|-------|
| Build command | `npm run build` |
| Output directory | `dist` |
| Environment variable | `VITE_API_URL=https://woifh.pythonanywhere.com` |

## Project Structure

```
src/
├── api/           # API client and endpoint functions
├── components/    # React components
│   ├── ui/        # Reusable UI components
│   ├── layout/    # Layout components
│   └── features/  # Domain-specific components
├── hooks/         # Custom React hooks
├── pages/         # Page components (routes)
├── stores/        # React Context providers
├── types/         # TypeScript interfaces
└── utils/         # Helper functions
```

## Related Projects

| Project | Description |
|---------|-------------|
| [tcz-server](https://github.com/woifh/tcz-server) | Flask backend API |
| [tcz-ios](https://github.com/woifh/tcz-ios) | iOS app |
| [tcz-android](https://github.com/woifh/tcz-android) | Android app |
