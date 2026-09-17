// Kept well under Vercel's hard request-body ceiling (4.5MB on the plan this
// backend deploys to) so an oversized upload fails with our own clear
// message instead of an opaque platform-level 413. Matches
// product-documents.constants.ts's convention -- there is no shared
// generic attachment-size constant in this codebase, each feature declares
// its own.
export const MAX_REQUIREMENT_ATTACHMENT_SIZE_MB = 4;
export const MAX_REQUIREMENT_ATTACHMENT_SIZE_BYTES =
  MAX_REQUIREMENT_ATTACHMENT_SIZE_MB * 1024 * 1024;

// Fields tracked in RequirementVersion history whenever they change on
// update() or review(). Kept as a single source of truth so the diff logic
// and the human-readable field labels below stay in sync.
export const REQUIREMENT_TRACKED_FIELDS = [
  'title',
  'description',
  'type',
  'priority',
  'riskLevel',
  'ownerId',
  'releaseId',
  'status',
] as const;

export type RequirementTrackedField =
  (typeof REQUIREMENT_TRACKED_FIELDS)[number];

export const REQUIREMENT_FIELD_LABELS: Record<RequirementTrackedField, string> =
  {
    title: 'Title',
    description: 'Description',
    type: 'Type',
    priority: 'Priority',
    riskLevel: 'Risk',
    ownerId: 'Owner',
    releaseId: 'Release',
    status: 'Status',
  };
