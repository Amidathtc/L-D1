# LMS (Loan Management System) API Documentation

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Base URL & Response Format](#base-url--response-format)
4. [User Roles & Permissions](#user-roles--permissions)
5. [API Endpoints](#api-endpoints)
   - [Authentication](#authentication-endpoints)
   - [Users](#users-endpoints)
   - [Branches](#branches-endpoints)
   - [Customers](#customers-endpoints)
   - [Loans](#loans-endpoints)
   - [Loan Types](#loan-types-endpoints)
   - [Repayments](#repayments-endpoints)
   - [Documents](#documents-endpoints)
   - [Audit Logs](#audit-logs-endpoints)
6. [Error Handling](#error-handling)
7. [Data Models](#data-models)

## Overview

The LMS API is a RESTful API for managing loan operations including customers, loans, repayments, and document management. The API uses JWT tokens for authentication and supports role-based access control.

## Authentication

The API uses JWT (JSON Web Tokens) for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## Base URL & Response Format

**Base URL:** `http://localhost:3000/api`

### Standard Response Format

```json
{
  "success": boolean,
  "message": string,
  "data": any,
  "error": any (only on errors),
  "pagination": {
    "page": number,
    "limit": number,
    "total": number,
    "totalPages": number
  } (only on paginated responses)
}
```

## User Roles & Permissions

| Role             | Description          | Permissions                                            |
| ---------------- | -------------------- | ------------------------------------------------------ |
| `ADMIN`          | System administrator | Full system access, user management, branch management |
| `BRANCH_MANAGER` | Branch manager       | Branch operations, loan approvals, staff management    |
| `CREDIT_OFFICER` | Credit officer       | Customer management, loan processing, repayments       |

## API Endpoints

### Authentication Endpoints

#### POST /auth/login

Login to the system.

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "user-id",
      "email": "user@example.com",
      "role": "CREDIT_OFFICER",
      "branchId": "branch-id"
    },
    "accessToken": "jwt-token",
    "refreshToken": "refresh-token"
  }
}
```

#### POST /auth/logout

Logout from the system.

**Headers:** `Authorization: Bearer <token>`

**Response:**

```json
{
  "success": true,
  "message": "Logout successful"
}
```

#### POST /auth/refresh

Refresh JWT token.

**Request Body:**

```json
{
  "refreshToken": "refresh-token"
}
```

#### GET /auth/me

Get current user profile.

**Headers:** `Authorization: Bearer <token>`

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "user-id",
    "email": "user@example.com",
    "role": "CREDIT_OFFICER",
    "branchId": "branch-id",
    "isActive": true
  }
}
```

#### PUT /auth/change-password

Change user password.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**

```json
{
  "currentPassword": "oldpassword",
  "newPassword": "newpassword123"
}
```

---

### Users Endpoints

**Note:** All user endpoints require ADMIN role.

#### POST /users

Create a new user.

**Request Body:**

```json
{
  "email": "newuser@example.com",
  "password": "password123",
  "role": "CREDIT_OFFICER",
  "branchId": "branch-id" // optional
}
```

#### GET /users

Get all users with pagination and filtering.

**Query Parameters:**

- `page` (number, default: 1)
- `limit` (number, default: 20)
- `role` (string): Filter by role
- `branchId` (string): Filter by branch
- `search` (string): Search by email

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "user-id",
      "email": "user@example.com",
      "role": "CREDIT_OFFICER",
      "branchId": "branch-id",
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 50,
    "totalPages": 3
  }
}
```

#### GET /users/:id

Get user by ID.

#### PUT /users/:id

Update user.

**Request Body:**

```json
{
  "email": "updated@example.com",
  "role": "BRANCH_MANAGER",
  "branchId": "new-branch-id",
  "isActive": false
}
```

#### DELETE /users/:id

Delete user (soft delete).

#### PUT /users/:id/reset-password

Reset user password.

---

### Branches Endpoints

#### POST /branches

Create a new branch. **Requires ADMIN role.**

**Request Body:**

```json
{
  "name": "Downtown Branch",
  "code": "DT001",
  "managerId": "manager-user-id" // optional
}
```

#### GET /branches

Get all branches. **Requires BRANCH_MANAGER role or higher.**

**Query Parameters:**

- `page` (number, default: 1)
- `limit` (number, default: 20)
- `search` (string): Search by name or code

#### GET /branches/:id

Get branch by ID.

#### GET /branches/:id/stats

Get branch statistics.

**Response:**

```json
{
  "success": true,
  "data": {
    "branchId": "branch-id",
    "branchName": "Downtown Branch",
    "totalCustomers": 150,
    "totalLoans": 89,
    "activeLoans": 45,
    "totalDisbursed": 1500000.0,
    "totalRepaid": 750000.0
  }
}
```

#### PUT /branches/:id

Update branch. **Requires ADMIN role.**

#### DELETE /branches/:id

Delete branch. **Requires ADMIN role.**

---

### Customers Endpoints

#### POST /customers

Create a new customer.

**Request Body:**

```json
{
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+1234567890",
  "email": "john.doe@example.com",
  "address": "123 Main St, City, State",
  "branchId": "branch-id",
  "currentOfficerId": "officer-id" // optional
}
```

#### GET /customers

Get all customers with filtering.

**Query Parameters:**

- `page` (number, default: 1)
- `limit` (number, default: 20)
- `branchId` (string): Filter by branch
- `currentOfficerId` (string): Filter by assigned officer
- `search` (string): Search by name, phone, or email

#### GET /customers/:id

Get customer by ID.

#### GET /customers/:id/loans

Get all loans for a customer.

#### PUT /customers/:id

Update customer.

#### POST /customers/:id/reassign

Reassign customer to different branch/officer.

**Request Body:**

```json
{
  "newBranchId": "new-branch-id",
  "newOfficerId": "new-officer-id",
  "reason": "Branch transfer"
}
```

#### DELETE /customers/:id

Delete customer.

---

### Loans Endpoints

#### POST /loans

Create a new loan.

**Request Body:**

```json
{
  "customerId": "customer-id",
  "loanTypeId": "loan-type-id", // optional
  "principalAmount": 10000.0,
  "termCount": 12,
  "termUnit": "MONTH",
  "startDate": "2024-01-01T00:00:00Z",
  "processingFeeAmount": 100.0,
  "penaltyFeePerDayAmount": 5.0,
  "interestRate": 15.5, // optional, annual percentage
  "notes": "Personal loan for home improvement"
}
```

#### GET /loans

Get all loans with filtering.

**Query Parameters:**

- `page` (number, default: 1)
- `limit` (number, default: 20)
- `status` (string): Filter by loan status
- `branchId` (string): Filter by branch
- `assignedOfficerId` (string): Filter by assigned officer
- `customerId` (string): Filter by customer
- `search` (string): Search by loan number or customer name

#### GET /loans/:id

Get loan by ID with full details.

#### GET /loans/:id/schedule

Get loan repayment schedule.

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "schedule-item-id",
      "dueDate": "2024-02-01T00:00:00Z",
      "principalDue": 833.33,
      "interestDue": 125.0,
      "totalDue": 958.33,
      "paidAmount": 958.33,
      "status": "PAID",
      "paidDate": "2024-02-01T10:30:00Z"
    }
  ]
}
```

#### GET /loans/:id/summary

Get loan summary with payment statistics.

#### PUT /loans/:id

Update loan details.

#### PUT /loans/:id/status

Update loan status. **Requires BRANCH_MANAGER role.**

**Request Body:**

```json
{
  "status": "APPROVED",
  "notes": "Loan approved after verification"
}
```

#### POST /loans/:id/disburse

Disburse loan. **Requires BRANCH_MANAGER role.**

**Request Body:**

```json
{
  "disbursedAt": "2024-01-01T10:00:00Z" // optional, defaults to now
}
```

#### POST /loans/:id/assign

Assign loan to officer. **Requires BRANCH_MANAGER role.**

**Request Body:**

```json
{
  "assignedOfficerId": "officer-id",
  "reason": "Workload balancing"
}
```

#### DELETE /loans/:id

Delete loan.

---

### Loan Types Endpoints

#### GET /loan-types

Get all loan types.

**Query Parameters:**

- `page` (number, default: 1)
- `limit` (number, default: 20)
- `isActive` (boolean): Filter by active status
- `search` (string): Search by name

#### GET /loan-types/:id

Get loan type by ID.

#### POST /loan-types

Create loan type. **Requires ADMIN role.**

**Request Body:**

```json
{
  "name": "Personal Loan",
  "description": "Personal loans for individual customers",
  "minAmount": 1000.0,
  "maxAmount": 50000.0
}
```

#### PUT /loan-types/:id

Update loan type. **Requires ADMIN role.**

#### PUT /loan-types/:id/toggle-status

Toggle loan type active status. **Requires ADMIN role.**

#### DELETE /loan-types/:id

Delete loan type. **Requires ADMIN role.**

---

### Repayments Endpoints

#### POST /repayments

Record a new repayment.

**Request Body:**

```json
{
  "loanId": "loan-id",
  "amount": 958.33,
  "method": "CASH", // CASH, BANK_TRANSFER, MOBILE_MONEY, CHECK
  "referenceNumber": "TXN123456",
  "notes": "Monthly payment"
}
```

#### GET /repayments

Get all repayments with filtering.

**Query Parameters:**

- `page` (number, default: 1)
- `limit` (number, default: 20)
- `loanId` (string): Filter by loan
- `receivedByUserId` (string): Filter by receiving officer
- `method` (string): Filter by payment method
- `dateFrom` (string): Filter from date (ISO format)
- `dateTo` (string): Filter to date (ISO format)

#### GET /repayments/:id

Get repayment by ID.

#### PUT /repayments/:id

Update repayment.

#### DELETE /repayments/:id

Delete repayment. **Requires BRANCH_MANAGER role.**

---

### Documents Endpoints

#### GET /documents/types

Get all document types.

#### POST /documents/customer/:customerId

Upload customer document.

**Content-Type:** `multipart/form-data`

**Form Data:**

- `file` (file): Document file
- `documentTypeId` (string): Document type ID
- `issuingAuthority` (string, optional): Issuing authority
- `issueDate` (string, optional): Issue date (ISO format)
- `expiryDate` (string, optional): Expiry date (ISO format)

#### GET /documents/customer/:customerId

Get all documents for a customer.

#### POST /documents/loan/:loanId

Upload loan document.

#### GET /documents/loan/:loanId

Get all documents for a loan.

#### PUT /documents/:id/verify

Verify document. **Requires BRANCH_MANAGER role.**

**Request Body:**

```json
{
  "type": "customer", // or "loan"
  "verified": true,
  "verificationNotes": "Document verified successfully"
}
```

#### DELETE /documents/:id

Delete document. **Requires BRANCH_MANAGER role.**

**Query Parameters:**

- `type` (string): "customer" or "loan"

---

### Audit Logs Endpoints

**Note:** All audit log endpoints require BRANCH_MANAGER role or higher.

#### GET /audit-logs

Get all audit logs with filtering.

**Query Parameters:**

- `page` (number, default: 1)
- `limit` (number, default: 20)
- `entityName` (string): Filter by entity type
- `entityId` (string): Filter by entity ID
- `actorUserId` (string): Filter by user who performed action
- `action` (string): Filter by action type
- `dateFrom` (string): Filter from date
- `dateTo` (string): Filter to date

#### GET /audit-logs/:id

Get audit log by ID.

#### GET /audit-logs/entity/:entityName/:entityId

Get audit trail for a specific entity.

---

## Error Handling

### HTTP Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (authentication required)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `500` - Internal Server Error

### Error Response Format

```json
{
  "success": false,
  "message": "Error description",
  "error": {
    "code": "ERROR_CODE",
    "details": "Detailed error information"
  }
}
```

### Common Error Codes

- `VALIDATION_ERROR` - Request validation failed
- `AUTHENTICATION_REQUIRED` - JWT token required
- `INSUFFICIENT_PERMISSIONS` - User lacks required permissions
- `RESOURCE_NOT_FOUND` - Requested resource not found
- `DUPLICATE_RESOURCE` - Resource already exists

---

## Data Models

### User Roles

```typescript
enum Role {
  ADMIN = "ADMIN",
  BRANCH_MANAGER = "BRANCH_MANAGER",
  CREDIT_OFFICER = "CREDIT_OFFICER",
}
```

### Loan Status

```typescript
enum LoanStatus {
  DRAFT = "DRAFT",
  PENDING_APPROVAL = "PENDING_APPROVAL",
  APPROVED = "APPROVED",
  ACTIVE = "ACTIVE",
  COMPLETED = "COMPLETED",
  DEFAULTED = "DEFAULTED",
  WRITTEN_OFF = "WRITTEN_OFF",
  CANCELED = "CANCELED",
}
```

### Term Units

```typescript
enum TermUnit {
  DAY = "DAY",
  WEEK = "WEEK",
  MONTH = "MONTH",
}
```

### Schedule Status

```typescript
enum ScheduleStatus {
  PENDING = "PENDING",
  PARTIAL = "PARTIAL",
  PAID = "PAID",
  OVERDUE = "OVERDUE",
}
```

### Repayment Methods

```typescript
enum RepaymentMethod {
  CASH = "CASH",
  BANK_TRANSFER = "BANK_TRANSFER",
  MOBILE_MONEY = "MOBILE_MONEY",
  CHECK = "CHECK",
}
```

---

## Rate Limiting

The API implements rate limiting:

- **15 minutes window**
- **100 requests per IP address**
- Exceeded limits return `429 Too Many Requests`

---

## File Upload Specifications

### Document Upload

- **Max file size:** 10MB
- **Supported formats:** PDF, JPG, JPEG, PNG, DOC, DOCX
- **Upload path:** `/uploads/documents/`
- **File naming:** `{timestamp}-{originalname}`

---

## Development & Testing

### Base URLs

- **Development:** `http://localhost:3000/api`
- **Production:** `https://your-domain.com/api`

### Health Check

```
GET /health
```

Returns:

```json
{
  "status": "OK",
  "timestamp": "2024-01-01T00:00:00Z"
}
```

---

## Authentication Flow Example

```javascript
// 1. Login
const loginResponse = await fetch("/api/auth/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    email: "user@example.com",
    password: "password123",
  }),
});

const { data } = await loginResponse.json();
const token = data.accessToken;

// 2. Use token for authenticated requests
const customersResponse = await fetch("/api/customers", {
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
});

// 3. Refresh token when needed
const refreshResponse = await fetch("/api/auth/refresh", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    refreshToken: data.refreshToken,
  }),
});
```

This documentation provides comprehensive guidance for frontend developers to integrate with the LMS API effectively.
