import { NotFoundException } from '@nestjs/common';

// Enforces organization-level data isolation. A user with no organization
// assigned is unscoped -- sees across every organization, matching today's
// behavior for every existing user, since User.organizationId is nullable
// and not backfilled. A user WITH an organization assigned can only see
// resources belonging to that same organization. Throws NotFoundException
// (not Forbidden) so a cross-organization UUID guess doesn't confirm the
// resource exists elsewhere.
export function assertSameOrganization(
  actorOrganizationId: string | null,
  resourceOrganizationId: string | null,
  notFoundMessage: string,
): void {
  if (actorOrganizationId && actorOrganizationId !== resourceOrganizationId) {
    throw new NotFoundException(notFoundMessage);
  }
}

// Spread into a Prisma `where` clause for models with a direct
// organizationId column (Project, Product, Organization itself).
export function organizationScopeWhere(
  actorOrganizationId: string | null,
): { organizationId: string } | Record<string, never> {
  return actorOrganizationId ? { organizationId: actorOrganizationId } : {};
}

// Spread into a Prisma `where` clause for models scoped to a product rather
// than directly to an organization (Requirement, TestPlan, Defect, ...).
export function productOrganizationScopeWhere(
  actorOrganizationId: string | null,
): { product: { organizationId: string } } | Record<string, never> {
  return actorOrganizationId
    ? { product: { organizationId: actorOrganizationId } }
    : {};
}

// Same idea, for models whose path to an organization is nested deeper than
// one hop (e.g. TestCase -> testScenario -> product -> organizationId).
// `buildWhere` gets the actor's organizationId and returns the relation
// filter shaped for that model; called only when the actor is scoped.
export function nestedOrganizationScopeWhere<T extends Record<string, unknown>>(
  actorOrganizationId: string | null,
  buildWhere: (organizationId: string) => T,
): T | Record<string, never> {
  return actorOrganizationId ? buildWhere(actorOrganizationId) : {};
}
