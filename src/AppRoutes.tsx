// AppRoutes.tsx
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import LoginScreen from "@/components/LoginScreen";
import ManagerDashboard from "@/components/dashboards/ManagerDashboard";
import ClientDashboard from "@/components/dashboards/ClientDashboard";
import OperatorDashboard from "@/components/dashboards/OperatorDashboard";
import DriverDashboard from "@/components/dashboards/DriverDashboard";

type AppRouteProps = {
  onLogin: (role: any, name: string) => void;
  trucks: any[];
  alerts: any[];
  totalSavings: number;
  fuelConsumptionData: any[];
  fuelLossHistory: any[];
  acknowledgeAlert: (id: string) => void;
  assignTrip: (truckId: string, dest: { lat: number; lng: number; name: string }) => void;
  currentUser: { role: any; name: string } | null;
  onLogout: () => void;
};

export default function AppRoutes(props: AppRouteProps) {
  return (
    <Routes>
      <Route path="/" element={<LoginScreen onLogin={props.onLogin} />} />
      <Route path="/manager" element={<ManagerDashboard {...props} />} />
      <Route path="/client" element={<ClientDashboard {...props} />} />
      <Route path="/operator" element={<OperatorDashboard {...props} />} />
      <Route path="/driver/:truckId?" element={<DriverDashboard {...props} />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
