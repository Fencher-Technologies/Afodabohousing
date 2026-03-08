import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { MapPin, Bed, Bath, Home, Phone, Mail, ChevronLeft, ChevronRight, Wifi, Car, Zap, Droplets } from 'lucide-react';
import prop1 from '@/assets/property-1.jpg';
import prop2 from '@/assets/property-2.jpg';
import prop3 from '@/assets/property-3.jpg';

type Property = Database['public']['Tables']['properties']['Row'];

const fallbackImages = [prop1, prop2, prop3];

const amenityIcons: Record<string, React.ReactNode> = {
  Water: <Droplets className="h-4 w-4" />,
  Electricity: <Zap className="h-4 w-4" />,
  WiFi: <Wifi className="h-4 w-4" />,
  Parking: <Car className="h-4 w-4" />,
};

const typeLabels: Record<string, string> = {
  house: 'House', apartment: 'Apartment', self_contained: 'Self-Contained',
  room: 'Room', studio: 'Studio', bungalow: 'Bungalow',
};

function formatUGX(amount: number) {
  return `UGX ${amount.toLocaleString()}`;
}

export default function PropertyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [imgIdx, setImgIdx] = useState(0);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!id) return;
    supabase.from('properties').select('*').eq('id', id).single().then(({ data }) => {
      setProperty(data);
      setLoading(false);
    });
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container py-16">
          <div className="animate-pulse space-y-6">
            <div className="h-96 bg-muted rounded-xl" />
            <div className="h-8 bg-muted rounded w-1/2" />
            <div className="h-4 bg-muted rounded w-1/3" />
          </div>
        </div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container py-24 text-center">
          <p className="text-4xl mb-4">🏚️</p>
          <h2 className="text-2xl font-display font-bold">Property not found</h2>
          <Button className="mt-6" onClick={() => navigate('/properties')}>Browse Properties</Button>
        </div>
      </div>
    );
  }

  const images = property.images?.length ? property.images : fallbackImages;
  const totalImages = images.length;

  const periodLabel = { monthly: '/month', quarterly: '/quarter', annually: '/year' }[property.rent_period] || '';

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container py-8 max-w-5xl mx-auto px-4">
        {/* Back */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm mb-6 transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to listings
        </button>

        {/* Image Gallery */}
        <div className="relative rounded-2xl overflow-hidden h-80 md:h-[440px] mb-8 bg-muted">
          <img
            src={images[imgIdx]}
            alt={property.title}
            className="w-full h-full object-cover"
          />
          {totalImages > 1 && (
            <>
              <button
                onClick={() => setImgIdx((imgIdx - 1 + totalImages) % totalImages)}
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-card/80 backdrop-blur-sm p-2 rounded-full hover:bg-card transition-colors shadow"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={() => setImgIdx((imgIdx + 1) % totalImages)}
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-card/80 backdrop-blur-sm p-2 rounded-full hover:bg-card transition-colors shadow"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                {images.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setImgIdx(i)}
                    className={`w-2 h-2 rounded-full transition-all ${i === imgIdx ? 'bg-accent w-6' : 'bg-card/70'}`}
                  />
                ))}
              </div>
            </>
          )}
          <div className="absolute top-4 left-4 flex gap-2">
            <Badge className="bg-accent text-accent-foreground">{typeLabels[property.property_type]}</Badge>
            <Badge className={property.status === 'available' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}>
              {property.status === 'available' ? '✓ Available' : 'Occupied'}
            </Badge>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Main info */}
          <div className="md:col-span-2 space-y-6">
            <div>
              <h1 className="font-display text-3xl font-bold text-foreground mb-2">{property.title}</h1>
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4 text-accent" />
                <span>{[property.address, property.area, property.city, property.district].filter(Boolean).join(', ')}</span>
              </div>
            </div>

            {/* Price */}
            <div className="bg-secondary rounded-xl p-5">
              <div className="text-3xl font-display font-bold text-primary">
                {formatUGX(property.rent_amount)}
                <span className="text-base font-normal text-muted-foreground ml-1">{periodLabel}</span>
              </div>
              <div className="text-sm text-muted-foreground mt-1 capitalize">
                Paid {property.rent_period}
              </div>
            </div>

            {/* Room breakdown */}
            <div>
              <h3 className="font-display font-semibold text-lg mb-3">Property Details</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { icon: <Bed className="h-5 w-5" />, label: 'Bedrooms', val: property.bedrooms },
                  { icon: <Bath className="h-5 w-5" />, label: 'Bathrooms', val: property.bathrooms },
                  { icon: <Home className="h-5 w-5" />, label: 'Sitting Rooms', val: property.sitting_rooms },
                  { icon: <Home className="h-5 w-5" />, label: 'Kitchens', val: property.kitchens },
                ].map((r) => (
                  <div key={r.label} className="bg-card border border-border rounded-lg p-4 text-center shadow-sm">
                    <div className="text-accent mx-auto mb-1 flex justify-center">{r.icon}</div>
                    <div className="text-2xl font-bold text-foreground">{r.val}</div>
                    <div className="text-xs text-muted-foreground">{r.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Description */}
            {property.description && (
              <div>
                <h3 className="font-display font-semibold text-lg mb-2">Description</h3>
                <p className="text-muted-foreground leading-relaxed">{property.description}</p>
              </div>
            )}

            {/* Amenities */}
            {property.amenities && property.amenities.length > 0 && (
              <div>
                <h3 className="font-display font-semibold text-lg mb-3">Amenities</h3>
                <div className="flex flex-wrap gap-2">
                  {property.amenities.map((a) => (
                    <div key={a} className="flex items-center gap-1.5 bg-secondary rounded-full px-4 py-1.5 text-sm font-medium">
                      {amenityIcons[a] || null}
                      {a}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Contact Panel */}
          <div className="space-y-4">
            <div className="bg-card border border-border rounded-xl p-6 shadow-card sticky top-24">
              <h3 className="font-display font-semibold text-lg mb-4">Contact House Manager</h3>

              {user ? (
                <div className="space-y-3">
                  {property.manager_phone && (
                    <a href={`tel:${property.manager_phone}`} className="w-full">
                      <Button className="w-full gradient-primary text-primary-foreground gap-2">
                        <Phone className="h-4 w-4" />
                        Call: {property.manager_phone}
                      </Button>
                    </a>
                  )}
                  {property.manager_email && (
                    <a href={`mailto:${property.manager_email}`} className="w-full">
                      <Button variant="outline" className="w-full gap-2">
                        <Mail className="h-4 w-4" />
                        Send Email
                      </Button>
                    </a>
                  )}
                  {!property.manager_phone && !property.manager_email && (
                    <p className="text-muted-foreground text-sm text-center py-2">Contact details not provided.</p>
                  )}
                </div>
              ) : (
                <div className="text-center space-y-3">
                  <p className="text-muted-foreground text-sm">Sign in to view contact details and message the house manager.</p>
                  <Button className="w-full gradient-primary text-primary-foreground" onClick={() => navigate('/login')}>
                    Sign In to Contact
                  </Button>
                  <Button variant="outline" className="w-full" onClick={() => navigate('/register')}>
                    Create Account
                  </Button>
                </div>
              )}

              <div className="mt-6 pt-4 border-t border-border text-xs text-muted-foreground text-center">
                GPS directions available after sign in
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
