// src/App.tsx (example)
import { ApolloClient, InMemoryCache, ApolloProvider, gql, useQuery } from '@apollo/client';

const client = new ApolloClient({
  uri: import.meta.env.VITE_GRAPHQL_ENDPOINT || 'http://localhost:3001/graphql',
  cache: new InMemoryCache(),
  credentials: 'include',
});


const HELLO_QUERY = gql`
  query SayHello {
    sayHello{
      message
    }
  }
`;

function Hello() {
  const { loading, error, data } = useQuery(HELLO_QUERY);
  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error :( {error.message}</p>;
  return <h1>{data.sayHello}</h1>;
}

function App() {
  return (
    <ApolloProvider client={client}>
      <Hello />
    </ApolloProvider>
  );
}
export default App;