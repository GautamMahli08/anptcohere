// Enhanced data models for the four modules (Retail, Alert, Knowledge, Notify)

export interface Site {
  id: string;
  name: string;
  type: "retail" | "industrial" | "other";
  lat: number;
  lng: number;
  clientId?: string;
}

export interface AlertLifecycle {
  id: string;
  type: "theft" | "tamper" | "tilt" | "offline" | "danger" | "deviation" | "info";
  severity: "critical" | "warning" | "info";
  truckId: string;
  siteId?: string;
  message: string;
  tsRaised: number; // epoch ms
  tsAck?: number;
  tsResolved?: number;
  ackBy?: { role: string; name: string };
  status: "raised" | "ack" | "resolved";
  sop?: {
    type: string;
    completed: number[]; // indices of completed steps
  };
}

export interface KnowledgeEntry {
  type: AlertLifecycle["type"];
  title: string;
  steps: string[];
}

export interface Notify {
  id: string;
  ts: number;
  audience: Array<"manager" | "operator" | "driver" | "client">;
  title: string;
  body: string;
  link?: { view: "manager" | "operator" | "driver" | "client"; params?: any };
  severity: "info" | "success" | "warning" | "critical";
  readBy: string[]; // session ids or role+name; RAM only
}

export interface KpiSummary {
  assignedTotalL: number;
  deliveredTotalL: number;
  lossL: number;
  lossPct: number;
  savings: number;
  uptimePct: number;
  routeCompliancePct: number;
}

export interface UiScope {
  retailOnly: boolean;
  clientId?: string;
}

// Event types for the event bus
export type EventTypes = {
  "trip:update": {
    truckId: string;
    status: string;
    assignment?: any;
    pod?: any;
    kpiDelta?: any;
  };
  "alert:new": AlertLifecycle;
  "alert:update": AlertLifecycle;
  "notify:new": Notify;
  "notify:read": { notifyId: string; userKey: string };
  "kpi:refresh": KpiSummary;
  "retail:confirmed": { stopKey: string; timestamp: Date };
  "trip:assigned": { truckId: string; destination: string; driver: string };
};