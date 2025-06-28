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

// This is the link that will handle file uploads and regular GraphQL operations
const uploadLink = createUploadLink({
  uri: import.meta.env.VITE_GRAPHQL_ENDPOINT || 'http://localhost:3000/graphql',
});


const authLink = setContext((_, { headers }) => {
  const token = localStorage.getItem('accessToken');
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : '',
      // This header can be useful for preventing CSRF in some setups
      'apollo-require-preflight': 'true',
    },
  };
});

// This link handles global error logging
const errorLink = onError(({ graphQLErrors, networkError }) => {
  if (graphQLErrors)
    graphQLErrors.forEach(({ message, locations, path }) =>
      console.error(
        `[GraphQL error]: Message: ${message}, Location: ${JSON.stringify(locations)}, Path: ${path}`,
      ),
    );
  if (networkError) console.error(`[Network error]: ${networkError}`);
});


// We chain the links together using ApolloLink.from.
// The request flows from right to left: errorLink -> authLink -> uploadLink
const client = new ApolloClient({
  link: from([errorLink, authLink, uploadLink]),
  cache: new InMemoryCache(),
});

export default client;
