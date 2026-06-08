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
>
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
import { createExpense } from "./expenses.service.js";

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
import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters long"),
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
    const errorDetails = result.error.errors.map((err) => ({
      field: err.path.join("."),
      message: err.message,
    }));

    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: errorDetails,
    });
  }

  // Replace request body with the cleaned and parsed data
  req.body = result.data;
  next();
};
```

### Reference Implementation in Your Codebase

We have implemented a live, functional example of this exact pattern in your codebase. Students can inspect these files to see Zod validation in action:

- **Validation Blueprint Schemas**: [auth.validator.js](file:///e:/Classes/MERN%20-%2012PM/Full%20Stack%20Projects/splitly/server/src/validators/auth.validator.js) contains the schemas for user registration, user login, and token refreshes.
- **Express Validation Middlewares**: [auth.validation.js](file:///e:/Classes/MERN%20-%2012PM/Full%20Stack%20Projects/splitly/server/src/modules/auth/auth.validation.js) parses the request payloads and sends standard client-friendly JSON error details.
- **Route Bindings**: [auth.routes.js](file:///e:/Classes/MERN%20-%2012PM/Full%20Stack%20Projects/splitly/server/src/modules/auth/auth.routes.js) acts as the connection point mounting the validation middlewares prior to running controllers.

---

## 7. Self-Study Exercises for Students

To practice these concepts, complete the following exercises:

> [!IMPORTANT]
> **Exercise 1: Basic Zod Validator (User Registration)**
> Create a validation schema for user registration inside `src/validators/auth.validator.js` using Zod:
>
> - `username`: string, between 3 and 30 characters.
> - `email`: valid email string format.
> - `password`: string of at least 6 characters.
>   Update `validateRegister` in `src/modules/auth/auth.validation.js` to parse request payloads against this schema.

> [!IMPORTANT]
> **Exercise 2: Intermediate Zod Validator (Expenses)**
> Replace the empty object inside `src/validators/expense.validator.js` with a Zod schema. Check that the expense `amount` is a number greater than 0, and that `splitType` is one of: `EQUAL`, `EXACT`, `PERCENTAGE`, or `SHARES`.

> [!TIP]
> **Exercise 3: Write Debt Simplification**
> Fill in the algorithm placeholder inside `src/utils/calculateBalances.js`.
>
> - Input: `[{ from: 'Alice', to: 'Bob', amount: 10 }, { from: 'Bob', to: 'Charlie', amount: 10 }]`
> - Expected Output: `[{ from: 'Alice', to: 'Charlie', amount: 10 }]`

---

## 8. Deep Dive: How Debt Simplification Works (Step-by-Step Trace)

To understand how `simplifyDebts` in [calculateBalances.js](file:///e:/Classes/MERN%20-%2012PM/Full%20Stack%20Projects/splitly/server/src/utils/calculateBalances.js) transforms complex debt loops, let's trace a 4-person cycle.

### The Scenario

Imagine these 4 group transactions are logged:

1. **Alice** owes **Bob** **$30**
2. **Bob** owes **Charlie** **$20**
3. **Charlie** owes **David** **$15**
4. **David** owes **Alice** **$10**

Without simplification, these 4 separate payments must be made. Let's see how the algorithm simplifies this.

---

### Step 1: Compute Net Balances

The algorithm loops through all transactions and tallies who is net "in the red" (debtors) and who is net "in the black" (creditors):

- **Alice**:
  - Owes Bob $30 (`-30`)
  - Owed by David $10 (`+10`)
  - **Net Balance** = `-30 + 10` = **-$20** (Debtor)
- **Bob**:
  - Owed by Alice $30 (`+30`)
  - Owes Charlie $20 (`-20`)
  - **Net Balance** = `+30 - 20` = **+$10** (Creditor)
- **Charlie**:
  - Owed by Bob $20 (`+20`)
  - Owes David $15 (`-15`)
  - **Net Balance** = `+20 - 15` = **+$5** (Creditor)
- **David**:
  - Owed by Charlie $15 (`+15`)
  - Owes Alice $10 (`-10`)
  - **Net Balance** = `+15 - 10` = **+$5** (Creditor)

> [!NOTE]
> **The Zero Sum Rule**
> The sum of all net balances must equal zero: `(-20) + (+10) + (+5) + (+5) = 0`. This is double-entry bookkeeping validation.

---

### Step 2: Partition & Sort

The algorithm filters out anyone with a `$0` net balance, splits the remaining users into two arrays, and sorts them descending by absolute value:

- **Debtors Array** (absolute values):
  `debtors = [{ user: 'Alice', amount: 20 }]`
- **Creditors Array**:
  `creditors = [{ user: 'Bob', amount: 10 }, { user: 'Charlie', amount: 5 }, { user: 'David', amount: 5 }]`

---

### Step 3: Two-Pointer Settlement Loop

The algorithm initializes two pointers: `i = 0` (pointing to the largest debtor) and `j = 0` (pointing to the largest creditor) and loops until all debts are settled:

#### **Iteration 1**

- **Active Pair**: Debtor Alice (`$20`) and Creditor Bob (`$10`).
- **Calculation**: Settlement amount = `min(20, 10)` = **$10**.
- **Action**: Record transaction **Alice pays Bob $10**.
- **State Update**:
  - Alice's remaining debt: `20 - 10` = **$10**.
  - Bob's remaining credit: `10 - 10` = **$0** (fully settled).
  - Pointers: Bob is settled, so we increment the creditor pointer (`j++` to index 1: Charlie).

#### **Iteration 2**

- **Active Pair**: Debtor Alice (`$10` remaining) and Creditor Charlie (`$5`).
- **Calculation**: Settlement amount = `min(10, 5)` = **$5**.
- **Action**: Record transaction **Alice pays Charlie $5**.
- **State Update**:
  - Alice's remaining debt: `10 - 5` = **$5**.
  - Charlie's remaining credit: `5 - 5` = **$0** (fully settled).
  - Pointers: Charlie is settled, so we increment the creditor pointer (`j++` to index 2: David).

#### **Iteration 3**

- **Active Pair**: Debtor Alice (`$5` remaining) and Creditor David (`$5`).
- **Calculation**: Settlement amount = `min(5, 5)` = **$5**.
- **Action**: Record transaction **Alice pays David $5**.
- **State Update**:
  - Alice's remaining debt: `5 - 5` = **$0** (fully settled).
  - David's remaining credit: `5 - 5` = **$0** (fully settled).
  - Pointers: Both are settled. We increment both pointers (`i++`, `j++`).
  - Loop exits because we have reached the end of both arrays.

---

### Step 4: Final Output Comparison

| Metric                   | Original                                                                                                 | Simplified                                                                              |
| :----------------------- | :------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------- |
| **Number of Payments**   | 4 payments                                                                                               | **3 payments**                                                                          |
| **Sender Workload**      | 4 people must send money                                                                                 | **Only Alice** has to send money                                                        |
| **List of Transactions** | 1. Alice -> Bob ($30)<br>2. Bob -> Charlie ($20)<br>3. Charlie -> David ($15)<br>4. David -> Alice ($10) | 1. **Alice -> Bob ($10)**<br>2. **Alice -> Charlie ($5)**<br>3. **Alice -> David ($5)** |

By netting the balances, the algorithm completely bypasses the intermediate transactions (e.g. Bob paying Charlie and Charlie paying David), significantly simplifying how debts are cleared within the group!

---

## 9. Greedy Balances vs. Maximum Flow Graph Algorithms

The blog post you read introduces an important constraint that makes the simplification problem NP-Complete: **"No one owes a person that they didn't owe before (or had a path of debt to)."**

Let's compare the algorithm we implemented with the Maximum Flow path reduction algorithm discussed in the blog post.

### The Key Difference: Relationships vs. Totals

- **Greedy Net Balances (Our Code)**: Focuses _exclusively_ on the net sums. It completely ignores who originally owed whom. This results in the absolute minimum number of payments globally, but it can create payments between strangers (e.g., Alice pays Ema directly, even if Alice did not know Ema).
- **Maximum Flow Path Reduction (Blog Post)**: Enforces that we only simplify transactions _along existing paths of debt_. It will never introduce a new payment relationship between two users who had no connection in the original directed graph. It uses Max-Flow algorithms (like Dinic's) to find cycles and redundant paths and prune them.

### Tracing the Blog Post Example

Let's input the blog post's 9 transaction scenario:

1. Gabe owes Bob $30
2. Gabe owes David $10
3. Fred owes Bob $10
4. Fred owes Charlie $30
5. Fred owes David $10
6. Fred owes Ema $10
7. Bob owes Charlie $40
8. Charlie owes David $20
9. David owes Ema $50

#### 1. Under the Max-Flow Path Reduction Algorithm:

- **Result**: **6 transactions** (Figure 3 in the blog post).
- Why? It preserves the constraint that we cannot create new payment paths between unconnected vertices.

#### 2. Under the Greedy Net Balances Algorithm (Our Code):

Let's calculate the net balances:

- Gabe: `-30 (to Bob) - 10 (to David)` = **-$40**
- Fred: `-10 (to Bob) - 30 (to Charlie) - 10 (to David) - 10 (to Ema)` = **-$60**
- Bob: `+30 (from Gabe) + 10 (from Fred) - 40 (to Charlie)` = **$0** (fully settled)
- Charlie: `+30 (from Fred) + 40 (from Bob) - 20 (to David)` = **+$50**
- David: `+10 (from Gabe) + 10 (from Fred) + 20 (from Charlie) - 50 (to Ema)` = **-$10**
- Ema: `+10 (from Fred) + 50 (from David)` = **+$60**

Partitioning and sorting descending:

- **Debtors**: `[ { user: 'Fred', amount: 60 }, { user: 'Gabe', amount: 40 }, { user: 'David', amount: 10 } ]`
- **Creditors**: `[ { user: 'Ema', amount: 60 }, { user: 'Charlie', amount: 50 } ]`

Greedy settlements:

- **Iteration 1**: Fred (`$60`) settles with Ema (`$60`) -> **Fred pays Ema $60** (both settled).
- **Iteration 2**: Gabe (`$40`) settles with Charlie (`$50`) -> **Gabe pays Charlie $40** (Gabe settled, Charlie owes $10).
- **Iteration 3**: David (`$10`) settles with Charlie (`$10` remaining) -> **David pays Charlie $10** (both settled).

**Our Greedy Result**: **3 transactions**!

1. Fred pays Ema $60
2. Gabe pays Charlie $40
3. David pays Charlie $10

### Summary Comparison

| Dimension                   | Greedy Net Balances (Our Code)          | Max-Flow Path Reduction (Blog Post)                     |
| :-------------------------- | :-------------------------------------- | :------------------------------------------------------ |
| **Primary Goal**            | Minimize global number of transactions. | Eliminate cycles and redundancies along existing paths. |
| **Relationship Constraint** | Ignored (strangers can pay each other). | Preserved (no new relations introduced).                |
| **Number of Transactions**  | **3** (Optimal global minimum)          | **6** (Constrained minimum)                             |
| **Complexity**              | $O(N \log N)$ (Highly scalable)         | $O(E^2 V)$ (Heavy graph calculation)                    |

---

## 10. Deep Dive: User Authentication & JWT Session Flow (SaaS Security Pattern)

The authentication system implemented in Splitly follows standard SaaS production security patterns, separating short-lived session access from long-lived token persistencies.

### 1. Token Session Architecture

To balance security and user experience, we implement two types of JSON Web Tokens (JWTs):

- **Access Token**: Short-lived (15 minutes). Sent in the `Authorization: Bearer <token>` header of API requests. It is stored only in the frontend application's memory. It is not saved in database collections, which keeps checks fast.
- **Refresh Token**: Long-lived (7 days). Stored in the database (`refreshtokens` collection) and sent to the client inside a secure, HTTP-only cookie. It is used to fetch a new Access Token once the old one expires.

> [!IMPORTANT]
> **XSS & CSRF Protection**
> By saving the refresh token inside a cookie configured with `httpOnly: true`, `secure: true`, and `sameSite: 'strict'`, we protect the session from Cross-Site Scripting (XSS) script theft and Cross-Site Request Forgery (CSRF) attacks.

---

### 2. The Token Rotation Flow (JWT Refresh Lifecycle)

When the short-lived access token expires, the client calls `POST /api/v1/auth/refresh`. The sequence below details the security checks that occur in the service layer:

```text
  [ Client request to /refresh ]
               │
               ▼
 1. Verify Signature and Expiration ────► Decrypts refresh token using REFRESH_TOKEN_SECRET
               │
               ▼
 2. Check Database Record ──────────────► Finds document in 'refreshtokens' collection
               │
               ├─► Not Found ───────────► Throws 401 Unauthorized
               ├─► Expired (expiresAt) ─► Throws 401 Unauthorized
               ├─► Already Revoked ─────► Throws 401 Unauthorized (Potential Replay Attack!)
               │
               ▼
 3. Revoke Old Token ───────────────────► Sets 'isRevoked = true' and 'revokedAt = Date.now()'
               │
               ▼
 4. Issue New Token Pair ───────────────► Generates new Access & Refresh tokens
               │
               ▼
 5. Save New Refresh Token ─────────────► Saves the new Refresh Token to DB
               │
               ▼
 6. Return Response ────────────────────► Sets new HTTP-only cookie, returns access token
```

---

### 3. Cryptographic UUID Salts (`jti`)

Under the hood of [jwt.service.js](file:///e:/Classes/MERN%20-%2012PM/Full%20Stack%20Projects/splitly/server/src/services/jwt.service.js), we add a unique **JWT ID (`jti`)** using `crypto.randomUUID()` to the payload of both access and refresh tokens:

```javascript
export const signRefreshToken = (userId) => {
  const jti = crypto.randomUUID();
  return jwt.sign({ id: userId, jti }, process.env.REFRESH_TOKEN_SECRET, {
    expiresIn: "7d",
  });
};
```

- **Why?** Since JWT signature outputs are deterministic based on their payload contents and creation timestamp, two tokens created for the same user within the same second would yield identical string outputs. If written to MongoDB concurrently (like during registration and login), they would trigger a duplicate key violation on the unique token index. Appending a random `jti` ensures complete cryptographic uniqueness.
