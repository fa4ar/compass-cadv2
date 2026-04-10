import { defineConfig } from "prisma/config";

export default defineConfig({
    schema: "prisma/schema.prisma",
    datasource: {
        url: "postgresql://compasscaduser:TpWV6Ardlk5eBhzqQc@localhost:5432/cadnew?schema=public&sslmode=disable",
    },
});