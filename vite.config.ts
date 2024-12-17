import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {  
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  return {
    plugins: [react()],
    define: {
      'process.env.VITE_ANTHROPIC_API_KEY': JSON.stringify(env.VITE_ANTHROPIC_API_KEY),
      'process.env.VITE_FOUNDRY_API_URL': JSON.stringify(env.VITE_FOUNDRY_API_URL),
      'process.env.VITE_FOUNDRY_CLIENT_ID': JSON.stringify(env.VITE_FOUNDRY_CLIENT_ID),
      'process.env.VITE_FOUNDRY_REDIRECT_URL': JSON.stringify(env.VITE_FOUNDRY_REDIRECT_URL),
      'process.env.VITE_OPENAI_API_KEY': JSON.stringify(env.VITE_OPENAI_API_KEY),
     },
  };
});
