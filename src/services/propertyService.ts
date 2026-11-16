import { isSupabaseConfigured, supabase } from '../lib/supabase';
import {
  ASSINIE_VILLA_IMAGE,
  BINGERVILLE_LAND_IMAGE,
  COCODY_DUPLEX_IMAGE,
  HERO_VILLA_IMAGE,
  PLATEAU_OFFICE_IMAGE,
  RIVIERA_APT_IMAGE,
} from '../data/demoData';
import type { PaymentProvider, Property, PropertyStatus, TransactionType } from '../types/database';
import { storageService } from './storageService';

interface RawSupabaseImage {
  id: string;
  property_id: string;
  image_url?: string;
  url?: string;
  public_url?: string;
  storage_path?: string;
  is_cover?: boolean;
  is_primary?: boolean;
  sort_order?: number;
  created_at?: string;
}

interface RawSupabaseProperty {
  id: string;
  user_id?: string;
  owner_id?: string;
  agency_id: string | null;
  category_id?: string;
  property_type?: string | null;
  subcategory?: string | null;
  transaction_type?: string;
  operation_type?: string;
  transaction?: string;
  title: string;
  slug?: string;
  description: string;
  price?: number;
  price_fcfa?: number;
  currency?: string;
  city: string;
  neighborhood?: string | null;
  commune?: string | null;
  quartier?: string | null;
  address?: string | null;
  address_hint?: string | null;
  public_address_hint?: string | null;
  contact_phone?: string | null;
  contact_whatsapp?: string | null;
  area_sqm?: number | null;
  surface_m2?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  additional_info?: Record<string, unknown> | null;
  status: string;
  rejection_reason?: string | null;
  is_furnished?: boolean;
  is_sponsored?: boolean;
  is_featured?: boolean;
  is_demo?: boolean;
  views_count?: number;
  published_at?: string | null;
  created_at: string;
  property_categories?: { name?: string } | null;
  agencies?: { name?: string; is_verified?: boolean } | null;
  property_images?: RawSupabaseImage[] | null;
}

function resolveDemoImageFallback(url: string, title: string): string {
  if (!url.startsWith('/demo-images/')) return url;
  const lower = `${url} ${title}`.toLowerCase();
  if (lower.includes('assinie') || lower.includes('terrain')) {
    return lower.includes('terrain') ? BINGERVILLE_LAND_IMAGE : ASSINIE_VILLA_IMAGE;
  }
  if (lower.includes('plateau') || lower.includes('bureau')) return PLATEAU_OFFICE_IMAGE;
  if (lower.includes('appartement') || lower.includes('riviera')) return RIVIERA_APT_IMAGE;
  if (lower.includes('duplex')) return COCODY_DUPLEX_IMAGE;
  return HERO_VILLA_IMAGE;
}

function normalizeStatus(rawStatus: string): PropertyStatus {
  if (rawStatus === 'published_available' || rawStatus === 'published') return 'published';
  if (rawStatus === 'pending_validation' || rawStatus === 'pending_review' || rawStatus === 'pending') {
    return 'pending_validation';
  }
  if (rawStatus === 'pending_payment') return 'pending_payment';
  if (rawStatus === 'rejected') return 'rejected';
  if (rawStatus === 'expired') return 'expired';
  if (rawStatus === 'archived') return 'archived';
  return 'draft';
}

function normalizeTransaction(rawTx?: string): TransactionType {
  if (rawTx === 'rent') return 'rent';
  if (rawTx === 'seasonal' || rawTx === 'short_term') return 'seasonal';
  return 'sale';
}

function mapSupabaseProperty(row: RawSupabaseProperty): Property {
  const tx = normalizeTransaction(row.transaction_type || row.operation_type || row.transaction);
  const info = (row.additional_info || {}) as Record<string, unknown>;
  const images = (row.property_images || [])
    .slice()
    .sort((a, b) => {
      const aCover = Boolean(a.is_cover ?? a.is_primary);
      const bCover = Boolean(b.is_cover ?? b.is_primary);
      if (aCover !== bCover) return aCover ? -1 : 1;
      return (a.sort_order ?? 0) - (b.sort_order ?? 0);
    })
    .map((img, idx) => {
      const resolvedUrl = img.image_url || img.public_url || img.url || HERO_VILLA_IMAGE;
      return {
        id: img.id,
        property_id: img.property_id,
        storage_path: img.storage_path || resolvedUrl,
        public_url: resolveDemoImageFallback(resolvedUrl, row.title),
        is_cover: Boolean(img.is_cover ?? img.is_primary ?? idx === 0),
        sort_order: img.sort_order ?? idx,
      };
    });

  return {
    id: row.id,
    reference: `RI-${row.id.slice(0, 8).toUpperCase()}`,
    slug: row.slug || row.id,
    owner_id: row.user_id || row.owner_id || '',
    owner_phone: row.contact_phone || undefined,
    owner_whatsapp: row.contact_whatsapp || undefined,
    agency_id: row.agency_id,
    agency_name: row.agencies?.name,
    agency_verified: Boolean(row.agencies?.is_verified),
    agent_id: null,
    category_id: row.category_id || '',
    category_name:
      row.property_categories?.name || row.property_type || row.subcategory || 'Bien immobilier',
    title: row.title,
    description: row.description,
    transaction: tx,
    price_fcfa: Number(row.price ?? row.price_fcfa ?? 0),
    price_period: tx === 'rent' ? 'month' : tx === 'seasonal' ? 'day' : 'total',
    city: row.city || 'Abidjan',
    commune: row.commune || row.neighborhood || row.city || 'Abidjan',
    quartier: row.quartier || row.neighborhood || row.commune || '',
    public_address_hint: row.address || row.address_hint || row.public_address_hint || null,
    show_exact_address: false,
    latitude: 5.34,
    longitude: -3.99,
    surface_m2: Number(row.area_sqm ?? row.surface_m2 ?? 0),
    bedrooms: Number(row.bedrooms ?? info.bedrooms ?? 0),
    bathrooms: Number(row.bathrooms ?? info.bathrooms ?? 0),
    has_garage: Boolean(info.has_garage ?? false),
    has_pool: Boolean(info.has_pool ?? false),
    has_garden: Boolean(info.has_garden ?? false),
    is_furnished: Boolean(row.is_furnished),
    amenities: Array.isArray(info.amenities) ? (info.amenities as string[]) : [],
    video_url: null,
    availability_date: row.published_at || row.created_at,
    status: normalizeStatus(row.status),
    rejection_reason: row.rejection_reason || null,
    featured_badge: row.is_sponsored || row.is_featured ? 'featured' : null,
    is_featured: Boolean(row.is_sponsored ?? row.is_featured),
    views_count: Number(row.views_count || 0),
    favorites_count: 0,
    plan_id: null,
    published_at: row.published_at || null,
    expires_at: null,
    created_at: row.created_at,
    images,
    is_demo: Boolean(row.is_demo),
  };
}

export const propertyService = {
  async fetchPublishedProperties(): Promise<Property[]> {
    if (!isSupabaseConfigured || !supabase) return [];

    const { data, error } = await supabase
      .from('properties')
      .select('*, property_images(*), agencies(name, is_verified)')
      .in('status', ['published', 'published_available'])
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return ((data as RawSupabaseProperty[]) || [])
      .map(mapSupabaseProperty)
      .filter((p) => !p.is_demo);
  },

  async fetchProperties(): Promise<Property[]> {
    if (!isSupabaseConfigured || !supabase) return [];

    const { data, error } = await supabase
      .from('properties')
      .select('*, property_images(*), agencies(name, is_verified)')
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return ((data as RawSupabaseProperty[]) || []).map(mapSupabaseProperty);
  },

  async fetchPropertyBySlug(slugOrId: string): Promise<Property | null> {
    if (!isSupabaseConfigured || !supabase) return null;

    const { data, error } = await supabase
      .from('properties')
      .select('*, property_images(*), agencies(name, is_verified)')
      .eq('id', slugOrId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return data ? mapSupabaseProperty(data as RawSupabaseProperty) : null;
  },

  async createPropertyAndInitiatePayment(payload: {
    ownerId: string;
    property: {
      agency_id: string | null;
      category_id: string;
      category_name?: string;
      title: string;
      description: string;
      transaction: Property['transaction'];
      price_fcfa: number;
      city: string;
      commune: string;
      quartier: string;
      public_address_hint: string | null;
      surface_m2: number;
      bedrooms: number;
      bathrooms: number;
      has_garage: boolean;
      has_pool: boolean;
      has_garden: boolean;
      is_furnished: boolean;
      amenities: string[];
      plan_id: string;
    };
    imageFiles: File[];
    provider: PaymentProvider;
    payerPhone: string;
    manualReference?: string;
  }): Promise<{ property: Property; paymentInitiated: boolean }> {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error('Supabase non configuré.');
    }

    const { data: insertedProp, error: propErr } = await supabase
      .from('properties')
      .insert({
        user_id: payload.ownerId,
        agency_id: payload.property.agency_id,
        title: payload.property.title,
        description: payload.property.description,
        price: payload.property.price_fcfa,
        currency: 'FCFA',
        property_type: payload.property.category_name || 'Bien immobilier',
        transaction_type: payload.property.transaction,
        city: payload.property.city,
        neighborhood: payload.property.quartier || payload.property.commune,
        address: payload.property.public_address_hint || payload.property.commune,
        bedrooms: payload.property.bedrooms,
        bathrooms: payload.property.bathrooms,
        status: 'pending',
      })
      .select('*, agencies(name, is_verified)')
      .single();

    if (propErr || !insertedProp) {
      throw new Error(propErr?.message || 'Erreur lors de la création de l’annonce.');
    }

    let savedImages: RawSupabaseImage[] = [];
    if (payload.imageFiles.length > 0) {
      const assets = await storageService.uploadPropertyPhotos(
        payload.ownerId,
        insertedProp.id,
        payload.imageFiles
      );
      const { data: imgRows, error: imgErr } = await supabase
        .from('property_images')
        .insert(
          assets.map((asset) => ({
            property_id: insertedProp.id,
            image_url: asset.public_url,
            is_cover: asset.is_cover,
          }))
        )
        .select('*');

      if (imgErr) {
        throw new Error(`Photos téléversées mais erreur lors de l’enregistrement en base : ${imgErr.message}`);
      }
      if (imgRows) {
        savedImages = imgRows as RawSupabaseImage[];
      }
    }

    let paymentInitiated = false;
    try {
      const { error: fnErr } = await supabase.functions.invoke('verify-payment', {
        body: {
          property_id: insertedProp.id,
          plan_id: payload.property.plan_id,
          provider: payload.provider,
          payer_phone: payload.payerPhone,
          manual_reference: payload.manualReference,
        },
      });
      if (!fnErr) paymentInitiated = true;
    } catch {
      paymentInitiated = false;
    }

    const mapped = mapSupabaseProperty({
      ...(insertedProp as RawSupabaseProperty),
      property_images: savedImages,
    });

    return { property: mapped, paymentInitiated };
  },

  async addPhotosToProperty(
    userId: string,
    propertyId: string,
    _propertyTitle: string,
    files: File[],
    startingOrder = 0,
    makeFirstCover = false
  ): Promise<Property['images']> {
    if (!isSupabaseConfigured || !supabase) return [];
    const assets = await storageService.uploadPropertyPhotos(userId, propertyId, files);
    const { data, error } = await supabase
      .from('property_images')
      .insert(
        assets.map((asset, idx) => ({
          property_id: propertyId,
          image_url: asset.public_url,
          is_cover: makeFirstCover && idx === 0,
        }))
      )
      .select('*');

    if (error) throw new Error(error.message);
    return ((data as RawSupabaseImage[]) || []).map((img, idx) => {
      const resolvedUrl = img.image_url || img.public_url || img.url || HERO_VILLA_IMAGE;
      return {
        id: img.id,
        property_id: img.property_id,
        storage_path: resolvedUrl,
        public_url: resolvedUrl,
        is_cover: Boolean(img.is_cover ?? img.is_primary),
        sort_order: startingOrder + idx,
      };
    });
  },

  async setPropertyCoverPhoto(propertyId: string, imageId: string): Promise<void> {
    if (!isSupabaseConfigured || !supabase) return;
    const { error: resetErr } = await supabase
      .from('property_images')
      .update({ is_cover: false })
      .eq('property_id', propertyId);
    if (resetErr) throw new Error(resetErr.message);

    const { error: setErr } = await supabase
      .from('property_images')
      .update({ is_cover: true })
      .eq('id', imageId)
      .eq('property_id', propertyId);
    if (setErr) throw new Error(setErr.message);
  },

  async deletePropertyPhoto(propertyId: string, imageId: string, storagePathOrUrl: string): Promise<void> {
    if (!isSupabaseConfigured || !supabase) return;
    if (storagePathOrUrl) {
      await storageService.deletePhoto('property-images', storagePathOrUrl);
    }
    const { error } = await supabase
      .from('property_images')
      .delete()
      .eq('id', imageId)
      .eq('property_id', propertyId);
    if (error) throw new Error(error.message);
  },

  async deleteProperty(propertyId: string): Promise<void> {
    if (!isSupabaseConfigured || !supabase) return;
    const { error } = await supabase.from('properties').delete().eq('id', propertyId);
    if (error) throw new Error(error.message);
  },
};
