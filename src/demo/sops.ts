import { KnowledgeEntry } from '@/types/lifecycle';

export const knowledgeSOPs: KnowledgeEntry[] = [
  {
    type: "theft",
    title: "Fuel Theft SOP",
    steps: [
      "Call driver and verify seal numbers",
      "Check valve status and tilt history",
      "Mark prevented or confirmed incident",
      "Attach note for audit"
    ]
  },
  {
    type: "deviation",
    title: "Route Deviation SOP", 
    steps: [
      "Call driver to confirm detour reason",
      "Assess corridor width and traffic",
      "Acknowledge and issue reroute",
      "Confirm return to corridor"
    ]
  },
  {
    type: "offline",
    title: "Offline SOP",
    steps: [
      "Check depot connectivity",
      "Confirm power/telemetry unit",
      "Wait for auto-recovery",
      "Log duration and impact"
    ]
  },
  {
    type: "tilt",
    title: "Tilt SOP",
    steps: [
      "Verify terrain/parking angle",
      "Pause offload if unsafe",
      "Resume when tilt normalizes"
    ]
  },
  {
    type: "tamper",
    title: "Tampering SOP",
    steps: [
      "Verify seal integrity",
      "Check valve positions",
      "Contact security if confirmed",
      "Document evidence"
    ]
  },
  {
    type: "danger",
    title: "Danger Zone SOP",
    steps: [
      "Immediate driver notification",
      "Assess security risk level",
      "Coordinate with authorities if needed",
      "Log incident details"
    ]
  },
  {
    type: "info",
    title: "General Information SOP",
    steps: [
      "Review information details",
      "Assess if action required",
      "Update relevant stakeholders",
      "Close or escalate as needed"
    ]
  }
];