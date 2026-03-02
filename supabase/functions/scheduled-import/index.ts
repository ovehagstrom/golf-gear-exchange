import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

// ============================================================
// Types
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

interface ImportStats {
  imported: number
  skipped_duplicates: number
  skipped_keyword_filtered: number
  skipped_non_golf: number
  error?: string
}

// ============================================================
// Configurable keyword blocklist
// ============================================================

const EXCLUDED_KEYWORDS = [
  'volkswagen', 'vw', 'bil', '1.6 tdi', 'tsi', 'gti', 'r-line', 'variant',
  'hyundai', 'toyota', 'volvo xc', 'bmw', 'audi', 'mercedes', 'skoda',
  'opel', 'ford focus', 'kia', 'mazda', 'nissan', 'peugeot', 'renault',
  'lägenhet', 'bostad', 'hyra', 'tjänst', 'jobb', 'arbete',
]

function isKeywordFiltered(title: string, description?: string): boolean {
  const text = `${title} ${description ?? ''}`.toLowerCase()
  return EXCLUDED_KEYWORDS.some(kw => text.includes(kw))
}

// ============================================================
// AI golf classifier — runs BEFORE spec extraction to save cost
// ============================================================

async function isGolfEquipment(title: string, description?: string): Promise<boolean> {
  const apiKey = Deno.env.get('LOVABLE_API_KEY')
  if (!apiKey) {
    console.warn('[AI] LOVABLE_API_KEY not set — skipping classification, accepting ad')
    return true
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
        model: 'google/gemini-2.5-flash-lite',
        messages: [
          {
            role: 'system',
            content: 'Du klassificerar annonser. Svara BARA med "JA" eller "NEJ", inget annat.',
          },
          {
            role: 'user',
            content: `Är detta en annons för fysisk golfutrustning (klubbor, set, shafts, bollar, bagar, golfkläder, golfvagnar, rangefinders, tees)? Annonstext: "${text}"`,
          },
        ],
        temperature: 0,
        max_tokens: 5,
      }),
    })

    if (!response.ok) {
      console.error(`[AI] Classification failed HTTP ${response.status}`)
      return true // fail-open: accept if AI is down
    }

    const data = await response.json()
    const answer = (data.choices?.[0]?.message?.content ?? '').trim().toUpperCase()
    console.log(`[AI] Classification for "${title.substring(0, 40)}": ${answer}`)
    return answer.startsWith('JA')
  } catch (err) {
    console.error('[AI] Classification error:', err)
    return true // fail-open
  }
}

// ============================================================
// AI spec extraction
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
// Source fetchers
// ============================================================

async function fetchBlocket(): Promise<ExternalListingInput[]> {
  const API_URL = 'https://www.blocket.se/recommerce/forsale/search/api/search/SEARCH_ID_BAP_COMMON'
  const TIMEOUT_MS = 15_000
  const results: ExternalListingInput[] = []

  const params = new URLSearchParams({
    q: 'golf',
    lim: '40',
    sort: 'PUBLISHED_DESC',
    category: '0.86', // Fritid, Hobby & Underhållning
  })

  const url = `${API_URL}?${params.toString()}`
  console.log(`[Blocket] Fetching from API: ${url}`)

  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; GolfMarket/1.0)',
        'Accept': 'application/json',
      },
    })
    clearTimeout(timer)

    console.log(`[Blocket] HTTP ${response.status}`)

    if (!response.ok) {
      const body = await response.text().catch(() => '')
      console.error(`[Blocket] API error ${response.status}: ${body.substring(0, 300)}`)
      return []
    }

    const data = await response.json()
    const ads = data?.docs || data?.data || []
    console.log(`[Blocket] API returned ${ads.length} ads`)

    if (ads.length === 0) {
      console.warn('[Blocket] API returned 0 ads')
      return []
    }

    for (let i = 0; i < ads.length; i++) {
      try {
        const ad = ads[i]
        const id = ad.id || ad.ad_id?.toString()
        const heading = ad.heading || ad.title
        const canonicalUrl = ad.canonical_url
          ? (ad.canonical_url.startsWith('http') ? ad.canonical_url : `https://www.blocket.se${ad.canonical_url}`)
          : `https://www.blocket.se/annons/${id}`

        if (!id || !heading) continue

        const price = ad.price?.amount || undefined
        const location = ad.location || undefined
        const imageUrls = ad.image_urls?.length ? ad.image_urls : (ad.image?.url ? [ad.image.url] : [])

        let timestamp: string | undefined
        if (ad.timestamp) {
          const ts = Number(ad.timestamp)
          const dateMs = ts > 32503680000 ? ts : ts * 1000
          const d = new Date(dateMs)
          if (d.getFullYear() >= 2020 && d.getFullYear() <= 2030) {
            timestamp = d.toISOString()
          }
        }

        results.push({
          source: 'blocket',
          source_id: id.toString(),
          title: heading,
          price,
          city: location,
          source_url: canonicalUrl,
          image_urls: imageUrls,
          description: undefined,
          published_at: timestamp,
          category: 'golf',
        })
      } catch (itemErr) {
        console.warn(`[Blocket] Ad ${i + 1} parse error:`, itemErr)
      }
    }
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      console.error(`[Blocket] Request timed out after ${TIMEOUT_MS}ms`)
    } else {
      console.error('[Blocket] Fetch error:', err)
    }
    return []
  }

  console.log(`[Blocket] Fetched ${results.length} raw ads (pre-filter)`)
  return results
}

async function fetchTradera(): Promise<ExternalListingInput[]> {
  console.log('[Tradera] Fetcher not yet implemented — skipping')
  return []
}

async function fetchFacebook(): Promise<ExternalListingInput[]> {
  console.log('[Facebook] Fetcher not yet implemented — skipping')
  return []
}

const SOURCE_FETCHERS: Record<string, () => Promise<ExternalListingInput[]>> = {
  blocket: fetchBlocket,
  tradera: fetchTradera,
  facebook: fetchFacebook,
}

// ============================================================
// Main handler
// ============================================================

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  // Security: allow cron (anon key), service role, or authenticated admin
  const authHeader = req.headers.get('Authorization')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || ''
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

  const isCronOrService = authHeader && (
    authHeader.includes(anonKey) || authHeader.includes(serviceKey)
  )

  if (!isCronOrService) {
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user } } = await supabaseUser.auth.getUser()
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const adminCheck = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )
    const { data: roleData } = await adminCheck
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
  }

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  let sourcesToRun = Object.keys(SOURCE_FETCHERS)
  try {
    const body = await req.json().catch(() => ({}))
    if (body.sources && Array.isArray(body.sources)) {
      sourcesToRun = body.sources.filter((s: string) => s in SOURCE_FETCHERS)
    }
  } catch {
    // No body — run all sources
  }

  const results: Record<string, ImportStats> = {}

  for (const source of sourcesToRun) {
    const fetcher = SOURCE_FETCHERS[source]
    const stats: ImportStats = {
      imported: 0,
      skipped_duplicates: 0,
      skipped_keyword_filtered: 0,
      skipped_non_golf: 0,
    }

    try {
      console.log(`[${source}] Starting fetch...`)
      const listings = await fetcher()
      console.log(`[${source}] Fetched ${listings.length} raw listings`)

      for (const listing of listings) {
        if (!listing.source_id || !listing.title || !listing.source_url) {
          stats.skipped_duplicates++
          continue
        }

        // Layer 1: Keyword blocklist (fast, no AI cost)
        if (isKeywordFiltered(listing.title, listing.description)) {
          console.log(`[${source}] ✗ Keyword filtered: "${listing.title.substring(0, 50)}"`)
          stats.skipped_keyword_filtered++
          continue
        }

        // Layer 2: AI golf classification (cheap model, before spec extraction)
        const isGolf = await isGolfEquipment(listing.title, listing.description)
        if (!isGolf) {
          console.log(`[${source}] ✗ AI rejected (not golf): "${listing.title.substring(0, 50)}"`)
          stats.skipped_non_golf++
          continue
        }

        // Layer 3: Extract specs (only for confirmed golf items)
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
          stats.skipped_duplicates++
        } else {
          console.log(`[${source}] ✓ Imported: "${listing.title.substring(0, 50)}"`)
          stats.imported++
        }
      }
    } catch (err) {
      console.error(`[${source}] Fatal error:`, err)
      stats.error = err instanceof Error ? err.message : 'Unknown error'
    }

    // Log to external_import_logs with new columns
    await supabaseAdmin.from('external_import_logs').insert({
      source,
      imported_count: stats.imported,
      skipped_duplicates_count: stats.skipped_duplicates,
      skipped_keyword_filtered_count: stats.skipped_keyword_filtered,
      skipped_non_golf_count: stats.skipped_non_golf,
      status: stats.error ? 'error' : 'success',
      error_message: stats.error || null,
    })

    results[source] = stats
    console.log(`[${source}] Done: ${stats.imported} imported, ${stats.skipped_keyword_filtered} keyword-filtered, ${stats.skipped_non_golf} AI-rejected, ${stats.skipped_duplicates} skipped/errors`)
  }

  return new Response(JSON.stringify({ success: true, results }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
