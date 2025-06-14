import {
  ApolloClient,
  InMemoryCache,
  ApolloLink,
  from,
} from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';
// To handle file uploads, you must use createUploadLink from this package
import createUploadLink from 'apollo-upload-client/createUploadLink.mjs';

// This is the link that will handle file uploads
const uploadLink = createUploadLink({
  // 👇 FIX: Use import.meta.env for browser-safe environment variables (Vite standard)
  uri: import.meta.env.VITE_GRAPHQL_ENDPOINT || 'http://localhost:3000/graphql',
});

// This link adds the authentication token and the CSRF prevention header to every request
const authLink = setContext((_, { headers }) => {
  const token = localStorage.getItem('accessToken');
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : '',
      // This header tells Apollo Server that the request is legitimate and not a CSRF attempt.
      'apollo-require-preflight': 'true',
    },
  };
});

// This link handles global error logging (network errors, GraphQL errors)
const errorLink = onError(({ graphQLErrors, networkError }) => {
  if (graphQLErrors)
    graphQLErrors.forEach(({ message, locations, path }) =>
      console.error(
        `[GraphQL error]: Message: ${message}, Location: ${JSON.stringify(locations)}, Path: ${path}`,
      ),
    );
  if (networkError) console.error(`[Network error]: ${networkError}`);
});


// We chain the links together. The request flows from right to left:
// Request -> errorLink -> authLink -> uploadLink -> Server
const client = new ApolloClient({
  link: from([errorLink, authLink, uploadLink]),
  cache: new InMemoryCache(),
});

export default client;
