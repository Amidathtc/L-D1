# Payment Status Alignment: Backend vs Frontend

**Date:** October 20, 2025  
**Status:** ✅ FIXED  
**Verification:** Backend and Frontend now use identical status values

---

## Backend Schedule Status Enum

**Source:** `L-D1/prisma/schema.prisma` (Lines 40-46)

```prisma
enum ScheduleStatus {
  PENDING
  PARTIAL
  PAID
  OVERDUE
}
```

**Also defined in:** `L-D1/src/service/repayment.service.ts` (Lines 14-18)

```typescript
enum ScheduleStatus {
  PENDING = "PENDING",
  PARTIAL = "PARTIAL",
  PAID = "PAID",
  OVERDUE = "OVERDUE",
}
```

---

## Frontend Schedule Status (BEFORE Fix)

**Source:** `L-Dash/app/dashboard/.../repayment-schedules/page.tsx` (Lines 64-71)

### ❌ BEFORE (Incorrect):

```typescript
status:
  | "PENDING"
  | "PARTIAL"
  | "PAID"
  | "OVERDUE"
  | "UNDER_REPAYMENT"      // ❌ NOT in backend
  | "FULLY_PAID";           // ❌ NOT in backend (backend uses PAID)
```

### ✅ AFTER (Correct):

```typescript
// Status values must match backend ScheduleStatus enum: PENDING, PARTIAL, PAID, OVERDUE
status: "PENDING" | "PARTIAL" | "PAID" | "OVERDUE";
```

---

## Issues Found & Fixed

### Issue 1: Extra Status Values in Frontend Interface

**Problem:**

- Frontend had `UNDER_REPAYMENT` and `FULLY_PAID` that don't exist in backend
- Caused type mismatches and confusion

**Fix:**

- Removed `UNDER_REPAYMENT` from interface
- Changed `FULLY_PAID` references to `PAID`

**File:** Line 64-71

---

### Issue 2: Invalid Status in getStatusBadge Function

**Before:**

```typescript
const getStatusBadge = (status: RepaymentSchedule["status"]) => {
  switch (status) {
    case "PAID":
      return <Badge className="bg-green-100 text-green-800">Paid</Badge>;
    case "PARTIAL":
      return <Badge className="bg-yellow-100 text-yellow-800">Partial</Badge>;
    case "OVERDUE":
      return <Badge className="bg-red-100 text-red-800">Overdue</Badge>;
    case "UNDER_REPAYMENT": // ❌ Invalid
      return (
        <Badge className="bg-blue-100 text-blue-800">Under Repayment</Badge>
      );
    case "FULLY_PAID": // ❌ Invalid
      return <Badge className="bg-green-100 text-green-800">Fully Paid</Badge>;
    case "PENDING":
    default:
      return <Badge className="bg-gray-100 text-gray-800">Pending</Badge>;
  }
};
```

**After:**

```typescript
const getStatusBadge = (status: RepaymentSchedule["status"]) => {
  // Backend statuses: PENDING, PARTIAL, PAID, OVERDUE
  switch (status) {
    case "PAID":
      return <Badge className="bg-green-100 text-green-800">Paid</Badge>;
    case "PARTIAL":
      return <Badge className="bg-yellow-100 text-yellow-800">Partial</Badge>;
    case "OVERDUE":
      return <Badge className="bg-red-100 text-red-800">Overdue</Badge>;
    case "PENDING":
    default:
      return <Badge className="bg-gray-100 text-gray-800">Pending</Badge>;
  }
};
```

**File:** Line 309-321

---

### Issue 3: calculateLoanMetrics Using Invalid Statuses

**Before:**

```typescript
let status: RepaymentSchedule["status"];
if (totalLeft === 0) status = "FULLY_PAID"; // ❌ Not in backend
else if (daysRemaining < 0) status = "OVERDUE";
else status = "UNDER_REPAYMENT"; // ❌ Not in backend
```

**After:**

```typescript
let status: RepaymentSchedule["status"];
// Backend statuses: PENDING, PARTIAL, PAID, OVERDUE
if (totalLeft === 0) status = "PAID"; // ✅ Matches backend
else if (daysRemaining < 0) status = "OVERDUE";
else status = "PENDING"; // ✅ Matches backend
```

**File:** Line 259-263

---

### Issue 4: computeScheduleMetrics Using Invalid Statuses

**Before:**

```typescript
let status: RepaymentSchedule["status"];
if (totalLeftToPay === 0) status = "PAID";
else if (isOverdue) status = "OVERDUE";
else if (safePaid > 0) status = "PARTIAL";
else status = "UNDER_REPAYMENT"; // ❌ Not in backend
```

**After:**

```typescript
let status: RepaymentSchedule["status"];
// Backend statuses: PENDING, PARTIAL, PAID, OVERDUE
if (totalLeftToPay === 0) status = "PAID";
else if (isOverdue) status = "OVERDUE";
else if (safePaid > 0) status = "PARTIAL";
else status = "PENDING"; // ✅ Matches backend
```

**File:** Line 279-288

---

### Issue 5: Filter Logic Using Invalid Statuses

**Before:**

```typescript
// Include: PENDING, PARTIAL, UNDER_REPAYMENT, OVERDUE
filtered = filtered.filter((item) =>
  ["PENDING", "PARTIAL", "UNDER_REPAYMENT", "OVERDUE"].includes(
    (item.status || "").toUpperCase()
  )
);
```

**After:**

```typescript
// Include: PENDING, PARTIAL, OVERDUE (everything except PAID)
filtered = filtered.filter((item) =>
  ["PENDING", "PARTIAL", "OVERDUE"].includes((item.status || "").toUpperCase())
);
```

**File:** Line 933-940

---

### Issue 6: UI Buttons Using Invalid Statuses

**Before:**

```typescript
{
  /* Buttons for status filtering */
}
<Button onClick={() => setStatusFilter("UNDER_REPAYMENT")}>
  Under Repayment {/* ❌ Not a backend status */}
</Button>;
```

**After:**

```typescript
{/* Backend status buttons: PENDING, PARTIAL, OVERDUE, PAID */}
<Button onClick={() => setStatusFilter("PENDING")}>
  Pending            {/* ✅ Valid backend status */}
</Button>
<Button onClick={() => setStatusFilter("PARTIAL")}>
  Partial
</Button>
<Button onClick={() => setStatusFilter("OVERDUE")}>
  Overdue
</Button>
<Button onClick={() => setStatusFilter("PAID")}>
  Paid               {/* ✅ Valid backend status, shows paid schedules */}
</Button>
```

**File:** Line 1425-1495

---

### Issue 7: SearchableSelect Options Using Invalid Statuses

**Before:**

```typescript
options={[
  { value: "", label: "All Statuses" },
  { value: "PENDING", label: "Pending" },
  { value: "PARTIAL", label: "Partial" },
  { value: "UNDER_REPAYMENT", label: "Under Repayment" },  // ❌ Invalid
]}
```

**After:**

```typescript
options={[
  { value: "", label: "All Statuses" },
  { value: "PENDING", label: "Pending" },
  { value: "PARTIAL", label: "Partial" },
  { value: "OVERDUE", label: "Overdue" },
  { value: "PAID", label: "Paid" },
]}
```

**File:** Line 1590-1600

---

## Summary of Changes

| #   | Component              | Before                      | After                  | Severity |
| --- | ---------------------- | --------------------------- | ---------------------- | -------- |
| 1   | Interface              | 6 statuses (incl. invalid)  | 4 statuses (all valid) | HIGH     |
| 2   | getStatusBadge         | Handles invalid statuses    | Only valid statuses    | MEDIUM   |
| 3   | calculateLoanMetrics   | FULLY_PAID, UNDER_REPAYMENT | PAID, PENDING          | CRITICAL |
| 4   | computeScheduleMetrics | UNDER_REPAYMENT             | PENDING                | CRITICAL |
| 5   | Filter Logic           | Includes UNDER_REPAYMENT    | Excludes invalid       | MEDIUM   |
| 6   | UI Buttons             | Under Repayment button      | Proper buttons         | MEDIUM   |
| 7   | SearchableSelect       | Invalid options             | Valid options          | LOW      |

---

## Backend vs Frontend Alignment

### Backend Statuses (Source of Truth)

```
PENDING  → Schedule due but not yet paid
PARTIAL  → Schedule partially paid (some amount paid, balance remaining)
PAID     → Schedule fully paid (totalDue == paidAmount)
OVERDUE  → Schedule due date has passed and status is not PAID
```

### Frontend Now Uses

✅ **Exact same 4 statuses as backend**

- No custom frontend-only statuses
- No type mismatches
- Seamless API-to-UI data flow

---

## Data Flow Verification

### Example: Schedule from API

```json
{
  "id": "xyz123",
  "loanId": "loan789",
  "sequence": 1,
  "dueDate": "2025-10-19",
  "principalDue": "5000",
  "paidAmount": "2000",
  "status": "PARTIAL",      // ← From backend (only 4 values possible)
  "loan": { ... }
}
```

### Frontend Processing

```typescript
// 1. API returns status: "PARTIAL" ✅
const schedule = response.data;

// 2. Interface validates: status: "PENDING" | "PARTIAL" | "PAID" | "OVERDUE" ✅
const validatedSchedule: RepaymentSchedule = schedule;

// 3. getStatusBadge renders correct badge ✅
getStatusBadge("PARTIAL") // → Yellow "Partial" badge

// 4. Filter works correctly ✅
filter includes "PARTIAL" in ["PENDING", "PARTIAL", "OVERDUE"]
```

---

## Testing Status Alignment

### Test Case 1: Display Status Badge

```
Input: { status: "PARTIAL", ... }
Expected: Yellow badge with "Partial" text
Result: ✅ Correct (after fix)
```

### Test Case 2: Filter by Status

```
Click "Partial" button
Expected: API called with ?status=PARTIAL
          Only PARTIAL items shown
Result: ✅ Correct (after fix)
```

### Test Case 3: Calculate Metrics

```
Input: { totalDue: 1000, paidAmount: 1000, ... }
Expected: status = "PAID" (not "FULLY_PAID")
Result: ✅ Correct (after fix)
```

### Test Case 4: Default Filter

```
No filter selected
Expected: Shows PENDING, PARTIAL, OVERDUE (not PAID)
Result: ✅ Correct (after fix)
```

---

## API Response Validation

When receiving repayment schedules from backend:

```typescript
// Backend guarantees these values in response
{
  "status": "PENDING" | "PARTIAL" | "PAID" | "OVERDUE"  // Always one of these 4
}

// Frontend now accepts ONLY these values
type Status = "PENDING" | "PARTIAL" | "PAID" | "OVERDUE"
```

---

## Files Modified

1. **`L-Dash/app/dashboard/business-management/loan-payment/repayment-schedules/page.tsx`**
   - Line 64-71: Fixed interface status type
   - Line 259-263: Fixed calculateLoanMetrics
   - Line 279-288: Fixed computeScheduleMetrics
   - Line 309-321: Fixed getStatusBadge
   - Line 933-940: Fixed filter logic
   - Line 1425-1495: Fixed UI buttons
   - Line 1590-1600: Fixed SearchableSelect options

---

## Backward Compatibility

✅ **Fully compatible** - No breaking changes

- All valid backend values are still supported
- Invalid frontend values are removed
- Existing data works correctly

---

## Production Readiness

✅ **Status: READY FOR DEPLOYMENT**

- All invalid statuses removed
- Backend and frontend aligned
- TypeScript validation passes
- No type conflicts
- API data flows correctly
- UI displays correct values

---

## Reference: Backend Enum Definition

**Prisma Schema (L-D1/prisma/schema.prisma):**

```prisma
enum ScheduleStatus {
  PENDING
  PARTIAL
  PAID
  OVERDUE
}
```

**Backend Service (L-D1/src/service/repayment.service.ts):**

```typescript
enum ScheduleStatus {
  PENDING = "PENDING",
  PARTIAL = "PARTIAL",
  PAID = "PAID",
  OVERDUE = "OVERDUE",
}
```

**Frontend Interface (Now Matches):**

```typescript
status: "PENDING" | "PARTIAL" | "PAID" | "OVERDUE";
```

---

## Conclusion

✅ **Complete alignment achieved**

- Backend and frontend use identical status values
- No type mismatches or confusion
- Clean data flow from API to UI
- Production-ready code
