import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const formData = await req.formData()

    const sellerName = formData.get('sellerName') as string
    const sellerEmail = formData.get('sellerEmail') as string | null
    const sellerPhone = formData.get('sellerPhone') as string | null
    const sellerCity = formData.get('sellerCity') as string
    const title = formData.get('title') as string
    const category = formData.get('category') as string
    const brand = formData.get('brand') as string
    const model = formData.get('model') as string
    const year = formData.get('year') as string | null
    const shaftModel = formData.get('shaftModel') as string | null
    const shaftFlex = formData.get('shaftFlex') as string | null
    const shaftLength = formData.get('shaftLength') as string | null
    const loft = formData.get('loft') as string | null
    const bounce = formData.get('bounce') as string | null
    const lieAngle = formData.get('lieAngle') as string | null
    const grip = formData.get('grip') as string | null
    const condition = formData.get('condition') as string
    const price = formData.get('price') as string
    const description = formData.get('description') as string | null

    // Validate required fields
    if (!sellerName || !sellerCity || !category || !brand || !model || !condition || !price) {
      return new Response(JSON.stringify({ error: 'Obligatoriska fält saknas' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Upload images
    const imageFiles: File[] = []
    for (const [key, value] of formData.entries()) {
      if (key === 'images' && value instanceof File) {
        imageFiles.push(value)
      }
    }

    if (imageFiles.length < 3) {
      return new Response(JSON.stringify({ error: 'Minst 3 bilder krävs' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const imageUrls: string[] = []
    for (const file of imageFiles) {
      const fileExt = file.name.split('.').pop()
      const fileName = `external/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('listing-images')
        .upload(fileName, file)

      if (uploadError) {
        console.error('Upload error:', uploadError)
        continue
      }

      const { data: { publicUrl } } = supabase.storage
        .from('listing-images')
        .getPublicUrl(fileName)

      imageUrls.push(publicUrl)
    }

    if (imageUrls.length < 3) {
      return new Response(JSON.stringify({ error: 'Kunde inte ladda upp tillräckligt många bilder' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Find or create external seller
    let externalSellerId: string

    // We need an admin user_id as the "created_by" for external sellers
    // Use the first admin we find
    const { data: adminRole } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'admin')
      .limit(1)
      .single()

    if (!adminRole) {
      return new Response(JSON.stringify({ error: 'Ingen admin hittades i systemet' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const adminUserId = adminRole.user_id

    // Check if external seller already exists by name+city
    const { data: existingSeller } = await supabase
      .from('external_sellers')
      .select('id')
      .eq('name', sellerName)
      .eq('city', sellerCity)
      .maybeSingle()

    if (existingSeller) {
      externalSellerId = existingSeller.id
    } else {
      const { data: newSeller, error: sellerError } = await supabase
        .from('external_sellers')
        .insert({
          name: sellerName,
          email: sellerEmail || null,
          phone: sellerPhone || null,
          city: sellerCity,
          created_by: adminUserId,
        })
        .select('id')
        .single()

      if (sellerError || !newSeller) {
        console.error('Error creating external seller:', sellerError)
        return new Response(JSON.stringify({ error: 'Kunde inte skapa säljarprofil' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      externalSellerId = newSeller.id
    }

    // Create listing under admin user with external_seller_id
    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .insert({
        user_id: adminUserId,
        external_seller_id: externalSellerId,
        title: title || `${brand} ${model}`,
        category,
        brand,
        model,
        year: year ? Number(year) : null,
        shaft_model: shaftModel || null,
        shaft_flex: shaftFlex || null,
        shaft_length: shaftLength || null,
        loft: loft || null,
        bounce: bounce || null,
        lie_angle: lieAngle || null,
        grip: grip || null,
        condition: Number(condition),
        price: Number(price),
        city: sellerCity,
        description: description || null,
        images: imageUrls,
      })
      .select('id')
      .single()

    if (listingError) {
      console.error('Error creating listing:', listingError)
      return new Response(JSON.stringify({ error: 'Kunde inte skapa annons' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ success: true, listingId: listing.id }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(JSON.stringify({ error: 'Oväntat fel' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
