export interface SubscriptionPackage {
  identifier: string;
  product: {
    identifier: string;
    title: string;
    description: string;
    price: number;
    priceString: string;
    currencyCode: string;
  };
}

export interface CustomerInfo {
  activeSubscriptions: string[];
  allPurchasedProductIdentifiers: string[];
  entitlements: {
    active: {
      [key: string]: {
        identifier: string;
        productIdentifier: string;
        isActive: boolean;
      };
    };
  };
}

export type SubscriptionStatus = 'free' | 'trial' | 'premium' | 'loading';
