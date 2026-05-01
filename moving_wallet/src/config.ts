import Constants from 'expo-constants'


const devHost = __DEV__
  ? (Constants.expoConfig?.hostUri?.split(':')[0] ?? null)
  : null


const PROD_HOST = process.env.EXPO_PUBLIC_PROD_HOST ?? '3.26.11.128'

const host = devHost ?? PROD_HOST

export const config = __DEV__
  ? {
      waltidWalletUrl: `http://${host}:7001`,
      issuerApiUrl:    `http://${host}:4000`,
      issuerBaseUrl:   `http://${host}`,
    }
  : {
      waltidWalletUrl: (process.env.EXPO_PUBLIC_WALTID_WALLET_URL ?? `http://${host}:7001`).replace(/\/$/, ''),
      issuerApiUrl:    (process.env.EXPO_PUBLIC_ISSUER_API_URL    ?? `http://${host}:4000`).replace(/\/$/, ''),
      issuerBaseUrl:   (process.env.EXPO_PUBLIC_ISSUER_BASE_URL   ?? `http://${host}`).replace(/\/$/, ''),
    }
