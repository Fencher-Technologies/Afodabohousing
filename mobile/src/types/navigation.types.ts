export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type RootStackParamList = {
  Onboarding: undefined;
  Auth: undefined;
  Tenant: undefined;
  Manager: undefined;
  AdminLite: undefined;
  RoleUnavailable: undefined;
};

export type TenantTabParamList = {
  Home: undefined;
  Payments: undefined;
  Messages: undefined;
  Profile: undefined;
};

export type ManagerTabParamList = {
  About: undefined;
  Contact: undefined;
  Home: undefined;
  Properties: undefined;
  Tenancies: undefined;
  Payments: undefined;
  Messages: undefined;
  Privacy: undefined;
  Profile: undefined;
  Terms: undefined;
};

export type ManagerPropertiesStackParamList = {
  ManagerPropertiesList: undefined;
  ManagerPropertyDetail: {
    propertyId: string;
  };
};

export type ManagerMessagesStackParamList = {
  ManagerMessagesList: undefined;
  ManagerConversationDetail: {
    participantId: string;
  };
};

export type ManagerTenanciesStackParamList = {
  ManagerTenanciesList: undefined;
  ManagerTenancyDetail: {
    tenancyId: string;
  };
};

export type AdminLiteStackParamList = {
  AdminLiteHome: undefined;
};

export type ProfileStackParamList = {
  ProfileHome: undefined;
  EditProfile: undefined;
  About: undefined;
  Contact: undefined;
  Privacy: undefined;
  Terms: undefined;
};
