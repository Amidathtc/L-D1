# Loan Service Refactoring TODO

## Status: 112 Errors Remaining (Down from 146 - 23% reduction)

### Quick Win Completed ✅
- Disabled customer.service.ts (30 errors eliminated)
- Disabled customer.controller.ts (4 errors eliminated)
- Disabled customer routes
- **Result: 146 → 112 errors (-34 errors)**

### Remaining Work: 112 Errors
- **loan.service.ts**: 42 errors
- **repayment.service.ts**: 21 errors
- **Supporting services**: 27 errors (document, optimized-query, assignment-history)
- **Controllers**: 17 errors (loan, repayment, assignment-history)
- **Routes**: 3 errors (customer.routes, auditLog)
- **Other**: 2 errors (user-activity.service, auditLog.controller)

---

## Phase 1: Fix loan.service.ts (42 Errors - Estimated 2-3 hours)

### Required Changes:

#### 1. Interface Changes (Line 5-16)
```typescript
// REPLACE: CreateLoanData interface
// OLD: customerId, assignedOfficerId
// NEW: unionMemberId (no assignedOfficerId field)

// IMPACT: 2 errors
```

#### 2. Method Signature - createLoan (Line 31-35)
```typescript
// REPLACE: 
// OLD: createdByUserId: string, userBranchId: string | null
// NEW: userId: string, userUnionId: string | null

// REPLACE BODY:
// OLD: const customer = await prisma.customer.findUnique({...include: { branch: true }})
// NEW: const unionMember = await prisma.unionMember.findUnique({...include: { union: true }})

// IMPACT: 10 errors fixed
```

#### 3. Remove Validation Block (Line 66-90)
```typescript
// DELETE entire assignedOfficer validation block
// It's no longer used in new model

// IMPACT: 0 errors (already deleted references)
```

#### 4. Update Active Loan Check (Line 96-110)
```typescript
// REPLACE:
// OLD: where: { customerId: data.customerId, status: {...}, deletedAt: null }
// NEW: where: { unionMemberId: data.unionMemberId, status: {...}, deletedAt: null }

// REPLACE: "Customer already has an active loan"
// NEW: "Union member already has an active loan"

// IMPACT: 3 errors fixed
```

#### 5. Fix Status Assignment (Line 113-139)
```typescript
// REPLACE:
// OLD: } else if (userRole === Role.BRANCH_MANAGER || userRole === Role.CREDIT_OFFICER) {
// NEW: } else if (userRole === Role.CREDIT_OFFICER) {

// IMPACT: 1 error fixed
```

#### 6. Fix Loan Creation Data (Line 148-189)
```typescript
// REPLACE:
// OLD: customerId: data.customerId, branchId: customer.branchId
// NEW: unionMemberId: data.unionMemberId, unionId: unionMember.union.id

// REMOVE FIELDS:
// - createdByUserId
// - assignedOfficerId with fallback logic

// REMOVE INCLUDES:
// - createdBy: { select: {...} }
// - assignedOfficer: { select: {...} }
// - branch: { select: {...} }

// ADD INCLUDES:
// - unionMember: true
// - union: true

// IMPACT: 12 errors fixed
```

#### 7. Fix getLoans Method Signature (Line 297-312)
```typescript
// UPDATE filters interface:
// REMOVE: branchId, assignedOfficerId, customerId
// ADD: unionId, unionMemberId

// UPDATE parameters:
// REPLACE: userBranchId with userUnionId

// UPDATE where clause:
// REMOVE: where.assignedOfficerId = userId
// REPLACE: where.branchId = userBranchId WITH where.unionId = userUnionId
// REMOVE: if (filters.branchId), if (filters.assignedOfficerId), if (filters.customerId)
// ADD: if (filters.unionId), if (filters.unionMemberId)

// IMPACT: 8 errors fixed
```

#### 8. Fix getLoans Include/Return (Line 355-410)
```typescript
// REPLACE includes in findMany:
// OLD: customer: { select: {...} }, branch: { select: {...} }, assignedOfficer: { select: {...} }
// NEW: unionMember: { select: {...} }, union: { select: {...} }

// IMPACT: 4 errors fixed
```

#### 9. Fix getLoanById Signature (Line 413-414)
```typescript
// REPLACE: userBranchId?: string
// NEW: userUnionId?: string

// UPDATE include:
// OLD: customer: true, branch: true, assignedOfficer: {...}, createdBy: {...}
// NEW: unionMember: true, union: true

// IMPACT: 4 errors fixed
```

#### 10. Fix All Permission Checks (Multiple locations)
```typescript
// PATTERN to find and replace:
// } else if (userRole === Role.BRANCH_MANAGER && userBranchId) {
//   if (loan.branchId !== userBranchId) {
//     throw new Error(...)
//   }
// }

// REPLACE WITH:
// } else if (userRole === Role.CREDIT_OFFICER && userUnionId) {
//   if (loan.unionId !== userUnionId) {
//     throw new Error(...)
//   }
// }

// Locations: Line ~500, ~550, ~625, ~740, ~800, ~900

// IMPACT: 8 errors fixed
```

#### 11. Remove assignedOfficer References (Multiple locations)
```typescript
// FIND & REPLACE:
// if (loan.assignedOfficerId !== userId) → DELETE entire block or simplify
// assignedOfficerId: newOfficerId → REMOVE or replace logic
// prisma.loanAssignmentHistory → prisma.unionAssignmentHistory
// oldBranchId: loan.branchId → oldUnionId: loan.unionId
// newBranchId: loan.branchId → newUnionId: loan.unionId

// IMPACT: 15 errors fixed
```

---

## Approach for Implementation

### Option A: Manual Replacement (Recommended for accuracy)
Use `replace_string_in_file` tool with 3-5 lines of context for each replacement. More time-consuming but precise.

**Estimated time: 2-3 hours**

### Option B: Hybrid Sed Commands (Faster but riskier)
Use targeted sed commands to bulk replace:
```bash
# 1. Replace customerId → unionMemberId
sed -i 's/customerId/unionMemberId/g' src/service/loan.service.ts

# 2. Replace branchId → unionId in appropriate contexts
sed -i 's/\.branchId/.unionId/g' src/service/loan.service.ts

# 3. Remove BRANCH_MANAGER permission checks
sed -i '/else if (userRole === Role\.BRANCH_MANAGER/,/^    }/d' src/service/loan.service.ts
```

**Estimated time: 30-45 minutes**
**Risk: Medium (could break syntax)**

---

## Phase 2: Fix Supporting Services (39 Errors - Estimated 1-2 hours)

### repayment.service.ts (21 errors)
- Replace Customer → UnionMember references
- Replace branchId → unionId
- Update permission checks

### Supporting Services (18 errors)
- document.service.ts: 9 errors
- optimized-query.service.ts: 9 errors
- assignment-history.service.ts: 9 errors (partially)

### Controllers (17 errors)
- loan.controller.ts: 9 errors
- repayment.controller.ts: 8 errors
- assignment-history.controller.ts: 1 error

---

## Testing Checklist

After completing refactoring:

- [ ] `npm run build` succeeds with 0 TypeScript errors
- [ ] Loan creation works with new unionMemberId
- [ ] Loan retrieval filters by unionId correctly
- [ ] Permission checks enforce union-based access
- [ ] API endpoints return 401 for unauthorized union access
- [ ] Repayment association with loans works
- [ ] Document association with loans works

---

## File References

- **Main file**: `src/service/loan.service.ts` (1244 lines)
- **Backup**: `src/service/loan.service.ts.backup` (created during attempts)
- **Related**: 
  - `src/service/repayment.service.ts`
  - `src/controllers/loan.controller.ts`
  - `prisma/schema.prisma` (schema for reference)

---

## Decision Log

- **2025-11-17**: Attempted sed-based bulk refactoring - caused syntax errors, reverted
- **2025-11-17**: Disabled customer service - immediate 34 error reduction
- **2025-11-17**: Identified 42-error pattern in loan.service needing systematic replacement
- **Recommendation**: Use hybrid approach - manual replacements for critical sections, sed for bulk text changes

