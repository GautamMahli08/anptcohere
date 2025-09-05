export type DisputeStatus = 'none' | 'open' | 'resolved' | 'rejected';

export interface RetailDelivery {
  id: string;
  clientName: string;
  siteAddress: string;
  assignedLiters: number;
  deliveredLiters: number;
  deliveryTs: Date;
  confirmedByClient?: boolean;
  disputeStatus: DisputeStatus;
  disputeNote?: string;
}

export interface RetailStop {
  id: string;
  clientName: string;
  siteAddress: string;
  eta: Date;
  assigned: Array<{ compartmentId: string; liters: number; fuelType?: string }>;
  exceptions?: Array<'delay' | 'diversion' | 'risk'>;
}

export interface ClientVolume {
  clientName: string;
  totalLiters: number;
}

export interface LossByClient {
  clientName: string;
  lossPercent: number; // 0..100
}
