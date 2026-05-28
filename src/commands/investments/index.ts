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
  investmentOverviewCommand,
  investmentPositionsCommand,
} from "./portfolio.js";
import {
  createTradeCommand,
  deleteTradeCommand,
  updateTradeCommand,
} from "./trades.js";
import {
  createCashAdjustmentCommand,
  deleteCashAdjustmentCommand,
  updateCashAdjustmentCommand,
} from "./cash.js";
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
investmentsCommand.addCommand(createTradeCommand);
investmentsCommand.addCommand(updateTradeCommand);
investmentsCommand.addCommand(deleteTradeCommand);
investmentsCommand.addCommand(createCashAdjustmentCommand);
investmentsCommand.addCommand(updateCashAdjustmentCommand);
investmentsCommand.addCommand(deleteCashAdjustmentCommand);
investmentsCommand.addCommand(listArchivedInvestmentsCommand);
investmentsCommand.addCommand(listArchivedInvestmentItemsCommand);
investmentsCommand.addCommand(restoreArchivedInvestmentsCommand);
investmentsCommand.addCommand(restoreTradeCommand);
investmentsCommand.addCommand(restoreCashAdjustmentCommand);
investmentsCommand.addCommand(permanentDeleteTradeCommand);
investmentsCommand.addCommand(permanentDeleteCashAdjustmentCommand);
investmentsCommand.addCommand(emptyArchivedInvestmentsCommand);
