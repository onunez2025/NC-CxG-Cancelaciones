import { useNavigate } from 'react-router-dom';
import { Home, AlertCircle } from 'lucide-react';
import { SIATCButton } from '../components/siatc/SIATCButton';

export const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-background p-4 text-center">
      <div className="mb-6 rounded-full bg-primary/5 p-6 animate-pulse">
        <AlertCircle className="h-16 w-16 text-primary" />
      </div>
      <h1 className="mb-2 text-6xl font-black tracking-tight text-foreground">404</h1>
      <p className="mb-8 text-xl font-medium text-muted-foreground">
        Ups! La página que buscas no existe o ha sido movida.
      </p>
      <SIATCButton 
        variant="primary" 
        icon={Home} 
        onClick={() => navigate('/dashboard')}
        className="px-8"
      >
        Volver al Inicio
      </SIATCButton>
    </div>
  );
};
