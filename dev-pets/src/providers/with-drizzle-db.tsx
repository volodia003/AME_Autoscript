import { DatabaseProvider } from "tauri-react-sqlite";
import * as schema from "../lib/db/schema";
import { env } from "../lib/env";

export const withDrizzleDb = (component: () => React.ReactNode) => () => {
  return (
    <DatabaseProvider
      options={{
        schema: schema,
        dbPath: "sqlite:" + env.VITE_DB_NAME + ".db",
        logger: false,
      }}
    >
      {component()}
    </DatabaseProvider>
  );
};
