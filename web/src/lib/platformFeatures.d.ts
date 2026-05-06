export declare const PLATFORM_FEATURES: {
    linkedin: {
        id: string;
        label: string;
        description: string;
    }[];
    instagram: {
        id: string;
        label: string;
        description: string;
    }[];
    whatsapp: {
        id: string;
        label: string;
        description: string;
    }[];
    email: {
        id: string;
        label: string;
        description: string;
    }[];
    voice: {
        id: string;
        label: string;
        description: string;
    }[];
};
export declare const UTILITY_QUESTIONS: {
    schedule: {
        question: string;
        options: {
            label: string;
            value: string;
        }[];
    };
    delay: {
        question: string;
        options: {
            label: string;
            value: string;
        }[];
    };
    condition: {
        question: string;
        options: {
            label: string;
            value: string;
        }[];
    };
    variables: {
        question: string;
        options: {
            label: string;
            value: string;
        }[];
        multiSelect: boolean;
    };
};
export type Platform = keyof typeof PLATFORM_FEATURES;
export type PlatformFeature = typeof PLATFORM_FEATURES[Platform][number];
//# sourceMappingURL=platformFeatures.d.ts.map