import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const EGOSMS_USERNAME = Deno.env.get('EGOSMS_USERNAME')
    const EGOSMS_PASSWORD = Deno.env.get('EGOSMS_PASSWORD')

    if (!EGOSMS_USERNAME || !EGOSMS_PASSWORD) {
      throw new Error('EgoSMS credentials not configured')
    }

    const { phone, message, sender = 'AFODABO' } = await req.json()

    if (!phone || !message) {
      throw new Error('phone and message are required')
    }

    // Normalize phone number: ensure it starts with 256 (Uganda code)
    let normalizedPhone = phone.replace(/\s+/g, '').replace(/^\+/, '')
    if (normalizedPhone.startsWith('0')) normalizedPhone = '256' + normalizedPhone.slice(1)
    if (!normalizedPhone.startsWith('256')) normalizedPhone = '256' + normalizedPhone

    // EgoSMS API endpoint
    const params = new URLSearchParams({
      username: EGOSMS_USERNAME,
      password: EGOSMS_PASSWORD,
      number: normalizedPhone,
      message: message,
      sender: sender,
    })

    const response = await fetch(`https://comms.egosms.co/api/send/?${params.toString()}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    })

    const result = await response.text()
    console.log('EgoSMS response:', result)

    return new Response(
      JSON.stringify({ success: true, result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    console.error('SMS error:', error)
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
