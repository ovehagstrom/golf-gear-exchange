import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

interface ExternalListingInput {
  source: string
  source_id: string
  title: string
  price?: number
  city?: string
  source_url: string
  image_urls?: string[]
  description?: string
  published_at?: string
  category?: string
}

interface ExtractedSpecs {
  brand?: string
  model?: string
  loft?: string
  shaft_model?: string
  flex?: string
  hand?: string // höger/vänster
}

async function extractSpecs(title: string, description?: string): Promise<ExtractedSpecs> {
  const apiKey = Deno.env.get('LOVABLE_API_KEY')
  if (!apiKey) {
    console.warn('LOVABLE_API_KEY not set, skipping spec extraction')
    return {}
  }

  const text = `${title}${description ? '\n' + description : ''}`

  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `Du är en expert på golfutrustning. Analysera annonstexten och extrahera följande specs som JSON. Svara BARA med JSON, inget annat.
Fält: brand, model, loft, shaft_model, flex, hand (höger/vänster)
Om ett fält inte kan avgöras, utelämna det. Var exakt med märkesnamn (Titleist, TaylorMade, Callaway, Ping, Cobra, Mizuno, Cleveland, Srixon, etc).
Exempel: {"brand":"Titleist","model":"TSR3","loft":"9","flex":"stiff","hand":"höger"}`
          },
          {
            role: 'user',
            content: text
          }
        ],
        temperature: 0.1,
        max_tokens: 200,
      }),
    })

    if (!response.ok) {
      console.error('AI extraction failed:', response.status)
      return {}
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content?.trim() || '{}'
    
    // Extract JSON from potential markdown code blocks
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }
    return {}
  } catch (error) {
    console.error('Spec extraction error:', error)
    return {}
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Verify admin auth
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    // Check admin role
    const { data: { user } } = await supabaseUser.auth.getUser()
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: roleData } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single()

    if (!roleData) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { listings } = await req.json() as { listings: ExternalListingInput[] }

    if (!listings || !Array.isArray(listings) || listings.length === 0) {
      return new Response(JSON.stringify({ error: 'No listings provided' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let imported = 0
    let skipped = 0
    let errors = 0

    for (const listing of listings) {
      if (!listing.source_id || !listing.title || !listing.source_url) {
        errors++
        continue
      }

      // Extract specs using AI
      const specs = await extractSpecs(listing.title, listing.description)

      const { error } = await supabaseAdmin
        .from('external_listings')
        .upsert({
          source: listing.source || 'blocket',
          source_id: listing.source_id,
          title: listing.title,
          price: listing.price || null,
          city: listing.city || null,
          source_url: listing.source_url,
          image_urls: listing.image_urls || [],
          description: listing.description || null,
          published_at: listing.published_at || null,
          category: listing.category || null,
          specs_json: specs,
          is_active: true,
        }, {
          onConflict: 'source,source_id',
          ignoreDuplicates: false,
        })

      if (error) {
        console.error('Insert error:', error)
        errors++
      } else {
        imported++
      }
    }

    return new Response(JSON.stringify({
      success: true,
      imported,
      skipped,
      errors,
      total: listings.length,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(JSON.stringify({ error: 'Unexpected error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
