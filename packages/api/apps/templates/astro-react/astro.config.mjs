// @ts-check
import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import tailwind from "@astrojs/tailwind";
import sitemap from "@astrojs/sitemap";
import db from "@astrojs/db";

// https://astro.build/config
export default defineConfig({
  integrations: [
    react(),
    db(),
    sitemap(),
    tailwind({
      applyBaseStyles: false,
    }),
  ],
  output: "server",

})