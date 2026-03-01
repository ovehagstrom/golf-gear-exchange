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
    const sellerEmail = formData.get('sellerEmail') as string
    const sellerPhone = formData.get('sellerPhone') as string | null
    const sellerCity = formData.get('sellerCity') as string
    const password = formData.get('password') as string
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
    if (!sellerName || !sellerEmail || !password || !sellerCity || !category || !brand || !model || !condition || !price) {
      return new Response(JSON.stringify({ error: 'Obligatoriska fält saknas' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (password.length < 6) {
      return new Response(JSON.stringify({ error: 'Lösenordet måste vara minst 6 tecken' }), {
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

    // Check if user already exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers()
    const existingUser = existingUsers?.users?.find(u => u.email === sellerEmail)

    let userId: string

    if (existingUser) {
      userId = existingUser.id
    } else {
      // Create user account
      const { data: newUser, error: userError } = await supabase.auth.admin.createUser({
        email: sellerEmail,
        password: password,
        email_confirm: true,
        user_metadata: {
          full_name: sellerName,
        },
      })

      if (userError || !newUser.user) {
        console.error('Error creating user:', userError)
        return new Response(JSON.stringify({ error: 'Kunde inte skapa konto: ' + (userError?.message || 'Okänt fel') }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      userId = newUser.user.id

      // Update profile with phone and city
      await supabase
        .from('profiles')
        .update({
          phone: sellerPhone || null,
          city: sellerCity,
          full_name: sellerName,
        })
        .eq('id', userId)
    }

    // Upload images
    const imageUrls: string[] = []
    for (const file of imageFiles) {
      const fileExt = file.name.split('.').pop()
      const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`

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

    // Create listing under the user's own account
    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .insert({
        user_id: userId,
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

    return new Response(JSON.stringify({ 
      success: true, 
      listingId: listing.id,
      accountCreated: !existingUser,
    }), {
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
