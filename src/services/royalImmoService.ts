import {
  isSupabaseConfigured,
  supabase,
  testSupabaseConnection,
  type SupabaseConnectionCheck,
} from '../lib/supabase';
import { authService } from './authService';
import { profileService } from './profileService';
import { propertyService } from './propertyService';
import { favoriteService } from './favoriteService';
import { storageService } from './storageService';
import {
  DEMO_ADMIN_LOGS,
  DEMO_AGENCIES,
  DEMO_AGENCY_MEMBERS,
  DEMO_CONTRACTS,
  DEMO_NOTIFICATIONS,
  DEMO_PAYMENTS,
  DEMO_PROFILES,
  DEMO_PROPERTIES,
  DEMO_RENTAL_PAYMENTS,
  DEMO_REPORTS,
  DEMO_VISITS,
  IVORY_COAST_LOCATIONS,
  OFFICIAL_CATEGORIES,
  OFFICIAL_PLANS,
} from '../data/demoData';
import type {
  AdminLogItem,
  Agency,
  AgencyMember,
  ContractRecord,
  FeaturedBadge,
  LocationItem,
  NotificationItem,
  PaymentProvider,
  PaymentRecord,
  Profile,
  Property,
  PropertyCategory,
  PropertySearchFilters,
  PublicationPlan,
  RentalPaymentRecord,
  ReportItem,
  UserRole,
  VisitRequest,
} from '../types/database';
import { slugify } from '../utils/format';

export interface PlatformSnapshot {
  properties: Property[];
  agencies: Agency[];
  categories: PropertyCategory[];
  locations: LocationItem[];
  plans: PublicationPlan[];
  profiles: Profile[];
  payments: PaymentRecord[];
  visits: VisitRequest[];
  agencyMembers: AgencyMember[];
  contracts: ContractRecord[];
  rentalPayments: RentalPaymentRecord[];
  notifications: NotificationItem[];
  reports: ReportItem[];
  adminLogs: AdminLogItem[];
  favorites: string[];
  currentUser: Profile | null;
  connectionCheck: SupabaseConnectionCheck | null;
  isLoadingData: boolean;
  dataError: string | null;
}

class RoyalImmoStore {
  private state: PlatformSnapshot = {
    properties: isSupabaseConfigured ? [] : [...DEMO_PROPERTIES],
    agencies: isSupabaseConfigured ? [] : [...DEMO_AGENCIES],
    categories: [...OFFICIAL_CATEGORIES],
    locations: [...IVORY_COAST_LOCATIONS],
    plans: [...OFFICIAL_PLANS],
    profiles: [...DEMO_PROFILES],
    payments: [...DEMO_PAYMENTS],
    visits: [...DEMO_VISITS],
    agencyMembers: [...DEMO_AGENCY_MEMBERS],
    contracts: [...DEMO_CONTRACTS],
    rentalPayments: [...DEMO_RENTAL_PAYMENTS],
    notifications: [...DEMO_NOTIFICATIONS],
    reports: [...DEMO_REPORTS],
    adminLogs: [...DEMO_ADMIN_LOGS],
    favorites: isSupabaseConfigured ? [] : ['prop-1', 'prop-4'],
    currentUser: null,
    connectionCheck: null,
    isLoadingData: isSupabaseConfigured,
    dataError: null,
  };

  private initialized = false;
  private listeners = new Set<() => void>();

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit() {
    this.listeners.forEach((fn) => fn());
  }

  getSnapshot(): PlatformSnapshot {
    return this.state;
  }

  async runConnectionDiagnostic(): Promise<SupabaseConnectionCheck> {
    const check = await testSupabaseConnection();
    this.state.connectionCheck = check;
    this.emit();
    return check;
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;

    if (!isSupabaseConfigured || !supabase) {
      await this.runConnectionDiagnostic();
      return;
    }

    // Listen to Supabase Auth session changes
    authService.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        try {
          const prof = await profileService.getProfile(session.user.id);
          this.state.currentUser = prof;
          const favIds = await favoriteService.fetchUserFavorites(session.user.id);
          this.state.favorites = favIds;
        } catch {
          // Schema may not yet be migrated
        }
      } else {
        this.state.currentUser = null;
        this.state.favorites = [];
      }
      this.emit();
    });

    await this.syncFromSupabase();
  }

  async syncFromSupabase(): Promise<void> {
    if (!isSupabaseConfigured || !supabase) return;

    this.state.isLoadingData = true;
    this.state.dataError = null;
    this.emit();

    const check = await this.runConnectionDiagnostic();

    try {
      const session = await authService.getSession();
      if (session?.user) {
        const prof = await profileService.getProfile(session.user.id);
        if (prof) {
          this.state.currentUser = prof;
        }
        const favs = await favoriteService.fetchUserFavorites(session.user.id);
        this.state.favorites = favs;
      }

      const [liveProps, catsRes, locsRes, agenciesRes] = await Promise.all([
        propertyService.fetchPublishedProperties(),
        supabase.from('property_categories').select('*').order('sort_order'),
        supabase.from('locations').select('*').eq('is_active', true),
        supabase.from('agencies').select('*'),
      ]);

      try {
        const plansRes = await supabase
          .from('publication_plans')
          .select('*')
          .order('duration_days', { ascending: true });
        if (plansRes.data?.length) {
          this.state.plans = (plansRes.data as Record<string, unknown>[]).map((pl, idx) => ({
            id: String(pl.id),
            code: String(pl.code || `PLAN_${pl.duration_days || idx}D`),
            name: String(pl.name || `${pl.duration_days} jours`),
            duration_days: Number(pl.duration_days || 30),
            price_fcfa: Number(pl.price_fcfa ?? pl.price ?? 0),
            description: (pl.description as string | null) || `Forfait officiel ${pl.name || ''}`,
            is_active: pl.is_active === undefined ? true : Boolean(pl.is_active),
            sort_order: Number(pl.sort_order ?? idx + 1),
          }));
        }
      } catch {
        // publication_plans fallback
      }

      if (catsRes.data?.length) this.state.categories = catsRes.data as PropertyCategory[];
      if (locsRes.data?.length) this.state.locations = locsRes.data as LocationItem[];

      this.state.properties = liveProps.map((p) => {
        if (p.category_name && p.category_name !== 'Bien immobilier') return p;
        const matchedCat = this.state.categories.find((c) => c.id === p.category_id);
        return matchedCat ? { ...p, category_name: matchedCat.name } : p;
      });
      if (agenciesRes.data) {
        this.state.agencies = (agenciesRes.data as Record<string, unknown>[]).map((a) => ({
          id: String(a.id),
          owner_id: String(a.owner_id || a.profile_id || ''),
          name: String(a.name || ''),
          slug: String(a.slug || slugify(String(a.name || 'agence'))),
          logo_url: (a.logo_url as string | null) || null,
          description: (a.description as string | null) || null,
          address: String(a.address || a.city || 'Abidjan'),
          city: String(a.city || 'Abidjan'),
          commune: (a.commune as string | null) || null,
          phone: String(a.phone || ''),
          whatsapp: (a.whatsapp as string | null) || null,
          email: String(a.email || ''),
          rccm_number: (a.rccm_number as string | null) || null,
          is_verified: Boolean(a.is_verified),
          is_active: a.is_active === undefined ? true : Boolean(a.is_active),
          listings_count: liveProps.filter((p) => p.agency_id === a.id).length,
          created_at: String(a.created_at || new Date().toISOString()),
        }));
      }

      if (!check.schemaReady && check.errorMessage) {
        this.state.dataError = check.errorMessage;
      }
    } catch (err) {
      this.state.dataError = (err as Error).message;
      this.state.properties = [];
    } finally {
      this.state.isLoadingData = false;
      this.emit();
    }
  }

  // AUTHENTICATION
  async signInWithPassword(email: string, password: string): Promise<{ error?: string }> {
    if (isSupabaseConfigured && supabase) {
      const res = await authService.signIn(email, password);
      if (res.error) return { error: res.error };
      if (res.profile) {
        this.state.currentUser = res.profile;
      } else if (res.session?.user) {
        this.state.currentUser = {
          id: res.session.user.id,
          email: res.session.user.email || email,
          full_name: (res.session.user.user_metadata?.full_name as string) || email.split('@')[0],
          phone: (res.session.user.user_metadata?.phone as string) || null,
          whatsapp: null,
          avatar_url: null,
          role: ((res.session.user.user_metadata?.role as UserRole) || 'individual'),
          city: 'Abidjan',
          is_verified: false,
          is_active: true,
          created_at: new Date().toISOString(),
        };
      }
      if (res.session?.user) {
        try {
          this.state.favorites = await favoriteService.fetchUserFavorites(res.session.user.id);
        } catch {
          // Schema not yet migrated
        }
      }
      this.emit();
      return {};
    }

    const matched = this.state.profiles.find((p) => p.email.toLowerCase() === email.toLowerCase());
    if (!matched) {
      return { error: 'Compte introuvable. Utilisez un accès de démonstration ou connectez Supabase.' };
    }
    this.state.currentUser = matched;
    this.emit();
    return {};
  }

  async signUp(payload: {
    email: string;
    password: string;
    fullName: string;
    phone: string;
    role: 'individual' | 'agency' | 'customer';
    agencyName?: string;
    city?: string;
  }): Promise<{ error?: string; requiresEmailConfirmation?: boolean }> {
    if (isSupabaseConfigured && supabase) {
      const res = await authService.signUp(payload);
      if (res.error) return { error: res.error };
      await this.syncFromSupabase();
      return { requiresEmailConfirmation: res.requiresEmailConfirmation };
    }

    const newProfile: Profile = {
      id: `demo-${Date.now()}`,
      email: payload.email,
      full_name: payload.fullName,
      phone: payload.phone,
      whatsapp: payload.phone,
      avatar_url: null,
      role: payload.role,
      city: payload.city || 'Abidjan',
      is_verified: false,
      is_active: true,
      created_at: new Date().toISOString(),
    };
    this.state.profiles = [newProfile, ...this.state.profiles];
    this.state.currentUser = newProfile;
    this.emit();
    return {};
  }

  loginDemoRole(role: UserRole) {
    const found = this.state.profiles.find((p) => p.role === role) || this.state.profiles[0];
    this.state.currentUser = found;
    this.emit();
  }

  async signOut() {
    await authService.signOut();
    this.state.currentUser = null;
    this.emit();
  }

  async updateProfile(updates: Partial<Profile>) {
    if (!this.state.currentUser) return;
    if (isSupabaseConfigured && supabase) {
      const updated = await profileService.updateProfile(this.state.currentUser.id, {
        full_name: updates.full_name,
        phone: updates.phone,
        whatsapp: updates.whatsapp,
        city: updates.city,
        avatar_url: updates.avatar_url,
      });
      if (updated) {
        this.state.currentUser = updated;
      }
    } else {
      this.state.currentUser = { ...this.state.currentUser, ...updates };
    }
    this.state.profiles = this.state.profiles.map((p) =>
      p.id === this.state.currentUser!.id ? this.state.currentUser! : p
    );
    this.emit();
  }

  async uploadProfilePhoto(file: File): Promise<string | null> {
    if (isSupabaseConfigured && supabase) {
      if (!this.state.currentUser) {
        throw new Error('Veuillez vous connecter avant de modifier votre photo de profil.');
      }
      const url = await profileService.uploadProfilePhoto(this.state.currentUser.id, file);
      this.state.currentUser = { ...this.state.currentUser, avatar_url: url };
      this.state.profiles = this.state.profiles.map((p) =>
        p.id === this.state.currentUser!.id ? this.state.currentUser! : p
      );
      this.emit();
      return url;
    }
    if (!this.state.currentUser) return null;
    const localUrl = URL.createObjectURL(file);
    this.state.currentUser = { ...this.state.currentUser, avatar_url: localUrl };
    this.emit();
    return localUrl;
  }

  async removeProfilePhoto(): Promise<void> {
    if (!this.state.currentUser) return;
    if (isSupabaseConfigured && supabase) {
      await profileService.removeProfilePhoto(this.state.currentUser.id, this.state.currentUser.avatar_url);
    }
    this.state.currentUser = { ...this.state.currentUser, avatar_url: null };
    this.state.profiles = this.state.profiles.map((p) =>
      p.id === this.state.currentUser!.id ? this.state.currentUser! : p
    );
    this.emit();
  }

  async uploadAgencyLogo(agencyId: string, file: File): Promise<string> {
    if (isSupabaseConfigured && supabase) {
      if (!this.state.currentUser) {
        throw new Error('Veuillez vous connecter pour modifier le logo de votre agence.');
      }
      const asset = await storageService.uploadAgencyLogo(file);
      const { error } = await supabase
        .from('agencies')
        .update({ logo_url: asset.public_url })
        .eq('id', agencyId);
      if (error) {
        throw new Error(`Logo téléversé mais erreur de mise à jour de l’agence : ${error.message}`);
      }
      this.state.agencies = this.state.agencies.map((a) =>
        a.id === agencyId ? { ...a, logo_url: asset.public_url } : a
      );
      this.emit();
      return asset.public_url;
    }

    const localUrl = URL.createObjectURL(file);
    this.state.agencies = this.state.agencies.map((a) =>
      a.id === agencyId ? { ...a, logo_url: localUrl } : a
    );
    this.emit();
    return localUrl;
  }

  async removeAgencyLogo(agencyId: string, currentLogoUrl?: string | null): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      if (!this.state.currentUser) {
        throw new Error('Session utilisateur requise.');
      }
      if (currentLogoUrl) {
        try {
          await storageService.deletePhoto('agency-logos', currentLogoUrl);
        } catch {
          // Ignore if logo was external or already deleted
        }
      }
      const { error } = await supabase
        .from('agencies')
        .update({ logo_url: null })
        .eq('id', agencyId);
      if (error) throw new Error(error.message);
    }
    this.state.agencies = this.state.agencies.map((a) =>
      a.id === agencyId ? { ...a, logo_url: null } : a
    );
    this.emit();
  }

  async addPropertyPhotos(propertyId: string, files: File[]): Promise<void> {
    const prop = this.state.properties.find((p) => p.id === propertyId);
    if (!prop) return;

    if (isSupabaseConfigured && supabase) {
      if (!this.state.currentUser) {
        throw new Error('Veuillez vous connecter avant d’ajouter des photos.');
      }
      const newImages = await propertyService.addPhotosToProperty(
        this.state.currentUser.id,
        propertyId,
        prop.title,
        files,
        prop.images.length,
        prop.images.length === 0
      );
      this.state.properties = this.state.properties.map((p) =>
        p.id === propertyId ? { ...p, images: [...p.images, ...newImages] } : p
      );
      this.emit();
      return;
    }

    const localImgs = files.map((f, idx) => ({
      id: `img-${Date.now()}-${idx}`,
      property_id: propertyId,
      storage_path: '',
      public_url: URL.createObjectURL(f),
      is_cover: prop.images.length === 0 && idx === 0,
      sort_order: prop.images.length + idx,
    }));
    this.state.properties = this.state.properties.map((p) =>
      p.id === propertyId ? { ...p, images: [...p.images, ...localImgs] } : p
    );
    this.emit();
  }

  async setPropertyCoverPhoto(propertyId: string, imageId: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      if (!this.state.currentUser) {
        throw new Error('Veuillez vous connecter pour modifier la photo de couverture.');
      }
      await propertyService.setPropertyCoverPhoto(propertyId, imageId);
    }
    this.state.properties = this.state.properties.map((p) => {
      if (p.id !== propertyId) return p;
      const updated = p.images
        .map((img) => ({ ...img, is_cover: img.id === imageId }))
        .sort((a, b) => (a.is_cover === b.is_cover ? a.sort_order - b.sort_order : a.is_cover ? -1 : 1));
      return { ...p, images: updated };
    });
    this.emit();
  }

  async deletePropertyPhoto(propertyId: string, imageId: string, storagePathOrUrl: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      if (!this.state.currentUser) {
        throw new Error('Veuillez vous connecter pour supprimer cette photo.');
      }
      await propertyService.deletePropertyPhoto(propertyId, imageId, storagePathOrUrl);
    }
    this.state.properties = this.state.properties.map((p) =>
      p.id === propertyId ? { ...p, images: p.images.filter((img) => img.id !== imageId) } : p
    );
    this.emit();
  }

  // CATALOG SEARCH & FILTERING
  filterProperties(filters: PropertySearchFilters, includeUnpublished = false): Property[] {
    const q = filters.query.trim().toLowerCase();
    const list = this.state.properties.filter((p) => {
      if (!includeUnpublished && p.status !== 'published') return false;
      if (q) {
        const hay = `${p.title} ${p.city} ${p.commune} ${p.quartier} ${p.category_name} ${p.reference}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (filters.city && p.city !== filters.city) return false;
      if (filters.commune && p.commune !== filters.commune) return false;
      if (filters.quartier && p.quartier !== filters.quartier) return false;
      if (filters.transaction && p.transaction !== filters.transaction) return false;
      if (filters.category && p.category_name !== filters.category) return false;
      if (filters.priceMin && p.price_fcfa < Number(filters.priceMin)) return false;
      if (filters.priceMax && p.price_fcfa > Number(filters.priceMax)) return false;
      if (filters.bedroomsMin && p.bedrooms < Number(filters.bedroomsMin)) return false;
      if (filters.bathroomsMin && p.bathrooms < Number(filters.bathroomsMin)) return false;
      if (filters.surfaceMin && p.surface_m2 < Number(filters.surfaceMin)) return false;
      if (filters.surfaceMax && p.surface_m2 > Number(filters.surfaceMax)) return false;
      if (filters.hasGarage && !p.has_garage) return false;
      if (filters.hasPool && !p.has_pool) return false;
      if (filters.hasGarden && !p.has_garden) return false;
      if (filters.furnishedOnly && !p.is_furnished) return false;
      return true;
    });

    return [...list].sort((a, b) => {
      if (filters.sort === 'price_asc') return a.price_fcfa - b.price_fcfa;
      if (filters.sort === 'price_desc') return b.price_fcfa - a.price_fcfa;
      if (filters.sort === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (a.is_featured !== b.is_featured) return a.is_featured ? -1 : 1;
      return b.views_count - a.views_count;
    });
  }

  async toggleFavorite(propertyId: string) {
    const exists = this.state.favorites.includes(propertyId);
    this.state.favorites = exists
      ? this.state.favorites.filter((id) => id !== propertyId)
      : [...this.state.favorites, propertyId];
    this.state.properties = this.state.properties.map((p) =>
      p.id === propertyId
        ? { ...p, favorites_count: Math.max(0, p.favorites_count + (exists ? -1 : 1)) }
        : p
    );
    this.emit();

    if (isSupabaseConfigured && supabase && this.state.currentUser && this.state.connectionCheck?.schemaReady) {
      try {
        if (exists) {
          await favoriteService.removeFavorite(this.state.currentUser.id, propertyId);
        } else {
          await favoriteService.addFavorite(this.state.currentUser.id, propertyId);
        }
      } catch {
        // Keep UI responsive
      }
    }
  }

  // PUBLISH & PAYMENT WORKFLOW
  async submitPropertyWithPayment(payload: {
    property: Omit<
      Property,
      | 'id'
      | 'reference'
      | 'slug'
      | 'owner_id'
      | 'status'
      | 'rejection_reason'
      | 'featured_badge'
      | 'is_featured'
      | 'views_count'
      | 'favorites_count'
      | 'published_at'
      | 'expires_at'
      | 'created_at'
    >;
    imageFiles?: File[];
    planId: string;
    provider: PaymentProvider;
    payerPhone: string;
    manualReference?: string;
  }): Promise<{ property: Property; payment: PaymentRecord }> {
    const user = this.state.currentUser;
    const plan = this.state.plans.find((pl) => pl.id === payload.planId) || this.state.plans[2];

    if (isSupabaseConfigured && supabase) {
      if (!user) {
        throw new Error('Authentification requise : veuillez vous connecter pour publier votre annonce et téléverser vos photos.');
      }
      const { property: createdProp } = await propertyService.createPropertyAndInitiatePayment({
        ownerId: user.id,
        property: {
          agency_id: payload.property.agency_id,
          category_id: payload.property.category_id,
          category_name: payload.property.category_name,
          title: payload.property.title,
          description: payload.property.description,
          transaction: payload.property.transaction,
          price_fcfa: payload.property.price_fcfa,
          city: payload.property.city,
          commune: payload.property.commune,
          quartier: payload.property.quartier,
          public_address_hint: payload.property.public_address_hint,
          surface_m2: payload.property.surface_m2,
          bedrooms: payload.property.bedrooms,
          bathrooms: payload.property.bathrooms,
          has_garage: payload.property.has_garage,
          has_pool: payload.property.has_pool,
          has_garden: payload.property.has_garden,
          is_furnished: payload.property.is_furnished,
          amenities: payload.property.amenities,
          plan_id: plan.id,
        },
        imageFiles: payload.imageFiles || [],
        provider: payload.provider,
        payerPhone: payload.payerPhone,
        manualReference: payload.manualReference,
      });

      const payment: PaymentRecord = {
        id: `pay-${Date.now()}`,
        user_id: user.id,
        user_name: user.full_name,
        property_id: createdProp.id,
        property_title: createdProp.title,
        plan_id: plan.id,
        plan_name: plan.name,
        amount_fcfa: plan.price_fcfa,
        currency: 'XOF',
        provider: payload.provider,
        status: 'pending',
        external_reference: null,
        payer_phone: payload.payerPhone,
        manual_reference: payload.manualReference || null,
        manual_proof_url: null,
        invoice_number: `RI-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`,
        created_at: new Date().toISOString(),
      };

      this.state.properties = [createdProp, ...this.state.properties];
      this.state.payments = [payment, ...this.state.payments];
      this.emit();
      return { property: createdProp, payment };
    }

    // Fallback when SQL schema is not yet applied or unauthenticated preview
    const fallbackUser = user || this.state.profiles[0];
    const id = `prop-${Date.now()}`;
    const ref = `RI-CI-${new Date().getFullYear()}-${String(Math.floor(1000 + Math.random() * 9000))}`;
    const propertyStatus = payload.provider === 'manual' ? 'pending_payment' : 'pending_validation';

    const newProp: Property = {
      ...payload.property,
      id,
      reference: ref,
      slug: `${slugify(payload.property.title)}-${id.slice(-4)}`,
      owner_id: fallbackUser.id,
      owner_name: fallbackUser.full_name,
      owner_phone: fallbackUser.phone || payload.payerPhone,
      owner_whatsapp: fallbackUser.whatsapp || payload.payerPhone,
      status: propertyStatus,
      rejection_reason: null,
      featured_badge: null,
      is_featured: false,
      views_count: 0,
      favorites_count: 0,
      plan_id: plan.id,
      published_at: null,
      expires_at: null,
      created_at: new Date().toISOString(),
      images: payload.property.images,
      is_demo: true,
    };

    const newPayment: PaymentRecord = {
      id: `pay-${Date.now()}`,
      user_id: fallbackUser.id,
      user_name: fallbackUser.full_name,
      property_id: id,
      property_title: newProp.title,
      plan_id: plan.id,
      plan_name: plan.name,
      amount_fcfa: plan.price_fcfa,
      currency: 'XOF',
      provider: payload.provider,
      status: 'pending',
      external_reference: payload.provider === 'manual' ? null : `INIT-${Date.now().toString().slice(-6)}`,
      payer_phone: payload.payerPhone,
      manual_reference: payload.manualReference || null,
      manual_proof_url: null,
      invoice_number: `RI-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`,
      created_at: new Date().toISOString(),
    };

    this.state.properties = [newProp, ...this.state.properties];
    this.state.payments = [newPayment, ...this.state.payments];
    this.emit();
    return { property: newProp, payment: newPayment };
  }

  // VISITS & REPORTS
  async createVisitRequest(payload: {
    propertyId: string;
    visitorName: string;
    visitorPhone: string;
    visitorEmail: string;
    preferredDate: string;
    message: string;
  }) {
    const prop = this.state.properties.find((p) => p.id === payload.propertyId);
    if (!prop) return;

    if (isSupabaseConfigured && supabase && this.state.connectionCheck?.schemaReady) {
      await supabase.from('visits').insert({
        property_id: prop.id,
        requester_id: this.state.currentUser?.id || null,
        agency_id: prop.agency_id,
        owner_id: prop.owner_id,
        visitor_name: payload.visitorName,
        visitor_phone: payload.visitorPhone,
        visitor_email: payload.visitorEmail,
        preferred_date: payload.preferredDate,
        message: payload.message,
      });
    }

    const visit: VisitRequest = {
      id: `vis-${Date.now()}`,
      property_id: prop.id,
      property_title: prop.title,
      requester_id: this.state.currentUser?.id || null,
      agency_id: prop.agency_id,
      owner_id: prop.owner_id,
      visitor_name: payload.visitorName,
      visitor_phone: payload.visitorPhone,
      visitor_email: payload.visitorEmail,
      preferred_date: payload.preferredDate,
      message: payload.message,
      status: 'pending',
      created_at: new Date().toISOString(),
    };
    this.state.visits = [visit, ...this.state.visits];
    this.emit();
  }

  async createReport(propertyId: string, reason: string, details: string) {
    const prop = this.state.properties.find((p) => p.id === propertyId);
    if (isSupabaseConfigured && supabase && this.state.connectionCheck?.schemaReady) {
      await supabase.from('reports').insert({
        property_id: propertyId,
        reporter_id: this.state.currentUser?.id || null,
        reason,
        details,
      });
    }
    this.state.reports = [
      {
        id: `rep-${Date.now()}`,
        property_id: propertyId,
        property_title: prop?.title,
        reason,
        details,
        status: 'open',
        created_at: new Date().toISOString(),
      },
      ...this.state.reports,
    ];
    this.emit();
  }

  async deleteProperty(propertyId: string) {
    if (isSupabaseConfigured && supabase && this.state.connectionCheck?.schemaReady) {
      await propertyService.deleteProperty(propertyId);
    }
    this.state.properties = this.state.properties.filter((p) => p.id !== propertyId);
    this.emit();
  }

  renewProperty(propertyId: string, planId: string) {
    const plan = this.state.plans.find((p) => p.id === planId);
    if (!plan) return;
    this.state.properties = this.state.properties.map((p) =>
      p.id === propertyId ? { ...p, status: 'pending_validation', plan_id: plan.id } : p
    );
    this.emit();
  }

  updateVisitStatus(visitId: string, status: VisitRequest['status']) {
    this.state.visits = this.state.visits.map((v) => (v.id === visitId ? { ...v, status } : v));
    this.emit();
  }

  addAgencyAgent(payload: { fullName: string; email: string; phone: string; memberRole: AgencyMember['member_role'] }) {
    const member: AgencyMember = {
      id: `mem-${Date.now()}`,
      agency_id: 'ag-1',
      profile_id: `agent-${Date.now()}`,
      full_name: payload.fullName,
      email: payload.email,
      phone: payload.phone,
      member_role: payload.memberRole,
      can_publish: true,
      can_manage_contracts: payload.memberRole !== 'assistant',
      is_active: true,
      joined_at: new Date().toISOString(),
    };
    this.state.agencyMembers = [...this.state.agencyMembers, member];
    this.emit();
  }

  addContract(payload: Omit<ContractRecord, 'id' | 'agency_id'>) {
    const ctr: ContractRecord = { ...payload, id: `ctr-${Date.now()}`, agency_id: 'ag-1' };
    this.state.contracts = [ctr, ...this.state.contracts];
    this.emit();
  }

  markRentalPaid(rentalId: string) {
    this.state.rentalPayments = this.state.rentalPayments.map((r) =>
      r.id === rentalId
        ? {
            ...r,
            status: 'paid',
            paid_at: new Date().toISOString(),
            receipt_number: `QUIT-RI-${Date.now().toString().slice(-6)}`,
            payment_method: 'Mobile Money / Virement',
          }
        : r
    );
    this.emit();
  }

  markNotificationRead(notifId: string) {
    this.state.notifications = this.state.notifications.map((n) =>
      n.id === notifId ? { ...n, is_read: true } : n
    );
    this.emit();
  }

  async adminApproveProperty(propertyId: string) {
    const prop = this.state.properties.find((p) => p.id === propertyId);
    const plan = this.state.plans.find((pl) => pl.id === prop?.plan_id) || this.state.plans[2];
    const now = new Date();
    const expires = new Date(now.getTime() + plan.duration_days * 86400 * 1000);

    if (isSupabaseConfigured && supabase && this.state.connectionCheck?.schemaReady) {
      await supabase.functions.invoke('admin-actions', {
        body: { action: 'approve_property', property_id: propertyId },
      });
    }

    this.state.properties = this.state.properties.map((p) =>
      p.id === propertyId
        ? {
            ...p,
            status: 'published',
            published_at: now.toISOString(),
            expires_at: expires.toISOString(),
            rejection_reason: null,
          }
        : p
    );
    this.addAdminLog('APPROVE_PROPERTY', 'properties', propertyId, { duration_days: plan.duration_days });
    this.emit();
  }

  async adminRejectProperty(propertyId: string, reason: string) {
    if (isSupabaseConfigured && supabase && this.state.connectionCheck?.schemaReady) {
      await supabase.functions.invoke('admin-actions', {
        body: { action: 'reject_property', property_id: propertyId, rejection_reason: reason },
      });
    }
    this.state.properties = this.state.properties.map((p) =>
      p.id === propertyId ? { ...p, status: 'rejected', rejection_reason: reason } : p
    );
    this.addAdminLog('REJECT_PROPERTY', 'properties', propertyId, { reason });
    this.emit();
  }

  adminSetFeatured(propertyId: string, badge: FeaturedBadge | null) {
    this.state.properties = this.state.properties.map((p) =>
      p.id === propertyId ? { ...p, is_featured: Boolean(badge), featured_badge: badge } : p
    );
    this.addAdminLog('SET_FEATURED_BADGE', 'properties', propertyId, { badge });
    this.emit();
  }

  adminVerifyPayment(paymentId: string, status: 'succeeded' | 'failed') {
    const pay = this.state.payments.find((p) => p.id === paymentId);
    this.state.payments = this.state.payments.map((p) =>
      p.id === paymentId ? { ...p, status } : p
    );
    if (pay && status === 'succeeded') {
      this.state.properties = this.state.properties.map((prop) =>
        prop.id === pay.property_id && prop.status === 'pending_payment'
          ? { ...prop, status: 'pending_validation' }
          : prop
      );
    }
    this.addAdminLog('VERIFY_PAYMENT', 'payments', paymentId, { status });
    this.emit();
  }

  adminUpdatePlanPrice(planId: string, priceFcfa: number) {
    this.state.plans = this.state.plans.map((pl) =>
      pl.id === planId ? { ...pl, price_fcfa: priceFcfa } : pl
    );
    this.addAdminLog('UPDATE_PLAN_PRICE', 'publication_plans', planId, { price_fcfa: priceFcfa });
    this.emit();
  }

  adminToggleAgencyVerified(agencyId: string) {
    this.state.agencies = this.state.agencies.map((a) =>
      a.id === agencyId ? { ...a, is_verified: !a.is_verified } : a
    );
    this.addAdminLog('TOGGLE_AGENCY_VERIFIED', 'agencies', agencyId, {});
    this.emit();
  }

  adminResolveReport(reportId: string, status: ReportItem['status']) {
    this.state.reports = this.state.reports.map((r) => (r.id === reportId ? { ...r, status } : r));
    this.addAdminLog('RESOLVE_REPORT', 'reports', reportId, { status });
    this.emit();
  }

  adminAddCategory(name: string) {
    const cat: PropertyCategory = {
      id: `cat-${Date.now()}`,
      name,
      slug: slugify(name),
      icon: 'Building2',
      sort_order: this.state.categories.length + 1,
      is_active: true,
    };
    this.state.categories = [...this.state.categories, cat];
    this.addAdminLog('ADD_CATEGORY', 'property_categories', cat.id, { name });
    this.emit();
  }

  adminAddLocation(city: string, commune: string, quartier: string) {
    const loc: LocationItem = {
      id: `loc-${Date.now()}`,
      city,
      commune,
      quartier,
      latitude: 5.34,
      longitude: -4.01,
      is_active: true,
    };
    this.state.locations = [...this.state.locations, loc];
    this.addAdminLog('ADD_LOCATION', 'locations', loc.id, { city, commune, quartier });
    this.emit();
  }

  private addAdminLog(action: string, targetTable: string, targetId: string, details: Record<string, unknown>) {
    this.state.adminLogs = [
      {
        id: `log-${Date.now()}`,
        admin_name: this.state.currentUser?.full_name || 'Administrateur',
        action,
        target_table: targetTable,
        target_id: targetId,
        details,
        created_at: new Date().toISOString(),
      },
      ...this.state.adminLogs,
    ];
  }
}

export const royalImmoStore = new RoyalImmoStore();
