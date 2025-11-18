# Quick Start Reference - Backend Refactoring

## What's Done ✅

- [x] Prisma schema updated (Union, UnionMember, Supervisor role)
- [x] Middleware updated (auth, roles)
- [x] Union service, controller, routes complete
- [x] UnionMember service, controller, routes complete
- [x] Route integration complete

## What's Next 🔄

**Priority 1 - CRITICAL:**
1. Update `user.service.ts` (Replace branchId → supervisorId)
2. Update `user.controller.ts` 
3. Update `loan.service.ts` (Add unionId, remove branch/officer refs)
4. Update `loan.controller.ts`

**Priority 2 - IMPORTANT:**
5. Update `document.service.ts` (CustomerDocument → UnionMemberDocument)
6. Update `types/index.ts` (Type definitions)

**Priority 3 - CLEANUP:**
7. Delete branch-related files
8. Remove old imports from routes/index.ts

**Priority 4 - PRODUCTION:**
9. Create Prisma migration
10. Test on dev database
11. Plan data migration strategy

## File Map

### Newly Created (Already Done)
```
src/
  service/
    union.service.ts ✓
    union-member.service.ts ✓
  controllers/
    union.controller.ts ✓
    union-member.controller.ts ✓
  routes/
    union.routes.ts ✓
    union-member.routes.ts ✓
```

### To Update (Next)
```
src/
  service/
    user.service.ts (TODO)
    loan.service.ts (TODO)
    document.service.ts (TODO)
  controllers/
    user.controller.ts (TODO)
    loan.controller.ts (TODO)
  types/
    index.ts (TODO)
```

### To Delete (Eventually)
```
src/
  service/
    branch.service.ts
    branch-transfer.service.ts
    branch-analytics.service.ts
  controllers/
    branch.controller.ts
    branch-transfer.controller.ts
    branch-analytics.controller.ts
  routes/
    branch.routes.ts
    branch-transfer.routes.ts
    branch-analytics.routes.ts
```

## Current Schema Structure

### Core Models
```
Union
  ├─ id (String)
  ├─ name (String)
  ├─ location (String?)
  ├─ address (String?)
  ├─ creditOfficerId (String) → User
  └─ unionMembers (UnionMember[])

UnionMember (was Customer)
  ├─ id (String)
  ├─ code (String)
  ├─ firstName, lastName, phone, email, etc.
  ├─ unionId (String) → Union
  └─ currentOfficerId (String?) → User

Loan
  ├─ id (String)
  ├─ loanNumber (String)
  ├─ unionMemberId (String) → UnionMember
  ├─ unionId (String) → Union
  ├─ status (LoanStatus)
  └─ ... other fields

User
  ├─ id (String)
  ├─ email (String)
  ├─ role (Role: ADMIN | SUPERVISOR | CREDIT_OFFICER)
  ├─ supervisorId (String?) → User
  ├─ unions (Union[]) → for CREDIT_OFFICER
  └─ ... other fields
```

## Common Code Patterns

### Service Method Template
```typescript
static async methodName(
  data: DataInterface,
  userId: string,
  userRole: Role
) {
  // 1. Validate inputs exist
  // 2. Check user permissions
  // 3. Perform business logic
  // 4. Return result
}
```

### Role-Based Filtering
```typescript
const where: any = { deletedAt: null };

if (userRole === Role.CREDIT_OFFICER) {
  where.union = { creditOfficerId: userId };
} else if (userRole === Role.SUPERVISOR) {
  where.union = {
    creditOfficer: { supervisorId: userId }
  };
}
// else if ADMIN, no filtering
```

### Controller Pattern
```typescript
static async methodName(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;
    
    const result = await Service.method(data, userId, userRole);
    
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
}
```

## API Endpoints Reference

### Union Endpoints
```
POST   /unions                          Create
GET    /unions                          List
GET    /unions/:id                      Get by ID
PUT    /unions/:id                      Update
DELETE /unions/:id                      Delete
POST   /unions/:unionId/assign          Reassign Officer
GET    /unions/export/csv               Export
```

### Union Member Endpoints
```
POST   /union-members                   Create
GET    /union-members                   List
GET    /union-members/:id               Get by ID
PUT    /union-members/:id               Update
DELETE /union-members/:id               Delete
POST   /union-members/:id/reassign      Reassign Union
GET    /union-members/export/csv        Export
```

## Test Cases to Run

After each update, test:
```
1. Create endpoint - POST /path
2. Read endpoint - GET /path/:id
3. List endpoint - GET /path (with filters)
4. Update endpoint - PUT /path/:id
5. Delete endpoint - DELETE /path/:id
6. Permission denied - Try with wrong role
7. Invalid input - Pass bad data
```

## Debugging Tips

### Check Compilation
```bash
cd L-D1
npm run build  # or tsc
```

### View Schema Changes
```bash
grep -n "Union\|UnionMember" prisma/schema.prisma
```

### Find All branchId References
```bash
grep -r "branchId" src/ --include="*.ts"
```

### Find All Customer References to Replace
```bash
grep -r "Customer" src/ --include="*.ts"
grep -r "customer" src/ --include="*.ts"
```

## Troubleshooting

### "User might not exist" TypeScript Error
→ Add non-null assertion: `userId!` or check before use

### "Property 'xyz' not found on type"
→ Check Prisma schema has the field
→ Regenerate Prisma: `npx prisma generate`

### Route not working
→ Check routes/index.ts has the import and mounting
→ Verify middleware is correct
→ Check controller method name matches

### Permission denied error
→ Check role-based filtering logic
→ Verify supervisor hierarchy is correct
→ Check userId is being passed to service

## Important Reminders

- ✓ Always include 3-5 lines of context in replace operations
- ✓ Run `npx prisma generate` after schema changes
- ✓ Check TypeScript before testing endpoints
- ✓ Test with different user roles
- ✓ Verify permissions work correctly
- ✓ Don't delete files until confirmed replaced
- ✓ Update imports when renaming files

## Time Estimates

- User Service: 2 hours
- Loan Service: 3 hours
- Document Service: 1 hour
- Type Updates: 1 hour
- Cleanup: 30 minutes
- Database Migration: 1-2 hours
- **Total Remaining: 8-10 hours**

---

**Generated:** November 15, 2025  
**Status:** Phase 1-2 Complete, Phase 3 Ready to Start
