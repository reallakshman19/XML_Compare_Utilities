/*
 * CII v14 Find & Replace contract boundary.
 *
 * This module does not mutate XML.
 * It converts approved CII review data into a transaction proposal
 * consumed by the future validation/apply layer.
 */

export function createFindReplaceTransaction(input) {
  return {
    version: "v14",
    sourceHash: input?.sourceHash ?? null,
    operations: Array.isArray(input?.operations)
      ? input.operations.map((operation) => ({
          scope: operation.scope ?? "UNKNOWN",
          entity: operation.entity ?? null,
          id: operation.id ?? null,
          field: operation.field ?? null,
          before: operation.before ?? null,
          after: operation.after ?? null,
          status: "PROPOSED"
        }))
      : []
  };
}

export function validateMutationBoundary(transaction) {
  return {
    canApply: false,
    reason: "Preview and validation gate required before XML mutation",
    transaction
  };
}