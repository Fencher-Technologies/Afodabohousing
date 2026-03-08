import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
    const SUPABASE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const CONSUMER_KEY = Deno.env.get('PESAPAL_CONSUMER_KEY')
    const CONSUMER_SECRET = Deno.env.get('PESAPAL_CONSUMER_SECRET')

    if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error('Supabase not configured')

    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

    // PesaPal sends IPN as POST or GET
    let orderTrackingId = ''
    let orderMerchantRef = ''

    if (req.method === 'POST') {
      const body = await req.json().catch(() => ({}))
      orderTrackingId = body.OrderTrackingId || body.orderTrackingId || ''
      orderMerchantRef = body.OrderMerchantReference || body.orderMerchantReference || ''
    } else {
      const url = new URL(req.url)
      orderTrackingId = url.searchParams.get('OrderTrackingId') || ''
      orderMerchantRef = url.searchParams.get('OrderMerchantReference') || ''
    }

    if (!orderTrackingId) {
      return new Response('OK', { headers: corsHeaders })
    }

    // Get PesaPal token and check transaction status
    const authRes = await fetch('https://pay.pesapal.com/v3/api/Auth/RequestToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ consumer_key: CONSUMER_KEY, consumer_secret: CONSUMER_SECRET }),
    })
    const authData = await authRes.json()
    const token = authData.token

    const statusRes = await fetch(`https://pay.pesapal.com/v3/api/Transactions/GetTransactionStatus?orderTrackingId=${orderTrackingId}`, {
      headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${token}` },
    })
    const statusData = await statusRes.json()

    // Extract payment ID from merchant reference (AFODABO-{paymentId}-{timestamp})
    const parts = orderMerchantRef.split('-')
    const paymentId = parts.length >= 2 ? parts[1] : ''

    if (paymentId && statusData.payment_status_description === 'Completed') {
      await supabase
        .from('payments')
        .update({
          status: 'confirmed',
          notes: `PesaPal: ${orderTrackingId}`,
          receipt_url: orderTrackingId,
        })
        .eq('id', paymentId)
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('IPN error:', err)
    return new Response('OK', { headers: corsHeaders })
  }
})
