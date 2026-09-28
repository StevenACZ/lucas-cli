import { apiRequestOrThrow } from "./api-client.js";
import { accountView } from "./views.js";
import { resourcePath } from "./resource-path.js";

type Row = Record<string, unknown>;

// Balances after a write, so agents never need a second `accounts list`. A
// failed read here must not turn a persisted write into an error.
export async function accountsAfterWrite(
  ids: Array<string | undefined>,
): Promise<Row[]> {
  const unique = [...new Set(ids.filter((id): id is string => Boolean(id)))];
  return Promise.all(
    unique.map(async (id) => {
      try {
        const account = await apiRequestOrThrow<Row>(
          "GET",
          resourcePath("/api/accounts", id),
        );
        return accountView(account);
      } catch {
        return { id, balanceUnavailable: true };
      }
    }),
  );
}
