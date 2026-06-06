import { Command } from "commander";
import {
  getInstrumentCommand,
  listInstrumentsCommand,
  searchInstrumentsCommand,
} from "./instruments.js";
import { refreshInvestmentsCommand } from "./refresh.js";
import {
  investmentActivityCommand,
  investmentHistoryCommand,
  investmentHistoryBackfillCommand,
  investmentOverviewCommand,
  investmentPositionsCommand,
  investmentReportCommand,
} from "./portfolio.js";
import {
  buyTradeCommand,
  createTradeCommand,
  deleteTradeCommand,
  sellTradeCommand,
  updateTradeCommand,
} from "./trades.js";
import {
  cashCommand,
  createCashAdjustmentCommand,
  deleteCashAdjustmentCommand,
  updateCashAdjustmentCommand,
} from "./cash.js";
import { importInvestmentsCommand } from "./import.js";
import { investmentTransferCommand } from "./transfer.js";
import {
  listArchivedInvestmentItemsCommand,
  listArchivedInvestmentsCommand,
  restoreArchivedInvestmentsCommand,
  restoreCashAdjustmentCommand,
  restoreTradeCommand,
  permanentDeleteCashAdjustmentCommand,
  permanentDeleteTradeCommand,
  emptyArchivedInvestmentsCommand,
} from "./archive.js";

export const investmentsCommand = new Command("investments").description(
  "Manage investment accounts, positions, trades, and catalog",
);

investmentsCommand.addCommand(listInstrumentsCommand);
investmentsCommand.addCommand(searchInstrumentsCommand);
investmentsCommand.addCommand(getInstrumentCommand);
investmentsCommand.addCommand(refreshInvestmentsCommand);
investmentsCommand.addCommand(investmentOverviewCommand);
investmentsCommand.addCommand(investmentPositionsCommand);
investmentsCommand.addCommand(investmentActivityCommand);
investmentsCommand.addCommand(investmentHistoryCommand);
investmentsCommand.addCommand(investmentHistoryBackfillCommand);
investmentsCommand.addCommand(investmentReportCommand);
investmentsCommand.addCommand(createTradeCommand);
investmentsCommand.addCommand(buyTradeCommand);
investmentsCommand.addCommand(sellTradeCommand);
investmentsCommand.addCommand(cashCommand);
investmentsCommand.addCommand(updateTradeCommand);
investmentsCommand.addCommand(deleteTradeCommand);
investmentsCommand.addCommand(createCashAdjustmentCommand);
investmentsCommand.addCommand(updateCashAdjustmentCommand);
investmentsCommand.addCommand(deleteCashAdjustmentCommand);
investmentsCommand.addCommand(investmentTransferCommand);
investmentsCommand.addCommand(importInvestmentsCommand);
investmentsCommand.addCommand(listArchivedInvestmentsCommand);
investmentsCommand.addCommand(listArchivedInvestmentItemsCommand);
investmentsCommand.addCommand(restoreArchivedInvestmentsCommand);
investmentsCommand.addCommand(restoreTradeCommand);
investmentsCommand.addCommand(restoreCashAdjustmentCommand);
investmentsCommand.addCommand(permanentDeleteTradeCommand);
investmentsCommand.addCommand(permanentDeleteCashAdjustmentCommand);
investmentsCommand.addCommand(emptyArchivedInvestmentsCommand);
