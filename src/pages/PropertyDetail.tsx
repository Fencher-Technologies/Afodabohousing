import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import VoiceRecorder from '@/components/VoiceRecorder';
import {
  MapPin, Bed, Bath, Home, Phone, Mail, ChevronLeft, ChevronRight,
  Wifi, Car, Zap, Droplets, Shield, Send, MessageSquare, Share2,
  Heart, CheckCircle, TreePine, Tv, Waves, Navigation, Sofa,
  ChefHat, ExternalLink, Building2, Sparkles
} from 'lucide-react';
import { isPropertyBoosted } from '@/services/property-boosts';
import prop1 from '@/assets/property-1.jpg';
import prop2 from '@/assets/property-2.jpg';
import prop3 from '@/assets/property-3.jpg';

type Property = Database['public']['Tables']['properties']['Row'];

// Minimal rental unit type from DB (may not be in generated types yet)
interface RentalUnit {
  id: string;
  unit_number: string;
  floor_level?: string | null;
  bedrooms: number;
  bathrooms: number;
  sitting_rooms: number;
  kitchens: number;
  rent_amount: number;
  rent_currency: string;
  status: string;
  description?: string | null;
  amenities?: string[] | null;
}

const fallbackImages = [prop1, prop2, prop3];

const amenityIcons: Record<string, React.ReactNode> = {
  Water: <Droplets className="h-4 w-4" />,
  Electricity: <Zap className="h-4 w-4" />,
  WiFi: <Wifi className="h-4 w-4" />,
  Parking: <Car className="h-4 w-4" />,
  Security: <Shield className="h-4 w-4" />,
  Garden: <TreePine className="h-4 w-4" />,
  Generator: <Zap className="h-4 w-4" />,
  DSTV: <Tv className="h-4 w-4" />,
  Borehole: <Waves className="h-4 w-4" />,
  'Tiled Floors': <Home className="h-4 w-4" />,
};

const typeLabels: Record<string, string> = {
  Residential: 'Residential',
  'Office Space': 'Office Space',
};

const statusColors: Record<string, string> = {
  available: 'bg-accent/10 text-accent border border-accent/30',
  occupied: 'bg-destructive/10 text-destructive border border-destructive/30',
  inactive: 'bg-muted text-muted-foreground border border-border',
};

function formatUGX(amount: number) {
  if (amount >= 1000000) return `UGX ${(amount / 1000000).toFixed(1)}M`;
  if (amount >= 1000) return `UGX ${(amount / 1000).toFixed(0)}K`;
  return `UGX ${amount.toLocaleString()}`;
}

export default function PropertyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [property, setProperty] = useState<Property | null>(null);
  const [units, setUnits] = useState<RentalUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [imgIdx, setImgIdx] = useState(0);
  const [messageOpen, setMessageOpen] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [saved, setSaved] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data: prop } = await supabase.from('properties').select('*').eq('id', id).single();
      setProperty(prop);
      if (prop) {
        const { data: unitData } = await supabase.from('rental_units').select('*').eq('property_id', id).eq('is_active', true);
        setUnits(unitData || []);
      }
      setLoading(false);
    })();
  }, [id]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !property?.owner_id || (!messageText.trim() && !audioUrl)) return;
    setSending(true);
    const { error } = await supabase.from('messages').insert({
      sender_id: user.id,
      receiver_id: property.owner_id,
      property_id: property.id,
      content: messageText.trim() || null,
      voice_note_url: audioUrl,
    });
    setSending(false);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Message sent!', description: 'The house manager will respond in your inbox.' });
    setMessageText('');
    setAudioUrl(null);
    setMessageOpen(false);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: property?.title || 'Property', url: window.location.href });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast({ title: 'Link copied!', description: 'Share this property with friends and family.' });
    }
  };

  // Build OSM search/embed URLs using district + area
  const buildOSMQuery = (p: Property) =>
    [p.area, p.city, p.district, 'Uganda'].filter(Boolean).join(', ');

  const getOSMSearchUrl = (p: Property) =>
    `https://www.openstreetmap.org/search?query=${encodeURIComponent(buildOSMQuery(p))}`;

  const getOSMDirectionsUrl = (p: Property) =>
    `https://www.openstreetmap.org/directions?to=${encodeURIComponent(buildOSMQuery(p))}`;

  // Use Nominatim geocoding URL embedded in iframe via overpass embed
  const getOSMEmbedUrl = (p: Property) => {
    // Build a search-based embed that zooms to the district
    const q = encodeURIComponent(`${p.district} District, Uganda`);
    return `https://nominatim.openstreetmap.org/search?q=${q}&format=html`;
  };

  // Alternative: use leaflet/OSM tile embed with known Uganda bbox for the district
  const getOSMTileEmbed = (p: Property) => {
    // Use a simple marker-based Leaflet embed URL
    const location = encodeURIComponent(buildOSMQuery(p));
    // Embed using geoapify or umap for simplicity; fall back to standard OSM export
    return `https://www.openstreetmap.org/export/embed.html?bbox=29.5%2C-1.5%2C35.5%2C4.5&layer=mapnik&marker=${encodeURIComponent(p.district + ', Uganda')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container py-16 max-w-6xl">
          <div className="animate-pulse space-y-6">
            <div className="h-10 bg-muted rounded w-1/3" />
            <div className="h-[440px] bg-muted rounded-3xl" />
            <div className="grid md:grid-cols-3 gap-6">
              <div className="md:col-span-2 h-64 bg-muted rounded-2xl" />
              <div className="h-64 bg-muted rounded-2xl" />
            </div>
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
          <p className="text-6xl mb-5">🏚️</p>
          <h2 className="text-3xl font-display font-bold text-foreground">Property Not Found</h2>
          <p className="text-muted-foreground mt-3 text-lg">This listing may have been removed or is no longer available.</p>
          <Button className="mt-6 gradient-primary text-primary-foreground" onClick={() => navigate('/properties')}>
            Browse All Properties
          </Button>
        </div>
        <Footer />
      </div>
    );
  }

  const images = property.images?.length ? property.images : fallbackImages;
  const totalImages = images.length;
  const periodLabel = { monthly: 'per month', quarterly: 'per quarter', annually: 'per year' }[property.rent_period] || '';
  const fullLocation = [property.address, property.area, property.city, property.district].filter(Boolean).join(', ');
  const availableUnits = units.filter(u => u.status === 'available');
  const isBoosted = isPropertyBoosted(property);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container py-8 max-w-6xl mx-auto px-4">
        {/* Back */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm mb-6 transition-colors group"
        >
          <ChevronLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
          Back to listings
        </button>

        {/* Image Gallery */}
        <div className="relative rounded-3xl overflow-hidden h-80 md:h-[500px] mb-8 bg-muted shadow-lg">
          <img src={images[imgIdx]} alt={property.title} className="w-full h-full object-cover" />

          {totalImages > 1 && (
            <>
              <button
                onClick={() => setImgIdx((imgIdx - 1 + totalImages) % totalImages)}
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-card/90 backdrop-blur-sm p-3 rounded-full hover:bg-card transition-all shadow-lg"
                aria-label="Previous image"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={() => setImgIdx((imgIdx + 1) % totalImages)}
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-card/90 backdrop-blur-sm p-3 rounded-full hover:bg-card transition-all shadow-lg"
                aria-label="Next image"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
              <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-2">
                {images.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setImgIdx(i)}
                    aria-label={`Image ${i + 1}`}
                    className={`h-2 rounded-full transition-all ${i === imgIdx ? 'bg-accent w-8' : 'bg-card/80 w-2'}`}
                  />
                ))}
              </div>
              <div className="absolute bottom-5 right-5 bg-card/80 backdrop-blur-sm text-xs px-2.5 py-1 rounded-full font-semibold">
                {imgIdx + 1} / {totalImages}
              </div>
            </>
          )}

          {/* Badges */}
          <div className="absolute top-5 left-5 flex gap-2">
            {isBoosted && (
              <Badge className="bg-amber-400 text-amber-950 font-semibold shadow gap-1">
                <Sparkles className="h-3.5 w-3.5" />
                Boosted
              </Badge>
            )}
            <Badge className="bg-accent text-accent-foreground font-semibold shadow">
              {typeLabels[property.property_type]}
            </Badge>
            <Badge className={`font-semibold shadow ${property.status === 'available' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
              {property.status === 'available' ? 'Available Now' : property.status === 'occupied' ? 'Occupied' : 'Inactive'}
            </Badge>
          </div>

          {/* Action buttons */}
          <div className="absolute top-5 right-5 flex gap-2">
            <button
              onClick={handleShare}
              className="bg-card/90 backdrop-blur-sm p-2.5 rounded-full hover:bg-card transition-all shadow"
              aria-label="Share"
            >
              <Share2 className="h-4 w-4 text-foreground" />
            </button>
            <button
              onClick={() => setSaved(!saved)}
              className={`bg-card/90 backdrop-blur-sm p-2.5 rounded-full hover:bg-card transition-all shadow ${saved ? 'text-accent' : 'text-foreground'}`}
              aria-label="Save"
            >
              <Heart className={`h-4 w-4 ${saved ? 'fill-current' : ''}`} />
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Main Info */}
          <div className="md:col-span-2 space-y-8">
            {/* Title and Price */}
            <div>
              <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-3 leading-tight">
                {property.title}
              </h1>
              <div className="flex items-center gap-2 text-muted-foreground mb-5">
                <MapPin className="h-4 w-4 text-accent shrink-0" />
                <span className="text-sm">{fullLocation || property.district}</span>
              </div>
              <div className="bg-gradient-to-r from-primary/10 to-transparent rounded-2xl p-5 border border-primary/20">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-display font-bold text-primary">
                    {formatUGX(property.rent_amount)}
                  </span>
                  <span className="text-lg text-muted-foreground">{periodLabel}</span>
                </div>
                <div className="text-sm text-muted-foreground mt-1.5 capitalize">
                  Paid {property.rent_period} in {property.rent_currency}
                  {units.length > 0 && (
                    <span className="ml-3 text-accent font-semibold">
                      {availableUnits.length}/{units.length} units available
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Room details (for the main property / single-unit view) */}
            {units.length === 0 && (
              <div>
                <h2 className="font-display font-bold text-xl mb-4">Property Details</h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { icon: <Bed className="h-5 w-5" />, label: 'Bedrooms', val: property.bedrooms },
                    { icon: <Bath className="h-5 w-5" />, label: 'Bathrooms', val: property.bathrooms },
                    { icon: <Sofa className="h-5 w-5" />, label: 'Sitting Rooms', val: property.sitting_rooms },
                    { icon: <ChefHat className="h-5 w-5" />, label: 'Kitchens', val: property.kitchens },
                  ].map(r => (
                    <div key={r.label} className="bg-card border border-border rounded-2xl p-5 text-center shadow-sm hover:shadow-md transition-shadow">
                      <div className="text-accent mx-auto mb-2 flex justify-center">{r.icon}</div>
                      <div className="text-3xl font-bold font-display text-foreground">{r.val}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{r.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Multi-unit listing */}
            {units.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Building2 className="h-5 w-5 text-primary" />
                  <h2 className="font-display font-bold text-xl">Rental Units</h2>
                </div>

                {/* Summary bar */}
                <div className="grid grid-cols-3 gap-3 mb-5">
                  <div className="bg-card border border-border rounded-xl p-3.5 text-center">
                    <div className="text-2xl font-display font-bold text-foreground">{units.length}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">Total Units</div>
                  </div>
                  <div className="bg-accent/8 border border-accent/20 rounded-xl p-3.5 text-center">
                    <div className="text-2xl font-display font-bold text-accent">{availableUnits.length}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">Available</div>
                  </div>
                  <div className="bg-card border border-border rounded-xl p-3.5 text-center">
                    <div className="text-2xl font-display font-bold text-foreground">{units.length - availableUnits.length}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">Occupied</div>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  {units.map(unit => (
                    <div
                      key={unit.id}
                      className={`bg-card border rounded-2xl overflow-hidden shadow-sm transition-all ${
                        unit.status === 'available'
                          ? 'border-accent/30 hover:shadow-md hover:-translate-y-0.5'
                          : 'border-border opacity-70'
                      }`}
                    >
                      {/* Unit header */}
                      <div className={`px-5 py-3 flex items-center justify-between ${unit.status === 'available' ? 'bg-accent/8' : 'bg-muted/50'}`}>
                        <div>
                          <p className="font-bold text-foreground text-sm">Unit {unit.unit_number}</p>
                          {unit.floor_level && <p className="text-xs text-muted-foreground">{unit.floor_level}</p>}
                        </div>
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${statusColors[unit.status] || 'bg-muted text-muted-foreground'}`}>
                          {unit.status}
                        </span>
                      </div>

                      <div className="p-5">
                        {/* Room stats */}
                        <div className="grid grid-cols-2 gap-2 mb-3">
                          {[
                            { icon: <Bed className="h-3.5 w-3.5" />, val: unit.bedrooms, label: 'Bed' },
                            { icon: <Bath className="h-3.5 w-3.5" />, val: unit.bathrooms, label: 'Bath' },
                            ...(unit.sitting_rooms > 0 ? [{ icon: <Sofa className="h-3.5 w-3.5" />, val: unit.sitting_rooms, label: 'Sitting' }] : []),
                            ...(unit.kitchens > 0 ? [{ icon: <ChefHat className="h-3.5 w-3.5" />, val: unit.kitchens, label: 'Kitchen' }] : []),
                          ].map(r => (
                            <div key={r.label} className="flex items-center gap-1.5 text-xs text-muted-foreground bg-secondary rounded-lg px-2.5 py-1.5">
                              <span className="text-primary">{r.icon}</span>
                              <span className="font-semibold text-foreground">{r.val}</span>
                              <span>{r.label}</span>
                            </div>
                          ))}
                        </div>

                        {/* Amenities chips */}
                        {unit.amenities && unit.amenities.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mb-3">
                            {unit.amenities.slice(0, 4).map(a => (
                              <span key={a} className="flex items-center gap-1 text-xs bg-primary/8 text-primary px-2 py-0.5 rounded-full">
                                {amenityIcons[a] && <span className="opacity-70">{amenityIcons[a]}</span>}
                                {a}
                              </span>
                            ))}
                            {unit.amenities.length > 4 && (
                              <span className="text-xs text-muted-foreground px-2 py-0.5">+{unit.amenities.length - 4} more</span>
                            )}
                          </div>
                        )}

                        {unit.description && (
                          <p className="text-xs text-muted-foreground mb-3 leading-relaxed line-clamp-2">{unit.description}</p>
                        )}

                        <div className="flex items-center justify-between pt-2 border-t border-border">
                          <div>
                            <span className="text-xl font-bold text-primary font-display">{formatUGX(unit.rent_amount)}</span>
                            <span className="text-muted-foreground text-xs ml-1">/mo</span>
                          </div>
                          {unit.status === 'available' ? (
                            user ? (
                              <Button size="sm" className="gradient-primary text-primary-foreground text-xs gap-1.5 h-8" onClick={() => setMessageOpen(true)}>
                                <MessageSquare className="h-3 w-3" />
                                Enquire
                              </Button>
                            ) : (
                              <Button size="sm" variant="outline" className="text-xs h-8 gap-1.5" onClick={() => navigate('/login')}>
                                Login to enquire
                              </Button>
                            )
                          ) : (
                            <span className="text-xs text-muted-foreground font-medium">Not available</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Description */}
            {property.description && (
              <div>
                <h2 className="font-display font-bold text-xl mb-3">About This Property</h2>
                <p className="text-muted-foreground leading-relaxed text-base">{property.description}</p>
              </div>
            )}

            {/* Amenities */}
            {property.amenities && property.amenities.length > 0 && (
              <div>
                <h2 className="font-display font-bold text-xl mb-4">Amenities and Features</h2>
                <div className="flex flex-wrap gap-3">
                  {property.amenities.map(a => (
                    <div
                      key={a}
                      className="flex items-center gap-2 bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm font-medium hover:bg-card transition-colors"
                    >
                      <span className="text-primary">{amenityIcons[a] || <CheckCircle className="h-4 w-4" />}</span>
                      {a}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Location */}
            <div>
              <h2 className="font-display font-bold text-xl mb-4">Location</h2>
              <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
                <div className="h-40 bg-secondary flex flex-col items-center justify-center gap-3">
                  <MapPin className="h-10 w-10 text-accent opacity-40" />
                  <div className="text-center">
                    <p className="font-semibold text-foreground text-sm">{fullLocation || `${property.district}, Uganda`}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Open a map app below to find exact location</p>
                  </div>
                </div>
                <div className="p-4 flex flex-wrap gap-4 border-t border-border bg-secondary/30">
                  <a
                    href={getOSMSearchUrl(property)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-primary font-semibold hover:underline"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Search on OpenStreetMap
                  </a>
                  <a
                    href={getOSMDirectionsUrl(property)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-accent font-semibold hover:underline"
                  >
                    <Navigation className="h-4 w-4" />
                    Get Directions
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Panel */}
          <div className="space-y-4">
            <div className="bg-card border border-border rounded-2xl p-6 shadow-lg sticky top-24">
              <h3 className="font-display font-bold text-xl mb-2">Contact House Manager</h3>
              <p className="text-muted-foreground text-sm mb-5">
                Interested in this property? Reach out directly to the house manager.
              </p>

              {user ? (
                <div className="space-y-3">
                  {property.manager_phone && (
                    <a href={`tel:${property.manager_phone}`} className="block w-full">
                      <Button className="w-full gradient-primary text-primary-foreground gap-2 h-11">
                        <Phone className="h-4 w-4" />
                        Call: {property.manager_phone}
                      </Button>
                    </a>
                  )}

                  {/* Message in-app */}
                  <Dialog open={messageOpen} onOpenChange={setMessageOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="w-full gap-2 h-11">
                        <MessageSquare className="h-4 w-4" />
                        Send In-App Message
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle className="font-display text-xl">Message House Manager</DialogTitle>
                        <DialogDescription>
                          Send a message about {property.title}. The manager will respond in your inbox.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="bg-secondary rounded-xl p-3 text-sm mt-3">
                        <p className="font-semibold text-foreground">{property.title}</p>
                        <p className="text-muted-foreground text-xs mt-0.5">
                          {property.district}{property.city ? `, ${property.city}` : ''}
                        </p>
                      </div>
                      <form onSubmit={handleSendMessage} className="space-y-4 mt-2">
                        <div>
                          <Label>Your Message</Label>
                          <Textarea
                            value={messageText}
                            onChange={e => setMessageText(e.target.value)}
                            rows={4}
                            placeholder="Hello, I am interested in this property. Is it still available?..."
                            className="mt-1"
                          />
                        </div>
                        <VoiceRecorder onRecordingComplete={setAudioUrl} onClear={() => setAudioUrl(null)} audioUrl={audioUrl} />
                        <Button type="submit" disabled={sending || (!messageText.trim() && !audioUrl)} className="w-full gradient-primary text-primary-foreground gap-2">
                          <Send className="h-4 w-4" />
                          {sending ? 'Sending...' : 'Send Message'}
                        </Button>
                      </form>
                    </DialogContent>
                  </Dialog>

                  {property.manager_email && (
                    <a href={`mailto:${property.manager_email}?subject=Inquiry: ${encodeURIComponent(property.title)}`} className="block w-full">
                      <Button variant="outline" className="w-full gap-2 h-11">
                        <Mail className="h-4 w-4" />
                        Email Manager
                      </Button>
                    </a>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="bg-secondary rounded-xl p-4 text-center">
                    <p className="text-sm text-muted-foreground mb-3">Sign in to contact this manager and view full details</p>
                    <Button className="w-full gradient-primary text-primary-foreground" onClick={() => navigate('/login')}>
                      Sign In to Contact
                    </Button>
                  </div>
                  <Button variant="outline" className="w-full" onClick={() => navigate('/register')}>
                    Create Free Account
                  </Button>
                </div>
              )}

              {/* Key details summary */}
              <div className="mt-6 pt-5 border-t border-border space-y-3">
                <h4 className="font-semibold text-sm text-foreground">Quick Details</h4>
                {[
                  { label: 'Type', val: typeLabels[property.property_type] || property.property_type },
                  { label: 'District', val: property.district },
                  { label: 'Rent Period', val: property.rent_period, capitalize: true },
                  { label: 'Currency', val: property.rent_currency },
                  ...(units.length > 0 ? [{ label: 'Total Units', val: String(units.length) }, { label: 'Available', val: String(availableUnits.length) }] : [
                    { label: 'Bedrooms', val: String(property.bedrooms) },
                    { label: 'Bathrooms', val: String(property.bathrooms) },
                  ]),
                ].map(r => (
                  <div key={r.label} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{r.label}</span>
                    <span className={`font-medium text-foreground ${r.capitalize ? 'capitalize' : ''}`}>{r.val}</span>
                  </div>
                ))}
              </div>

              {/* Share */}
              <Button variant="outline" className="w-full mt-4 gap-2" onClick={handleShare}>
                <Share2 className="h-4 w-4" />
                Share This Listing
              </Button>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
