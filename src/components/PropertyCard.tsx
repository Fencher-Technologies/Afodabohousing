import { Link } from 'react-router-dom';
import { MapPin, Bed, Bath, Home } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Database } from '@/integrations/supabase/types';
import prop1 from '@/assets/property-1.jpg';
import prop2 from '@/assets/property-2.jpg';
import prop3 from '@/assets/property-3.jpg';

type Property = Database['public']['Tables']['properties']['Row'];

const fallbackImages = [prop1, prop2, prop3];

const typeLabels: Record<string, string> = {
  house: 'House',
  apartment: 'Apartment',
  self_contained: 'Self-Contained',
  room: 'Room',
  studio: 'Studio',
  bungalow: 'Bungalow',
};

const periodLabels: Record<string, string> = {
  monthly: '/mo',
  quarterly: '/qtr',
  annually: '/yr',
};

function formatUGX(amount: number) {
  return `UGX ${amount.toLocaleString()}`;
}

interface PropertyCardProps {
  property: Property;
  index?: number;
}

export default function PropertyCard({ property, index = 0 }: PropertyCardProps) {
  const imageUrl = property.images?.[0] || fallbackImages[index % 3];

  return (
    <Link to={`/properties/${property.id}`} className="group block">
      <div className="bg-card rounded-lg overflow-hidden border border-border shadow-card hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
        {/* Image */}
        <div className="relative h-52 overflow-hidden">
          <img
            src={imageUrl}
            alt={property.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute top-3 left-3">
            <Badge className="bg-accent text-accent-foreground font-medium text-xs">
              {typeLabels[property.property_type] || property.property_type}
            </Badge>
          </div>
          <div className="absolute top-3 right-3">
            <Badge
              variant={property.status === 'available' ? 'default' : 'secondary'}
              className={property.status === 'available' ? 'bg-primary text-primary-foreground' : ''}
            >
              {property.status === 'available' ? 'Available' : 'Occupied'}
            </Badge>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          <h3 className="font-display font-semibold text-lg text-foreground mb-1 line-clamp-1 group-hover:text-primary transition-colors">
            {property.title}
          </h3>

          <div className="flex items-center gap-1 text-muted-foreground text-sm mb-3">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-accent" />
            <span className="line-clamp-1">{property.area ? `${property.area}, ` : ''}{property.district}</span>
          </div>

          {/* Room breakdown */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
            <div className="flex items-center gap-1">
              <Bed className="h-3.5 w-3.5" />
              <span>{property.bedrooms} bed{property.bedrooms !== 1 ? 's' : ''}</span>
            </div>
            <div className="flex items-center gap-1">
              <Bath className="h-3.5 w-3.5" />
              <span>{property.bathrooms} bath{property.bathrooms !== 1 ? 's' : ''}</span>
            </div>
            <div className="flex items-center gap-1">
              <Home className="h-3.5 w-3.5" />
              <span>{property.sitting_rooms} sitting</span>
            </div>
          </div>

          {/* Price */}
          <div className="flex items-end justify-between">
            <div>
              <span className="text-xl font-bold text-primary font-display">
                {formatUGX(property.rent_amount)}
              </span>
              <span className="text-muted-foreground text-sm ml-1">
                {periodLabels[property.rent_period]}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
