// export interface UserData {
//     firstName: string;
//     lastName: string;
//     email: string;
//     phone: string;
//     company: string;
//     position: string;
//     location: string;
//     timezone: string;
//     bio: string;
// }

export interface NotificationSettings {
    emailNotifications: boolean;
    pushNotifications: boolean;
    bugAlerts: boolean;
    weeklyReports: boolean;
    teamUpdates: boolean;
}

export interface SecuritySettings {
    twoFactorAuth: boolean;
    sessionTimeout: string;
    loginAlerts: boolean;
}