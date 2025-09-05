// components/FSaaSApp.tsx
import React from "react";
import useMuscatSimulation from "@/hooks/useMuscatSimulation"; // <- your data hook
import AppRoutes from "@/AppRoutes";

export default function FSaaSApp() {
  const {
    currentUser,
    trucks,
    alerts,
    totalSavings,
    fuelConsumptionData,
    fuelLossHistory,
    onLogin,
    onLogout,
    acknowledgeAlert,
    assignTrip,
  } = useMuscatSimulation();

  return (
    <AppRoutes
      onLogin={onLogin}
      trucks={trucks}
      alerts={alerts}
      totalSavings={totalSavings}
      fuelConsumptionData={fuelConsumptionData}
      fuelLossHistory={fuelLossHistory}
      acknowledgeAlert={acknowledgeAlert}
      assignTrip={assignTrip}
      currentUser={currentUser}
      onLogout={onLogout}
    />
  );
}
