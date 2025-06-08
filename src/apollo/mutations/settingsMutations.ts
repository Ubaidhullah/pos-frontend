import { gql } from '@apollo/client';

export const UPDATE_SETTINGS = gql`
  mutation UpdateSettings($updateSettingsInput: UpdateSettingsInput!) {
    updateSettings(updateSettingsInput: $updateSettingsInput) {
      id # Return the ID to confirm success
    }
  }
`;