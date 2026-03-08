import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const PESAPAL_BASE = 'https://pay.pesapal.com/v3/api'

async function getPesapalToken(consumerKey: string, consumerSecret: string): Promise<string> {
  const res = await fetch(`${PESAPAL_BASE}/Auth/RequestToken`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({ consumer_key: consumerKey, consumer_secret: consumerSecret }),
  })
  const data = await res.json()
  if (!data.token) throw new Error(`PesaPal auth failed: ${JSON.stringify(data)}`)
  return data.token
}

async function registerIPN(token: string, ipnUrl: string): Promise<string> {
  const res = await fetch(`${PESAPAL_BASE}/URLSetup/RegisterIPN`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ url: ipnUrl, ipn_notification_type: 'POST' }),
  })
  const data = await res.json()
  return data.ipn_id || ''
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const CONSUMER_KEY = Deno.env.get('PESAPAL_CONSUMER_KEY')
    const CONSUMER_SECRET = Deno.env.get('PESAPAL_CONSUMER_SECRET')
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
    const SUPABASE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!CONSUMER_KEY || !CONSUMER_SECRET) throw new Error('PesaPal credentials not configured')

    const { action, paymentId, amount, currency = 'UGX', description, email, phone, firstName, lastName, callbackUrl } = await req.json()
    const token = await getPesapalToken(CONSUMER_KEY, CONSUMER_SECRET)

    if (action === 'initiate') {
      // Register IPN URL
      const ipnUrl = `${SUPABASE_URL}/functions/v1/pesapal-ipn`
      const ipnId = await registerIPN(token, ipnUrl)

      // Submit order
      const orderId = `AFODABO-${paymentId}-${Date.now()}`
      const res = await fetch(`${PESAPAL_BASE}/Transactions/SubmitOrderRequest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          id: orderId,
          currency,
          amount: Number(amount),
          description: description || 'Rent Payment - Afodabohousing',
          callback_url: callbackUrl || 'https://afodabohousing.com/payment/callback',
          notification_id: ipnId,
          billing_address: {
            email_address: email || '',
            phone_number: phone || '',
            first_name: firstName || 'Tenant',
            last_name: lastName || '',
          },
        }),
      })
      const orderData = await res.json()

      if (!orderData.redirect_url) throw new Error(`Order failed: ${JSON.stringify(orderData)}`)

      return new Response(
        JSON.stringify({ success: true, redirectUrl: orderData.redirect_url, orderId, orderTrackingId: orderData.order_tracking_id }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'status') {
      const { orderTrackingId } = await req.json().catch(() => ({ orderTrackingId: '' }))
      const res = await fetch(`${PESAPAL_BASE}/Transactions/GetTransactionStatus?orderTrackingId=${orderTrackingId}`, {
        headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${token}` },
      })
      const data = await res.json()
      return new Response(JSON.stringify({ success: true, data }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), { status: 400, headers: corsHeaders })
  } catch (err) {
    console.error(err)
    return new Response(
      JSON.stringify({ success: false, error: err instanceof Error ? err.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
