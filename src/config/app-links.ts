/**
 * Where the mobile app can be downloaded.
 *
 * The Android APK is served by the website itself from /downloads, so no
 * third-party storage is involved. To release a new build, replace
 * public/downloads/axis-housing.apk (keep the file name) and redeploy.
 *
 * Android only: there is no iOS build.
 */

export const ANDROID_PACKAGE = 'com.fenchertechnologies.axishousing';

/** Path of the APK on this site. */
export const APK_PATH = '/downloads/axis-housing.apk';

/** The public site, used to build absolute links for sharing. */
const SITE_URL = 'https://axishousings.com';

export const APP_LINKS = {
  /** Relative, so the button works on any deployment of the site. */
  android: APK_PATH,
};

/** The single absolute link shared publicly to get the app. */
export const GET_APP_URL = `${SITE_URL}${APK_PATH}`;
