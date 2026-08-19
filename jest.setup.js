// Global test setup — mocks native modules that every screen touches
// indirectly (via AuthContext/config imports) but that have no real
// implementation available in the Jest environment.

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
