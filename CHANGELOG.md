# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Changed
- Redesign profile page with modern card-based layout (profile card, form sections, toggle switches)
- Increased navigation icon sizes for better visibility

### Fixed
- Calendar navigation flicker when navigating past the last visible day
- Profile page not displaying user data (API response parsing fix)
- Reduced redundant API calls on profile page by unifying React Query caching
- Fixed profile picture cache busting (now uses version instead of timestamp)
