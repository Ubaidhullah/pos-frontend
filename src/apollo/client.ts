import {
  ApolloClient,
  InMemoryCache,
  ApolloLink,
  from,
} from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';
import createUploadLink from 'apollo-upload-client/createUploadLink.mjs';

const uploadLink = createUploadLink({
  uri: import.meta.env.VITE_GRAPHQL_ENDPOINT || 'http://localhost:3000/graphql',
});

const authLink = setContext((_, { headers }) => {
  const token = localStorage.getItem('accessToken');
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : '',
      'apollo-require-preflight': 'true',
    },
  };
});

// --- FIX IS HERE: Enhanced error handling logic ---
const errorLink = onError(({ graphQLErrors, networkError }) => {
  if (graphQLErrors) {
    graphQLErrors.forEach(({ message, locations, path, extensions }) => {
      console.error(
        `[GraphQL error]: Message: ${message}, Location: ${JSON.stringify(locations)}, Path: ${path}`,
      );

      // If the backend sends an 'UNAUTHENTICATED' code, it means the token
      // is invalid or expired. We must log the user out.
      if ((extensions?.code as string) === 'UNAUTHENTICATED') {
        // Clear the token and redirect to login
        localStorage.removeItem('accessToken');
        window.location.href = '/login';
      }
    });
  }

  // Handle network errors (like a 401 Unauthorized HTTP status)
  if (networkError && 'statusCode' in networkError && networkError.statusCode === 401) {
    console.error(`[Network error]: ${networkError}`);
    // Clear the token and redirect to login
    localStorage.removeItem('accessToken');
    window.location.href = '/login';
  }
});


const client = new ApolloClient({
  link: from([errorLink, authLink, uploadLink]),
  cache: new InMemoryCache(),
});

export default client;
