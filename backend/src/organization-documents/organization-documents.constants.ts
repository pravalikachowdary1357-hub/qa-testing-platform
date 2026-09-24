// Kept well under Vercel's hard request-body ceiling (4.5MB on the plan this
// backend deploys to) so an oversized upload fails with our own clear
// message instead of an opaque platform-level 413.
export const MAX_ORGANIZATION_DOCUMENT_FILE_SIZE_MB = 4;
export const MAX_ORGANIZATION_DOCUMENT_FILE_SIZE_BYTES = MAX_ORGANIZATION_DOCUMENT_FILE_SIZE_MB * 1024 * 1024;
