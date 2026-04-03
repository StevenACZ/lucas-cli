#!/usr/bin/env node
import { Command } from "commander";
import { maybeNotifyForUpdate } from "./lib/update-notifier.js";
import { CLI_VERSION } from "./lib/version.js";

// Auth
import { loginCommand } from "./commands/auth/login.js";
import { logoutCommand } from "./commands/auth/logout.js";
import { statusCommand } from "./commands/auth/status.js";

// Accounts
import { listAccountsCommand } from "./commands/accounts/list.js";
import { createAccountCommand } from "./commands/accounts/create.js";
import { updateAccountCommand } from "./commands/accounts/update.js";
import { deleteAccountCommand } from "./commands/accounts/delete.js";

// Transactions
import { listTransactionsCommand } from "./commands/transactions/list.js";
import { createTransactionCommand } from "./commands/transactions/create.js";
import { updateTransactionCommand } from "./commands/transactions/update.js";
import { deleteTransactionCommand } from "./commands/transactions/delete.js";

// Transfers
import { listTransfersCommand } from "./commands/transfers/list.js";
import { createTransferCommand } from "./commands/transfers/create.js";
import { updateTransferCommand } from "./commands/transfers/update.js";
import { deleteTransferCommand } from "./commands/transfers/delete.js";

// Subscriptions
import { listSubscriptionsCommand } from "./commands/subscriptions/list.js";
import { createSubscriptionCommand } from "./commands/subscriptions/create.js";
import { updateSubscriptionCommand } from "./commands/subscriptions/update.js";
import { deleteSubscriptionCommand } from "./commands/subscriptions/delete.js";
import { markPaidCommand } from "./commands/subscriptions/mark-paid.js";

// Loans
import { listLoansCommand } from "./commands/loans/list.js";
import { createLoanCommand } from "./commands/loans/create.js";
import { updateLoanCommand } from "./commands/loans/update.js";
import { payLoanCommand } from "./commands/loans/pay.js";
import { markPaidLoanCommand } from "./commands/loans/mark-paid.js";
import { deleteLoanCommand } from "./commands/loans/delete.js";

// Stats
import { summaryCommand } from "./commands/stats/summary.js";
import { monthlyCommand } from "./commands/stats/monthly.js";
import { byCategoryCommand } from "./commands/stats/by-category.js";

// Categories
import { listCategoriesCommand } from "./commands/categories/list.js";

// Exchange rate
import { convertCommand } from "./commands/exchange-rate/convert.js";

const program = new Command();

program
  .name("lucas")
  .description("LucasApp CLI - Financial data management for AI agents")
  .version(CLI_VERSION);

// Grupo: auth
const auth = program.command("auth").description("Authentication commands");
auth.addCommand(loginCommand);
auth.addCommand(logoutCommand);
auth.addCommand(statusCommand);

// Grupo: accounts
const accounts = program
  .command("accounts")
  .description("Manage financial accounts");
accounts.addCommand(listAccountsCommand);
accounts.addCommand(createAccountCommand);
accounts.addCommand(updateAccountCommand);
accounts.addCommand(deleteAccountCommand);

// Grupo: transactions
const transactions = program
  .command("transactions")
  .description("Manage transactions");
transactions.addCommand(listTransactionsCommand);
transactions.addCommand(createTransactionCommand);
transactions.addCommand(updateTransactionCommand);
transactions.addCommand(deleteTransactionCommand);

// Grupo: transfers
const transfers = program.command("transfers").description("Manage transfers");
transfers.addCommand(listTransfersCommand);
transfers.addCommand(createTransferCommand);
transfers.addCommand(updateTransferCommand);
transfers.addCommand(deleteTransferCommand);

// Grupo: subscriptions
const subscriptions = program
  .command("subscriptions")
  .description("Manage subscriptions");
subscriptions.addCommand(listSubscriptionsCommand);
subscriptions.addCommand(createSubscriptionCommand);
subscriptions.addCommand(updateSubscriptionCommand);
subscriptions.addCommand(deleteSubscriptionCommand);
subscriptions.addCommand(markPaidCommand);

// Grupo: loans
const loans = program.command("loans").description("Manage loans");
loans.addCommand(listLoansCommand);
loans.addCommand(createLoanCommand);
loans.addCommand(updateLoanCommand);
loans.addCommand(payLoanCommand);
loans.addCommand(markPaidLoanCommand);
loans.addCommand(deleteLoanCommand);

// Grupo: stats
const stats = program.command("stats").description("Financial statistics");
stats.addCommand(summaryCommand);
stats.addCommand(monthlyCommand);
stats.addCommand(byCategoryCommand);

// Grupo: categories
const categories = program.command("categories").description("View categories");
categories.addCommand(listCategoriesCommand);

// Grupo: exchange-rate
const exchangeRate = program
  .command("exchange-rate")
  .description("Currency exchange");
exchangeRate.addCommand(convertCommand);

await maybeNotifyForUpdate(CLI_VERSION);
await program.parseAsync(process.argv);
