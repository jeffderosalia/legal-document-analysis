import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {  
  return {
    plugins: [react()],
    define: {
      'process.env': process.env,
      "process.env.NODE_ENV": JSON.stringify(mode),
    },
  };
});
