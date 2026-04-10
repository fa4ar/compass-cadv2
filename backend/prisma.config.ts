import { defineConfig } from "prisma/config";

export default defineConfig({
    schema: "prisma/schema.prisma",
    datasource: {
        url: "postgresql://postgres:administratorpassword@localhost:5433/cadnew",
    },
});