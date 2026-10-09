/**
 * Where the mobile app can be downloaded.
 *
 * The Play Store listing is the destination the business wants every share
 * and every download button to point at. Until the listing is live the
 * package URL still resolves to the store page, which shows "not found"
 * rather than a broken link, and the Drive fallback stays available for
 * testers, so set PLAY_STORE_LIVE to true the day the listing is published.
 */

export const ANDROID_PACKAGE = 'com.fenchertechnologies.axishousing';

export const PLAY_STORE_URL = `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE}`;

/** Flip to true once the Play Store listing is published. */
export const PLAY_STORE_LIVE = false;

/** Direct APK / TestFlight builds used while the stores are pending. */
const DRIVE_ANDROID = 'https://drive.google.com/drive/folders/1rWCINlslmwcj0sphOExgVSfg4i2dGZsq?usp=sharing';
const DRIVE_IOS = 'https://drive.google.com/drive/folders/14wuFtQkrOrRtoH2lr0D1QK3bnQL64VPq?usp=sharing';

export const APP_LINKS = {
  android: PLAY_STORE_LIVE ? PLAY_STORE_URL : DRIVE_ANDROID,
  ios: DRIVE_IOS,
};

/** The single link shared publicly to get the app. */
export const GET_APP_URL = APP_LINKS.android;
