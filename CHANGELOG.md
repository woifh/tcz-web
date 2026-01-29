# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Removed
- Admin calendar view feature (monthly block overview)

### Fixed
- Profile pictures not loading on Cloudflare Pages deployment (cross-origin URL fix)
- Block reasons: "Temporary" checkbox now hidden when editing (setting is immutable after creation)
- Dashboard slot colors now consistent across themes (use explicit hex values)
- Safari login: Switch from httpOnly cookies to Authorization header (Safari ITP blocks cross-origin cookies)

## [1.0] - 2026-01-28

### Added
- Court blocking: Reservation conflict confirmation - shows affected reservations before cancelling
- Court blocking: Visual indicator (Layers icon) when temp block suspends a regular block
- Court blocking: Block conflict detection with detailed error display
- Court blocking: Search and filter for upcoming blocks

### Changed
- Migrate UI to shadcn/ui-style design system (Radix UI, CVA, Tailwind)
- Add design tokens and theming system with dark mode support
- Redesign profile page with modern card-based layout (profile card, form sections, toggle switches)
- Increased navigation icon sizes for better visibility

### Fixed
- Calendar navigation flicker when navigating past the last visible day
- Profile page not displaying user data (API response parsing fix)
- Reduced redundant API calls on profile page by unifying React Query caching
- Fixed profile picture cache busting (now uses version instead of timestamp)
