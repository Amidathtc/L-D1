# Backend Refactoring Implementation Plan

## Overview
This document outlines the systematic approach to complete the Branch → Union refactoring across the L-D1 backend.

## Completed Items ✓
1. **Prisma Schema Updated**
   - Removed `Branch` model and all related models (`BranchTransfer`, `BranchAnalytics`)
   - Created new `Union` model with `creditOfficerId` relation
   - Renamed `Customer` → `UnionMember`
   - Renamed `CustomerDocument` → `UnionMemberDocument`  
   - Renamed `CustomerReassignment` → `UnionMemberReassignment`
   - Renamed `LoanAssignmentHistory` → `UnionAssignmentHistory`
   - Updated `Role` enum: `BRANCH_MANAGER` → `SUPERVISOR`
   - Added `supervisorId` to User model for supervisor hierarchy
   - Updated Loan model: removed `branchId`, `createdByUserId`, `assignedOfficerId`; added `unionId`
   - Regenerated Prisma Client

2. **Middleware & Auth Updated**
   - Updated `auth.middleware.ts` to use `supervisorId` instead of `branchId`
   - Updated `role.middleware.ts` to use `SUPERVISOR` instead of `BRANCH_MANAGER`
   - Added backward compatibility exports

3. **Union Management Created**
   - Created `union.service.ts` with full CRUD and management logic
   - Created `union.controller.ts` with all HTTP endpoints
   - Created `union.routes.ts` with proper routing
   - Added union routes to `routes/index.ts`

## Remaining Work

### Phase 1: Customer → UnionMember Refactoring

#### 1.1 Create union-member.service.ts
- Rename and adapt `customer.service.ts`
- Key changes:
  - Replace `branchId` with `unionId`
  - Remove `currentOfficerId` references (get from union)
  - Update create/update/delete methods
  - Update filtering and access control

#### 1.2 Create union-member.controller.ts
- Rename and adapt `customer.controller.ts`
- Update all endpoint handlers

#### 1.3 Create union-member.routes.ts
- Rename and adapt `customer.routes.ts`
- Mount at `/union-members` or `/members`

#### 1.4 Update Routes Index
- Remove old customer routes
- Add new union-member routes

### Phase 2: Loan Service Refactoring

#### 2.1 Update loan.service.ts
- Remove all `branchId` field handling
- Remove `createdByUserId` and `assignedOfficerId` fields
- Add `unionId` field handling
- Update create loan logic:
  ```
  - Validate union exists
  - Get credit officer from union.creditOfficerId
  - Get customer (UnionMember)
  - Ensure customer belongs to the union
  ```
- Update access control:
  - Credit officers can only see loans for their unions
  - Supervisors can see loans for unions under their credit officers
  - Admins can see all loans

#### 2.2 Update loan.controller.ts
- Update all endpoint handlers to work with new service

### Phase 3: History & Reassignment Services

#### 3.1 Create union-assignment-history.service.ts
- Replaces functionality from `assignment-history.service.ts`
- Tracks union assignments to credit officers

#### 3.2 Create union-member-reassignment.service.ts
- Replaces functionality from reassignment logic
- Tracks union member movements between unions

### Phase 4: Document Service Refactoring

#### 4.1 Update document.service.ts
- Replace `CustomerDocument` with `UnionMemberDocument`
- Update all references and relations

### Phase 5: User Service Refactoring

#### 5.1 Complete user.service.ts Update
- Replace `branchId` with `supervisorId`
- Update permission logic for supervisor hierarchy:
  - Admins: full access
  - Supervisors: manage their credit officers
  - Credit officers: view their unions and members
- Remove branch-related validation

### Phase 6: Cleanup & Deletion

#### 6.1 Delete Branch-Related Files
- `branch.service.ts` and controller
- `branch.routes.ts`
- `branch-transfer.service.ts` and controller
- `branch-transfer.routes.ts`
- `branch-analytics.service.ts` and controller
- `branch-analytics.routes.ts`

#### 6.2 Delete Assignment History Files (if replaced)
- Old `assignment-history.service.ts`
- Old `assignment-history.controller.ts`
- Old `assignment-history.routes.ts`

### Phase 7: Type & Validator Updates

#### 7.1 Update types/
- Remove `Branch` related types
- Add `Union` types
- Replace `Customer` types with `UnionMember` types
- Update role types (BRANCH_MANAGER → SUPERVISOR)

#### 7.2 Update validators/
- Update validation schemas for new models

### Phase 8: Database Migration

#### 8.1 Create Migration
```bash
npx prisma migrate dev --name migrate_branch_to_union_hierarchy
```

#### 8.2 Data Migration Steps
This will require careful planning:
1. Create unions for each branch
2. Assign branch managers to supervise credit officers
3. Copy branch members to union members
4. Copy branch loans to union loans
5. Update assignment history records

## File Change Summary

### To Create
- `src/service/union-member.service.ts`
- `src/service/union-assignment-history.service.ts`
- `src/service/union-member-reassignment.service.ts`
- `src/controllers/union-member.controller.ts`
- `src/controllers/union-assignment-history.controller.ts`
- `src/routes/union-member.routes.ts`
- `src/routes/union-assignment-history.routes.ts`
- `prisma/migrations/[timestamp]_migrate_branch_to_union_hierarchy/migration.sql`

### To Update
- `src/service/loan.service.ts` (remove branch/creator/officer refs, add unionId)
- `src/service/user.service.ts` (supervisor hierarchy)
- `src/service/document.service.ts` (UnionMemberDocument)
- `src/controllers/loan.controller.ts`
- `src/controllers/user.controller.ts`
- `src/controllers/document.controller.ts`
- `src/routes/loan.routes.ts`
- `src/routes/user.routes.ts`
- `src/routes/index.ts`
- `src/types/` (all type definitions)
- `src/validators/` (validation schemas)

### To Delete
- `src/service/branch.service.ts`
- `src/service/branch-transfer.service.ts`
- `src/service/branch-analytics.service.ts`
- `src/service/assignment-history.service.ts` (if fully replaced)
- `src/controllers/branch.controller.ts`
- `src/controllers/branch-transfer.controller.ts`
- `src/controllers/branch-analytics.controller.ts`
- `src/controllers/assignment-history.controller.ts` (if fully replaced)
- `src/routes/branch.routes.ts`
- `src/routes/branch-transfer.routes.ts`
- `src/routes/branch-analytics.routes.ts`
- `src/routes/assignment-history.routes.ts` (if fully replaced)

## Testing Checklist

After all updates:
1. ✓ TypeScript compilation passes
2. ✓ No branch references remain in active code
3. ✓ All imports updated
4. ✓ Database migration runs successfully
5. ✓ Sample API calls work with new structure
6. ✓ Permission checks work correctly with hierarchy
7. ✓ Audit logs work with new entities

## Notes

- Maintain backward compatibility where possible
- All changes should respect the new hierarchy:
  - Admin > Supervisor > Credit Officer
  - Credit Officer manages multiple Unions
  - Each Union has a group of UnionMembers
  - Loans are tied to UnionMembers and Unions

- The system no longer tracks which officer *created* a loan, only which union it belongs to
- Access control is now based on union assignment, not branch assignment
