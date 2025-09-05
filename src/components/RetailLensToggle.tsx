import React from 'react';
import { Store } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useUiScope } from '@/contexts/UiScopeContext';

const RetailLensToggle: React.FC = () => {
  const { scope, setRetailOnly } = useUiScope();

  return (
    <Button
      variant={scope.retailOnly ? "default" : "outline"}
      size="sm"
      onClick={() => setRetailOnly(!scope.retailOnly)}
      className={`flex items-center gap-2 ${
        scope.retailOnly 
          ? 'bg-retail hover:bg-retail/90 text-white' 
          : 'hover:bg-retail/10 hover:text-retail'
      }`}
    >
      <Store className="w-4 h-4" />
      Retail
      {scope.retailOnly && (
        <Badge variant="secondary" className="ml-1 h-4 px-1 text-xs">
          ON
        </Badge>
      )}
    </Button>
  );
};

export default RetailLensToggle;