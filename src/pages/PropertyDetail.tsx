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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
  MapPin, Bed, Bath, Home, Phone, Mail, ChevronLeft, ChevronRight,
  Wifi, Car, Zap, Droplets, Shield, Send, MessageSquare, Share2,
  Heart, CheckCircle, TreePine, Tv, Waves, Navigation, Sofa,
  ChefHat, ExternalLink
} from 'lucide-react';
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
  Security: <Shield className="h-4 w-4" />,
  Garden: <TreePine className="h-4 w-4" />,
  Generator: <Zap className="h-4 w-4" />,
  DSTV: <Tv className="h-4 w-4" />,
  Borehole: <Waves className="h-4 w-4" />,
  'Tiled Floors': <Home className="h-4 w-4" />,
};

const typeLabels: Record<string, string> = {
  house: 'House', apartment: 'Apartment', self_contained: 'Self-Contained',
  room: 'Single Room', studio: 'Studio', bungalow: 'Bungalow',
};

function formatUGX(amount: number) {
  if (amount >= 1000000) return `UGX ${(amount / 1000000).toFixed(1)}M`;
  if (amount >= 1000) return `UGX ${(amount / 1000).toFixed(0)}K`;
  return `UGX ${amount.toLocaleString()}`;
}

export default function PropertyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [imgIdx, setImgIdx] = useState(0);
  const [messageOpen, setMessageOpen] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [saved, setSaved] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!id) return;
    supabase.from('properties').select('*').eq('id', id).single().then(({ data }) => {
      setProperty(data);
      setLoading(false);
    });
  }, [id]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!property || !user || !messageText.trim()) return;
    setSending(true);
    const { error } = await supabase.from('messages').insert({
      sender_id: user.id,
      receiver_id: property.manager_id,
      content: messageText,
      property_id: property.id,
    });
    setSending(false);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Message sent!', description: 'The house manager will get back to you shortly.' });
    setMessageOpen(false);
    setMessageText('');
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: property?.title || 'Property', url: window.location.href });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast({ title: 'Link copied!', description: 'Share this property with friends and family.' });
    }
  };

  // Build Nominatim / OSM URLs for this property
  const getNominatimSearchUrl = (location: string) => {
    const encoded = encodeURIComponent(location + ', Uganda');
    return `https://www.openstreetmap.org/search?query=${encoded}`;
  };

  const getOSMDirectionsUrl = (location: string) => {
    return `https://www.openstreetmap.org/directions?to=${encodeURIComponent(location + ', Uganda')}`;
  };

  // OSM embed iframe showing Uganda map; link opens to the precise location via Nominatim
  const getOSMEmbedUrl = () => {
    return `https://www.openstreetmap.org/export/embed.html?bbox=29.5%2C-1.5%2C35.5%2C4.5&layer=mapnik`;
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container py-16 max-w-5xl">
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
  const mapLocation = [property.area, property.city, property.district].filter(Boolean).join(', ');

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container py-8 max-w-5xl mx-auto px-4">
        {/* Back */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm mb-6 transition-colors group"
        >
          <ChevronLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
          Back to listings
        </button>

        {/* Image Gallery */}
        <div className="relative rounded-3xl overflow-hidden h-80 md:h-[480px] mb-8 bg-muted shadow-lg">
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
            <Badge className="bg-accent text-accent-foreground font-semibold shadow">
              {typeLabels[property.property_type]}
            </Badge>
            <Badge className={`font-semibold shadow ${property.status === 'available' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
              {property.status === 'available' ? 'Available Now' : 'Occupied'}
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
                </div>
              </div>
            </div>

            {/* Room details */}
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

            {/* OpenStreetMap Location */}
            <div>
              <h2 className="font-display font-bold text-xl mb-4">Location on Map</h2>
              <div className="bg-card border border-border rounded-2xl overflow-hidden">
                {/* OSM Embed - Uganda overview with location label */}
                <div className="relative h-64 bg-secondary">
                  <iframe
                    title={`Map of ${property.district}`}
                    className="w-full h-full border-0"
                    src={getOSMEmbedUrl()}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                  <div className="absolute inset-0 pointer-events-none flex items-end">
                    <div className="w-full bg-gradient-to-t from-card/80 to-transparent p-3">
                      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                        <MapPin className="h-4 w-4 text-accent" />
                        {fullLocation || property.district + ', Uganda'}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="p-4 flex flex-wrap gap-3">
                  <a
                    href={getNominatimSearchUrl(mapLocation || property.district)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-primary font-medium hover:underline"
                  >
                    <ExternalLink className="h-4 w-4" />
                    View on OpenStreetMap
                  </a>
                  <span className="text-muted-foreground" aria-hidden>|</span>
                  <a
                    href={getOSMDirectionsUrl(mapLocation || property.district)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-accent font-medium hover:underline"
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
                            required
                            placeholder="Hello, I am interested in this property. Could you please tell me more about availability and when I can come for a viewing?"
                            className="mt-1"
                          />
                        </div>
                        <Button
                          type="submit"
                          disabled={sending}
                          className="w-full gradient-primary text-primary-foreground gap-2"
                        >
                          {sending ? 'Sending...' : <><Send className="h-4 w-4" />Send Message</>}
                        </Button>
                      </form>
                    </DialogContent>
                  </Dialog>

                  {property.manager_email && (
                    <a
                      href={`mailto:${property.manager_email}?subject=Enquiry: ${encodeURIComponent(property.title)}`}
                      className="block w-full"
                    >
                      <Button variant="outline" className="w-full gap-2 h-11">
                        <Mail className="h-4 w-4" />
                        Send Email
                      </Button>
                    </a>
                  )}

                  {/* OpenStreetMap Directions */}
                  {fullLocation && (
                    <a
                      href={getOSMDirectionsUrl(mapLocation || property.district)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block w-full"
                    >
                      <Button variant="outline" className="w-full gap-2 h-11 text-muted-foreground">
                        <Navigation className="h-4 w-4 text-accent" />
                        Get GPS Directions
                      </Button>
                    </a>
                  )}

                  {!property.manager_phone && !property.manager_email && (
                    <p className="text-muted-foreground text-sm text-center py-3">
                      Contact details not provided for this listing.
                    </p>
                  )}
                </div>
              ) : (
                <div className="text-center space-y-3">
                  <div className="bg-muted rounded-xl p-4 text-sm text-muted-foreground">
                    <Shield className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    Sign in to view contact details, send messages and get GPS directions.
                  </div>
                  <Button
                    className="w-full gradient-primary text-primary-foreground h-11 font-semibold"
                    onClick={() => navigate('/login')}
                  >
                    Sign In to Contact
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full h-11"
                    onClick={() => navigate('/register')}
                  >
                    Create Free Account
                  </Button>
                </div>
              )}

              {/* Share */}
              <div className="mt-4 pt-4 border-t border-border">
                <Button variant="ghost" className="w-full gap-2 text-muted-foreground text-sm" onClick={handleShare}>
                  <Share2 className="h-4 w-4" />
                  Share This Listing
                </Button>
              </div>
            </div>

            {/* Safety info */}
            <div className="bg-secondary border border-border rounded-2xl p-5">
              <div className="flex items-start gap-3">
                <Shield className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-foreground">Safe Renting Tips</p>
                  <ul className="text-xs text-muted-foreground mt-2 space-y-1.5">
                    <li className="flex items-start gap-1.5"><CheckCircle className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" /> Always visit the property before paying</li>
                    <li className="flex items-start gap-1.5"><CheckCircle className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" /> Request a written tenancy agreement</li>
                    <li className="flex items-start gap-1.5"><CheckCircle className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" /> Pay via PesaPal or upload mobile money proof</li>
                    <li className="flex items-start gap-1.5"><CheckCircle className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" /> Report fraud to info@afodabohousing.com</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
