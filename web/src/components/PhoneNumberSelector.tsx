import Image from "next/image";
import { Phone } from "lucide-react";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

type NumberItem = {
    id: string;
    phone_number: string;
    country_code?: string;
    base_number?: string;
    provider?: string;
    type?: string;
};

const DIAL_TO_COUNTRY: Record<string, { code: string; name: string }> = {
    "+1": { code: "us", name: "US" },
    "+44": { code: "gb", name: "GB" },
    "+91": { code: "in", name: "IN" },
    "+971": { code: "ae", name: "AE" },
    "+61": { code: "au", name: "AU" },
    "+49": { code: "de", name: "DE" },
    "+33": { code: "fr", name: "FR" },
    "+81": { code: "jp", name: "JP" },
    "+86": { code: "cn", name: "CN" },
    "+7": { code: "ru", name: "RU" },
    "+55": { code: "br", name: "BR" },
    "+52": { code: "mx", name: "MX" },
    "+27": { code: "za", name: "ZA" },
    "+234": { code: "ng", name: "NG" },
    "+20": { code: "eg", name: "EG" },
    "+966": { code: "sa", name: "SA" },
    "+65": { code: "sg", name: "SG" },
    "+60": { code: "my", name: "MY" },
    "+62": { code: "id", name: "ID" },
    "+63": { code: "ph", name: "PH" },
    "+92": { code: "pk", name: "PK" },
    "+880": { code: "bd", name: "BD" },
    "+94": { code: "lk", name: "LK" },
    "+974": { code: "qa", name: "QA" },
    "+965": { code: "kw", name: "KW" },
    "+973": { code: "bh", name: "BH" },
    "+968": { code: "om", name: "OM" },
};

interface PhoneNumberSelectorProps {
    numbers: NumberItem[];
    countryCodes: string[];
    selectedCountryCode: string | undefined;
    onSelectedCountryCodeChange: (code: string) => void;
    selectedNumberId: string | undefined;
    onSelectedNumberChange: (id: string) => void;
}

const normalizeE164Like = (phone: unknown): string =>
    String(phone ?? "").trim().replace(/^\+{2,}/, "+");

export function PhoneNumberSelector({
    numbers,
    countryCodes,
    selectedCountryCode,
    onSelectedCountryCodeChange,
    selectedNumberId,
    onSelectedNumberChange,
}: PhoneNumberSelectorProps) {
    // With country codes
    if (countryCodes.length > 0) {
        const activeCode = selectedCountryCode ?? countryCodes[0];
        const activeCountry = DIAL_TO_COUNTRY[activeCode];

        return (
            <div className="w-full mx-0">
                <label className="text-sm font-medium text-gray-700 mb-1 block">
                    Phone Number
                </label>
                <div className="flex rounded-[10px] border border-gray-200 overflow-hidden focus-within:ring-2 focus-within:ring-gray-200 min-h-[48px] bg-white">
                    {/* Country code selector */}
                    <Select value={activeCode} onValueChange={onSelectedCountryCodeChange}>
                        <SelectTrigger className="flex items-center gap-2 px-3 bg-gray-50 border-0 border-r border-gray-200 hover:bg-gray-100 rounded-none focus:ring-0 shadow-none h-auto min-w-[96px] max-w-[116px] min-h-[48px]">
                            <div className="flex items-center gap-2">
                                {activeCountry ? (
                                    <Image
                                        src={`https://flagcdn.com/w40/${activeCountry.code}.png`}
                                        alt={activeCountry.name}
                                        width={24}
                                        height={16}
                                        unoptimized
                                    />
                                ) : (
                                    <Phone className="w-4 h-4 text-gray-500" />
                                )}
                                <span className="text-sm font-medium text-gray-700">{activeCode}</span>
                            </div>
                        </SelectTrigger>
                        <SelectContent>
                            {countryCodes.map((code) => {
                                const country = DIAL_TO_COUNTRY[code];
                                return (
                                    <SelectItem key={code} value={code}>
                                        <div className="flex items-center gap-3">
                                            {country ? (
                                                <Image
                                                    src={`https://flagcdn.com/w40/${country.code}.png`}
                                                    alt={country.name}
                                                    width={24}
                                                    height={16}
                                                    unoptimized
                                                />
                                            ) : (
                                                <Phone className="w-4 h-4 text-gray-400" />
                                            )}
                                            <span className="text-sm text-gray-700">{country?.name ?? code}</span>
                                            <span className="text-sm font-medium text-gray-500 ml-auto">{code}</span>
                                        </div>
                                    </SelectItem>
                                );
                            })}
                        </SelectContent>
                    </Select>

                    {/* Base number selector */}
                    <Select value={selectedNumberId} onValueChange={onSelectedNumberChange}>
                        <SelectTrigger className="h-auto flex-1 border-0 rounded-none focus:ring-0 shadow-none bg-transparent px-3 text-left min-h-[48px]">
                            <SelectValue placeholder="Select number" />
                        </SelectTrigger>
                        <SelectContent>
                            {numbers.map((n) => (
                                <SelectItem key={n.id} value={n.id}>
                                    <div className="flex flex-col">
                                        <span className="font-medium">
                                            {n.base_number ?? normalizeE164Like(n.phone_number)}
                                        </span>
                                        {n.provider && (
                                            <span className="text-xs text-gray-500">{n.provider}</span>
                                        )}
                                    </div>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>
        );
    }

    // Fallback — no country codes
    return (
        <div className="w-full mx-0">
            <label className="text-sm font-medium text-gray-700 mb-1 block">
                Phone Number
            </label>
            <Select value={selectedNumberId} onValueChange={onSelectedNumberChange}>
                <SelectTrigger className="h-12 rounded-[10px] border-gray-200 focus:ring-2 focus:ring-primary w-full">
                    <SelectValue placeholder="Select number" />
                </SelectTrigger>
                <SelectContent>
                    {numbers.map((n) => (
                        <SelectItem key={n.id} value={n.id}>
                            <div className="flex items-center gap-2">
                                <Phone className="w-4 h-4 text-gray-500 flex-shrink-0" />
                                <span>{n.base_number ?? normalizeE164Like(n.phone_number)}</span>
                            </div>
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}