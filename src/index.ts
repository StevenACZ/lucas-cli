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
import { debtDetailCommand } from "./commands/accounts/debt-detail.js";
import { payExpenseCommand } from "./commands/accounts/pay-expense.js";
import { payExpensesCommand } from "./commands/accounts/pay-expenses.js";
import {
  cashbackAdjustCommand,
  cashbackRedeemCommand,
} from "./commands/accounts/cashback.js";
import { accountsStatsCommand } from "./commands/accounts/stats.js";
import { balanceHistoryCommand } from "./commands/accounts/balance-history.js";
import {
  archiveAccountCommand,
  unarchiveAccountCommand,
} from "./commands/accounts/archive.js";

// Transactions
import { listTransactionsCommand } from "./commands/transactions/list.js";
import { getTransactionCommand } from "./commands/transactions/get.js";
import { createTransactionCommand } from "./commands/transactions/create.js";
import { updateTransactionCommand } from "./commands/transactions/update.js";
import { deleteTransactionCommand } from "./commands/transactions/delete.js";
import { duplicateTransactionCommand } from "./commands/transactions/duplicate.js";

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
import { subscriptionCalendarCommand } from "./commands/subscriptions/calendar.js";
import { subscriptionServicesCommand } from "./commands/subscriptions/services.js";
import { subscriptionChargesCommand } from "./commands/subscription-charges/index.js";
import { subscriptionGroupsCommand } from "./commands/subscription-groups/index.js";
import { settingsCommand } from "./commands/settings/index.js";

// Loans
import { listLoansCommand } from "./commands/loans/list.js";
import { createLoanCommand } from "./commands/loans/create.js";
import { updateLoanCommand } from "./commands/loans/update.js";
import { payLoanCommand } from "./commands/loans/pay.js";
import { markPaidLoanCommand } from "./commands/loans/mark-paid.js";
import { unmarkPaidLoanCommand } from "./commands/loans/unmark-paid.js";
import { deleteLoanCommand } from "./commands/loans/delete.js";

// Stats
import { summaryCommand } from "./commands/stats/summary.js";
import { overviewCommand } from "./commands/stats/overview.js";
import { monthlyCommand } from "./commands/stats/monthly.js";
import { byCategoryCommand } from "./commands/stats/by-category.js";

// Categories
import { listCategoriesCommand } from "./commands/categories/list.js";

// Exchange rate
import { convertCommand } from "./commands/exchange-rate/convert.js";
import { bcrCommand } from "./commands/exchange-rate/bcr.js";

// AI
import { aiUsageCommand } from "./commands/ai/usage.js";
import { aiInsightsCommand } from "./commands/ai/insights.js";
import { parseExpensesCommand } from "./commands/ai/parse-expenses.js";
import { parseExpensesImageCommand } from "./commands/ai/parse-expenses-image.js";

// Trash
import { trashCommand } from "./commands/trash/index.js";

const program = new Command();

program
  .name("lucas")
  .description("LucasApp CLI - Financial data management for AI agents")
  .version(CLI_VERSION);

// Group: auth
const auth = program.command("auth").description("Authentication commands");
auth.addCommand(loginCommand);
auth.addCommand(logoutCommand);
auth.addCommand(statusCommand);

// Group: accounts
const accounts = program
  .command("accounts")
  .description("Manage financial accounts");
accounts.addCommand(listAccountsCommand);
accounts.addCommand(createAccountCommand);
accounts.addCommand(updateAccountCommand);
accounts.addCommand(deleteAccountCommand);
accounts.addCommand(debtDetailCommand);
accounts.addCommand(payExpenseCommand);
accounts.addCommand(payExpensesCommand);
accounts.addCommand(cashbackRedeemCommand);
accounts.addCommand(cashbackAdjustCommand);
accounts.addCommand(accountsStatsCommand);
accounts.addCommand(balanceHistoryCommand);
accounts.addCommand(archiveAccountCommand);
accounts.addCommand(unarchiveAccountCommand);

// Group: transactions
const transactions = program
  .command("transactions")
  .description("Manage transactions");
transactions.addCommand(listTransactionsCommand);
transactions.addCommand(getTransactionCommand);
transactions.addCommand(createTransactionCommand);
transactions.addCommand(updateTransactionCommand);
transactions.addCommand(deleteTransactionCommand);
transactions.addCommand(duplicateTransactionCommand);

// Group: transfers
const transfers = program.command("transfers").description("Manage transfers");
transfers.addCommand(listTransfersCommand);
transfers.addCommand(createTransferCommand);
transfers.addCommand(updateTransferCommand);
transfers.addCommand(deleteTransferCommand);

// Group: subscriptions
const subscriptions = program
  .command("subscriptions")
  .description("Manage subscriptions");
subscriptions.addCommand(listSubscriptionsCommand);
subscriptions.addCommand(createSubscriptionCommand);
subscriptions.addCommand(updateSubscriptionCommand);
subscriptions.addCommand(deleteSubscriptionCommand);
subscriptions.addCommand(markPaidCommand);
subscriptions.addCommand(subscriptionCalendarCommand);
subscriptions.addCommand(subscriptionServicesCommand);

program.addCommand(subscriptionGroupsCommand);
program.addCommand(subscriptionChargesCommand);
program.addCommand(settingsCommand);

// Group: loans
const loans = program.command("loans").description("Manage loans");
loans.addCommand(listLoansCommand);
loans.addCommand(createLoanCommand);
loans.addCommand(updateLoanCommand);
loans.addCommand(payLoanCommand);
loans.addCommand(markPaidLoanCommand);
loans.addCommand(unmarkPaidLoanCommand);
loans.addCommand(deleteLoanCommand);

// Group: stats
const stats = program.command("stats").description("Financial statistics");
stats.addCommand(summaryCommand);
stats.addCommand(overviewCommand);
stats.addCommand(monthlyCommand);
stats.addCommand(byCategoryCommand);

// Group: categories
const categories = program.command("categories").description("View categories");
categories.addCommand(listCategoriesCommand);

// Group: exchange-rate
const exchangeRate = program
  .command("exchange-rate")
  .description("Currency exchange");
exchangeRate.addCommand(convertCommand);
exchangeRate.addCommand(bcrCommand);

// Group: ai
const ai = program.command("ai").description("LucasApp AI tools");
ai.addCommand(aiUsageCommand);
ai.addCommand(aiInsightsCommand);
ai.addCommand(parseExpensesCommand);
ai.addCommand(parseExpensesImageCommand);

// Group: trash
program.addCommand(trashCommand);

// Group: investments (experimental; backend gates it behind the same flag)
if (process.env.LUCAS_INVESTMENTS === "1") {
  const { investmentsCommand } =
    await import("./commands/investments/index.js");
  investmentsCommand.description(
    "Manage investment accounts, positions, trades, and catalog (EXPERIMENTAL; requires LUCAS_INVESTMENTS=1 and a backend with investments enabled)",
  );
  program.addCommand(investmentsCommand);
}

await program.parseAsync(process.argv);
await maybeNotifyForUpdate(CLI_VERSION);
