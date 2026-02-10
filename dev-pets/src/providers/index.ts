import compose from "compose-function";
import { withRouting } from "./with-routing";
import { withAuth } from "./with-auth";
import { withDrizzleDb } from "./with-drizzle-db";
import { withQuery } from "./with-query";
import { withEvents } from "./with-events";

export const withProviders = compose(
    withRouting,
    withAuth,
    withDrizzleDb,
    withQuery,
    withEvents
);