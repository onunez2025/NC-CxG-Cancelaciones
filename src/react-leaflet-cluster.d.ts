declare module 'react-leaflet-cluster' {
  import { ReactNode } from 'react';
  
  interface MarkerClusterGroupProps {
    children: ReactNode;
    chunkedLoading?: boolean;
    showCoverageOnHover?: boolean;
    spiderfyOnMaxZoom?: boolean;
    [key: string]: any;
  }
  
  const MarkerClusterGroup: React.FC<MarkerClusterGroupProps>;
  export default MarkerClusterGroup;
}
