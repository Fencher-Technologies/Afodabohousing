const { withGradleProperties } = require('@expo/config-plugins');

function upsertGradleProperty(properties, key, value) {
  const existing = properties.find(
    (item) => item.type === 'property' && item.key === key
  );

  if (existing) {
    existing.value = value;
    return;
  }

  properties.push({ type: 'property', key, value });
}

module.exports = ({ config }) =>
  withGradleProperties(
    {
      ...config,
      newArchEnabled: false,
      android: {
        ...config.android,
        newArchEnabled: false,
      },
    },
    (gradleConfig) => {
      upsertGradleProperty(
        gradleConfig.modResults,
        'org.gradle.parallel',
        'false'
      );
      upsertGradleProperty(
        gradleConfig.modResults,
        'newArchEnabled',
        'false'
      );
      return gradleConfig;
    }
  );
