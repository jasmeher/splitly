/**
 * Greedy Debt Simplification Algorithm.
 * 
 * Objective: Minimize the total number of transactions required to settle all debts in a group.
 * Example:
 *   - Alice owes Bob $10
 *   - Bob owes Charlie $10
 *   - Simplification: Alice owes Charlie $10 directly (eliminating Bob from the transaction loop).
 * 
 * Flow:
 *   1. Calculate the net balance of every user (Credit - Debt).
 *   2. Group users into Debtors (net balance < 0) and Creditors (net balance > 0).
 *   3. Sort both groups in descending order of absolute value (greedy heuristic).
 *   4. Use a two-pointer approach to match the largest debtor with the largest creditor, 
 *      settle the maximum possible amount, update balances, and move pointers forward.
 */
export const simplifyDebts = (transactions) => {
  // STEP 1: Compute net balances for each participant
  const balances = {}; // Map of username/userId -> net amount (positive = owed money, negative = owes money)

  transactions.forEach(({ from, to, amount }) => {
    // Payer 'from' owes money (reduce their net balance)
    balances[from] = (balances[from] || 0) - amount;
    // Payee 'to' is owed money (increase their net balance)
    balances[to] = (balances[to] || 0) + amount;
  });

  // STEP 2: Partition users into debtors and creditors
  const debtors = [];
  const creditors = [];

  Object.entries(balances).forEach(([user, amount]) => {
    // Math.round(val * 100) / 100 eliminates floating point inaccuracies (e.g. 9.99999999999)
    const roundedAmount = Math.round(amount * 100) / 100;
    if (roundedAmount < 0) {
      // Store absolute value of debt for easier computation
      debtors.push({ user, amount: -roundedAmount });
    } else if (roundedAmount > 0) {
      creditors.push({ user, amount: roundedAmount });
    }
  });

  const simplified = [];

  // STEP 3: Sort descending by amount to settle the largest balances first
  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  let i = 0; // Pointer for debtors
  let j = 0; // Pointer for creditors

  // STEP 4: Two-pointer greedy settlement match
  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];

    // Settle the maximum possible amount between the current debtor and creditor
    const settlementAmount = Math.min(debtor.amount, creditor.amount);

    simplified.push({
      from: debtor.user,
      to: creditor.user,
      amount: Math.round(settlementAmount * 100) / 100
    });

    // Subtract the settled amount from their remaining balances
    debtor.amount -= settlementAmount;
    creditor.amount -= settlementAmount;

    // Move pointers if a user's balance is fully settled (zeroed out)
    if (Math.round(debtor.amount * 100) / 100 === 0) {
      i++;
    }
    if (Math.round(creditor.amount * 100) / 100 === 0) {
      j++;
    }
  }

  return simplified;
};

/*
================================================================================
CODE TRACE AND STATE FLOW WALKTHROUGH FOR STUDENTS
================================================================================

1. INPUT OBJECT PASSED TO THE FUNCTION:
   const transactions = [
     { from: 'Alice', to: 'Bob', amount: 30 },
     { from: 'Bob', to: 'Charlie', amount: 20 },
     { from: 'Charlie', to: 'David', amount: 15 },
     { from: 'David', to: 'Alice', amount: 10 }
   ];

2. STEP-BY-STEP EXECUTION TRACE:

   --- LINE 18: const balances = {}; ---
   State: balances = {}

   --- LINE 20: transactions.forEach(({ from, to, amount }) => { ... }) ---
   - Loop 1 (Alice -> Bob, amount = 30):
     * balances['Alice'] = (undefined || 0) - 30 => -30
     * balances['Bob']   = (undefined || 0) + 30 => 30
   - Loop 2 (Bob -> Charlie, amount = 20):
     * balances['Bob']     = 30 - 20 => 10
     * balances['Charlie'] = (undefined || 0) + 20 => 20
   - Loop 3 (Charlie -> David, amount = 15):
     * balances['Charlie'] = 20 - 15 => 5
     * balances['David']   = (undefined || 0) + 15 => 15
   - Loop 4 (David -> Alice, amount = 10):
     * balances['David'] = 15 - 10 => 5
     * balances['Alice'] = -30 + 10 => -20
   State after Step 1:
     balances = { Alice: -20, Bob: 10, Charlie: 5, David: 5 }

   --- LINE 29: Object.entries(balances).forEach(([user, amount]) => { ... }) ---
   - Entry ['Alice', -20]: roundedAmount = -20 < 0 => debtors.push({ user: 'Alice', amount: 20 })
   - Entry ['Bob', 10]: roundedAmount = 10 > 0 => creditors.push({ user: 'Bob', amount: 10 })
   - Entry ['Charlie', 5]: roundedAmount = 5 > 0 => creditors.push({ user: 'Charlie', amount: 5 })
   - Entry ['David', 5]: roundedAmount = 5 > 0 => creditors.push({ user: 'David', amount: 5 })
   State after Step 2:
     debtors = [ { user: 'Alice', amount: 20 } ]
     creditors = [ { user: 'Bob', amount: 10 }, { user: 'Charlie', amount: 5 }, { user: 'David', amount: 5 } ]

   --- LINE 39: debtors.sort(...); creditors.sort(...); ---
   - debtors (remains sorted): [ { user: 'Alice', amount: 20 } ]
   - creditors (remains sorted): [ { user: 'Bob', amount: 10 }, { user: 'Charlie', amount: 5 }, { user: 'David', amount: 5 } ]

   --- LINE 42: let i = 0, j = 0; ---
   State: i = 0 (points to Alice), j = 0 (points to Bob)

   --- LINE 45: while (i < debtors.length && j < creditors.length) ---
   
   - --- ITERATION 1 ---
     * LINE 46: debtor = debtors[0] => { user: 'Alice', amount: 20 }
     * LINE 47: creditor = creditors[0] => { user: 'Bob', amount: 10 }
     * LINE 50: settlementAmount = Math.min(20, 10) => 10
     * LINE 52: simplified.push({ from: 'Alice', to: 'Bob', amount: 10 })
     * LINE 58: debtor.amount = 20 - 10 => 10
     * LINE 59: creditor.amount = 10 - 10 => 0
     * LINE 62: Math.round(debtor.amount) === 0 => false (i remains 0)
     * LINE 65: Math.round(creditor.amount) === 0 => true (j increments to 1, points to Charlie)
     State:
       debtors = [ { user: 'Alice', amount: 10 } ]
       creditors = [ { user: 'Bob', amount: 0 }, { user: 'Charlie', amount: 5 }, { user: 'David', amount: 5 } ]
       simplified = [ { from: 'Alice', to: 'Bob', amount: 10 } ]

   - --- ITERATION 2 ---
     * LINE 46: debtor = debtors[0] => { user: 'Alice', amount: 10 }
     * LINE 47: creditor = creditors[1] => { user: 'Charlie', amount: 5 }
     * LINE 50: settlementAmount = Math.min(10, 5) => 5
     * LINE 52: simplified.push({ from: 'Alice', to: 'Charlie', amount: 5 })
     * LINE 58: debtor.amount = 10 - 5 => 5
     * LINE 59: creditor.amount = 5 - 5 => 0
     * LINE 62: Math.round(debtor.amount) === 0 => false (i remains 0)
     * LINE 65: Math.round(creditor.amount) === 0 => true (j increments to 2, points to David)
     State:
       debtors = [ { user: 'Alice', amount: 5 } ]
       creditors = [ { user: 'Bob', amount: 0 }, { user: 'Charlie', amount: 0 }, { user: 'David', amount: 5 } ]
       simplified = [ 
         { from: 'Alice', to: 'Bob', amount: 10 },
         { from: 'Alice', to: 'Charlie', amount: 5 }
       ]

   - --- ITERATION 3 ---
     * LINE 46: debtor = debtors[0] => { user: 'Alice', amount: 5 }
     * LINE 47: creditor = creditors[2] => { user: 'David', amount: 5 }
     * LINE 50: settlementAmount = Math.min(5, 5) => 5
     * LINE 52: simplified.push({ from: 'Alice', to: 'David', amount: 5 })
     * LINE 58: debtor.amount = 5 - 5 => 0
     * LINE 59: creditor.amount = 5 - 5 => 0
     * LINE 62: Math.round(debtor.amount) === 0 => true (i increments to 1)
     * LINE 65: Math.round(creditor.amount) === 0 => true (j increments to 3)
     State:
       debtors = [ { user: 'Alice', amount: 0 } ]
       creditors = [ { user: 'Bob', amount: 0 }, { user: 'Charlie', amount: 0 }, { user: 'David', amount: 0 } ]
       simplified = [ 
         { from: 'Alice', to: 'Bob', amount: 10 },
         { from: 'Alice', to: 'Charlie', amount: 5 },
         { from: 'Alice', to: 'David', amount: 5 }
       ]

   - --- LOOP TERMINATES ---
     Condition: i < debtors.length (1 < 1 is false) OR j < creditors.length (3 < 3 is false)

   --- LINE 70: return simplified; ---
   Output returned to caller:
   [
     { from: 'Alice', to: 'Bob', amount: 10 },
     { from: 'Alice', to: 'Charlie', amount: 5 },
     { from: 'Alice', to: 'David', amount: 5 }
   ]
================================================================================
*/
