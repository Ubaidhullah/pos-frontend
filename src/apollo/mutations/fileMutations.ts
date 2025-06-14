import { gql } from '@apollo/client';

export const UPLOAD_PRODUCT_IMAGE = gql`
  mutation UploadProductImage($file: Upload!) {
    uploadProductImage(file: $file)
  }
`;