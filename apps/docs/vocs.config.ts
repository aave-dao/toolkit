import { defineConfig } from "vocs";
import { sidebar } from "./sidebar";

export default defineConfig({
  rootDir: ".",
  title: "Aave",
  sidebar,
  topNav: [{ text: "Docs", link: "/docs/getting-started", match: "/docs" }],
});
