/**
 * Konomerce - User Defined Types (UDTs)
 * E-commerce data structures as Ignition-style UDTs
 */

export const UDTs = {
  // Product UDT
  Product: {
    name: 'Product',
    description: 'E-commerce product template',
    members: {
      SKU: { type: 'String', default: '' },
      Name: { type: 'String', default: '' },
      Description: { type: 'String', default: '' },
      Price: { type: 'Float8', default: 0.0 },
      ComparePrice: { type: 'Float8', default: 0.0 },
      Cost: { type: 'Float8', default: 0.0 },
      Category: { type: 'String', default: '' },
      ImageURL: { type: 'String', default: '' },
      Active: { type: 'Boolean', default: true },
      Featured: { type: 'Boolean', default: false },
      CreatedAt: { type: 'DateTime', default: null },
      UpdatedAt: { type: 'DateTime', default: null }
    }
  },

  // Inventory UDT
  Inventory: {
    name: 'Inventory',
    description: 'Inventory tracking for a product',
    members: {
      ProductSKU: { type: 'String', default: '' },
      Quantity: { type: 'Int4', default: 0 },
      Reserved: { type: 'Int4', default: 0 },
      Available: { type: 'Int4', default: 0 },
      ReorderPoint: { type: 'Int4', default: 10 },
      ReorderQty: { type: 'Int4', default: 50 },
      Location: { type: 'String', default: 'Warehouse A' },
      LastCounted: { type: 'DateTime', default: null },
      LowStock: { type: 'Boolean', default: false }
    }
  },

  // Customer UDT
  Customer: {
    name: 'Customer',
    description: 'Customer profile template',
    members: {
      ID: { type: 'String', default: '' },
      Email: { type: 'String', default: '' },
      FirstName: { type: 'String', default: '' },
      LastName: { type: 'String', default: '' },
      Phone: { type: 'String', default: '' },
      Address: { type: 'String', default: '' },
      City: { type: 'String', default: '' },
      State: { type: 'String', default: '' },
      ZipCode: { type: 'String', default: '' },
      Country: { type: 'String', default: 'US' },
      TotalOrders: { type: 'Int4', default: 0 },
      TotalSpent: { type: 'Float8', default: 0.0 },
      CreatedAt: { type: 'DateTime', default: null },
      LastOrderAt: { type: 'DateTime', default: null }
    }
  },

  // Order UDT
  Order: {
    name: 'Order',
    description: 'Order template',
    members: {
      ID: { type: 'String', default: '' },
      CustomerID: { type: 'String', default: '' },
      Status: { type: 'String', default: 'pending' },
      ItemCount: { type: 'Int4', default: 0 },
      Subtotal: { type: 'Float8', default: 0.0 },
      Tax: { type: 'Float8', default: 0.0 },
      Shipping: { type: 'Float8', default: 0.0 },
      Discount: { type: 'Float8', default: 0.0 },
      Total: { type: 'Float8', default: 0.0 },
      ShippingAddress: { type: 'String', default: '' },
      TrackingNumber: { type: 'String', default: '' },
      Notes: { type: 'String', default: '' },
      CreatedAt: { type: 'DateTime', default: null },
      UpdatedAt: { type: 'DateTime', default: null },
      ShippedAt: { type: 'DateTime', default: null },
      CompletedAt: { type: 'DateTime', default: null }
    }
  },

  // CartItem UDT
  CartItem: {
    name: 'CartItem',
    description: 'Order line item template',
    members: {
      OrderID: { type: 'String', default: '' },
      ProductSKU: { type: 'String', default: '' },
      ProductName: { type: 'String', default: '' },
      Quantity: { type: 'Int4', default: 1 },
      UnitPrice: { type: 'Float8', default: 0.0 },
      LineTotal: { type: 'Float8', default: 0.0 }
    }
  },

  // Gateway Status UDT
  GatewayStatus: {
    name: 'GatewayStatus',
    description: 'Gateway connection status',
    members: {
      Connected: { type: 'Boolean', default: false },
      LastSync: { type: 'DateTime', default: null },
      SyncCount: { type: 'Int4', default: 0 },
      ErrorCount: { type: 'Int4', default: 0 },
      Latency: { type: 'Int4', default: 0 }
    }
  }
};

// Create a tag instance from UDT
export function createFromUDT(udtName, data = {}) {
  const udt = UDTs[udtName];
  if (!udt) throw new Error(`Unknown UDT: ${udtName}`);

  const instance = {};
  for (const [key, def] of Object.entries(udt.members)) {
    instance[key] = data[key] !== undefined ? data[key] : def.default;
  }
  return instance;
}

// Validate data against UDT
export function validateUDT(udtName, data) {
  const udt = UDTs[udtName];
  if (!udt) return { valid: false, errors: ['Unknown UDT'] };

  const errors = [];
  for (const [key, def] of Object.entries(udt.members)) {
    const value = data[key];
    if (value === undefined) continue;

    // Type checking
    switch (def.type) {
      case 'String':
        if (typeof value !== 'string') errors.push(`${key} must be a string`);
        break;
      case 'Int4':
      case 'Int8':
        if (!Number.isInteger(value)) errors.push(`${key} must be an integer`);
        break;
      case 'Float4':
      case 'Float8':
        if (typeof value !== 'number') errors.push(`${key} must be a number`);
        break;
      case 'Boolean':
        if (typeof value !== 'boolean') errors.push(`${key} must be a boolean`);
        break;
    }
  }

  return { valid: errors.length === 0, errors };
}
