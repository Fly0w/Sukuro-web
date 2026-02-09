import { defineStore } from 'pinia'
import { createClient } from '@supabase/supabase-js'

export const useAppConfigStore = defineStore('app-config', {
  state: () => ({
    environment: 'dev' as 'dev' | 'prod'
  }),
  
  actions: {
    setEnvironment(env: 'dev' | 'prod') {
      this.environment = env
    },
    
    getSupabaseClient() {
      const config = useRuntimeConfig()
      
      // Si on est en dev, on utilise le client par défaut injecté par le module (qui utilise SUPABASE_URL du .env)
      // Ou on le recrée explicitement pour être sûr
      
      const url = this.environment === 'prod' 
        ? config.public.prodSupabaseUrl 
        : config.public.devSupabaseUrl
        
      const key = this.environment === 'prod' 
        ? config.public.prodSupabaseKey 
        : config.public.devSupabaseKey
        
      if (!url || !key) {
        console.warn(`Credentials manquants pour l'environnement ${this.environment}`)
        // Fallback sur le client par défaut si prod n'est pas configuré
        return useSupabaseClient()
      }
      
      return createClient(url, key)
    }
  }
})
