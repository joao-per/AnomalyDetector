// TypeScript mirror of the BFF serializer DTOs (backend/api/serializers.py).
// Keep these in sync with map_anomaly / map_supplier / map_userdetails.

export interface AnomalyPlots {
  standard: string | null;
  enhanced: string | null;
  categorical: string | null;
}

/** One anomalous feature combination (name may be missing in the data —
 *  label it generically via `index`). Nulls are already filtered out. */
export interface FeaturePair {
  index: number;
  name: string | null;
  value: string | number;
}

export interface Anomaly {
  id: string;
  anomalieId: string | null;
  status: string | null;
  statusChangedAt: string | null;

  // classification / scoring
  anomalyType: string | null;
  processReference: string | null; // Rechnung / Wareneingang / Bestellkopf / Bestellposition
  matchClass: string | null;
  matchExplanation: string | null;
  criticality: number | null; // numeric level (e.g. 2)
  criticalityClass: string | null; // human label (e.g. "Middle" / "High")
  score: number | null;

  // description
  description1: string | null;
  description2: string | null;
  featureJson: string | null;

  // anomalous feature combinations (details panel)
  categoricalFeatures: FeaturePair[];
  numericalFeatures: FeaturePair[];

  plots: AnomalyPlots;

  // parties
  owner: string | null;
  vendorName: string | null;
  vendorEmail: string | null;
  vendorPhone: string | null;
  supplierId: string | null;
  bestellerEmail: string | null;
  besteller: string | null;

  // order / article
  orderId: string | null;
  navOrderLink: string | null;
  articleId: string | null;
  articleCategory: string | null;
  articleName: string | null;

  // email drafts
  draftVendorEmail: string | null;
  draftInternalEmail: string | null;

  // comments / audit trail
  commentDone: string | null;
  commentAcceptance: string | null;
  changeHistory: string | null;

  // system
  createdOn: string | null;
  modifiedOn: string | null;
}

export interface Supplier {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  number: string | null;
  classification: string | null;
  employeeEmail: string | null;
  buyerName: string | null;
}

export interface Signature {
  id?: string;
  userId: string;
  signature: string | null;
  username?: string | null;
}

/** Workflow statuses (German, as stored in Dataverse). */
export const STATUS = {
  NEW: "new",
  IN_PROGRESS: "in Bearbeitung",
  CANCELLED: "abgebrochen", // plain cancel — terminal, no ML side-effects
  UNTRAINED: "Abtrainiert", // untrained — suppressed in the ML pipeline
  DONE: "Abgeschlossen", // closed/completed (set by existing flows)
} as const;
