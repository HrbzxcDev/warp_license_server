export type License = {
  license_key: string;
  product: string;
  status: string;
  machine_id: string | null;
  activated_at: string | null;
  created_at: string;
  notes: string | null;
};

export type MessageResponse = {
  success: boolean;
  message: string;
  data?: Record<string, unknown>;
};

export type CreateLicenseBody = {
  license_key: string;
  product?: string;
  notes?: string | null;
};
