import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

// ============================================================
// Source fetchers — add new sources here
// Each returns an array of ExternalListingInput objects
// ============================================================

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

/**
 * Placeholder: Blocket fetcher
 * Replace this with actual scraping/API logic when ready.
 * For now returns empty array — no mock data in production.
 */
async function fetchBlocket(): Promise<ExternalListingInput[]> {
  console.log('[Blocket] Fetcher not yet implemented — skipping')
  return []
}

/**
 * Placeholder: Tradera fetcher
 */
async function fetchTradera(): Promise<ExternalListingInput[]> {
  console.log('[Tradera] Fetcher not yet implemented — skipping')
  return []
}

/**
 * Placeholder: Facebook Marketplace fetcher
 */
async function fetchFacebook(): Promise<ExternalListingInput[]> {
  console.log('[Facebook] Fetcher not yet implemented — skipping')
  return []
}

// Registry of all source fetchers
const SOURCE_FETCHERS: Record<string, () => Promise<ExternalListingInput[]>> = {
  blocket: fetchBlocket,
  tradera: fetchTradera,
  facebook: fetchFacebook,
}

// ============================================================
// AI spec extraction (same logic as import-external-listings)
// ============================================================

async function extractSpecs(title: string, description?: string): Promise<Record<string, string>> {
  const apiKey = Deno.env.get('LOVABLE_API_KEY')
  if (!apiKey) return {}

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
Om ett fält inte kan avgöras, utelämna det.`,
          },
          { role: 'user', content: text },
        ],
        temperature: 0.1,
        max_tokens: 200,
      }),
    })

    if (!response.ok) return {}

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content?.trim() || '{}'
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    return jsonMatch ? JSON.parse(jsonMatch[0]) : {}
  } catch {
    return {}
  }
}

// ============================================================
// Main handler
// ============================================================

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  // Security: only allow calls with service role or with the correct Authorization header
  // from pg_cron (which sends the anon key). We verify by checking a shared secret
  // or simply trust the internal network. For extra safety we check Authorization.
  const authHeader = req.headers.get('Authorization')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  
  if (!authHeader || !authHeader.includes(anonKey || '___never_match___')) {
    // Also allow service role
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!authHeader || !authHeader.includes(serviceKey || '___never_match___')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
  }

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // Optionally allow specifying which sources to run via body
  let sourcesToRun = Object.keys(SOURCE_FETCHERS)
  try {
    const body = await req.json().catch(() => ({}))
    if (body.sources && Array.isArray(body.sources)) {
      sourcesToRun = body.sources.filter((s: string) => s in SOURCE_FETCHERS)
    }
  } catch {
    // No body — run all sources
  }

  const results: Record<string, { imported: number; skipped: number; error?: string }> = {}

  for (const source of sourcesToRun) {
    const fetcher = SOURCE_FETCHERS[source]
    let imported = 0
    let skipped = 0
    let errorMessage: string | null = null

    try {
      console.log(`[${source}] Starting fetch...`)
      const listings = await fetcher()
      console.log(`[${source}] Fetched ${listings.length} listings`)

      if (listings.length === 0) {
        skipped = 0
        imported = 0
      } else {
        // Process each listing: extract specs + upsert
        for (const listing of listings) {
          if (!listing.source_id || !listing.title || !listing.source_url) {
            skipped++
            continue
          }

          const specs = await extractSpecs(listing.title, listing.description)

          const { error } = await supabaseAdmin
            .from('external_listings')
            .upsert({
              source: listing.source || source,
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
            console.error(`[${source}] Upsert error:`, error)
            skipped++
          } else {
            imported++
          }
        }
      }
    } catch (err) {
      console.error(`[${source}] Fatal error:`, err)
      errorMessage = err instanceof Error ? err.message : 'Unknown error'
    }

    // Log to external_import_logs
    await supabaseAdmin.from('external_import_logs').insert({
      source,
      imported_count: imported,
      skipped_duplicates_count: skipped,
      status: errorMessage ? 'error' : 'success',
      error_message: errorMessage,
    })

    results[source] = { imported, skipped, ...(errorMessage ? { error: errorMessage } : {}) }
    console.log(`[${source}] Done: ${imported} imported, ${skipped} skipped`)
  }

  return new Response(JSON.stringify({ success: true, results }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
