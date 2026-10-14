# Security Specification - Mafia Streets

## Data Invariants
1. A user profile cannot be created by someone else. `uid` must match `request.auth.uid`.
2. `cleanMoney`, `dirtyMoney`, `bankBalance` can only be updated if specific conditions are met (e.g., job completion, heist).
3. Chat messages must have correct `senderId`.
4. Role 'Admin' cannot be self-assigned.
5. `createdAt` and `updatedAt` timestamps must be validated against `request.time`.

## The "Dirty Dozen" Payloads
1. **Identity Spoofing**: Attempting to create a user profile for a different `uid`.
2. **Privilege Escalation**: Attempting to set `role: 'Admin'` during profile creation.
3. **Ghost Field Update**: Attempting to update a user profile with an extra field `isPro: true`.
4. **ID Poisoning**: Attempting to use a 2MB string as a `projectId` or `userId`.
5. **Money Injection**: Attempting to update `cleanMoney` to a huge value without authorization.
6. **Chat Spoofing**: Sending a chat message with a different `senderId`.
7. **Bounty Hijacking**: Attempting to delete a bounty created by someone else.
8. **Militia Takeover**: Attempting to change the leader of a militia without being the current leader.
9. **Timestamp Manipulation**: Sending a `createdAt` date from the future.
10. **Terminal State Bypass**: Attempting to change the status of a 'completed' trade contract.
11. **PII Leak**: Attempting to read another user's private data (if any).
12. **Recursive Cost Attack**: Making a complex list query that consumes excessive resources.

## The Test Runner
(This would be `firestore.rules.test.ts` if we had a local test environment, but we will emulate the logic in the rules themselves).
