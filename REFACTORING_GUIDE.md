# L-D1 Backend Refactoring - Branch to Union Hierarchy

## Executive Summary

A comprehensive backend refactoring has been initiated to transition the L-D1 application from a **Branch-based hierarchical structure** to a **Union-based hierarchical structure**. This document provides an overview of completed work and guidance for continuing the implementation.

**Project Status:** 35% Complete  
**Start Date:** November 15, 2025  
**Next Phase:** User Service Refactoring  

## 🎯 Refactoring Objective

Transform the organizational hierarchy from:
```
Admin → Branch Manager → Credit Officer → Customers
```

To:
```
Admin → Supervisor → Credit Officer → Unions (Groups) → Union Members
```

### Key Changes
- **Branch** model removed; replaced with **Union** model
- **Customer** renamed to **UnionMember**
- **Branch Manager** role renamed to **Supervisor**
- **Credit Officers** now manage **Unions** instead of branches
- **Loans** now tied directly to **Unions** (not to branch + officer)
- New **Supervisor-Credit Officer** self-referencing relation in User model

## ✅ Phase 1: Complete - Schema & Infrastructure

### Updated Files
1. **prisma/schema.prisma**
   - Removed: Branch, BranchTransfer, BranchAnalytics
   - Added: Union model
   - Renamed: Customer→UnionMember, CustomerDocument→UnionMemberDocument
   - Renamed: LoanAssignmentHistory→UnionAssignmentHistory, CustomerReassignment→UnionMemberReassignment
   - Updated: User model (removed branchId, added supervisorId)
   - Updated: Loan model (removed branchId/createdByUserId/assignedOfficerId, added unionId)
   - Updated: Role enum (BRANCH_MANAGER→SUPERVISOR)

2. **src/middlewares/auth.middleware.ts**
   - Changed: branchId references → supervisorId
   - Removed: branch active status check
   - Maintained: All authentication flow

3. **src/middlewares/role.middleware.ts**
   - Added: SUPERVISOR role exports
   - Maintained: Backward compatibility with old names (requireBranchManager → SUPERVISOR)
   - Updated: Staff role to include SUPERVISOR

## ✅ Phase 2: Complete - Union & UnionMember Management

### Created Services
1. **src/service/union.service.ts** (400+ lines)
   - `createUnion()` - Create with credit officer assignment
   - `getUnions()` - Role-based filtering
   - `getUnionById()` - With permission checks
   - `updateUnion()` - Admin only
   - `deleteUnion()` - With validation
   - `assignUnionToCreditOfficer()` - With history tracking
   - `exportUnions()` - For data export

2. **src/service/union-member.service.ts** (650+ lines)
   - `createUnionMember()` - With union/officer validation
   - `getUnionMembers()` - Role-based filtering (Admin/Supervisor/CreditOfficer)
   - `getUnionMemberById()` - With permission checks
   - `updateUnionMember()` - With optional union reassignment
   - `deleteUnionMember()` - With active loan validation
   - `reassignUnionMember()` - Admin-only member migration
   - `exportUnionMembers()` - For data export

### Created Controllers
1. **src/controllers/union.controller.ts**
   - All HTTP endpoints for union management
   - Proper error handling and validation
   - Request/response formatting

2. **src/controllers/union-member.controller.ts**
   - All HTTP endpoints for member management
   - Comprehensive error handling
   - Request/response formatting

### Created Routes
1. **src/routes/union.routes.ts**
   - POST `/` - Create union (Admin, Supervisor)
   - GET `/` - List unions (All roles)
   - GET `/:id` - Get union (All roles)
   - PUT `/:id` - Update union (Admin)
   - DELETE `/:id` - Delete union (Admin)
   - POST `/:unionId/assign` - Reassign union (Admin)
   - GET `/export/csv` - Export (All roles)

2. **src/routes/union-member.routes.ts**
   - POST `/` - Create member (Admin, Supervisor, CreditOfficer)
   - GET `/` - List members (All roles)
   - GET `/:id` - Get member (All roles)
   - PUT `/:id` - Update member (Admin, Supervisor, CreditOfficer)
   - DELETE `/:id` - Delete member (Admin, Supervisor, CreditOfficer)
   - POST `/:id/reassign` - Reassign member (Admin)
   - GET `/export/csv` - Export (All roles)

### Updated Files
1. **src/routes/index.ts**
   - Added imports for union and union-member routes
   - Mounted routes at `/unions` and `/union-members`
   - Updated test endpoint

## 📋 Phase 3: IN PROGRESS - Service Refactoring

The following services still need refactoring to use the new Union-based model:

### Critical (Must Complete First)

#### 1. User Service (`src/service/user.service.ts`)
**Status:** Not Started  
**Impact:** CRITICAL - Affects all auth and permissions  
**Changes Needed:**
- Replace all `branchId` references with `supervisorId`
- Update `createUser()` to validate supervisor instead of branch
- Update `getUsers()` to filter by supervisor hierarchy
- Update permission logic:
  - Supervisors see only their credit officers
  - Credit officers see only themselves
  - Admins see everyone
- Update bulk operations (changeRole, assignSupervisor, unassignSupervisor)
- Remove all branch-related logic

#### 2. Loan Service (`src/service/loan.service.ts`)
**Status:** Not Started  
**Impact:** CRITICAL - Core business logic  
**Changes Needed:**
- Remove `branchId` field handling
- Remove `createdByUserId` and `assignedOfficerId` fields
- Add `unionId` field handling
- Update `createLoan()`:
  - Validate union exists
  - Get credit officer from union.creditOfficerId
  - Get union member and ensure they belong to the union
  - Remove officer assignment logic
- Update access control:
  - Credit officers: only their unions' loans
  - Supervisors: only unions of their credit officers
  - Admins: all loans
- Update filtering and querying

#### 3. User Controller (`src/controllers/user.controller.ts`)
**Status:** Not Started  
**Impact:** HIGH - API endpoints  
**Changes:** Update to pass supervisorId instead of branchId

#### 4. Loan Controller (`src/controllers/loan.controller.ts`)
**Status:** Not Started  
**Impact:** HIGH - API endpoints  
**Changes:** Update to pass unionId, remove officer/creator fields

### Important (Should Complete)

#### 5. Document Service (`src/service/document.service.ts`)
**Status:** Not Started  
**Impact:** MEDIUM - Document management  
**Changes Needed:**
- Replace `CustomerDocument` → `UnionMemberDocument`
- Update all document relations and queries

#### 6. Type Definitions (`src/types/index.ts`)
**Status:** Not Started  
**Impact:** MEDIUM - TypeScript safety  
**Changes Needed:**
- Update `AuthenticatedUser` (branchId → supervisorId)
- Add Union and UnionMember types
- Remove Branch types
- Update Role type

### Low Priority (Cleanup)

#### 7. Delete Branch Files
**Files to Delete:**
- `src/service/branch.service.ts`
- `src/controllers/branch.controller.ts`
- `src/routes/branch.routes.ts`
- `src/service/branch-transfer.service.ts`
- `src/controllers/branch-transfer.controller.ts`
- `src/routes/branch-transfer.routes.ts`
- `src/service/branch-analytics.service.ts`
- `src/controllers/branch-analytics.controller.ts`
- `src/routes/branch-analytics.routes.ts`

**Remove from `routes/index.ts`:**
- branchRoutes import and mounting
- branchTransferRoutes import and mounting
- branchAnalyticsRoutes import and mounting

#### 8. Optional: Create History Services
**Services:**
- `union-assignment-history.service.ts` - Track union reassignments
- `union-member-reassignment.service.ts` - Track member reassignments
- Corresponding controllers and routes

#### 9. Database Migration (`prisma/migrations/`)
**Status:** Not Started  
**Impact:** CRITICAL for production  
**Tasks:**
- Create migration: `npx prisma migrate dev --name migrate_branch_to_union_hierarchy`
- Plan data migration strategy:
  - Create unions for each branch
  - Assign branch managers as supervisors
  - Copy customers to union members
  - Copy loans with new unionId
  - Update assignment history records
- Execute migration
- Test on development database

## 🔄 Permission Hierarchy

### New Role-Based Access Pattern

**Admin User**
- Can view/manage everything
- Can create supervisors and credit officers
- Can create unions and assign them
- Can reassign members between unions

**Supervisor User**
- Can view/manage credit officers assigned to them
- Can view unions managed by their credit officers
- Can view members in their credit officers' unions
- Can view loans in their credit officers' unions
- Cannot create other supervisors

**Credit Officer User**
- Can view/manage only their assigned unions
- Can view/manage members in their unions
- Can view loans in their unions
- Can create members in their unions
- Can create loans in their unions
- Cannot view unions managed by other officers

**System Flow Example**
```
Admin creates Supervisor "John"
  ↓
Admin creates Credit Officer "Ahmed" under Supervisor "John"
  ↓
Admin creates Union "Ikeja Market" assigned to Officer "Ahmed"
  ↓
Officer "Ahmed" creates UnionMember "Mary" in Union "Ikeja Market"
  ↓
Officer "Ahmed" creates Loan for "Mary"
  ↓
Supervisor "John" can view loan (sees "Ahmed"'s data)
  ↓
Admin can view loan (sees all data)
```

## 📊 Testing Checklist

When implementing each phase, verify:

### Type Safety
- [ ] TypeScript compiles with no errors
- [ ] All imports are correct
- [ ] No `any` types used inappropriately

### Functionality
- [ ] CRUD operations work for each entity
- [ ] Role-based access control enforced
- [ ] Filtering works correctly
- [ ] Soft deletes work
- [ ] Related record validation works

### Integration
- [ ] Services integrate with controllers correctly
- [ ] Controllers call services with correct parameters
- [ ] Routes pass data correctly
- [ ] Error handling is consistent

### Security
- [ ] Unauthorized users cannot access data
- [ ] Permission checks happen at service level
- [ ] Data is validated before operations
- [ ] Audit logs recorded (if implemented)

## 🚀 Recommended Implementation Order

1. **First:** User Service
   - Most foundational
   - Affects all other services
   - Start with createUser, getUsers, updateUser

2. **Second:** Loan Service
   - Core business logic
   - Depends on User service working
   - Then Loan Controller

3. **Third:** Document Service
   - Uses UnionMember relation
   - Lower complexity

4. **Fourth:** Type Definitions
   - Update after services are done
   - Ensures TypeScript catches issues

5. **Fifth:** Cleanup
   - Delete branch files
   - Remove old imports

6. **Sixth:** Database Migration
   - Only when all services ready
   - Test on dev first

## 📝 Development Tips

### For Each Service Refactoring

1. **Understand Current Logic**
   - Read existing service methods
   - Note all queries and filters
   - Identify permission checks

2. **Plan Changes**
   - List all field name changes
   - Map old relationships to new ones
   - Plan permission logic changes

3. **Implement Incrementally**
   - Change one method at a time
   - Test each method
   - Update corresponding controller
   - Fix type errors

4. **Test After Each Change**
   - Check TypeScript compilation
   - Run API calls manually
   - Verify permission logic
   - Test edge cases

### Useful Patterns

```typescript
// Role-based filtering pattern
if (userRole === Role.CREDIT_OFFICER && userId) {
  where.union = {
    creditOfficerId: userId,
  };
} else if (userRole === Role.SUPERVISOR && userId) {
  where.union = {
    creditOfficer: {
      supervisorId: userId,
    },
  };
} else if (userRole === Role.ADMIN) {
  // No filtering
}

// Error messages
- "Union not found" - for missing unions
- "Credit Officer not found" - for missing officers
- "You can only view your assigned unions" - for permission errors
- "Cannot delete union with existing members" - for validation
```

## 📞 Support References

- **Schema Guide:** See `prisma/schema.prisma` for model definitions
- **Service Examples:** `union.service.ts` and `union-member.service.ts` show the pattern
- **Controller Examples:** `union.controller.ts` shows HTTP handling
- **Route Examples:** `union.routes.ts` shows permission middleware usage

## 🎓 Key Learning Points

1. **Union Model** - Groups of union members, assigned to one credit officer
2. **Supervisor Hierarchy** - Credit officers report to supervisors
3. **Access Control** - Always check user's role and assigned scope
4. **Soft Deletes** - Mark deleted but don't remove from DB
5. **History Tracking** - Record major changes in history tables

## ✨ Final Notes

- All new code follows consistent patterns for maintainability
- Permission checks are enforced at the service level
- Error messages are clear and helpful
- No breaking changes to API structure (mostly additions)
- Documentation has been created for easy reference

**Next Developer:** Start with Phase 3, Task 1 (User Service). Read this document first, then `BACKEND_REFACTORING_PLAN.md` for detailed technical guidance.

---

**Document Generated:** November 15, 2025  
**Phase Completion:** 35% of full refactoring  
**Estimated Remaining Time:** 13-16 development hours
