export interface UserProfile {
    name: string;
    role: string;
    location: string;
    patients: number;
    bloodType: string;
    availability: string;
    avatar: string;
}

export interface ProfileCardProps {
    profile: UserProfile;
}

export interface Event {
    id: string;
    time: string;
    title: string;
    type: string;
    color: string;
}

export interface EventsListProps {
    events: Event[];
}

export interface LoginData {
    email: string;
    password: string;
}

export interface AuthProps {
    onLogin: () => void;
}