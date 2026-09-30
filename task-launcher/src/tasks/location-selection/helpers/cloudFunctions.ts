import { taskStore } from '../../../taskStore';

export const LEVANTE_ADMIN_CLOUD_FUNCTIONS_DEV = 'https://us-central1-hs-levante-admin-dev.cloudfunctions.net';
export const LEVANTE_ADMIN_CLOUD_FUNCTIONS_PROD = 'https://us-central1-hs-levante-admin-prod.cloudfunctions.net';

/** Resolves dev vs prod admin cloud function host from the active Firebase project. */
export function getLevanteAdminCloudFunctionsBaseUrl(): string {
  if (taskStore().isDev) {
    return LEVANTE_ADMIN_CLOUD_FUNCTIONS_DEV;
  }
  return LEVANTE_ADMIN_CLOUD_FUNCTIONS_PROD;
}

export function getDefaultPopulationKonturH3ApiUrl(): string {
  return `${getLevanteAdminCloudFunctionsBaseUrl()}/populationKonturH3`;
}

export function getDefaultPopulationWorldpopH3ApiUrl(): string {
  return `${getLevanteAdminCloudFunctionsBaseUrl()}/populationWorldpopH3`;
}

export function getCartoBasemapTileUrlTemplate(): string {
  return `${getLevanteAdminCloudFunctionsBaseUrl()}/cartoBasemapTile/light_all/{z}/{x}/{y}{r}.png`;
}
