import { Argument, Command } from "commander";
import { output } from "../lib/output.js";

export interface GuideStep {
  command: string;
  why: string;
}

export interface Guide {
  title: string;
  when: string;
  steps: GuideStep[];
  mistakes: string[];
}

export const GUIDES: Record<string, Guide> = {
  expense: {
    title: "Record an expense",
    when: "Money left one of your accounts for a purchase, bill or service.",
    steps: [
      {
        command: "lucas accounts list",
        why: "Find the paying account; names resolve ignoring case and accents.",
      },
      {
        command: "lucas categories list --type EXPENSE",
        why: "Pick an expense category by name or slug.",
      },
      {
        command:
          'lucas transactions create --account "ITK Soles" --type EXPENSE --amount 42.90 --description "Supermercado" --category Food --date today --dry-run',
        why: "Check the resolved account, category and date without writing.",
      },
      {
        command:
          'lucas transactions create --account "ITK Soles" --type EXPENSE --amount 42.90 --description "Supermercado" --category Food --date today',
        why: "Create it; the response carries the account balance after the write.",
      },
    ],
    mistakes: [
      "Amounts are positive; the direction comes from --type EXPENSE, never from a minus sign.",
      "A credit-card purchase is an EXPENSE on the card account itself, not on the bank account that later pays the card (guide card-purchase).",
      "Money moved between your own accounts is a transfer (guide transfer), not an expense plus an income; that double-counts spending.",
      "Do not record an expense that loans pay, subscription-charges pay or subscriptions mark-paid already booked; those commands create their own movement.",
      "A plain YYYY-MM-DD --date is stored at 12:00 local time; pass YYYY-MM-DDTHH:mm when the hour matters.",
    ],
  },
  "card-purchase": {
    title: "Record a credit-card purchase",
    when: "You bought something with a credit card.",
    steps: [
      {
        command: "lucas accounts list",
        why: "Find the CREDIT account; it shows currentDebt and availableCredit.",
      },
      {
        command:
          'lucas transactions create --account "Visa Signature" --type EXPENSE --amount 120 --description "Supermercado" --category Food --dry-run',
        why: "Check the resolved card and category without writing.",
      },
      {
        command:
          'lucas transactions create --account "Visa Signature" --type EXPENSE --amount 120 --description "Supermercado" --category Food',
        why: "Create it; the card's currentDebt grows by the amount.",
      },
      {
        command: 'lucas accounts debt-detail "Visa Signature" --only-pending',
        why: "Confirm the purchase is listed as pending card debt.",
      },
    ],
    mistakes: [
      "Book the purchase on the card, not on the bank account; the bank balance only moves when you pay the card (guide card-payment).",
      "Paying the card later is not a second expense; the spending is counted once, at the purchase.",
      "Cashback accrues from the card's rate; pass --cashback-amount only to override it with what the bank really credited, and only on a card with cashback enabled.",
    ],
  },
  "card-payment": {
    title: "Pay a credit card",
    when: "You paid part or all of a credit card's debt.",
    steps: [
      {
        command: 'lucas accounts debt-detail "Visa Signature" --only-pending',
        why: "List the pending expenses with their ids and remaining amounts.",
      },
      {
        command:
          'lucas accounts pay-expenses "Visa Signature" --source ACCOUNT --from-account "ITK Soles" --item <expense-id> --item <expense-id>=50 --dry-run',
        why: "Check the settlement request; omit =amount to pay an expense's full remaining.",
      },
      {
        command:
          'lucas accounts pay-expenses "Visa Signature" --source ACCOUNT --from-account "ITK Soles" --item <expense-id> --item <expense-id>=50',
        why: "Settle the expenses atomically; the response carries both balances.",
      },
    ],
    mistakes: [
      'Every settled expense gets its own "Pago: <expense description>" leg linked to it: a transfer from the funding account with --source ACCOUNT, an INCOME on the card with EXTERNAL, "Pago con cashback: ..." with CASHBACK. Those legs are the payment, not duplicates.',
      'Never delete "Pago:" legs to tidy up and never add another transfer or expense for the same payment; deleting a leg removes the settlement and the expense is pending again.',
      "A plain transfers create into the card lowers the debt but settles the oldest open expenses first, not the ones you meant; use pay-expense or pay-expenses to settle specific expenses.",
      "--source ACCOUNT needs --from-account in the card's currency; another credit card can only fund it from its balance in favor.",
      "pay-expenses is all-or-nothing and takes up to 50 --item values; use pay-expense for a single expense.",
    ],
  },
  transfer: {
    title: "Move money between your accounts",
    when: "Money moved between two of your own accounts, optionally with a bank fee.",
    steps: [
      {
        command:
          'lucas transfers create --from-account "ITK Soles" --to-account "ITK Dólares" --amount 370 --to-amount 100 --fee 2.50 --fee-category "Bank fees" --dry-run',
        why: "Check both accounts, the arriving amount and the fee without writing.",
      },
      {
        command:
          'lucas transfers create --from-account "ITK Soles" --to-account "ITK Dólares" --amount 370 --to-amount 100 --fee 2.50 --fee-category "Bank fees"',
        why: "Create the transfer and its fee in one atomic write.",
      },
    ],
    mistakes: [
      "--amount is what leaves the source without the fee; --fee is booked as a separate EXPENSE on the source in the same write. Do not add the fee into --amount or create the fee expense yourself.",
      "Cross-currency: pass --to-amount (what really arrived) or --rate; otherwise the market rate decides the arriving amount.",
      "A transfer is neither income nor spending; do not also create an INCOME/EXPENSE pair for it.",
      "--fee-description and --fee-category need --fee.",
      "Paying a credit card with a transfer settles its oldest expenses first; use guide card-payment to settle specific ones.",
    ],
  },
  "loan-payment": {
    title: "Pay a loan installment",
    when: "You paid money toward a loan.",
    steps: [
      {
        command: 'lucas loans get "Car loan"',
        why: "See the next installment, what it still owes and the loan currency; the loan takes its name or id.",
      },
      {
        command:
          'lucas loans pay "Car loan" --amount 350 --account "ITK Soles" --dry-run',
        why: "Check the resolved loan, paying account and body without writing.",
      },
      {
        command:
          'lucas loans pay "Car loan" --amount 350 --account "ITK Soles" --verified',
        why: "Pay and re-read the loan to verify the server state.",
      },
    ],
    mistakes: [
      "loans pay and loans mark-paid both post a real payment: mark-paid is loans pay with --amount set to the whole remaining of the next pending installment, late fees included. Neither one only marks.",
      'The expense "Pago préstamo - <loan>" is booked only when you pass --account; without it the loan balance drops but no movement is recorded and no account balance changes. The loan\'s default paying account is not used automatically.',
      "With --account the payment is in that account's currency (it overrides --currency); when it differs from the loan currency pass --loan-amount or --exchange-rate.",
      "An accepted payment exits 0 even when data.verification.verified is false or null; it is persisted, so never retry it. Check with loans get.",
      "To undo a payment use loans unmark-paid (guide undo); deleting its expense leaves the loan payment in place.",
    ],
  },
  "subscription-charge": {
    title: "Pay a subscription charge",
    when: "A subscription or service bill was charged.",
    steps: [
      {
        command: "lucas subscription-charges pending",
        why: "List pending and overdue charges with their ids.",
      },
      {
        command: "lucas subscription-charges pay <charge-id> --dry-run",
        why: "Check the request without writing.",
      },
      {
        command: "lucas subscription-charges pay <charge-id>",
        why: "Pay it; the subscription moves to its next billing date.",
      },
    ],
    mistakes: [
      "subscription-charges pay books an EXPENSE named after the subscription on its linked account; subscription-charges mark-paid only marks the charge PAID and never books a movement. Without a linked account pay also only marks.",
      "subscriptions mark-paid <subscription> is a pay, not a mark: it pays the latest unpaid charge (creating the charge for nextBilling when there is none) and books the expense when the subscription has a linked account.",
      "Do not also create the expense with transactions create; when an expense is already linked to the charge, pay confirms it instead of charging twice.",
      "To undo use subscription-charges revert-payment <charge-id>: it only works on the subscription's latest paid charge and also removes the booked expense. Deleting the expense alone leaves the charge PAID.",
    ],
  },
  undo: {
    title: "Undo a movement or payment",
    when: "Something was recorded by mistake.",
    steps: [
      {
        command: "lucas transactions delete <transaction-id>",
        why: "Move an income or expense to the trash and restore the balance.",
      },
      {
        command: "lucas transfers delete <transfer-id>",
        why: "Move a transfer and both legs to the trash.",
      },
      {
        command: "lucas trash transactions",
        why: "Find a deleted transaction.",
      },
      {
        command: "lucas trash restore-transaction <transaction-id>",
        why: "Bring it back with its balance effect.",
      },
      {
        command: "lucas trash restore-transfer <transfer-id>",
        why: "Bring a transfer back with its balance effects.",
      },
      {
        command: 'lucas loans unmark-paid "Car loan" --dry-run',
        why: "See which loan payment would be reversed (default: the most recent).",
      },
      {
        command: 'lucas loans unmark-paid "Car loan"',
        why: "Reverse it and remove its expense; add --payment-id for an older one.",
      },
      {
        command: "lucas subscription-charges revert-payment <charge-id>",
        why: "Reopen the latest paid charge of a subscription and remove its expense.",
      },
    ],
    mistakes: [
      "Soft deletes (transactions delete, transfers delete) need no --yes; it is accepted and ignored. Only trash permanent-delete-* and trash empty-* need --yes, and they are irreversible.",
      "accounts delete, loans delete and subscriptions delete are permanent too (they need --yes); there is no trash for them.",
      'transactions delete refuses transfer legs, including card "Pago:" legs paid with --source ACCOUNT; use transfers delete.',
      "Deleting the expense of a loan payment or subscription charge leaves the payment in place; use loans unmark-paid or subscription-charges revert-payment.",
    ],
  },
  "bulk-import": {
    title: "Import many incomes and expenses",
    when: "You have a statement or list of movements to record at once.",
    steps: [
      {
        command:
          "lucas transactions create-many --file expenses.json --dry-run",
        why: "Validate every row and see the grouped requests without writing.",
      },
      {
        command: "lucas transactions create-many --file expenses.json",
        why: "Create them; read data.created and data.skipped.",
      },
    ],
    mistakes: [
      "Rows are INCOME or EXPENSE only (account, type, amount, description, category, date, notes); transfers and card payments go through their own commands.",
      "Every row is validated before anything is written; one bad row fails the whole file with details.errors.",
      "A row matching an existing movement (same day, type, amount and a matching description) is skipped, not created; read data.skipped before assuming everything was imported.",
      "date defaults to today; set it on every row copied from a statement.",
    ],
  },
};

export const guideCommand = new Command("guide")
  .description(
    "Step-by-step recipes with the common mistakes for writes (list topics without an argument)",
  )
  .addArgument(
    new Argument("[topic]", "Guide topic").choices(Object.keys(GUIDES)),
  )
  .action((topic: string | undefined) => {
    if (!topic) {
      const rows = Object.entries(GUIDES).map(([name, guide]) => ({
        topic: name,
        title: guide.title,
        when: guide.when,
      }));
      output.success(rows, { count: rows.length });
      return;
    }
    output.success({ topic, ...GUIDES[topic] });
  });
