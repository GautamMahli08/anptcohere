export const knowledgeBase = {
  roles: {
    title: "User Roles Overview",
    content: [
      "Manager: Complete fleet oversight, all trucks and analytics",
      "Client: Customer view of their assigned vehicles and deliveries", 
      "Operator: Trip assignment and fleet coordination",
      "Driver: Individual truck status and delivery progress"
    ]
  },
  kpis: {
    title: "Key Performance Indicators",
    content: [
      "Fuel Loss %: (Assigned - Delivered) / Assigned × 100",
      "Savings: Prevented losses calculated using OMR 0.23/liter",
      "Route Compliance: Adherence to planned corridor (400m threshold)",
      "System Uptime: Percentage of time trucks are online and reporting"
    ]
  },
  map_legend: {
    title: "Map Legend",
    content: [
      "Green Circle: Depot zone (Mina Al Fahal)",
      "Blue Circles: Delivery stations (Qurum, Al Khuwair, Rusayl)",
      "Red Circle: Danger/Restricted zone (Port Sultan Qaboos)",
      "Dashed Line: Planned route corridor",
      "Truck Icons: Real-time vehicle positions with heading arrows"
    ]
  },
  alerts_notify: {
    title: "Alerts & Notifications",
    content: [
      "Real-time alerts for theft, tampering, route deviations",
      "Severity levels: Low, Medium, High, Critical",
      "Notification bell shows unread count",
      "Toast messages for immediate event awareness",
      "Bulk acknowledgment and filtering available"
    ]
  },
  export_tools: {
    title: "Export & Reporting",
    content: [
      "CSV Export: Trip data, fuel loss history, alerts, retail metrics",
      "PDF Print: Use browser print (Ctrl+P) for formatted reports",
      "Real-time data: All exports reflect current simulation state",
      "Trip Reports: Detailed delivery summaries with POD timestamps"
    ]
  }
};