import React, { useState } from 'react';
import { gql, useQuery, useMutation } from '@apollo/client';

const GET_PRODUCTS_QUERY = gql`
  query GetProducts {
    products { # Assuming your query for all products is named 'products'
      id
      name
      price
      inventoryItem {
        quantity
      }
    }
  }
`;

const CREATE_ORDER_MUTATION = gql`
  mutation CreateOrder($createOrderInput: CreateOrderInput!) {
    createOrder(createOrderInput: $createOrderInput) {
      id
      totalAmount
      status
      items {
        product {
          name
        }
        quantity
        priceAtSale
      }
    }
  }
`;

interface ProductData {
  id: string;
  name: string;
  price: number;
  inventoryItem?: { quantity: number };
}

interface CartItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;
}

export function PosInterface() {
  const { data: productsData, loading: productsLoading, error: productsError } = useQuery(GET_PRODUCTS_QUERY);
  const [cart, setCart] = useState<CartItem[]>([]);

  const [createOrder, { data: orderData, loading: orderLoading, error: orderError }] = useMutation(CREATE_ORDER_MUTATION, {
    onCompleted: (data) => {
      console.log('Order created:', data.createOrder);
      alert(`Order ${data.createOrder.id} created successfully! Total: $${data.createOrder.totalAmount}`);
      setCart([]); // Clear cart
      // You might want to refetch product inventory or use cache updates
    },
    onError: (err) => {
      console.error('Order creation error:', err.message);
      alert(`Error creating order: ${err.message}`);
    }
  });

  const addToCart = (product: ProductData) => {
    setCart((prevCart) => {
      const existingItem = prevCart.find(item => item.productId === product.id);
      if (existingItem) {
        return prevCart.map(item =>
          item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prevCart, { productId: product.id, name: product.name, quantity: 1, price: product.price }];
    });
  };

  const handleCreateOrder = () => {
    if (cart.length === 0) {
      alert('Cart is empty!');
      return;
    }
    const orderItems = cart.map(item => ({
      productId: item.productId,
      quantity: item.quantity,
    }));
    createOrder({ variables: { createOrderInput: { items: orderItems } } });
  };

  if (productsLoading) return <p>Loading products...</p>;
  if (productsError) return <p>Error loading products: {productsError.message}</p>;

  return (
    <div>
      <h2>Products</h2>
      <div style={{ display: 'flex', flexWrap: 'wrap' }}>
        {productsData?.products.map((product: ProductData) => (
          <div key={product.id} style={{ border: '1px solid #ccc', margin: '5px', padding: '10px', width: '150px' }}>
            <h4>{product.name}</h4>
            <p>Price: ${product.price}</p>
            <p>Stock: {product.inventoryItem?.quantity ?? 'N/A'}</p>
            <button onClick={() => addToCart(product)} disabled={(product.inventoryItem?.quantity ?? 0) === 0}>
              Add to Cart
            </button>
          </div>
        ))}
      </div>

      <h2>Cart</h2>
      {cart.length === 0 ? <p>Cart is empty.</p> : (
        <ul>
          {cart.map(item => (
            <li key={item.productId}>
              {item.name} - Qty: {item.quantity} - Price: ${item.price.toFixed(2)}
            </li>
          ))}
        </ul>
      )}
      <h3>Total: ${cart.reduce((acc, item) => acc + item.price * item.quantity, 0).toFixed(2)}</h3>
      <button onClick={handleCreateOrder} disabled={cart.length === 0 || orderLoading}>
        {orderLoading ? 'Placing Order...' : 'Place Order'}
      </button>
      {orderError && <p style={{ color: 'red' }}>Order Error: {orderError.message}</p>}
    </div>
  );
}