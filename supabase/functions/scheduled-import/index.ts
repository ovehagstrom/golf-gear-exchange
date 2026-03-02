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

// ---- Helpers ----

/** Simple XML tag content extractor (no dependency needed) */
function getTagContent(xml: string, tag: string): string | null {
  const regex = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>|<${tag}[^>]*>([\\s\\S]*?)</${tag}>`)
  const match = xml.match(regex)
  if (!match) return null
  return (match[1] ?? match[2] ?? '').trim()
}

/** Extract all occurrences of a tag */
function getAllTagContents(xml: string, tag: string): string[] {
  const regex = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>|<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'g')
  const results: string[] = []
  let m: RegExpExecArray | null
  while ((m = regex.exec(xml)) !== null) {
    results.push((m[1] ?? m[2] ?? '').trim())
  }
  return results
}

/** Try to extract a price (integer SEK) from a string */
function extractPrice(text: string): number | undefined {
  // Match patterns like "1 500 kr", "1500kr", "1500 SEK", standalone numbers
  const m = text.match(/([\d\s]+)\s*(?:kr|sek|:-)/i)
  if (m) {
    const num = parseInt(m[1].replace(/\s/g, ''), 10)
    if (!isNaN(num) && num > 0 && num < 10_000_000) return num
  }
  return undefined
}

/** Generate a stable ID from a URL string */
function hashSourceId(url: string): string {
  let hash = 0
  for (let i = 0; i < url.length; i++) {
    const chr = url.charCodeAt(i)
    hash = ((hash << 5) - hash) + chr
    hash |= 0
  }
  return `blocket-${Math.abs(hash).toString(36)}`
}

/** Extract first image URL from HTML content or enclosure/media tags */
function extractFirstImage(itemXml: string): string[] {
  // Check for enclosure with image type
  const encMatch = itemXml.match(/<enclosure[^>]+url=["']([^"']+)["'][^>]*type=["']image/i)
  if (encMatch) return [encMatch[1]]
  // Check for media:content or media:thumbnail
  const mediaMatch = itemXml.match(/<media:(?:content|thumbnail)[^>]+url=["']([^"']+)["']/i)
  if (mediaMatch) return [mediaMatch[1]]
  // Check for <img> in description/content
  const imgMatch = itemXml.match(/<img[^>]+src=["']([^"']+)["']/i)
  if (imgMatch) return [imgMatch[1]]
  return []
}

/**
 * Blocket RSS fetcher — tries multiple known RSS URLs.
 * DEBUG MODE: date filtering disabled to verify parsing works.
 */
async function fetchBlocket(): Promise<ExternalListingInput[]> {
  // Try multiple possible RSS URLs since Blocket changes these periodically
  const RSS_URLS = [
    'https://www.blocket.se/rss?q=golf&cg=6060', // sport & fritid category
    'https://www.blocket.se/rss?q=golfklubbor',
    'https://www.blocket.se/rss/hela_sverige?q=golf&cg=6060',
    'https://www.blocket.se/rss/sport_fritid_hobby?q=golf',
  ]
  const TIMEOUT_MS = 15_000
  const results: ExternalListingInput[] = []

  let xml: string | null = null
  let usedUrl = ''

  for (const url of RSS_URLS) {
    console.log(`[Blocket] Trying RSS URL: ${url}`)
    try {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

      const response = await fetch(url, {
        signal: controller.signal,
        headers: { 'User-Agent': 'GolfMarket-Aggregator/1.0' },
      })
      clearTimeout(timer)

      console.log(`[Blocket] HTTP ${response.status} from ${url}`)
      console.log(`[Blocket] Content-Type: ${response.headers.get('content-type')}`)

      if (!response.ok) continue

      const text = await response.text()
      console.log(`[Blocket] Received ${text.length} bytes`)
      console.log(`[Blocket] First 500 chars: ${text.substring(0, 500)}`)

      // Verify it looks like RSS/XML
      if (text.includes('<item') || text.includes('<entry') || text.includes('<rss')) {
        xml = text
        usedUrl = url
        console.log(`[Blocket] ✓ Valid RSS found at ${url}`)
        break
      } else {
        console.warn(`[Blocket] Response from ${url} does not look like RSS, trying next...`)
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        console.error(`[Blocket] Timeout after ${TIMEOUT_MS}ms for ${url}`)
      } else {
        console.error(`[Blocket] Fetch error for ${url}:`, err)
      }
    }
  }

  if (!xml) {
    console.error('[Blocket] All RSS URLs failed — no valid feed found')
    // Return special marker so the caller can log this in external_import_logs
    return []
  }

  console.log(`[Blocket] Using feed from: ${usedUrl}`)

  // Split into <item> blocks (also handle <entry> for Atom feeds)
  let itemBlocks = xml.split(/<item[\s>]/).slice(1)
  if (itemBlocks.length === 0) {
    itemBlocks = xml.split(/<entry[\s>]/).slice(1)
  }

  console.log(`[Blocket] Found ${itemBlocks.length} items in feed`)

  if (itemBlocks.length === 0) {
    console.warn('[Blocket] Feed parsed successfully but contains 0 items')
    console.log(`[Blocket] Feed structure preview (tags found): ${
      [...xml.matchAll(/<(\w+)[\s>]/g)].map(m => m[1]).filter((v, i, a) => a.indexOf(v) === i).join(', ')
    }`)
    return []
  }

  let parsedCount = 0
  let skippedCount = 0

  for (let i = 0; i < itemBlocks.length; i++) {
    const block = itemBlocks[i]
    try {
      const title = getTagContent(block, 'title')
      const link = getTagContent(block, 'link')
      const description = getTagContent(block, 'description') ?? getTagContent(block, 'content')
      const pubDate = getTagContent(block, 'pubDate') ?? getTagContent(block, 'published') ?? getTagContent(block, 'updated')

      console.log(`[Blocket] Item ${i + 1}: title="${title?.substring(0, 60)}", link="${link?.substring(0, 80)}", pubDate="${pubDate}"`)

      if (!title || !link) {
        console.warn(`[Blocket] Item ${i + 1} skipped: missing title or link`)
        skippedCount++
        continue
      }

      // DEBUG: date filtering DISABLED — accepting all items
      // TODO: re-enable after verifying parsing works
      console.log(`[Blocket] Item ${i + 1}: DATE FILTER DISABLED — including item regardless of date`)

      const idMatch = link.match(/(\d{8,})/)
      const sourceId = idMatch ? idMatch[1] : hashSourceId(link)

      const price = extractPrice(title) ?? (description ? extractPrice(description) : undefined)

      const locationMatch = block.match(/<blocket:location[^>]*>([^<]+)/i)
        ?? block.match(/<geo:(?:name|locality)[^>]*>([^<]+)/i)
      const city = locationMatch ? locationMatch[1].trim() : undefined

      const imageUrls = extractFirstImage(block)

      results.push({
        source: 'blocket',
        source_id: sourceId,
        title,
        price,
        city,
        source_url: link,
        image_urls: imageUrls,
        description: description ?? undefined,
        published_at: pubDate ? new Date(pubDate).toISOString() : undefined,
        category: 'golf',
      })
      parsedCount++
    } catch (itemErr) {
      console.warn(`[Blocket] Item ${i + 1} error:`, itemErr)
      skippedCount++
    }
  }

  console.log(`[Blocket] Summary: ${parsedCount} parsed, ${skippedCount} skipped, ${results.length} total results`)
  return results
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

  // Security: allow cron (anon key), service role, or authenticated admin
  const authHeader = req.headers.get('Authorization')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || ''
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

  const isCronOrService = authHeader && (
    authHeader.includes(anonKey) || authHeader.includes(serviceKey)
  )

  if (!isCronOrService) {
    // Check if it's an authenticated admin
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

    const token = authHeader.replace('Bearer ', '')
    const { data: claimsData, error: claimsError } = await supabaseUser.auth.getClaims(token)
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const userId = claimsData.claims.sub
    const adminCheck = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )
    const { data: roleData } = await adminCheck
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
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
