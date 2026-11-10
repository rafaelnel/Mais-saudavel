/**
 * Hardened Firestore Rules Test Suite (Dirty Dozen Verification)
 */
export interface DirtyDozenTestCase {
  id: number;
  name: string;
  collection: string;
  docId: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  auth: { uid: string; email_verified: boolean } | null;
  payload?: Record<string, unknown>;
  expectedResult: 'PERMISSION_DENIED';
}

export const DIRTY_DOZEN_TESTS: DirtyDozenTestCase[] = [
  {
    id: 1,
    name: 'Unverified Email Write',
    collection: 'users',
    docId: 'user_1',
    operation: 'create',
    auth: { uid: 'user_1', email_verified: false },
    payload: { uid: 'user_1', displayName: 'Rafael' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 2,
    name: 'Identity Spoofing on Profile',
    collection: 'users',
    docId: 'user_2',
    operation: 'create',
    auth: { uid: 'user_1', email_verified: true },
    payload: { uid: 'user_2', displayName: 'Spoofed' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 3,
    name: 'Orphaned Child Record Without User Profile',
    collection: 'meals',
    docId: 'meal_orphan',
    operation: 'create',
    auth: { uid: 'user_no_profile', email_verified: true },
    payload: { userId: 'user_no_profile', name: 'Arroz e Frango' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 4,
    name: 'Shadow Field Injection on Create',
    collection: 'meals',
    docId: 'meal_shadow',
    operation: 'create',
    auth: { uid: 'user_1', email_verified: true },
    payload: { userId: 'user_1', isAdmin: true },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 5,
    name: 'Shadow Field Injection on Update',
    collection: 'users',
    docId: 'user_1',
    operation: 'update',
    auth: { uid: 'user_1', email_verified: true },
    payload: { role: 'superadmin' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 6,
    name: 'Immutable Field Mutation (userId / createdAt)',
    collection: 'meals',
    docId: 'meal_1',
    operation: 'update',
    auth: { uid: 'user_1', email_verified: true },
    payload: { userId: 'user_2' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 7,
    name: 'Forged Client Timestamp',
    collection: 'weights',
    docId: 'weight_1',
    operation: 'create',
    auth: { uid: 'user_1', email_verified: true },
    payload: { userId: 'user_1', createdAt: '1999-01-01T00:00:00Z' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 8,
    name: 'Value Poisoning Out-of-Bounds Weight',
    collection: 'users',
    docId: 'user_1',
    operation: 'update',
    auth: { uid: 'user_1', email_verified: true },
    payload: { currentWeightKg: 99999 },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 9,
    name: 'String Overflow on Todo Title',
    collection: 'todos',
    docId: 'todo_1',
    operation: 'create',
    auth: { uid: 'user_1', email_verified: true },
    payload: { userId: 'user_1', title: 'A'.repeat(500) },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 10,
    name: 'ID Poisoning Attack',
    collection: 'workouts',
    docId: 'invalid id with spaces and $ymbols!',
    operation: 'create',
    auth: { uid: 'user_1', email_verified: true },
    payload: { userId: 'user_1' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 11,
    name: 'Cross-Tenant Get Request',
    collection: 'weights',
    docId: 'weight_user_1',
    operation: 'get',
    auth: { uid: 'user_2', email_verified: true },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 12,
    name: 'Unfiltered Cross-Tenant List Scraping',
    collection: 'meals',
    docId: '*',
    operation: 'list',
    auth: { uid: 'user_2', email_verified: true },
    expectedResult: 'PERMISSION_DENIED',
  },
];
