// https://nuxt.com/docs/api/configuration/nuxt-config
import tailwindcss from "@tailwindcss/vite";

export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  modules: [
    "@pinia/nuxt",
    "shadcn-nuxt",
    "@nuxtjs/supabase",
    "@nuxtjs/color-mode",
  ],
  vite: {
    plugins: [tailwindcss()],
  },
  css: ["~/assets/css/tailwind.css"],
  shadcn: {
    prefix: "",
    componentDir: "@/components/ui",
  },
  supabase: {
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_KEY,
    redirect: false
  },
  runtimeConfig: {
    public: {
      devSupabaseUrl: process.env.SUPABASE_URL,
      devSupabaseKey: process.env.SUPABASE_KEY,
      prodSupabaseUrl: process.env.PROD_SUPABASE_URL,
      prodSupabaseKey: process.env.PROD_SUPABASE_KEY,
    }
  },
  colorMode: {
    classSuffix: '',
    preference: 'dark', // Force le mode sombre par défaut
    fallback: 'dark'
  }
});
