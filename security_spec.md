# Security Specification (`security_spec.md`)

## 1. Data Invariants

1. **Zero-Trust Default Deny**: Every path not explicitly matched is denied via `match /{document=**} { allow read, write: if false; }`.
2. **Verified Identity Enforcement**: Every write operation across all collections requires `request.auth != null && request.auth.token.email_verified == true`.
3. **Path Variable Hardening**: Every single-document target operation (`get`, `create`, `update`, `delete`) validates the document ID with `isValidId(id)` (`id is string && id.size() >= 1 && id.size() <= 128 && id.matches('^[a-zA-Z0-9_\\-]+$')`).
4. **Parent Existence Invariant (Global Consistency)**: No record in `/meals/{mealId}`, `/workouts/{workoutId}`, `/weights/{weightId}`, `/todos/{todoId}`, or `/dailyMetrics/{metricId}` can be created unless the parent `/users/$(incoming().userId)` document exists (`exists(/databases/$(database)/documents/users/$(incoming().userId))`) and `incoming().userId == request.auth.uid`.
5. **Strict Key Allowlisting (Anti-Shadow-Update)**: Every `create` checks `hasAll` and `hasOnly` for exact schema keys. Every `update` wraps the entire rule in `isValid[Entity](incoming())`, enforces immutable fields (`uid`/`userId`, `createdAt`), validates `incoming().updatedAt == request.time`, and restricts modified keys via `incoming().diff(existing()).affectedKeys().hasOnly(...)`.
6. **Secure List Queries (Query Enforcer)**: Every `allow list` rule enforces `isSignedIn() && existing().userId == request.auth.uid` without any `get()` or `exists()` calls inside `list`.

---

## 2. The "Dirty Dozen" Payloads

1. **Unverified Email Write**: Authenticated user with `email_verified: false` attempts to create `/users/user_1`.
2. **Identity Spoofing on Profile**: User `user_1` attempts to create `/users/user_2` or set `uid: "user_2"`.
3. **Orphaned Child Record**: User `user_1` attempts to create `/meals/meal_1` before `/users/user_1` exists.
4. **Shadow Field Injection on Create**: User `user_1` creates `/meals/meal_1` with an undeclared field `"isAdmin": true`.
5. **Shadow Field Injection on Update**: User `user_1` updates `/users/user_1` adding `"role": "admin"`.
6. **Immutable Field Mutation**: User `user_1` updates `/meals/meal_1` changing `userId` or `createdAt`.
7. **Forged Client Timestamp**: User `user_1` creates or updates `/weights/weight_1` with a past/future `createdAt` or `updatedAt` != `request.time`.
8. **Value Poisoning (Out-of-Bounds Numeric)**: User `user_1` updates `/users/user_1` with `currentWeightKg: 99999` or `age: -5`.
9. **String Overflow (Denial of Wallet)**: User `user_1` creates `/todos/todo_1` with a 5,000-character `title`.
10. **ID Poisoning Attack**: User `user_1` creates a document with non-alphanumeric characters or >128 chars in `{mealId}`.
11. **Cross-Tenant Read/Get**: User `user_2` attempts `get` on `/weights/weight_owned_by_user_1`.
12. **Unfiltered List Scraping**: User `user_2` attempts `list` on `/meals` without filtering `where('userId', '==', 'user_2')`.
