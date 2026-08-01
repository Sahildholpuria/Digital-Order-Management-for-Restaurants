import React from 'react';
import { PageLoader } from './PageLoader';

interface CustomerMenuLoaderProps {
  restaurantName?: string;
}

export const CustomerMenuLoader: React.FC<CustomerMenuLoaderProps> = ({ restaurantName }) => {
  return (
    <PageLoader
      message={restaurantName ? `LOADING ${restaurantName.toUpperCase()}...` : "LOADING GOURMET MENU..."}
      subtext="Syncing live restaurant items & kitchen status"
      fullScreen={true}
    />
  );
};

export default CustomerMenuLoader;
