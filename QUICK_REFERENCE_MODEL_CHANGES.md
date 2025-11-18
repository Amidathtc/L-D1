# Quick Reference - Model Changes

## Service Method Refactoring

### OptimizedQueryService
```typescript
// BEFORE → AFTER
getUsersWithBranch() → getUsersWithRelations()
getCustomersWithRelations() → getUnionMembersWithRelations()
getBranchesWithStats() → getUnionsWithStats()
```

### DocumentService
```typescript
// BEFORE → AFTER
uploadCustomerDocument() → uploadUnionMemberDocument()
getCustomerDocuments() → getUnionMemberDocuments()

// Parameter changes
type: "customer" → type: "unionMember"
```

### Parameter Renames Across Services
```typescript
// BEFORE → AFTER
branchId → unionId
customerId → unionMemberId
assignedOfficerId → (removed - not used in new schema)
currentOfficerId → currentOfficerId (still valid on UnionMember)

// Function parameter types
type: "customer" | "loan" → type: "unionMember" | "loan"
```

## Model Hierarchy

```
User (supervisors)
├── UnionMember (many per union)
│   ├── UnionMemberDocument
│   ├── UnionMemberReassignment
│   └── Loan
│       ├── RepaymentScheduleItem
│       ├── Repayment
│       └── LoanDocument
└── Union (managed by credit officer)
    └── UnionAssignmentHistory
```

## Critical Fixes

1. **Union model**: 
   - Does NOT have `code` field (only `location`)
   - Does NOT have `manager` field (has `creditOfficer`)
   - No `loan` relation (one-to-many handled via Loan.unionId)

2. **UnionMember model**:
   - HAS `code` field (unique identifier)
   - Is linked to Union via `unionId`
   - Has `currentOfficer` optional relation

3. **Loan model**:
   - Does NOT have `assignedOfficer` or `createdBy` relations
   - Links to UnionMember via `unionMemberId`
   - Links to Union via `unionId`

4. **Documents**:
   - `CustomerDocument` → `UnionMemberDocument`
   - File system operations removed from delete methods

## Deployment Checklist
- [ ] All services compile without errors ✅
- [ ] Update controller references
- [ ] Update API route handlers
- [ ] Update frontend models/types
- [ ] Database migration complete
- [ ] Test all CRUD operations
- [ ] Test filtered queries
- [ ] Test dashboard statistics
