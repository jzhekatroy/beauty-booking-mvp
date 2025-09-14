export interface Service {
  id: string;
  name: string;
  duration: number; // в минутах
  price: number; // в рублях
  description: string;
  image?: string; // URL изображения
  photoUrl?: string; // Альтернативное поле для совместимости
  requireConfirmation?: boolean;
}

export interface ServiceGroup {
  id: string;
  name: string;
  order: number;
  services: Service[];
}

export interface Master {
  id: string;
  firstName: string;
  lastName: string;
  name?: string; // Вычисляемое поле
  specialization?: string;
  photoUrl?: string;
  description?: string;
  services?: string[]; // ID услуг
}

export interface TimeSlot {
  time: string; // формат "HH:MM"
  available: boolean;
  timezoneInfo?: {
    salonTime: string;
    clientTime: string;
    timezoneInfo: string;
  };
}

export interface ClientInfo {
  name: string;
  firstName?: string;
  lastName?: string;
  phone: string;
  email?: string;
  notes?: string;
}

export interface BookingData {
  services: Service[];
  date: string;
  master: Master | null;
  timeSlot: TimeSlot | null;
  clientInfo: ClientInfo;
  totalPrice: number;
  totalDuration: number;
}

export type BookingStep = 'start' | 'select-services' | 'select-date-time' | 'client-info';

export interface TeamData {
  team: {
    id: string
    name: string
    logoUrl?: string
    privacyPolicyUrl?: string
    slug: string
    bookingStep: number
    timezone: string
    publicServiceCardsWithPhotos?: boolean
    publicTheme?: 'light' | 'dark'
    publicPageTitle?: string
    publicPageDescription?: string
    publicPageLogoUrl?: string
  }
  serviceGroups: ServiceGroup[]
  ungroupedServices: Service[]
  masters: Master[]
}