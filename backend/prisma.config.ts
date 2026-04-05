import { defineConfig, env } from "prisma/config";
import * as dotenv from "dotenv";

// Явно загружаем .env файл
dotenv.config({ path: "../.env" });

export default defineConfig({
    schema: "prisma/schema.prisma",
    datasource: {
        url: env("DATABASE_URL"),
    },
});