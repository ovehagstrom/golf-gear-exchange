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
  skipped_non_driver: number
  error?: string
}

// ============================================================
// Configurable keyword blocklist
// ============================================================

const EXCLUDED_KEYWORDS = [
  'volkswagen', 'vw', 'golf 1.', 'tdi', 'tsi', 'gti', 'bil',
  'hyundai', 'toyota', 'volvo xc', 'bmw', 'audi', 'mercedes', 'skoda',
  'opel', 'ford focus', 'kia', 'mazda', 'nissan', 'peugeot', 'renault',
  'lägenhet', 'bostad', 'hyra', 'tjänst', 'jobb', 'arbete',
  'disc', 'innova', 'discraft', 'discmania', 'frisbee',
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
Fält: brand, model, loft, shaft_model, flex, hand (höger/vänster), category (driver/fairway_wood/hybrid/driving_iron/iron_set/wedge/putter/shaft/complete_set/bag/accessories/other)
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
// Image proxy/cache helpers (avoid browser ORB/CORS blocking)
// ============================================================

function guessImageExtension(url: string, contentType?: string | null): string {
  const type = (contentType || '').toLowerCase()
  if (type.includes('image/jpeg') || type.includes('image/jpg')) return 'jpg'
  if (type.includes('image/png')) return 'png'
  if (type.includes('image/webp')) return 'webp'
  if (type.includes('image/gif')) return 'gif'
  if (type.includes('image/avif')) return 'avif'

  try {
    const pathname = new URL(url).pathname
    const match = pathname.match(/\.([a-zA-Z0-9]+)$/)
    if (match?.[1]) return match[1].toLowerCase()
  } catch {
    // ignore parse failures
  }

  return 'jpg'
}

async function cacheExternalImagesToStorage(
  supabaseAdmin: ReturnType<typeof createClient>,
  source: string,
  sourceId: string,
  imageUrls: string[]
): Promise<string[]> {
  if (!imageUrls?.length) return []

  const uploadedUrls: string[] = []

  for (let i = 0; i < Math.min(imageUrls.length, 2); i++) {
    const imageUrl = imageUrls[i]
    if (!imageUrl) continue

    try {
      const response = await fetch(imageUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; GolfMarket/1.0)',
          'Accept': 'image/*,*/*;q=0.8',
          'Referer': 'https://www.tradera.com/',
        },
      })

      if (!response.ok) {
        console.warn(`[image-cache] Failed ${response.status} for ${imageUrl}`)
        continue
      }

      const contentType = response.headers.get('content-type') || 'image/jpeg'
      if (!contentType.toLowerCase().startsWith('image/')) {
        console.warn(`[image-cache] Non-image response for ${imageUrl}: ${contentType}`)
        continue
      }

      const fileExt = guessImageExtension(imageUrl, contentType)
      const filePath = `external/${source}/${sourceId}-${i + 1}.${fileExt}`
      const bytes = new Uint8Array(await response.arrayBuffer())

      const { error: uploadError } = await supabaseAdmin.storage
        .from('listing-images')
        .upload(filePath, bytes, {
          contentType,
          upsert: true,
        })

      if (uploadError) {
        console.warn(`[image-cache] Upload failed for ${filePath}: ${uploadError.message}`)
        continue
      }

      const { data } = supabaseAdmin.storage.from('listing-images').getPublicUrl(filePath)
      if (data?.publicUrl) uploadedUrls.push(data.publicUrl)
    } catch (err) {
      console.warn('[image-cache] Unexpected error:', err)
    }
  }

  return uploadedUrls
}

// ============================================================
// Source fetchers
// ============================================================

const BLOCKET_QUERIES = [
  'golf klubba',
  'golf driver',
  'golf järnset',
  'golf putter',
  'golf wedge',
  'golf hybrid',
  'golf fairwaywood',
  'golfklubbor nyskick',
  'driver nyskick',
  'järnset nyskick',
]

const TRADERA_QUERIES = [
  'golf klubba',
  'golf driver',
  'golf järnset',
  'golf putter',
  'golf wedge',
  'golf hybrid',
  'golf fairwaywood',
  'golfklubbor nyskick',
  'driver nyskick',
  'järnset nyskick',
]

function dedupeListingsBySourceId(listings: ExternalListingInput[]): ExternalListingInput[] {
  const seen = new Set<string>()
  const deduped: ExternalListingInput[] = []

  for (const listing of listings) {
    const key = `${listing.source}:${listing.source_id}`
    if (seen.has(key)) continue
    seen.add(key)
    deduped.push(listing)
  }

  return deduped
}

function sortByPublishedDesc(listings: ExternalListingInput[]): ExternalListingInput[] {
  return [...listings].sort((a, b) => {
    const aTs = a.published_at ? new Date(a.published_at).getTime() : 0
    const bTs = b.published_at ? new Date(b.published_at).getTime() : 0
    return bTs - aTs
  })
}

async function fetchBlocket(): Promise<ExternalListingInput[]> {
  const API_URL = 'https://www.blocket.se/recommerce/forsale/search/api/search/SEARCH_ID_BAP_COMMON'
  const TIMEOUT_MS = 15_000
  const allResults: ExternalListingInput[] = []

  for (const query of BLOCKET_QUERIES) {
    const params = new URLSearchParams({
      q: query,
      lim: '250',
      sort: 'PUBLISHED_DESC',
    })

    const url = `${API_URL}?${params.toString()}`
    console.log(`[Blocket] Fetching query="${query}"`)

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

      if (!response.ok) {
        const body = await response.text().catch(() => '')
        console.error(`[Blocket] API error ${response.status} for query="${query}": ${body.substring(0, 200)}`)
        continue
      }

      const data = await response.json()
      const ads = data?.docs || data?.data || []
      console.log(`[Blocket] query="${query}" returned ${ads.length} ads`)

      for (const ad of ads) {
        try {
          const id = ad.id || ad.ad_id?.toString()
          const heading = ad.heading || ad.title
          if (!id || !heading) continue

          const canonicalUrl = ad.canonical_url
            ? (ad.canonical_url.startsWith('http') ? ad.canonical_url : `https://www.blocket.se${ad.canonical_url}`)
            : `https://www.blocket.se/annons/${id}`

          const price = ad.price?.amount || undefined
          const location = ad.location || undefined
          const imageUrls = ad.image_urls?.length ? ad.image_urls : (ad.image?.url ? [ad.image.url] : [])

          let timestamp: string | undefined
          if (ad.timestamp) {
            const ts = Number(ad.timestamp)
            const dateMs = ts > 32503680000 ? ts : ts * 1000
            const d = new Date(dateMs)
            if (d.getFullYear() >= 2020 && d.getFullYear() <= 2035) {
              timestamp = d.toISOString()
            }
          }

          allResults.push({
            source: 'blocket',
            source_id: id.toString(),
            title: heading,
            price,
            city: location,
            source_url: canonicalUrl,
            image_urls: imageUrls,
            description: undefined,
            published_at: timestamp,
            category: undefined,
          })
        } catch (itemErr) {
          console.warn('[Blocket] Ad parse error:', itemErr)
        }
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        console.error(`[Blocket] Query="${query}" timed out after ${TIMEOUT_MS}ms`)
      } else {
        console.error(`[Blocket] Query="${query}" fetch error:`, err)
      }
    }
  }

  const deduped = dedupeListingsBySourceId(allResults)
  console.log(`[Blocket] Fetched ${allResults.length} raw ads, ${deduped.length} unique`)
  return deduped
}

async function fetchTradera(): Promise<ExternalListingInput[]> {
  const TIMEOUT_MS = 15_000
  const allResults: ExternalListingInput[] = []

  const apiUrl = 'https://www.tradera.com/api/webapi/discover/web/independent-search'

  try {
    const initController = new AbortController()
    const initTimer = setTimeout(() => initController.abort(), TIMEOUT_MS)

    const initResponse = await fetch('https://www.tradera.com/', {
      signal: initController.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    })
    clearTimeout(initTimer)
    await initResponse.text()

    const cookies = initResponse.headers.get('set-cookie') || ''

    for (const query of TRADERA_QUERIES) {
      const params = new URLSearchParams({
        query,
        sortBy: 'AddedOn',
        categoryId: '25',
        itemStatus: 'unsold',
        itemType: 'All',
        automaticTranslationPreferred: 'true',
        forceKeywordSearch: 'false',
        includeFilters: 'false',
        languageCodeIso2: 'sv',
        searchTypeVariantHint: 'enrichemptysearchresult',
        shippingCountryCodeIso2: 'SE',
      })

      const url = `${apiUrl}?${params.toString()}`
      console.log(`[Tradera] Fetching query="${query}"`)

      try {
        const controller = new AbortController()
        const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

        const response = await fetch(url, {
          method: 'POST',
          signal: controller.signal,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Cookie': cookies,
            'Referer': 'https://www.tradera.com/search?q=golf+driver',
          },
        })
        clearTimeout(timer)

        if (!response.ok) {
          const body = await response.text().catch(() => '')
          console.error(`[Tradera] Error ${response.status} for query="${query}": ${body.substring(0, 200)}`)
          continue
        }

        const data = await response.json()
        const items = data?.items || data?.searchResult?.items || data?.result?.items || []
        const itemList = Array.isArray(data) ? data : items

        console.log(`[Tradera] query="${query}" returned ${itemList.length} items`)

        for (const item of itemList) {
          try {
            const id = item.itemId?.toString() || item.id?.toString()
            const title = item.shortDescription || item.title || item.heading
            if (!id || !title) continue

            const price = item.price || item.buyNowPrice || undefined
            const imageUrls: string[] = []
            if (item.imageUrlTemplate) {
              imageUrls.push(item.imageUrlTemplate.replace('{format}', 'large-fit'))
            }
            if (item.imageSecondaryUrlTemplate) {
              imageUrls.push(item.imageSecondaryUrlTemplate.replace('{format}', 'medium-fit'))
            }

            const itemUrl = item.itemUrl || `/item/${id}`

            allResults.push({
              source: 'tradera',
              source_id: id,
              title,
              price: price ? Math.round(Number(price)) : undefined,
              city: undefined,
              source_url: itemUrl.startsWith('http') ? itemUrl : `https://www.tradera.com${itemUrl}`,
              image_urls: imageUrls,
              description: item.description || undefined,
              published_at: item.startDate || item.created || undefined,
              category: undefined,
            })
          } catch (itemErr) {
            console.warn('[Tradera] Item parse error:', itemErr)
          }
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          console.error(`[Tradera] Query="${query}" timed out after ${TIMEOUT_MS}ms`)
        } else {
          console.error(`[Tradera] Query="${query}" fetch error:`, err)
        }
      }
    }
  } catch (err) {
    console.error('[Tradera] Initialization failed:', err)
  }

  const deduped = dedupeListingsBySourceId(allResults)
  console.log(`[Tradera] Extracted ${allResults.length} raw ads, ${deduped.length} unique`)
  return deduped
}

// ============================================================
// Swedish Golf Store Scraping via Firecrawl
// ============================================================

interface StoreConfig {
  name: string
  source: string
  urls: string[]
}

const GOLF_STORES: StoreConfig[] = [
  {
    name: 'Dormy Golf',
    source: 'dormy',
    urls: [
      'https://www.dormy.com/sv/golfklubbor/metalwoods/drivers',
      'https://www.dormy.com/sv/golfklubbor/metalwoods/fairwaywoods',
      'https://www.dormy.com/sv/golfklubbor/metalwoods/hybrider',
      'https://www.dormy.com/sv/golfklubbor/jarnset',
      'https://www.dormy.com/sv/golfklubbor/wedgar',
      'https://www.dormy.com/sv/golfklubbor/putters',
    ],
  },
  {
    name: 'Golfstore',
    source: 'golfstore',
    urls: [
      'https://www.golfstore.se/produkter/herr/herrklubbor',
      'https://www.golfstore.se/produkter/dam/damklubbor',
    ],
  },
  {
    name: 'ScandiGolf',
    source: 'scandigolf',
    urls: [
      'https://www.scandigolf.se/collections/driver',
      'https://www.scandigolf.se/collections/fairwaywoods',
      'https://www.scandigolf.se/collections/hybrider',
      'https://www.scandigolf.se/collections/jarnset',
      'https://www.scandigolf.se/collections/wedgar',
      'https://www.scandigolf.se/collections/putters',
    ],
  },
  {
    name: 'Swegolf',
    source: 'swegolf',
    urls: [
      'https://www.swegolf.se/collections/golfklubbor',
    ],
  },
  {
    name: 'Dimbo Golf',
    source: 'dimbogolf',
    urls: [
      'https://www.dimbogolf.se/golfklubbor',
    ],
  },
  {
    name: 'Downswing',
    source: 'downswing',
    urls: [
      'https://www.downswing.se/golfklubbor',
    ],
  },
  {
    name: 'Golfbutik',
    source: 'golfbutik',
    urls: [
      'https://golfbutik.se/24-drivers',
      'https://golfbutik.se/25-fairwaywoods',
      'https://golfbutik.se/26-hybrider',
      'https://golfbutik.se/27-jarnset',
      'https://golfbutik.se/28-wedgar',
      'https://golfbutik.se/29-putters',
    ],
  },
  {
    name: 'Golfprylar',
    source: 'golfprylar',
    urls: [
      'https://www.golfprylar.se/golfklubbor',
    ],
  },
  {
    name: 'FJ Sweden',
    source: 'fjsweden',
    urls: [
      'https://www.fjsweden.se/golfklubbor',
    ],
  },
  {
    name: 'NJ Golf',
    source: 'njgolf',
    urls: [
      'https://www.njgolf.se/golfklubbor',
    ],
  },
  {
    name: 'Golfhandeln',
    source: 'golfhandeln',
    urls: [
      'https://www.golfhandeln.se/golfklubbor',
    ],
  },
  {
    name: 'Golfgiganten',
    source: 'golfgiganten',
    urls: [
      'https://www.golfgiganten.se/golfklubbor',
    ],
  },
  {
    name: 'Golfvaruhuset',
    source: 'golfvaruhuset',
    urls: [
      'https://www.golfvaruhuset.se/golfklubbor',
    ],
  },
  {
    name: 'NordicGolfers',
    source: 'nordicgolfers',
    urls: [
      'https://www.nordicgolfers.se/golfklubbor',
    ],
  },
  {
    name: 'Golfimporten',
    source: 'golfimporten',
    urls: [
      'https://www.golfimporten.se/golfklubbor',
    ],
  },
  {
    name: 'Golfcenter',
    source: 'golfcenter',
    urls: [
      'https://www.golfcenter.se/golfklubbor',
    ],
  },
  {
    name: 'Golfshopen',
    source: 'golfshopen',
    urls: [
      'https://www.golfshopen.se/golfklubbor',
    ],
  },
  {
    name: 'Golfdeal',
    source: 'golfdeal',
    urls: [
      'https://www.golfdeal.se/golfklubbor',
    ],
  },
  {
    name: 'Golfbidder',
    source: 'golfbidder',
    urls: [
      'https://www.golfbidder.se/',
    ],
  },
  {
    name: 'Golfreuse',
    source: 'golfreuse',
    urls: [
      'https://www.golfreuse.se/golfklubbor',
    ],
  },
  {
    name: 'Drivers.se',
    source: 'drivers_se',
    urls: [
      'https://www.drivers.se/',
    ],
  },
  {
    name: 'Out-of-Bounds',
    source: 'outofbounds',
    urls: [
      'https://www.outofbounds.se/golfklubbor',
    ],
  },
  {
    name: 'Dormy Outlet',
    source: 'dormy_outlet',
    urls: [
      'https://www.dormy.com/sv/golfklubbor?f-tag=outlet',
    ],
  },
]

async function scrapeWithFirecrawl(url: string): Promise<string | null> {
  const apiKey = Deno.env.get('FIRECRAWL_API_KEY')
  if (!apiKey) {
    console.warn('[Firecrawl] FIRECRAWL_API_KEY not set')
    return null
  }

  try {
    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url,
        formats: ['markdown'],
        onlyMainContent: true,
        waitFor: 5000,
      }),
    })

    if (!response.ok) {
      const errText = await response.text().catch(() => '')
      console.error(`[Firecrawl] Error ${response.status} for ${url}: ${errText.substring(0, 200)}`)
      return null
    }

    const data = await response.json()
    return data?.data?.markdown || data?.markdown || null
  } catch (err) {
    console.error(`[Firecrawl] Scrape error for ${url}:`, err)
    return null
  }
}

async function extractProductsFromMarkdown(
  markdown: string,
  storeName: string,
  sourceUrl: string
): Promise<ExternalListingInput[]> {
  const apiKey = Deno.env.get('LOVABLE_API_KEY')
  if (!apiKey) return []

  // Truncate to avoid token limits
  const truncated = markdown.substring(0, 8000)

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
            content: `Du extraherar golfprodukter från webbsidors innehåll. Svara BARA med en JSON-array med produkter.
Varje produkt ska ha: title (string), price (number i SEK, utan "kr"), brand (string), category (driver/fairway_wood/hybrid/iron_set/wedge/putter/shaft/complete_set/bag/accessories/other).
Om priset har "original price" och "discounted price", använd discounted price.
Inkludera BARA golfklubbor (inte bollar, kläder, skor, bagar, vagnar, tillbehör).
Om du inte kan hitta några produkter, svara med tom array [].
Max 50 produkter.`,
          },
          {
            role: 'user',
            content: `Extrahera golfklubbor från denna ${storeName} sida:\n\n${truncated}`,
          },
        ],
        temperature: 0.1,
        max_tokens: 4000,
      }),
    })

    if (!response.ok) {
      console.error(`[AI] Product extraction failed: ${response.status}`)
      return []
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content?.trim() || '[]'
    const jsonMatch = content.match(/\[[\s\S]*\]/)
    if (!jsonMatch) return []

    const products = JSON.parse(jsonMatch[0])
    if (!Array.isArray(products)) return []

    return products
      .filter((p: Record<string, unknown>) => p.title && typeof p.title === 'string')
      .map((p: Record<string, unknown>) => ({
        source: storeName.toLowerCase().replace(/[^a-z0-9]/g, '_'),
        source_id: `${storeName.toLowerCase().replace(/[^a-z0-9]/g, '_')}-${(p.title as string).toLowerCase().replace(/[^a-z0-9åäö]/g, '-').substring(0, 60)}`,
        title: p.title as string,
        price: typeof p.price === 'number' ? Math.round(p.price) : undefined,
        city: undefined,
        source_url: sourceUrl,
        image_urls: [],
        description: undefined,
        published_at: new Date().toISOString(),
        category: (p.category as string) || undefined,
      }))
  } catch (err) {
    console.error(`[AI] Product extraction error:`, err)
    return []
  }
}

async function fetchGolfStores(): Promise<ExternalListingInput[]> {
  const firecrawlKey = Deno.env.get('FIRECRAWL_API_KEY')
  if (!firecrawlKey) {
    console.log('[Stores] FIRECRAWL_API_KEY not set — skipping store scraping')
    return []
  }

  const allResults: ExternalListingInput[] = []

  // Process max 5 stores per run to avoid timeout
  // Rotate which stores get scraped based on current hour
  const hour = new Date().getUTCHours()
  const batchSize = 3
  const startIdx = (hour % Math.ceil(GOLF_STORES.length / batchSize)) * batchSize
  const storeBatch = GOLF_STORES.slice(startIdx, startIdx + batchSize)
  console.log(`[Stores] Processing batch ${startIdx}-${startIdx + storeBatch.length} of ${GOLF_STORES.length} stores`)

  for (const store of storeBatch) {
    console.log(`[${store.name}] Scraping ${store.urls.length} URLs...`)

    for (const url of store.urls) {
      try {
        const markdown = await scrapeWithFirecrawl(url)
        if (!markdown || markdown.length < 100) {
          console.warn(`[${store.name}] No content from ${url}`)
          continue
        }

        console.log(`[${store.name}] Got ${markdown.length} chars from ${url}`)
        const products = await extractProductsFromMarkdown(markdown, store.name, url)

        // Override source with store config source
        for (const p of products) {
          p.source = store.source
          p.source_id = `${store.source}-${p.source_id}`
        }

        allResults.push(...products)
        console.log(`[${store.name}] Extracted ${products.length} products from ${url}`)
      } catch (err) {
        console.error(`[${store.name}] Error scraping ${url}:`, err)
      }

      // Rate limit: 1s between requests
      await new Promise(r => setTimeout(r, 1000))
    }
  }

  const deduped = dedupeListingsBySourceId(allResults)
  console.log(`[Stores] Total: ${allResults.length} raw, ${deduped.length} unique from batch of ${storeBatch.length} stores`)
  return deduped
}

const SOURCE_FETCHERS: Record<string, () => Promise<ExternalListingInput[]>> = {
  blocket: fetchBlocket,
  tradera: fetchTradera,
  stores: fetchGolfStores,
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
  let maxAgeDays = 1 // default for scheduled runs: last 24h
  let isManual = false
  let forceInline = false
  let maxListingsPerSource = 120

  try {
    const body = await req.json().catch(() => ({}))
    if (body.sources && Array.isArray(body.sources)) {
      sourcesToRun = body.sources.filter((s: string) => s in SOURCE_FETCHERS)
    }
    if (body.time === 'manual') {
      isManual = true
      maxAgeDays = 7 // manual: last 7 days
      maxListingsPerSource = 250
    }
    if (body.maxAgeDays && typeof body.maxAgeDays === 'number') {
      maxAgeDays = body.maxAgeDays
    }
    if (body.maxListingsPerSource && typeof body.maxListingsPerSource === 'number') {
      maxListingsPerSource = Math.max(1, Math.min(500, body.maxListingsPerSource))
    }
    if (body.mode === 'inline') {
      forceInline = true
    }
  } catch {
    // No body — run all sources
  }

  const cutoffDate = new Date(Date.now() - maxAgeDays * 24 * 60 * 60 * 1000)
  console.log(
    `[import] Mode: ${isManual ? 'manual' : 'scheduled'}, maxAgeDays: ${maxAgeDays}, maxListingsPerSource: ${maxListingsPerSource}, cutoff: ${cutoffDate.toISOString()}`
  )

  const importTask = async () => {
    const results: Record<string, ImportStats> = {}

    // Run all sources IN PARALLEL to avoid timeout
    const sourcePromises = sourcesToRun.map(async (source) => {
      const fetcher = SOURCE_FETCHERS[source]
      const stats: ImportStats = {
        imported: 0,
        skipped_duplicates: 0,
        skipped_keyword_filtered: 0,
        skipped_non_golf: 0,
        skipped_non_driver: 0,
      }

      try {
        console.log(`[${source}] Starting fetch...`)
        const fetchedListings = await fetcher()
        const listings = sortByPublishedDesc(fetchedListings).slice(0, maxListingsPerSource)
        console.log(`[${source}] Processing ${listings.length}/${fetchedListings.length} listings`)

        for (const listing of listings) {
          if (!listing.source_id || !listing.title || !listing.source_url) {
            stats.skipped_duplicates++
            continue
          }

          if (listing.published_at) {
            const publishedDate = new Date(listing.published_at)
            if (publishedDate < cutoffDate) {
              stats.skipped_duplicates++
              continue
            }
          }

          // Skip keyword filter and AI classification for store products 
          // (they come from golf-specific pages, so they're always golf)
          const isStoreProduct = source === 'stores'

          if (!isStoreProduct && isKeywordFiltered(listing.title, listing.description)) {
            console.log(`[${source}] ✗ Keyword filtered: "${listing.title.substring(0, 50)}"`)
            stats.skipped_keyword_filtered++
            continue
          }

          if (!isStoreProduct) {
            const isGolf = await isGolfEquipment(listing.title, listing.description)
            if (!isGolf) {
              console.log(`[${source}] ✗ AI rejected (not golf): "${listing.title.substring(0, 50)}"`)
              stats.skipped_non_golf++
              continue
            }
          }

          const specs = isStoreProduct 
            ? {} // Store products already have category from AI extraction
            : await extractSpecs(listing.title, listing.description)

          let finalImageUrls = listing.image_urls || []
          if (source === 'tradera' && finalImageUrls.length > 0) {
            const cachedUrls = await cacheExternalImagesToStorage(
              supabaseAdmin,
              source,
              listing.source_id,
              finalImageUrls
            )

            if (cachedUrls.length > 0) {
              finalImageUrls = cachedUrls
            }
          }

          const { error } = await supabaseAdmin
            .from('external_listings')
            .upsert({
              source: listing.source || source,
              source_id: listing.source_id,
              title: listing.title,
              price: listing.price || null,
              city: listing.city || null,
              source_url: listing.source_url,
              image_urls: finalImageUrls,
              description: listing.description || null,
              published_at: listing.published_at || null,
              category: (specs as Record<string, string>).category || listing.category || null,
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
            stats.imported++
          }
        }
      } catch (err) {
        console.error(`[${source}] Fatal error:`, err)
        stats.error = err instanceof Error ? err.message : 'Unknown error'
      }

      await supabaseAdmin.from('external_import_logs').insert({
        source,
        imported_count: stats.imported,
        skipped_duplicates_count: stats.skipped_duplicates,
        skipped_keyword_filtered_count: stats.skipped_keyword_filtered,
        skipped_non_golf_count: stats.skipped_non_golf,
        skipped_non_driver_count: stats.skipped_non_driver,
        status: stats.error ? 'error' : 'success',
        error_message: stats.error || null,
      })

      results[source] = stats
      console.log(`[${source}] Done: imported=${stats.imported}, keyword_filtered=${stats.skipped_keyword_filtered}, ai_rejected=${stats.skipped_non_golf}, skipped=${stats.skipped_duplicates}`)
    })

    await Promise.all(sourcePromises)
    return results
  }

  // Always run synchronously to ensure completion
  // EdgeRuntime.waitUntil is unreliable for long-running tasks
  const results = await importTask()
  return new Response(JSON.stringify({
    success: true,
    message: isManual ? 'Import klar.' : 'Schemalagd import klar.',
    sources: sourcesToRun,
    results,
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
