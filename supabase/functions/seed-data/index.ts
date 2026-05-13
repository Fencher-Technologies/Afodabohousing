import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Idempotency check
    const { data: existing } = await supabase.from("properties").select("id").limit(1);
    if (existing && existing.length > 0) {
      return new Response(
        JSON.stringify({ message: "Demo data already loaded.", alreadySeeded: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── 1. Create demo users ────────────────────────────────────────────
    const demoUsers = [
      { email: "admin@afodabo.ug",    name: "Admin Afodabo",       role: "admin",        phone: "+256 700 000001" },
      { email: "john@afodabo.ug",     name: "John Ssebagala",      role: "house_manager", phone: "+256 772 345678" },
      { email: "grace@afodabo.ug",    name: "Grace Namukasa",      role: "house_manager", phone: "+256 701 234567" },
      { email: "sarah@afodabo.ug",    name: "Sarah Nakato",        role: "tenant",        phone: "+256 754 987654" },
      { email: "david@afodabo.ug",    name: "David Okello",        role: "tenant",        phone: "+256 783 112233" },
    ];

    const userIds: Record<string, string> = {};

    for (const u of demoUsers) {
      const { data: existing } = await supabase.auth.admin.listUsers();
      const existingUser = existing?.users?.find(usr => usr.email === u.email);

      let userId: string;
      if (existingUser) {
        userId = existingUser.id;
      } else {
        const { data: created, error } = await supabase.auth.admin.createUser({
          email: u.email,
          password: "Demo@1234",
          email_confirm: true,
          user_metadata: { full_name: u.name },
        });
        if (error || !created.user) {
          console.error(`Failed to create ${u.email}:`, error?.message);
          continue;
        }
        userId = created.user.id;
      }

      userIds[u.email] = userId;

      // Ensure profile & role exist
      await supabase.from("profiles").upsert({ user_id: userId, full_name: u.name, phone: u.phone, role: u.role }, { onConflict: "user_id" });
    }

    const johnId = userIds["john@afodabo.ug"];
    const graceId = userIds["grace@afodabo.ug"];
    const sarahId = userIds["sarah@afodabo.ug"];
    const davidId = userIds["david@afodabo.ug"];

    // ── 2. Create tenant records ──────────────────────────────────────────
    const tenantData: { owner_id: string; user_id: string; first_name: string; last_name: string; email: string }[] = [];
    if (sarahId && johnId) tenantData.push({ owner_id: johnId, user_id: sarahId, first_name: "Sarah", last_name: "Nakato", email: "sarah@afodabo.ug" });
    if (davidId && graceId) tenantData.push({ owner_id: graceId, user_id: davidId, first_name: "David", last_name: "Okello", email: "david@afodabo.ug" });

    const { data: insertedTenants } = await supabase.from("tenants").insert(tenantData).select("id, user_id, owner_id");
    const sarahTenant = insertedTenants?.find(t => t.user_id === sarahId);
    const davidTenant = insertedTenants?.find(t => t.user_id === davidId);

    // ── 3. Properties ────────────────────────────────────────────────────
    const propertiesData = [
      // John's properties
      {
        owner_id: johnId, title: "3-Bedroom Family House in Ntinda", property_type: "house",
        district: "Kampala", city: "Kampala", area: "Ntinda",
        address: "Plot 45, Ntinda Road, Kampala",
        bedrooms: 3, sitting_rooms: 1, kitchens: 1, bathrooms: 2,
        rent_amount: 1800000, rent_period: "monthly",
        amenities: ["Water", "Electricity", "Parking", "Security"],
        description: "Spacious 3-bedroom house on a quiet Ntinda road. Tiled floors throughout, large compound, 24-hr security. Minutes from Ntinda Complex.",
        manager_phone: "+256 772 345678", manager_email: "john@afodabo.ug", status: "occupied",
        images: [],
      },
      {
        owner_id: johnId, title: "Modern 2-Bed Apartment, Bukoto", property_type: "apartment",
        district: "Kampala", city: "Kampala", area: "Bukoto",
        address: "Block B, Palm Gardens, Bukoto",
        bedrooms: 2, sitting_rooms: 1, kitchens: 1, bathrooms: 1,
        rent_amount: 1200000, rent_period: "monthly",
        amenities: ["Water", "Electricity", "WiFi", "Parking"],
        description: "Contemporary 2-bedroom apartment in Palm Gardens complex. Fully tiled, modern kitchen, high-speed WiFi included. Walking distance to Bukoto market.",
        manager_phone: "+256 772 345678", manager_email: "john@afodabo.ug", status: "available",
        images: [],
      },
      {
        owner_id: johnId, title: "Self-Contained Room in Kireka", property_type: "self_contained",
        district: "Wakiso", city: "Kireka", area: "Kireka",
        address: "Zone B, Kireka Town",
        bedrooms: 1, sitting_rooms: 0, kitchens: 1, bathrooms: 1,
        rent_amount: 350000, rent_period: "monthly",
        amenities: ["Water", "Electricity"],
        description: "Neat self-contained room with private bathroom and kitchenette. Secure neighborhood, good transport links to Kampala CBD.",
        manager_phone: "+256 772 345678", manager_email: "john@afodabo.ug", status: "available",
        images: [],
      },
      {
        owner_id: johnId, title: "Studio Apartment – Kiwatule", property_type: "studio",
        district: "Kampala", city: "Kampala", area: "Kiwatule",
        address: "Kiwatule Shopping Centre Area",
        bedrooms: 1, sitting_rooms: 0, kitchens: 1, bathrooms: 1,
        rent_amount: 550000, rent_period: "monthly",
        amenities: ["Water", "Electricity", "WiFi"],
        description: "Cozy studio apartment ideal for professionals. Open-plan living/bedroom, full kitchen, fast WiFi. Minutes from Kiwatule roundabout.",
        manager_phone: "+256 772 345678", manager_email: "john@afodabo.ug", status: "available",
        images: [],
      },
      {
        owner_id: johnId, title: "Executive 4-Bed Bungalow, Naguru", property_type: "bungalow",
        district: "Kampala", city: "Kampala", area: "Naguru",
        address: "Plot 12, Naguru Hill Drive",
        bedrooms: 4, sitting_rooms: 2, kitchens: 2, bathrooms: 3,
        rent_amount: 3500000, rent_period: "monthly",
        amenities: ["Water", "Electricity", "WiFi", "Parking", "Security", "Generator", "Garden"],
        description: "Stunning executive bungalow on Naguru hill with panoramic city views. Two kitchens, servants quarters, manicured garden, generator backup.",
        manager_phone: "+256 772 345678", manager_email: "john@afodabo.ug", status: "available",
        images: [],
      },
      {
        owner_id: johnId, title: "Single Room – Nansana", property_type: "room",
        district: "Wakiso", city: "Nansana", area: "Nansana",
        address: "Nansana Trading Centre",
        bedrooms: 1, sitting_rooms: 0, kitchens: 0, bathrooms: 1,
        rent_amount: 180000, rent_period: "monthly",
        amenities: ["Water", "Electricity"],
        description: "Affordable single room in Nansana. Shared bathroom and kitchen facilities. Secure compound.",
        manager_phone: "+256 772 345678", manager_email: "john@afodabo.ug", status: "available",
        images: [],
      },

      // Grace's properties
      {
        manager_id: graceId, title: "2-Bedroom Apartment – Mbarara", property_type: "apartment",
        district: "Mbarara", city: "Mbarara", area: "Ruharo",
        address: "Ruharo Mission Road, Mbarara",
        bedrooms: 2, sitting_rooms: 1, kitchens: 1, bathrooms: 1,
        rent_amount: 900000, rent_period: "monthly",
        amenities: ["Water", "Electricity", "Parking"],
        description: "Well-maintained 2-bedroom apartment in Ruharo, Mbarara's premium neighborhood. Close to Mbarara University and Referral Hospital.",
        manager_phone: "+256 701 234567", manager_email: "grace@afodabo.ug", status: "occupied",
        images: [],
      },
      {
        manager_id: graceId, title: "Spacious 3-Bed House – Gulu", property_type: "house",
        district: "Gulu", city: "Gulu", area: "Laroo",
        address: "Laroo Division, Gulu City",
        bedrooms: 3, sitting_rooms: 1, kitchens: 1, bathrooms: 2,
        rent_amount: 1200000, rent_period: "monthly",
        amenities: ["Water", "Electricity", "Parking", "Security"],
        description: "Large family house in the peaceful Laroo division of Gulu. Borehole water supply, perimeter fence, private parking.",
        manager_phone: "+256 701 234567", manager_email: "grace@afodabo.ug", status: "available",
        images: [],
      },
      {
        manager_id: graceId, title: "Self-Contained Unit – Jinja", property_type: "self_contained",
        district: "Jinja", city: "Jinja", area: "Walukuba",
        address: "Walukuba West, Jinja",
        bedrooms: 1, sitting_rooms: 0, kitchens: 1, bathrooms: 1,
        rent_amount: 300000, rent_period: "monthly",
        amenities: ["Water", "Electricity"],
        description: "Compact self-contained unit in Walukuba West, Jinja. Ideal for single professionals. Near Owen Falls Dam and Jinja market.",
        manager_phone: "+256 701 234567", manager_email: "grace@afodabo.ug", status: "available",
        images: [],
      },
      {
        manager_id: graceId, title: "Lake View 2-Bed Apartment – Entebbe", property_type: "apartment",
        district: "Wakiso", city: "Entebbe", area: "Kiwafu",
        address: "Kiwafu Road, Entebbe",
        bedrooms: 2, sitting_rooms: 1, kitchens: 1, bathrooms: 1,
        rent_amount: 1400000, rent_period: "monthly",
        amenities: ["Water", "Electricity", "WiFi", "Parking", "Garden"],
        description: "Charming apartment with partial lake views in quiet Kiwafu, Entebbe. Tiled floors, fitted kitchen, lush garden compound. 5 mins to Entebbe Airport.",
        manager_phone: "+256 701 234567", manager_email: "grace@afodabo.ug", status: "available",
        images: [],
      },
      {
        manager_id: graceId, title: "Room to Let – Lira City", property_type: "room",
        district: "Lira", city: "Lira", area: "Adyel",
        address: "Adyel Division, Lira City",
        bedrooms: 1, sitting_rooms: 0, kitchens: 0, bathrooms: 1,
        rent_amount: 150000, rent_period: "monthly",
        amenities: ["Water", "Electricity"],
        description: "Affordable room in a clean compound in Adyel, Lira City. Shared amenities, good security. Close to Lira market.",
        manager_phone: "+256 701 234567", manager_email: "grace@afodabo.ug", status: "available",
        images: [],
      },
      {
        manager_id: graceId, title: "3-Bed House – Wakiso Town", property_type: "house",
        district: "Wakiso", city: "Wakiso", area: "Wakiso Town",
        address: "Wakiso-Gombe Road",
        bedrooms: 3, sitting_rooms: 1, kitchens: 1, bathrooms: 2,
        rent_amount: 1500000, rent_period: "monthly",
        amenities: ["Water", "Electricity", "Parking", "Security", "Garden"],
        description: "Recently renovated 3-bedroom house along Wakiso-Gombe Road. Large garden, servant's quarters, water tank backup. Easy access to Kampala via Gayaza Road.",
        manager_phone: "+256 701 234567", manager_email: "grace@afodabo.ug", status: "available",
        images: [],
      },
    ];

    const { data: insertedProps, error: propsErr } = await supabase
      .from("properties")
      .insert(propertiesData)
      .select("id, title, owner_id, status");

    if (propsErr) {
      throw new Error("Properties insert failed: " + propsErr.message);
    }

    // ── 4. Leases ──────────────────────────────────────────────────────
    const ntindaHouse = insertedProps?.find(p => p.title.includes("Ntinda") && p.owner_id === johnId);
    const mbararaApt = insertedProps?.find(p => p.title.includes("Mbarara") && p.owner_id === graceId);

    const today = new Date();
    const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86400000).toISOString().split("T")[0];
    const subDays = (d: Date, n: number) => new Date(d.getTime() - n * 86400000).toISOString().split("T")[0];

    const leasesData = [];

    if (ntindaHouse && sarahTenant && johnId) {
      leasesData.push({
        owner_id: johnId,
        property_id: ntindaHouse.id,
        tenant_id: sarahTenant.id,
        start_date: subDays(today, 45),
        end_date: addDays(today, 45),
        monthly_rent: 1800000,
        security_deposit: 1800000,
        status: "active",
      });
    }

    if (mbararaApt && davidTenant && graceId) {
      leasesData.push({
        owner_id: graceId,
        property_id: mbararaApt.id,
        tenant_id: davidTenant.id,
        start_date: subDays(today, 75),
        end_date: addDays(today, 10),
        monthly_rent: 900000,
        security_deposit: 900000,
        status: "active",
      });
    }

    const { data: insertedLeases } = await supabase.from("leases").insert(leasesData).select("id, owner_id, tenant_id");

    // ── 5. Payments ────────────────────────────────────────────────────
    const paymentsData = [];
    const sarahLease = insertedLeases?.find(l => l.tenant_id === sarahTenant?.id);
    const davidLease = insertedLeases?.find(l => l.tenant_id === davidTenant?.id);

    if (sarahLease && sarahTenant) {
      paymentsData.push({
        lease_id: sarahLease.id,
        tenant_id: sarahTenant.id,
        amount: 1800000,
        payment_type: "rent",
        status: "confirmed",
        due_date: subDays(today, 46),
        paid_date: subDays(today, 46),
        transaction_id: "MTN2025031501234",
        notes: "Payment received via MTN Mobile Money. TXN#: MTN2025031501234",
      });
      paymentsData.push({
        lease_id: sarahLease.id,
        tenant_id: sarahTenant.id,
        amount: 1800000,
        payment_type: "rent",
        status: "uploaded",
        due_date: addDays(today, 45),
        notes: "Paid via Airtel Money. Reference: AIRTEL202503220001",
      });
    }

    if (davidLease && davidTenant) {
      paymentsData.push({
        lease_id: davidLease.id,
        tenant_id: davidTenant.id,
        amount: 900000,
        payment_type: "rent",
        status: "confirmed",
        due_date: subDays(today, 46),
        paid_date: subDays(today, 46),
        transaction_id: "DFCU-2025-0892",
        notes: "Bank transfer. Ref: DFCU-2025-0892",
      });
      paymentsData.push({
        lease_id: davidLease.id,
        tenant_id: davidTenant.id,
        amount: 900000,
        payment_type: "rent",
        status: "pending",
        due_date: addDays(today, 10),
        notes: null,
      });
    }

    if (paymentsData.length > 0) {
      await supabase.from("payments").insert(paymentsData);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Demo data loaded successfully!",
        accounts: [
          { email: "admin@afodabo.ug", password: "Demo@1234", role: "Admin" },
          { email: "john@afodabo.ug", password: "Demo@1234", role: "House Manager (Kampala)" },
          { email: "grace@afodabo.ug", password: "Demo@1234", role: "House Manager (Mbarara/Gulu)" },
          { email: "sarah@afodabo.ug", password: "Demo@1234", role: "Tenant" },
          { email: "david@afodabo.ug", password: "Demo@1234", role: "Tenant (rent due soon)" },
        ],
        summary: {
          properties: insertedProps?.length || 0,
          leases: leasesData.length,
          tenants: insertedTenants?.length || 0,
          payments: paymentsData.length,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
