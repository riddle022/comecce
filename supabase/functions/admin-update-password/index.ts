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
            throw new Error('Forbidden: Only admins can update passwords of other users')
        }

        const { userId, newPassword } = await req.json()

        if (!userId || !newPassword || newPassword.length < 6) {
            throw new Error('Invalid request: userId and newPassword (min 6 chars) are required')
        }

        const { error: updateError } = await adminClient.auth.admin.updateUserById(
            userId,
            { password: newPassword }
        )

        if (updateError) throw updateError

        return new Response(
            JSON.stringify({ message: 'Password updated successfully' }),
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
