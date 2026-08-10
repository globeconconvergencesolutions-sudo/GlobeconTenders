export const ORG_STATUS_ACTIVE = "active";
export const ORG_STATUS_SUSPENDED = "suspended";
export const ORG_STATUS_TRIAL_EXPIRED = "trial_expired";

export type OrgStatus =
  | typeof ORG_STATUS_ACTIVE
  | typeof ORG_STATUS_SUSPENDED
  | typeof ORG_STATUS_TRIAL_EXPIRED;

export function orgAllowsLogin(status: string): boolean {
  return status === ORG_STATUS_ACTIVE || status === ORG_STATUS_TRIAL_EXPIRED;
}

export function orgAllowsSync(status: string): boolean {
  return status === ORG_STATUS_ACTIVE;
}

export function orgAllowsWrites(status: string): boolean {
  return status === ORG_STATUS_ACTIVE;
}
