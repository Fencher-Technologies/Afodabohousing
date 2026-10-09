/**
 * Where the mobile app can be downloaded.
 *
 * Kept in step with src/config/app-links.ts on the web so a shared listing
 * sends people to the same place from either platform. Flip PLAY_STORE_LIVE
 * on both the day the Play Store listing is published.
 */

export const ANDROID_PACKAGE = "com.fenchertechnologies.axishousing";

export const PLAY_STORE_URL = `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE}`;

/** Flip to true once the Play Store listing is published. */
export const PLAY_STORE_LIVE = false;

/** Direct APK build used while the store listing is pending. */
const DRIVE_ANDROID =
  "https://drive.google.com/drive/folders/1rWCINlslmwcj0sphOExgVSfg4i2dGZsq?usp=sharing";

/** The single link shared publicly to get the app. */
export const GET_APP_URL = PLAY_STORE_LIVE ? PLAY_STORE_URL : DRIVE_ANDROID;
