import {
    ApolloClient,
    InMemoryCache,
    // createHttpLink,// For file uploads if needed
    ApolloLink,
    from, // Use 'from' to chain links
  } from '@apollo/client';
  import createUploadLink from 'apollo-upload-client/createUploadLink.mjs';
  import { setContext } from '@apollo/client/link/context';
  import { onError } from '@apollo/client/link/error';
  import { message } from 'antd'; // For displaying error messages
  
  // HTTP connection to your GraphQL API
  const httpLink = createUploadLink({
    uri: import.meta.env.VITE_GRAPHQL_ENDPOINT || 'http://localhost:3000/graphql',
  });
  
  // Middleware for attaching the JWT token to requests
  const authLink = setContext((_, { headers }) => {
    const token = localStorage.getItem('accessToken');
    return {
      headers: {
        ...headers,
        authorization: token ? `Bearer ${token}` : '',
      },
    };
  });
  
  // Error handling link
  const errorLink = onError(({ graphQLErrors, networkError, operation, forward }) => {
    if (graphQLErrors) {
      graphQLErrors.forEach(({ message: msg, locations, path, extensions }) => {
        console.error(
          `[GraphQL error]: Message: ${msg}, Location: ${JSON.stringify(locations)}, Path: ${path}, Extensions: ${JSON.stringify(extensions)}`
        );
        // Display user-friendly error messages
        if (extensions?.code === 'UNAUTHENTICATED' || msg.includes('UNAUTHENTICATED')) {
          // Handle token expiration or unauthenticated access
          // e.g., clear token, redirect to login
          // This might be better handled in a response link or specific component logic
          message.error('Session expired or unauthorized. Please login again.');
          // Consider calling your auth context's logout function here
          // Example:
          // if (typeof window !== 'undefined') { // ensure it's browser environment
          //   localStorage.removeItem('accessToken');
          //   localStorage.removeItem('authUser');
          //   window.location.href = '/login'; // Force reload to login
          // }
        } else {
          message.error(`GraphQL Error: ${msg}`);
        }
      });
    }
  
    if (networkError) {
      console.error(`[Network error]: ${networkError}`);
      message.error(`Network Error: ${networkError.message}. Please check your connection.`);
    }
  
    // You can also retry operations here if needed
    // return forward(operation);
  });
  
  const client = new ApolloClient({
    // Chain links: errorLink -> authLink -> httpLink
    link: from([errorLink, authLink, httpLink]),
    cache: new InMemoryCache({
      typePolicies: {
        // Example: Specify how to merge incoming data for paginated fields if needed
        // Query: {
        //   fields: {
        //     products: {
        //       // Custom merge logic for pagination
        //       keyArgs: false, // Or specify key arguments
        //       merge(existing = [], incoming) {
        //         return [...existing, ...incoming];
        //       },
        //     },
        //   },
        // },
      },
    }),
    defaultOptions: {
      watchQuery: {
        fetchPolicy: 'cache-and-network', // Default fetch policy
        errorPolicy: 'all',
      },
      query: {
        fetchPolicy: 'network-only', // Or 'cache-first' depending on data freshness needs
        errorPolicy: 'all',
      },
      mutate: {
        errorPolicy: 'all',
      },
    },
  });
  
  export default client;