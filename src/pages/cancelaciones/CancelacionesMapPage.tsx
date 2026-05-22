import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { SIATC_THEME } from '../../utils/siatc-theme';
import { SIATCButton } from '../../components/siatc/SIATCButton';
import { ArrowLeft, Loader2, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Fix for default marker icons in React-Leaflet
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

interface MapData {
  id: string;
  ticket: string;
  cliente: string;
  asunto: string;
  motivo: string;
  latitud: string;
  longitud: string;
}

export const CancelacionesMapPage = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<MapData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('siatc_token');
        const res = await fetch('/api/cancelaciones/mapa/hoy', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (!res.ok) throw new Error('Error al cargar datos del mapa');
        const json = await res.json();
        setData(json);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const defaultCenter: [number, number] = [-12.046374, -77.042793]; // Lima, Peru

  return (
    <div className={SIATC_THEME.LAYOUT.PAGE_WRAPPER}>
      <div className={SIATC_THEME.LAYOUT.HEADER_WRAPPER}>
        <div>
          <h1 className={SIATC_THEME.TYPOGRAPHY.PAGE_TITLE}>Mapa de Cancelaciones - Hoy</h1>
          <p className={SIATC_THEME.TYPOGRAPHY.PAGE_SUBTITLE}>
            Visualización geográfica de los servicios cancelados generados en el día actual.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <SIATCButton 
            variant="secondary" 
            icon={ArrowLeft}
            onClick={() => navigate('/cancelaciones')}
          >
            Volver a Cancelaciones
          </SIATCButton>
        </div>
      </div>

      <div className={`${SIATC_THEME.LAYOUT.CONTENT_CONTAINER} p-0 overflow-hidden flex flex-col h-[calc(100vh-200px)] min-h-[500px]`}>
        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-sm text-muted-foreground font-medium">Cargando mapa...</p>
          </div>
        ) : error ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-red-500 font-semibold">{error}</p>
          </div>
        ) : (
          <div className="flex-1 relative">
            <MapContainer 
              center={data.length > 0 && data[0].latitud ? [parseFloat(data[0].latitud), parseFloat(data[0].longitud)] : defaultCenter} 
              zoom={11} 
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {data.map((item) => {
                const lat = parseFloat(item.latitud);
                const lng = parseFloat(item.longitud);
                if (isNaN(lat) || isNaN(lng)) return null;

                return (
                  <Marker key={item.id} position={[lat, lng]}>
                    <Popup>
                      <div className="p-1">
                        <p className="font-bold text-sm mb-1">Ticket #{item.ticket}</p>
                        <p className="text-xs text-slate-600 dark:text-slate-300 mb-1"><b>Cliente:</b> {item.cliente}</p>
                        <p className="text-xs text-slate-600 dark:text-slate-300 mb-1"><b>Asunto:</b> {item.asunto}</p>
                        <p className="text-xs text-red-600 dark:text-red-400 font-semibold"><b>Motivo:</b> {item.motivo}</p>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>
            
            {/* Legend / Stats overlay */}
            <div className="absolute bottom-6 right-6 z-[1000] bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-4 rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 pointer-events-auto">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Total Mostrados</p>
                  <p className="text-2xl font-bold text-foreground leading-none mt-1">{data.length}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
