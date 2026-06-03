# Student Study Guide: Inside the Splitly Backend Codebase

Welcome to **Splitly**'s backend codebase! This guide is designed to help you understand the architectural patterns, database modeling, and flow of data in a production-grade Node.js/Express, Mongoose, and Socket.IO application.

---

## 1. Architectural Blueprint: Feature-Based Layering

Many beginner tutorials teach the **Global Layering** approach:
```text
server/
├── controllers/    # Contains auth, user, group, and expense controllers
├── routes/         # Contains auth, user, group, and expense routes
└── services/       # Contains auth, user, group, and expense services
```
While simple, this structure gets messy as the project grows. If you want to change how "expenses" work, you have to modify files scattered across three or four different root folders.

### The SaaS Solution: Feature-Based Modules
In **Splitly**, we use a **Feature-Based Module** architecture. Each feature domain (like `auth`, `expenses`, or `settlements`) gets its own self-contained folder under `src/modules/`:
```text
src/modules/expenses/
├── expenses.controller.js  # Layer 1: Transport & Request handling
├── expenses.service.js     # Layer 2: Core business calculations
├── expenses.routes.js      # Endpoint mappings
└── expenses.validation.js  # Checks payload integrity before running business logic
```
> [!TIP]
> **Why is this better?**
> 1. **Cohesion**: Files that change together are stored together.
> 2. **Scalability**: If Splitly grows, a feature folder (like `notifications`) can be copied out of this repository and easily deployed as an independent **Microservice** without breaking the rest of the application.

---

## 2. Database Layer: Mongoose Models & Schemas

Mongoose translates MongoDB documents into JavaScript objects. Here is a breakdown of our models inside `src/models/` and how they model real-world debt relationships:

### Core Mongoose Models

1. **User (`User.js`)**
   - Stores user profiles, hashed passwords, currency preferences, and an array of references to other `User` documents (`friends`).
   - Uses a `pre('save')` hook to automatically encrypt passwords using `bcrypt` before saving.
   - Sets `select: false` on the password field so that search queries do not return passwords by default.

2. **Group (`Group.js`) & GroupMember (`GroupMember.js`)**
   - Instead of storing an array of member objects directly inside the `Group` document (which could hit MongoDB's 16MB document size limit), we use a junction table pattern: **`GroupMember`**.
   - `GroupMember` links a `Group` reference and a `User` reference.
   - **Compound Unique Index**: `groupMemberSchema.index({ group: 1, user: 1 }, { unique: true });` prevents a student/user from being added to the same group twice.

3. **Expense (`Expense.js`) & ExpenseSplit (`ExpenseSplit.js`)**
   - An `Expense` represents the main bill (e.g., "$30 spent at Starbucks paid by Alice").
   - An `ExpenseSplit` represents who owes what (e.g., "Bob owes $10", "Charlie owes $10").
   - Each `ExpenseSplit` references the parent `Expense` and the owing `User`.
   - **Compound Unique Index**: `expenseSplitSchema.index({ expense: 1, user: 1 }, { unique: true });` ensures a user cannot have duplicate debt splits for the same bill.

4. **RefreshToken (`RefreshToken.js`)**
   - Manages token-based session revocations.
   - Uses a **MongoDB TTL (Time-To-Live) Index**: `{ expireAfterSeconds: 0 }` on the `expiresAt` field. MongoDB automatically deletes these documents once they expire, keeping the database clean.

---

## 3. The Request-Response Flow (Step-by-Step)

Let's trace what happens when a client sends a request to add a new expense:
`POST /api/v1/expenses` with a JSON body representing the bill.

```text
  [ Client Request ]
         │
         ▼
 1. [ src/server.js ] ──► Listens to incoming HTTP traffic and routes it to app.js
         │
         ▼
 2. [ src/app.js ] ────► Mounts global middlewares (CORS, JSON Parser) and forwards to routes
         │
         ▼
 3. [ src/routes/index.js ] ──► Directs traffic starting with '/expenses' to expenses.routes.js
         │
         ▼
 4. [ src/modules/expenses/expenses.routes.js ]
         │
         ├─► [ middleware/auth.middleware.js ] ──► Verifies JWT, populates req.user
         ├─► [ expenses.validation.js ] ─────────► Validates that request body fields are correct
         │
         ▼
 5. [ expenses.controller.js ] ──► Extracts inputs (req.body, req.user.id) and calls service
         │
         ▼
 6. [ expenses.service.js ] ────► Handles the business logic:
         │                        - Creates the Expense document
         │                        - Loops and creates splits in ExpenseSplit
         │                        - Triggers real-time alerts
         │
         ▼
 7. [ src/models/Expense.js ] ───► Mongoose validates types and writes to MongoDB
         │
         ▼
 8. [ MongoDB Database ] ────────► Commits the data to disk
```

### Core Code Snippet: The Controller
The controller's job is **only** to manage HTTP requests and formatting. It should never contain direct database logic:
```javascript
// src/modules/expenses/expenses.controller.js
import { createExpense } from './expenses.service.js';

export const handleCreateExpense = async (req, res, next) => {
  try {
    // 1. Controller calls the Service layer containing business logic
    const result = await createExpense(req.body, req.user.id);
    
    // 2. Controller sends the response using a consistent wrapper
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    // 3. Any error is forwarded to the global errorHandler middleware
    next(error);
  }
};
```

---

## 4. Key Middleware Operations

Middlewares are functions that run before your routes process the request. Think of them as security guards at a gate:

### 1. Global Error Handler (`src/middleware/error.middleware.js`)
Instead of using messy `try-catch` blocks that send different error formats back to the user, Splitly uses a single global error handler. If an error occurs anywhere in the stack, we pass it to `next(error)`. The error handler intercepts it and formats the output consistently:
```json
{
  "success": false,
  "message": "Resource not found",
  "errors": [],
  "stack": "Error: ... (hidden in production mode)"
}
```

### 2. Async Handler Wrapper (`src/utils/asyncHandler.js`)
Writing `try-catch` blocks inside every controller is repetitive. The `asyncHandler` utility intercepts promises and automatically routes any rejected promise directly to the global error middleware:
```javascript
export const asyncHandler = (requestHandler) => {
  return (req, res, next) => {
    Promise.resolve(requestHandler(req, res, next)).catch((err) => next(err));
  };
};
```

---

## 5. Real-Time WebSockets Architecture

HTTP requests are **uni-directional**: the client must ask the server for data. But in a collaborative bill-splitting app, we want real-time updates (e.g. "Bob typed a comment" or "Alice just logged a settlement").

In Splitly, we integrate **Socket.IO**:
- **Socket Service (`src/services/socket.service.js`)**: A singleton class that holds the global socket instance. Other services import this class to broadcast events to connected clients.
- **Namespaces & Rooms**: When a user logs in, they join a private room `user_${userId}`. When they view a group, they join `group_${groupId}`.
- **Event Listeners**:
  - `typing_comment`: Broadcasts typing indicators to other members in the group room.
  - `join_notifications`: Bridges the client connection to real-time notification alerts.

---

## 6. Understanding Zod Validation (Crash Course)

**Zod** is a schema declaration and validation library. In JavaScript backend applications, it allows you to define a blueprint (schema) for your HTTP request bodies (JSON payloads) and check if incoming requests match that blueprint.

### Step-by-Step Example: Validating a User Login
Let's learn how to validate user logins. We want to ensure that the request contains a valid `email` and a `password` of at least 6 characters.

1. **Define the Zod Schema**:
```javascript
import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters long')
});
```

2. **Create a Validation Middleware**:
We create a helper middleware that parses the request body against our schema:
```javascript
export const validateLogin = (req, res, next) => {
  // safeParse checks the body and returns { success: true, data } or { success: false, error }
  const result = loginSchema.safeParse(req.body);
  
  if (!result.success) {
    // Map Zod errors to a student-friendly response
    const errorDetails = result.error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message
    }));
    
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errorDetails
    });
  }
  
  // Replace request body with the cleaned and parsed data
  req.body = result.data;
  next();
};
```

### Reference Implementation in Your Codebase
We have implemented a live, functional example of this exact pattern in your codebase. Students can inspect these files to see Zod validation in action:
* **Validation Blueprint Schemas**: [auth.validator.js](file:///e:/Classes/MERN%20-%2012PM/Full%20Stack%20Projects/splitly/server/src/validators/auth.validator.js) contains the schemas for user registration, user login, and token refreshes.
* **Express Validation Middlewares**: [auth.validation.js](file:///e:/Classes/MERN%20-%2012PM/Full%20Stack%20Projects/splitly/server/src/modules/auth/auth.validation.js) parses the request payloads and sends standard client-friendly JSON error details.
* **Route Bindings**: [auth.routes.js](file:///e:/Classes/MERN%20-%2012PM/Full%20Stack%20Projects/splitly/server/src/modules/auth/auth.routes.js) acts as the connection point mounting the validation middlewares prior to running controllers.

---

## 7. Self-Study Exercises for Students

To practice these concepts, complete the following exercises:

> [!IMPORTANT]
> **Exercise 1: Basic Zod Validator (User Registration)**
> Create a validation schema for user registration inside `src/validators/auth.validator.js` using Zod:
> - `username`: string, between 3 and 30 characters.
> - `email`: valid email string format.
> - `password`: string of at least 6 characters.
> Update `validateRegister` in `src/modules/auth/auth.validation.js` to parse request payloads against this schema.

> [!IMPORTANT]
> **Exercise 2: Intermediate Zod Validator (Expenses)**
> Replace the empty object inside `src/validators/expense.validator.js` with a Zod schema. Check that the expense `amount` is a number greater than 0, and that `splitType` is one of: `EQUAL`, `EXACT`, `PERCENTAGE`, or `SHARES`.

> [!TIP]
> **Exercise 3: Write Debt Simplification**
> Fill in the algorithm placeholder inside `src/utils/calculateBalances.js`. 
> - Input: `[{ from: 'Alice', to: 'Bob', amount: 10 }, { from: 'Bob', to: 'Charlie', amount: 10 }]`
> - Expected Output: `[{ from: 'Alice', to: 'Charlie', amount: 10 }]`

