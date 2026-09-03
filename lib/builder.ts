import { Attribution } from "ox/erc8021";

/**
 * Base Builder Code attribution configuration.
 * @see https://docs.base.org/specifications/builder-codes/overview
 * @see https://docs.base.org/specifications/builder-codes/for-app-developers
 */
export const BUILDER_CODE = "bc_1hvd8159";

export const BUILDER_DATA_SUFFIX = Attribution.toDataSuffix({
  codes: [BUILDER_CODE],
}) as `0x${string}`;
