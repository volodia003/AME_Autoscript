
import { pgTable, serial, text } from "drizzle-orm/pg-core";


export const userTable = pgTable( "user", {
    id: serial("id").primaryKey(),
    initData: text('name').notNull()
})