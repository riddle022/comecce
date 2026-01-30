import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
        )

        const adminClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // Get the session user
        const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
        if (userError || !user) throw new Error('Unauthorized')

        // Check if user is admin
        const { data: perfil, error: perfilError } = await adminClient
            .from('perfis')
            .select('grupo:grupo_id(permissoes)')
            .eq('id', user.id)
            .single()

        const permissions = (perfil?.grupo as any)?.permissoes
        if (perfilError || !permissions?.admin) {
            throw new Error('Forbidden: Only admins can create users')
        }

        const { email, password, nome, telefone, grupo_id, ativo } = await req.json()

        if (!email || !password || !nome) {
            throw new Error('Invalid request: email, password, and nome are required')
        }

        // 1. Create user in Auth
        const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
            email,
            password,
            email_confirm: true // Auto-confirm email
        })

        if (authError) throw authError
        if (!authData.user) throw new Error('Failed to create user in Auth')

        // 2. Create profile in perfis
        const { error: insertError } = await adminClient
            .from('perfis')
            .insert({
                id: authData.user.id,
                nome,
                email,
                telefone: telefone || null,
                grupo_id: grupo_id || null,
                ativo: ativo !== undefined ? ativo : true
            })

        if (insertError) throw insertError

        return new Response(
            JSON.stringify({ userId: authData.user.id, message: 'User created successfully' }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            }
        )
    } catch (error: any) {
        return new Response(
            JSON.stringify({ error: error.message }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            }
        )
    }
})
