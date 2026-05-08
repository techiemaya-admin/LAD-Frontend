"use client";
import { useState } from "react";
import Image from "next/image";
import {
  Card, CardHeader, CardTitle, CardDescription, CardContent
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileText, Loader2, Phone, Download, Trash, Eye, EyeOff, SquarePen, ChevronDown, BrainCircuit, PhoneCall } from "lucide-react";
import { useToast } from "@/components/ui/app-toaster";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogActions } from "@/components/ui/dialog";
import ExcelJS from "exceljs";
// LAD Architecture Compliance: Use SDK hooks instead of direct API calls
import { useMakeCall, useTriggerBatchCall, useUpdateSummary } from '@lad/frontend-features/voice-agent';
import { logger } from "@/lib/logger";
import {
  saveBatchUpload,
  updateJsonSnapshot,
  getOriginalFile,
  BatchUploadEntry,
} from "@/utils/batchUploadStorage";

// Country codes data with flag emojis and dial codes
const COUNTRIES = [
  { code: "IN", name: "India", dialCode: "+91", flag: "🇮🇳" },
  { code: "US", name: "United States", dialCode: "+1", flag: "🇺🇸" },
  { code: "GB", name: "United Kingdom", dialCode: "+44", flag: "🇬🇧" },
  { code: "CA", name: "Canada", dialCode: "+1", flag: "🇨🇦" },
  { code: "AU", name: "Australia", dialCode: "+61", flag: "🇦🇺" },
  { code: "DE", name: "Germany", dialCode: "+49", flag: "🇩🇪" },
  { code: "FR", name: "France", dialCode: "+33", flag: "🇫🇷" },
  { code: "IT", name: "Italy", dialCode: "+39", flag: "🇮🇹" },
  { code: "ES", name: "Spain", dialCode: "+34", flag: "🇪🇸" },
  { code: "BR", name: "Brazil", dialCode: "+55", flag: "🇧🇷" },
  { code: "MX", name: "Mexico", dialCode: "+52", flag: "🇲🇽" },
  { code: "AR", name: "Argentina", dialCode: "+54", flag: "🇦🇷" },
  { code: "ZA", name: "South Africa", dialCode: "+27", flag: "🇿🇦" },
  { code: "EG", name: "Egypt", dialCode: "+20", flag: "🇪🇬" },
  { code: "NG", name: "Nigeria", dialCode: "+234", flag: "🇳🇬" },
  { code: "KE", name: "Kenya", dialCode: "+254", flag: "🇰🇪" },
  { code: "SG", name: "Singapore", dialCode: "+65", flag: "🇸🇬" },
  { code: "JP", name: "Japan", dialCode: "+81", flag: "🇯🇵" },
  { code: "KR", name: "South Korea", dialCode: "+82", flag: "🇰🇷" },
  { code: "CN", name: "China", dialCode: "+86", flag: "🇨🇳" },
  { code: "HK", name: "Hong Kong", dialCode: "+852", flag: "🇭🇰" },
  { code: "AE", name: "UAE", dialCode: "+971", flag: "🇦🇪" },
  { code: "SA", name: "Saudi Arabia", dialCode: "+966", flag: "🇸🇦" },
  { code: "PK", name: "Pakistan", dialCode: "+92", flag: "🇵🇰" },
  { code: "BD", name: "Bangladesh", dialCode: "+880", flag: "🇧🇩" },
  { code: "LK", name: "Sri Lanka", dialCode: "+94", flag: "🇱🇰" },
  { code: "MY", name: "Malaysia", dialCode: "+60", flag: "🇲🇾" },
  { code: "ID", name: "Indonesia", dialCode: "+62", flag: "🇮🇩" },
  { code: "PH", name: "Philippines", dialCode: "+63", flag: "🇵🇭" },
  { code: "TH", name: "Thailand", dialCode: "+66", flag: "🇹🇭" },
  { code: "VN", name: "Vietnam", dialCode: "+84", flag: "🇻🇳" },
  { code: "NZ", name: "New Zealand", dialCode: "+64", flag: "🇳🇿" },
  { code: "RU", name: "Russia", dialCode: "+7", flag: "🇷🇺" },
  { code: "TR", name: "Turkey", dialCode: "+90", flag: "🇹🇷" },
  { code: "NL", name: "Netherlands", dialCode: "+31", flag: "🇳🇱" },
  { code: "BE", name: "Belgium", dialCode: "+32", flag: "🇧🇪" },
  { code: "CH", name: "Switzerland", dialCode: "+41", flag: "🇨🇭" },
  { code: "AT", name: "Austria", dialCode: "+43", flag: "🇦🇹" },
  { code: "SE", name: "Sweden", dialCode: "+46", flag: "🇸🇪" },
  { code: "NO", name: "Norway", dialCode: "+47", flag: "🇳🇴" },
  { code: "DK", name: "Denmark", dialCode: "+45", flag: "🇩🇰" },
  { code: "FI", name: "Finland", dialCode: "+358", flag: "🇫🇮" },
  { code: "PL", name: "Poland", dialCode: "+48", flag: "🇵🇱" },
  { code: "UA", name: "Ukraine", dialCode: "+380", flag: "🇺🇦" },
  { code: "IL", name: "Israel", dialCode: "+972", flag: "🇮🇱" },
  { code: "QA", name: "Qatar", dialCode: "+974", flag: "🇶🇦" },
  { code: "KW", name: "Kuwait", dialCode: "+965", flag: "🇰🇼" },
  { code: "BH", name: "Bahrain", dialCode: "+973", flag: "🇧🇭" },
  { code: "OM", name: "Oman", dialCode: "+968", flag: "🇴🇲" },
  { code: "JO", name: "Jordan", dialCode: "+962", flag: "🇯🇴" },
  { code: "LB", name: "Lebanon", dialCode: "+961", flag: "🇱🇧" },
  { code: "IQ", name: "Iraq", dialCode: "+964", flag: "🇮🇶" },
  { code: "IR", name: "Iran", dialCode: "+98", flag: "🇮🇷" },
  { code: "AF", name: "Afghanistan", dialCode: "+93", flag: "🇦🇫" },
  { code: "NP", name: "Nepal", dialCode: "+977", flag: "🇳🇵" },
  { code: "MM", name: "Myanmar", dialCode: "+95", flag: "🇲🇲" },
  { code: "KH", name: "Cambodia", dialCode: "+855", flag: "🇰🇭" },
  { code: "LA", name: "Laos", dialCode: "+856", flag: "🇱🇦" },
  { code: "BN", name: "Brunei", dialCode: "+673", flag: "🇧🇳" },
  { code: "MO", name: "Macau", dialCode: "+853", flag: "🇲🇴" },
  { code: "TW", name: "Taiwan", dialCode: "+886", flag: "🇹🇼" },
  { code: "MN", name: "Mongolia", dialCode: "+976", flag: "🇲🇳" },
  { code: "KP", name: "North Korea", dialCode: "+850", flag: "🇰🇵" },
  { code: "KZ", name: "Kazakhstan", dialCode: "+7", flag: "🇰🇿" },
  { code: "UZ", name: "Uzbekistan", dialCode: "+998", flag: "🇺🇿" },
  { code: "TM", name: "Turkmenistan", dialCode: "+993", flag: "🇹🇲" },
  { code: "KG", name: "Kyrgyzstan", dialCode: "+996", flag: "🇰🇬" },
  { code: "TJ", name: "Tajikistan", dialCode: "+992", flag: "🇹🇯" },
  { code: "GE", name: "Georgia", dialCode: "+995", flag: "🇬🇪" },
  { code: "AZ", name: "Azerbaijan", dialCode: "+994", flag: "🇦🇿" },
  { code: "AM", name: "Armenia", dialCode: "+374", flag: "🇦🇲" },
  { code: "MD", name: "Moldova", dialCode: "+373", flag: "🇲🇩" },
  { code: "BY", name: "Belarus", dialCode: "+375", flag: "🇧🇾" },
  { code: "EE", name: "Estonia", dialCode: "+372", flag: "🇪🇪" },
  { code: "LV", name: "Latvia", dialCode: "+371", flag: "🇱🇻" },
  { code: "LT", name: "Lithuania", dialCode: "+370", flag: "🇱🇹" },
  { code: "IE", name: "Ireland", dialCode: "+353", flag: "🇮🇪" },
  { code: "IS", name: "Iceland", dialCode: "+354", flag: "🇮🇸" },
  { code: "AL", name: "Albania", dialCode: "+355", flag: "🇦🇱" },
  { code: "BA", name: "Bosnia & Herzegovina", dialCode: "+387", flag: "🇧🇦" },
  { code: "ME", name: "Montenegro", dialCode: "+382", flag: "🇲🇪" },
  { code: "MK", name: "North Macedonia", dialCode: "+389", flag: "🇲🇰" },
  { code: "RS", name: "Serbia", dialCode: "+381", flag: "🇷🇸" },
  { code: "SI", name: "Slovenia", dialCode: "+386", flag: "🇸🇮" },
  { code: "HR", name: "Croatia", dialCode: "+385", flag: "🇭🇷" },
  { code: "BG", name: "Bulgaria", dialCode: "+359", flag: "🇧🇬" },
  { code: "RO", name: "Romania", dialCode: "+40", flag: "🇷🇴" },
  { code: "HU", name: "Hungary", dialCode: "+36", flag: "🇭🇺" },
  { code: "CZ", name: "Czech Republic", dialCode: "+420", flag: "🇨🇿" },
  { code: "SK", name: "Slovakia", dialCode: "+421", flag: "🇸🇰" },
  { code: "PT", name: "Portugal", dialCode: "+351", flag: "🇵🇹" },
  { code: "GR", name: "Greece", dialCode: "+30", flag: "🇬🇷" },
  { code: "MT", name: "Malta", dialCode: "+356", flag: "🇲🇹" },
  { code: "CY", name: "Cyprus", dialCode: "+357", flag: "🇨🇾" },
  { code: "LU", name: "Luxembourg", dialCode: "+352", flag: "🇱🇺" },
  { code: "MC", name: "Monaco", dialCode: "+377", flag: "🇲🇨" },
  { code: "LI", name: "Liechtenstein", dialCode: "+423", flag: "🇱🇮" },
  { code: "AD", name: "Andorra", dialCode: "+376", flag: "🇦🇩" },
  { code: "SM", name: "San Marino", dialCode: "+378", flag: "🇸🇲" },
  { code: "VA", name: "Vatican City", dialCode: "+379", flag: "🇻🇦" },
  { code: "GI", name: "Gibraltar", dialCode: "+350", flag: "🇬🇮" },
  { code: "FO", name: "Faroe Islands", dialCode: "+298", flag: "🇫🇴" },
  { code: "GL", name: "Greenland", dialCode: "+299", flag: "🇬🇱" },
  { code: "PM", name: "St. Pierre & Miquelon", dialCode: "+508", flag: "🇵🇲" },
  { code: "AW", name: "Aruba", dialCode: "+297", flag: "🇦🇼" },
  { code: "CW", name: "Curaçao", dialCode: "+599", flag: "🇨🇼" },
  { code: "SX", name: "Sint Maarten", dialCode: "+1-721", flag: "🇸🇽" },
  { code: "BQ", name: "Caribbean Netherlands", dialCode: "+599", flag: "🇧🇶" },
  { code: "GP", name: "Guadeloupe", dialCode: "+590", flag: "🇬🇵" },
  { code: "MQ", name: "Martinique", dialCode: "+596", flag: "🇲🇶" },
  { code: "GF", name: "French Guiana", dialCode: "+594", flag: "🇬🇫" },
  { code: "RE", name: "Réunion", dialCode: "+262", flag: "🇷🇪" },
  { code: "YT", name: "Mayotte", dialCode: "+269", flag: "🇾🇹" },
  { code: "SC", name: "Seychelles", dialCode: "+248", flag: "🇸🇨" },
  { code: "MU", name: "Mauritius", dialCode: "+230", flag: "🇲🇺" },
  { code: "MG", name: "Madagascar", dialCode: "+261", flag: "🇲🇬" },
  { code: "KM", name: "Comoros", dialCode: "+269", flag: "🇰🇲" },
  { code: "MZ", name: "Mozambique", dialCode: "+258", flag: "🇲🇿" },
  { code: "MW", name: "Malawi", dialCode: "+265", flag: "🇲🇼" },
  { code: "ZM", name: "Zambia", dialCode: "+260", flag: "🇿🇲" },
  { code: "ZW", name: "Zimbabwe", dialCode: "+263", flag: "🇿🇼" },
  { code: "BW", name: "Botswana", dialCode: "+267", flag: "🇧🇼" },
  { code: "NA", name: "Namibia", dialCode: "+264", flag: "🇳🇦" },
  { code: "AO", name: "Angola", dialCode: "+244", flag: "🇦🇴" },
  { code: "CD", name: "DR Congo", dialCode: "+243", flag: "🇨🇩" },
  { code: "CG", name: "Congo", dialCode: "+242", flag: "🇨🇬" },
  { code: "GA", name: "Gabon", dialCode: "+241", flag: "🇬🇦" },
  { code: "GQ", name: "Equatorial Guinea", dialCode: "+240", flag: "🇬🇶" },
  { code: "ST", name: "São Tomé & Príncipe", dialCode: "+239", flag: "🇸🇹" },
  { code: "CV", name: "Cape Verde", dialCode: "+238", flag: "🇨🇻" },
  { code: "GN", name: "Guinea", dialCode: "+224", flag: "🇬🇳" },
  { code: "GW", name: "Guinea-Bissau", dialCode: "+245", flag: "🇬🇼" },
  { code: "GM", name: "Gambia", dialCode: "+220", flag: "🇬🇲" },
  { code: "SN", name: "Senegal", dialCode: "+221", flag: "🇸🇳" },
  { code: "MR", name: "Mauritania", dialCode: "+222", flag: "🇲🇷" },
  { code: "ML", name: "Mali", dialCode: "+223", flag: "🇲🇱" },
  { code: "SL", name: "Sierra Leone", dialCode: "+232", flag: "🇸🇱" },
  { code: "LR", name: "Liberia", dialCode: "+231", flag: "🇱🇷" },
  { code: "CI", name: "Côte d'Ivoire", dialCode: "+225", flag: "🇨🇮" },
  { code: "GH", name: "Ghana", dialCode: "+233", flag: "🇬🇭" },
  { code: "TG", name: "Togo", dialCode: "+228", flag: "🇹🇬" },
  { code: "BJ", name: "Benin", dialCode: "+229", flag: "🇧🇯" },
  { code: "CO", name: "Colombia", dialCode: "+57", flag: "🇨🇴" },
  { code: "VE", name: "Venezuela", dialCode: "+58", flag: "🇻🇪" },
  { code: "GY", name: "Guyana", dialCode: "+592", flag: "🇬🇾" },
  { code: "SR", name: "Suriname", dialCode: "+597", flag: "🇸🇷" },
  { code: "EC", name: "Ecuador", dialCode: "+593", flag: "🇪🇨" },
  { code: "PE", name: "Peru", dialCode: "+51", flag: "🇵🇪" },
  { code: "BO", name: "Bolivia", dialCode: "+591", flag: "🇧🇴" },
  { code: "CL", name: "Chile", dialCode: "+56", flag: "🇨🇱" },
  { code: "PY", name: "Paraguay", dialCode: "+595", flag: "🇵🇾" },
  { code: "UY", name: "Uruguay", dialCode: "+598", flag: "🇺🇾" },
  { code: "FK", name: "Falkland Islands", dialCode: "+500", flag: "🇫🇰" },
  { code: "GS", name: "South Georgia", dialCode: "+500", flag: "🇬🇸" },
  { code: "JM", name: "Jamaica", dialCode: "+1-876", flag: "🇯🇲" },
  { code: "TT", name: "Trinidad & Tobago", dialCode: "+1-868", flag: "🇹🇹" },
  { code: "BB", name: "Barbados", dialCode: "+1-246", flag: "🇧🇧" },
  { code: "GD", name: "Grenada", dialCode: "+1-473", flag: "🇬🇩" },
  { code: "VC", name: "St. Vincent", dialCode: "+1-784", flag: "🇻🇨" },
  { code: "LC", name: "St. Lucia", dialCode: "+1-758", flag: "🇱🇨" },
  { code: "DM", name: "Dominica", dialCode: "+1-767", flag: "🇩🇲" },
  { code: "AG", name: "Antigua & Barbuda", dialCode: "+1-268", flag: "🇦🇬" },
  { code: "KN", name: "St. Kitts & Nevis", dialCode: "+1-869", flag: "🇰🇳" },
  { code: "BS", name: "Bahamas", dialCode: "+1-242", flag: "🇧🇸" },
  { code: "BZ", name: "Belize", dialCode: "+501", flag: "🇧🇿" },
  { code: "CR", name: "Costa Rica", dialCode: "+506", flag: "🇨🇷" },
  { code: "SV", name: "El Salvador", dialCode: "+503", flag: "🇸🇻" },
  { code: "GT", name: "Guatemala", dialCode: "+502", flag: "🇬🇹" },
  { code: "HN", name: "Honduras", dialCode: "+504", flag: "🇭🇳" },
  { code: "NI", name: "Nicaragua", dialCode: "+505", flag: "🇳🇮" },
  { code: "PA", name: "Panama", dialCode: "+507", flag: "🇵🇦" },
  { code: "CU", name: "Cuba", dialCode: "+53", flag: "🇨🇺" },
  { code: "HT", name: "Haiti", dialCode: "+509", flag: "🇭🇹" },
  { code: "DO", name: "Dominican Republic", dialCode: "+1-809", flag: "🇩🇴" },
  { code: "PR", name: "Puerto Rico", dialCode: "+1-787", flag: "🇵🇷" },
  { code: "VI", name: "U.S. Virgin Islands", dialCode: "+1-340", flag: "🇻🇮" },
  { code: "VG", name: "British Virgin Islands", dialCode: "+1-284", flag: "🇻🇬" },
  { code: "AI", name: "Anguilla", dialCode: "+1-264", flag: "🇦🇮" },
  { code: "MS", name: "Montserrat", dialCode: "+1-664", flag: "🇲🇸" },
  { code: "KY", name: "Cayman Islands", dialCode: "+1-345", flag: "🇰🇾" },
  { code: "TC", name: "Turks & Caicos", dialCode: "+1-649", flag: "🇹🇨" },
  { code: "BM", name: "Bermuda", dialCode: "+1-441", flag: "🇧🇲" },
  { code: "AX", name: "Åland Islands", dialCode: "+358", flag: "🇦🇽" },
  { code: "SJ", name: "Svalbard & Jan Mayen", dialCode: "+47", flag: "🇸🇯" },
  { code: "BL", name: "St. Barthélemy", dialCode: "+590", flag: "🇧🇱" },
  { code: "MF", name: "St. Martin", dialCode: "+590", flag: "🇲🇫" },
  { code: "WF", name: "Wallis & Futuna", dialCode: "+681", flag: "🇼🇫" },
  { code: "NC", name: "New Caledonia", dialCode: "+687", flag: "🇳🇨" },
  { code: "PF", name: "French Polynesia", dialCode: "+689", flag: "🇵🇫" },
  { code: "CK", name: "Cook Islands", dialCode: "+682", flag: "🇨🇰" },
  { code: "NU", name: "Niue", dialCode: "+683", flag: "🇳🇺" },
  { code: "TK", name: "Tokelau", dialCode: "+690", flag: "🇹🇰" },
  { code: "AS", name: "American Samoa", dialCode: "+1-684", flag: "🇦🇸" },
  { code: "WS", name: "Samoa", dialCode: "+685", flag: "🇼🇸" },
  { code: "KI", name: "Kiribati", dialCode: "+686", flag: "🇰🇮" },
  { code: "NR", name: "Nauru", dialCode: "+674", flag: "🇳🇷" },
  { code: "PW", name: "Palau", dialCode: "+680", flag: "🇵🇼" },
  { code: "FM", name: "Micronesia", dialCode: "+691", flag: "🇫🇲" },
  { code: "MH", name: "Marshall Islands", dialCode: "+692", flag: "🇲🇭" },
  { code: "TV", name: "Tuvalu", dialCode: "+688", flag: "🇹🇻" },
  { code: "TO", name: "Tonga", dialCode: "+676", flag: "🇹🇴" },
  { code: "FJ", name: "Fiji", dialCode: "+679", flag: "🇫🇯" },
  { code: "VU", name: "Vanuatu", dialCode: "+678", flag: "🇻🇺" },
  { code: "SB", name: "Solomon Islands", dialCode: "+677", flag: "🇸🇧" },
  { code: "PG", name: "Papua New Guinea", dialCode: "+675", flag: "🇵🇬" },
  { code: "MP", name: "Northern Mariana Islands", dialCode: "+1-670", flag: "🇲🇵" },
  { code: "GU", name: "Guam", dialCode: "+1-671", flag: "🇬🇺" },
];

// Helper function to get full phone number with country code
function getFullPhoneNumber(phoneNumber: string, countryDialCode: string): string {
  const cleanPhone = phoneNumber.replace(/\s+/g, "").trim();
  // If phone already starts with +, assume it has country code
  if (cleanPhone.startsWith("+")) {
    return cleanPhone;
  }
  // If phone starts with the dial code digits (without +), don't add it again
  if (cleanPhone.startsWith(countryDialCode.replace("+", ""))) {
    return `+${cleanPhone}`;
  }
  return `${countryDialCode}${cleanPhone}`;
}

type BulkEntry = BatchUploadEntry;

interface CallOptionsProps {
  useCsv: boolean;
  onUseCsvChange: (useCsv: boolean) => void;
  // Single
  dial: string;
  onDialChange: (dial: string) => void;
  clientName: string;
  onClientNameChange: (clientName: string) => void;
  // Bulk
  bulkEntries?: BulkEntry[];
  onBulkEntriesChange?: (rows: BulkEntry[]) => void;
  loading: boolean;
  selectedNumberId: string | undefined;
  agentId: string | undefined;
  fromNumber: string | undefined;
  onLoadingChange?: (loading: boolean) => void;
  additionalInstructions: string;
  isPrefilled?: boolean;
  onAdditionalInstructionsChange?: (text: string) => void;
  initiatedBy?: string | number;
  dataSource?: 'backend' | 'file' | 'localStorage'; // Track where data came from
  dataType?: 'company' | 'employee'; // Track data type for backend updates
  onDataSourceChange?: (source: 'backend' | 'file' | 'localStorage') => void; // Allow updating data source
}

// Track current batch upload metadata for API submission
let currentBatchUploadMetadata: { fileName: string; uploadedAt: string } | null = null;

export function CallOptions(props: CallOptionsProps) {
  const {
    useCsv, onUseCsvChange,
    dial, onDialChange,
    clientName, onClientNameChange,
    bulkEntries = [], onBulkEntriesChange,
    loading, agentId, fromNumber,
    onLoadingChange, additionalInstructions, isPrefilled = false,
    onAdditionalInstructionsChange,
    initiatedBy,
    dataSource = 'localStorage',
    dataType = 'company',
    onDataSourceChange,
  } = props;
  const { push } = useToast();
  const router = useRouter();
  // LAD Architecture Compliance: Use SDK hook instead of direct API calls
  const makeCallMutation = useMakeCall();
  const triggerBatchCallMutation = useTriggerBatchCall();
  const updateSummaryMutation = useUpdateSummary();
  const [expanded, setExpanded] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0]); // Default to India (+91)
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const hasBulk = (bulkEntries?.length || 0) > 0;
  const visibleCount = expanded ? bulkEntries.length : Math.min(5, bulkEntries.length);
  // --- new state for radio selection and modal ---
  const [selectedSummaryIndex, setSelectedSummaryIndex] = useState<number | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorRowIndex, setEditorRowIndex] = useState<number | null>(null);
  const [editorValues, setEditorValues] = useState<{
    to_number: string;
    name?: string;
    summary?: string; // UI convenience and added_context
    requested_id?: string;
    sales_summary?: string; // for companies
    company_sales_summary?: string; // for employees
  }>({ to_number: "", name: "", summary: "" });
  const [savingSummary, setSavingSummary] = useState(false);
  // Helper function to filter out placeholder/template text from names
  const cleanLeadName = (name: string | undefined, phone: string): string => {
    if (!name || !name.trim()) return phone;
    const cleaned = name.trim();
    // Filter out common placeholder text patterns
    const placeholders = [
      'optional name',
      'optional',
      '(optional',
      'optional - phone used if empty',
      'lead name (optional)',
      'enter name',
      'name here',
    ];
    const lowerName = cleaned.toLowerCase();
    if (placeholders.some(p => lowerName === p || lowerName.includes(`(${p}`) || lowerName.includes(`${p})`))) {
      return phone; // Use phone instead of placeholder
    }
    return cleaned;
  };
  const handleSubmit = async () => {
    onLoadingChange?.(true);
    try {
      if (!agentId) throw new Error("Please select a voice agent");
      if (!fromNumber) throw new Error("Please select a valid from number");
      // Determine effective initiator
      const effectiveInitiator =
        initiatedBy !== undefined
          ? initiatedBy
          : (agentId && !Number.isNaN(Number(agentId)) ? Number(agentId) : undefined);
      if (useCsv) {
        if (!hasBulk) throw new Error("No numbers in the bulk list");
        // Get original file from storage if this is a file-based batch upload
        let originalFileBase64: string | undefined;
        let fileMetadata: { file_name?: string; uploaded_at?: string } = {};
        if (dataSource === 'file' && currentBatchUploadMetadata) {
          const storedFile = getOriginalFile(currentBatchUploadMetadata.uploadedAt);
          if (storedFile) {
            originalFileBase64 = storedFile.base64;
            fileMetadata = {
              file_name: storedFile.metadata.file_name,
              uploaded_at: storedFile.metadata.uploaded_at,
            };
            logger.debug('Retrieved original file for batch call', {
              fileName: storedFile.metadata.file_name,
            });
          }
        }
        // updated bulk payload - include per-row summary and top-level added_context
        const payload = {
          voice_id: "default", // Required by V2 API
          agent_id: agentId,
          from_number: fromNumber,
          // optional global context (Additional Instructions from the UI)
          added_context: (additionalInstructions && String(additionalInstructions).trim()) || undefined,
          entries: bulkEntries
            .filter((r) => !!r.to_number)
            .map((r) => ({
              to_number: r.to_number,
              lead_name: cleanLeadName(r.name || r.lead_name, r.to_number), // Filter placeholders
              // row-level context (uses row.summary if present)
              added_context: r.summary && String(r.summary).trim() ? r.summary.trim() : r.added_context || undefined,
              lead_id: r.lead_id ? String(r.lead_id) : undefined, // V2: Ensure UUID string
              knowledge_base_store_ids: r.knowledge_base_store_ids || undefined, // V2: New field
            })),
          ...(effectiveInitiator !== undefined ? { initiated_by: String(effectiveInitiator) } : {}),
          // Include original file for batch upload persistence
          ...(originalFileBase64 ? { original_file: originalFileBase64 } : {}),
          ...fileMetadata,
        };
        logger.debug('Sending bulk payload', { entriesCount: payload.entries.length });
        const res = await triggerBatchCallMutation.mutateAsync(payload);
        const anyRes: any = res;
        const jobId: string | undefined =
          anyRes?.result?.job_id ||
          anyRes?.batch?.job_id ||
          anyRes?.job_id;
        push({
          title: "Bulk Calls Started",
          description: `${payload.entries.length} numbers queued.`,
        });
        if (jobId) {
          router.push(
            `/call-logs?jobId=${encodeURIComponent(jobId)}&mode=current-batch`
          );
        } else {
          // Fallback: go to generic call logs if no job_id was returned
          router.push("/call-logs");
        }
        return;
      }
      if (!dial) throw new Error("Please enter a phone number to call");
      const fullPhoneNumber = getFullPhoneNumber(dial, selectedCountry.dialCode);
      // LAD Architecture Compliance: Use SDK hook instead of direct API call
      if (!agentId) throw new Error("Please select a voice agent");
      logger.debug("Initiating single call via SDK", {
        hasAgent: !!agentId,
        hasPhone: !!fullPhoneNumber,
        hasContext: !!additionalInstructions
      });
      // Use SDK hook which handles VAPI disable logic and error handling
      await makeCallMutation.mutateAsync({
        voiceAgentId: agentId,
        phoneNumber: fullPhoneNumber,
        context: additionalInstructions || "Call initiated from dashboard",
        fromNumber: fromNumber // Pass from number from call configuration
      });
      push({ title: "Success", description: "Call initiated successfully!" });
      onDialChange("");
      onClientNameChange("");
      router.push("/call-logs");
    } catch (e: any) {
      logger.error("Failed to initiate call", { error: e?.message || 'Unknown error' });
      push({ variant: "error", title: "Error", description: e?.message || "Failed to initiate call. Please try again." });
    } finally {
      onLoadingChange?.(false);
    }
  };
  const openEditorFor = (idx: number) => {
    const row = bulkEntries[idx];
    setEditorRowIndex(idx);
    const currentText = row.summary || "";
    setEditorValues({
      to_number: row.to_number.replace(/\s+/g, ""),
      name: row.name || row.company_name,
      summary: currentText,
      // initialize specific field depending on type for editing
      sales_summary: dataType === 'company' ? currentText : undefined,
      company_sales_summary: dataType === 'employee' ? currentText : undefined,
      requested_id: (row as any).requested_id,
    });
    setEditorOpen(true);
  };
  const saveEditor = async () => {
    if (editorRowIndex === null) return;
    setSavingSummary(true);
    try {
      // 1. Optimistically update UI
      const copy = [...bulkEntries];
      copy[editorRowIndex] = { ...copy[editorRowIndex], ...editorValues };
      onBulkEntriesChange?.(copy);
      // 2. Persist to localStorage for file-uploaded or localStorage-sourced data
      if (dataSource === 'file' || dataSource === 'localStorage') {
        try {
          localStorage.setItem('bulk_call_targets', JSON.stringify({ data: copy }));
          logger.debug('Updated localStorage with edited entry');
        } catch (lsError) {
          logger.warn('Failed to update localStorage', { error: lsError });
        }
      }
      // 2b. Update JSON snapshot when rows are edited (original file stays unchanged)
      if (dataSource === 'file') {
        updateJsonSnapshot(copy);
        logger.debug('Updated JSON snapshot after row edit', { rows: copy.length });
      }
      // 3. Persist to database for backend-sourced data
      if (dataSource === 'backend') {
        try {
          const normalizedPhone = editorValues.to_number.replace(/\s+/g, "");
          const idFromRequested = editorValues.requested_id && String(editorValues.requested_id).trim();
          const identifier = idFromRequested
            ? (dataType === 'employee'
              ? { employee_data_id: idFromRequested }
              : { company_data_id: idFromRequested })
            : null;
          if (!identifier) {
            push({
              variant: 'warning',
              title: 'Identifier required',
              description: 'Backend data requires an ID to update summary. Please ensure this row has an employee/company id.'
            });
            return; // do not attempt phone-only update for backend data
          }
          const activeText = dataType === 'employee' ? (editorValues.company_sales_summary || editorValues.summary || '') : (editorValues.sales_summary || editorValues.summary || '');
          // Keep generic summary for backwards-compat while also sending the specific field
          const payload = {
            ...identifier,
            name: editorValues.name,
            summary: activeText,
            ...(dataType === 'employee' ? { company_sales_summary: activeText } : { sales_summary: activeText }),
            type: dataType,
          } as const;
          await updateSummaryMutation.mutateAsync(payload as any);
          logger.debug('Updated database summary', { identifier: identifier || normalizedPhone });
        } catch (apiError: any) {
          logger.error('Failed to update database', { error: apiError });
          // Non-blocking: UI is already updated, just log the error
          push({
            variant: 'warning',
            title: 'Partial save',
            description: 'UI updated but database sync failed. Changes may not persist on reload.'
          });
        }
      }
      // If this edited row is currently selected for Additional Instructions, sync the edited summary
      if (selectedSummaryIndex !== null && selectedSummaryIndex === editorRowIndex) {
        const activeText = dataType === 'employee' ? (editorValues.company_sales_summary || editorValues.summary || '') : (editorValues.sales_summary || editorValues.summary || '');
        onAdditionalInstructionsChange?.(activeText);
      }
      push({ title: 'Saved', description: 'Summary saved successfully' });
      setEditorOpen(false);
    } catch (e: any) {
      logger.error('Failed saving summary', { error: e });
      push({ variant: 'error', title: 'Save failed', description: e?.message || 'Could not save summary' });
    } finally {
      setSavingSummary(false);
    }
  };
  // When radio selection changes, update Additional Instructions with the selected summary
  const onRadioChange = (idx: number | null) => {
    setSelectedSummaryIndex(idx);
    if (idx === null) {
      onAdditionalInstructionsChange?.('');
      return;
    }
    const s = bulkEntries[idx]?.summary || '';
    onAdditionalInstructionsChange?.(s);
  };
  const removeRow = (idx: number) => {
    const copy = bulkEntries.filter((_, i) => i !== idx);
    onBulkEntriesChange?.(copy);
    // Update JSON snapshot when rows are deleted (original file stays unchanged)
    if (dataSource === 'file') {
      updateJsonSnapshot(copy);
      logger.debug('Updated JSON snapshot after row deletion', { remainingRows: copy.length });
    }
    // adjust selectedSummaryIndex reliably
    if (selectedSummaryIndex === idx) {
      onRadioChange(null);
    } else if (selectedSummaryIndex !== null && selectedSummaryIndex > idx) {
      // shift selection down by 1
      setSelectedSummaryIndex((prev) => (prev !== null ? prev - 1 : null));
    }
  };
  // ----------------------------
  // Template download (xlsx) using ExcelJS
  // ----------------------------
  // const downloadTemplate = async () => {
  //   const wb = new ExcelJS.Workbook();
  //   const ws = wb.addWorksheet("Template");
  //   ws.columns = [
  //     { header: "Phone", key: "phone", width: 20 },
  //     { header: "Name", key: "name", width: 20 },
  //     { header: "Summary", key: "summary", width: 40 },
  //   ];
  //   ws.addRow({
  //     phone: "+1XXXXXXXXXX",
  //     name: "(optional - phone used if empty)",
  //     summary: "(optional context for the call)",
  //   });
  //   ws.eachRow((row) => {
  //     row.eachCell((cell) => {
  //       cell.numFmt = "@"; // TEXT format
  //     });
  //   });
  //   const buffer = await wb.xlsx.writeBuffer();
  //   const blob = new Blob([buffer], {
  //     type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  //   });
  //   const url = URL.createObjectURL(blob);
  //   const a = document.createElement("a");
  //   a.href = url;
  //   a.download = "bulk_call_template.xlsx";
  //   a.click();
  //   URL.revokeObjectURL(url);
  // };
  const downloadTemplate = async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Template");
    // Force Text format for all template columns (prevents Excel from treating values as General/Number)
    ws.columns = [
      { header: "Phone", key: "phone", width: 20, style: { numFmt: "@" } },
      { header: "Name", key: "name", width: 20, style: { numFmt: "@" } },
      { header: "Summary", key: "summary", width: 40, style: { numFmt: "@" } },
    ];
    ws.addRow({
      phone: "+1XXXXXXXXXX",
      name: "Optional Name",
      summary: "Optional summary for call context",
    });
    // Also explicitly apply to existing cells (header + sample row) for maximum compatibility.
    ws.getRow(1).eachCell((cell) => {
      cell.numFmt = "@";
    });
    ws.getRow(2).eachCell((cell) => {
      cell.numFmt = "@";
    });
    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "bulk_call_template.xlsx";
    a.click();
    URL.revokeObjectURL(url);
  };
  const [isRephrasing, setIsRephrasing] = useState(false);
  // ----------------------------
  // Parse uploaded file and update bulkEntries
  // ----------------------------
  const handleFile = async (file: File | null) => {
    if (!file) return;
    const filename = file.name.toLowerCase();
    try {
      // CSV parsing
      if (filename.endsWith(".csv")) {
        const text = await file.text();
        const rows = text.split(/\r\n|\n/).filter(Boolean);
        const parsed: BulkEntry[] = [];
        if (rows.length === 0) {
          push({ variant: "error", title: "Empty file", description: "Uploaded file contained no rows." });
          return;
        }
        // detect header row
        let startIdx = 0;
        const firstCols = rows[0].split(",").map((c) => c.trim().toLowerCase());
        const hasHeader = firstCols.some((c) => /phone|number|to_number|name|summary/.test(c));
        let phoneIdx = 0, nameIdx = 1, summaryIdx = 2;
        let employeeIdIdx: number | null = null;
        let companyIdIdx: number | null = null;
        let requestedIdIdx: number | null = null;
        if (hasHeader) {
          startIdx = 1;
          for (let i = 0; i < firstCols.length; i++) {
            const h = firstCols[i];
            if (/phone|number|to_number/.test(h)) phoneIdx = i;
            if (/^name$|lead|client/.test(h)) nameIdx = i;
            if (/summary|note|notes|context/.test(h)) summaryIdx = i;
            if (/employee_data_id/.test(h)) employeeIdIdx = i;
            if (/company_data_id/.test(h)) companyIdIdx = i;
            if (/requested_id/.test(h)) requestedIdIdx = i;
          }
        }
        for (let i = startIdx; i < rows.length; i++) {
          // naive CSV split (doesn't handle quoted commas); works for simple CSVs
          const cols = rows[i].split(",").map((c) => c.trim());
          const phone = (cols[phoneIdx] || "").replace(/\s+/g, ""); // Remove all spaces from phone number
          const name = cols[nameIdx] || "";
          const summary = cols[summaryIdx] || "";
          let requested_id: string | undefined = undefined;
          if (employeeIdIdx !== null && cols[employeeIdIdx]) requested_id = String(cols[employeeIdIdx]).trim();
          else if (companyIdIdx !== null && cols[companyIdIdx]) requested_id = String(cols[companyIdIdx]).trim();
          else if (requestedIdIdx !== null && cols[requestedIdIdx]) requested_id = String(cols[requestedIdIdx]).trim();
          if (phone) parsed.push({ to_number: phone, name: name || undefined, summary: summary || undefined, requested_id });
        }
        onBulkEntriesChange?.(parsed);
        onUseCsvChange?.(true as any);
        onDataSourceChange?.('file'); // Mark as file-sourced
        // Persist original file and JSON snapshot for batch upload
        try {
          const stored = await saveBatchUpload(file, parsed);
          currentBatchUploadMetadata = {
            fileName: stored.metadata.file_name,
            uploadedAt: stored.metadata.uploaded_at,
          };
          logger.debug('Batch upload saved with original file', {
            fileName: stored.metadata.file_name,
            rows: stored.metadata.rows,
          });
        } catch (storageError) {
          logger.warn('Failed to save batch upload storage', { error: storageError });
        }
        // Persist to legacy localStorage for compatibility
        try {
          localStorage.setItem('bulk_call_targets', JSON.stringify({ data: parsed }));
          logger.debug('CSV data saved to localStorage');
        } catch (e) {
          logger.warn('Failed to save CSV to localStorage', { error: e });
        }
        push({ title: "File parsed", description: `${parsed.length} rows loaded from CSV.` });
        return;
      }
      // Excel parsing (.xlsx) using ExcelJS
      if (filename.endsWith(".xls")) {
        push({
          variant: "error",
          title: "Unsupported format",
          description: "Legacy .xls is not supported. Please save/export as .xlsx and try again.",
        });
        return;
      }
      // Only .xlsx files should reach this point; reject other unsupported types explicitly
      if (!filename.endsWith(".xlsx")) {
        push({
          variant: "error",
          title: "Unsupported file type",
          description: "Only .csv and .xlsx files are supported. Please upload a .csv or .xlsx file.",
        });
        return;
      }
      const arrayBuffer = await file.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(arrayBuffer);
      const worksheet = workbook.worksheets[0];
      if (!worksheet) {
        push({ variant: "error", title: "Invalid file", description: "No worksheet found" });
        return;
      }
      // Read headers
      const headers: string[] = [];
      worksheet.getRow(1).eachCell((cell, col) => {
        headers[col - 1] = String((cell.value as any) || "").toLowerCase().trim();
      });
      // Detect columns
      const phoneIdx = headers.findIndex((h) => /phone|number|to_number/.test(h));
      const nameIdx = headers.findIndex((h) => /name|lead|client/.test(h));
      const summaryIdx = headers.findIndex((h) => /summary|note|context/.test(h));
      const requestedIdx = headers.findIndex((h) => /requested_id|employee_data_id|company_data_id/.test(h));
      if (phoneIdx === -1) {
        push({
          variant: "error",
          title: "Invalid Excel",
          description: "Phone / Number column not found",
        });
        return;
      }
      const parsed: BulkEntry[] = [];
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;
        const values = row.values as any[];
        const phone = String(values[phoneIdx + 1] || "")
          .replace(/\s+/g, "")
          .trim();
        if (!phone) return;
        const extra: Record<string, any> = {};
        headers.forEach((h, i) => {
          if (![phoneIdx, nameIdx, summaryIdx, requestedIdx].includes(i)) {
            extra[h] = values[i + 1];
          }
        });
        parsed.push({
          to_number: phone,
          name: nameIdx >= 0 ? String(values[nameIdx + 1] || "").trim() : undefined,
          summary: summaryIdx >= 0 ? String(values[summaryIdx + 1] || "").trim() : undefined,
          requested_id: requestedIdx >= 0 ? String(values[requestedIdx + 1] || "").trim() : undefined,
          _extra: Object.keys(extra).length ? extra : undefined,
        });
      });
      onBulkEntriesChange?.(parsed);
      onUseCsvChange?.(true as any);
      onDataSourceChange?.("file");
      // Persist original Excel and JSON snapshot for batch upload
      try {
        const stored = await saveBatchUpload(file, parsed);
        currentBatchUploadMetadata = {
          fileName: stored.metadata.file_name,
          uploadedAt: stored.metadata.uploaded_at,
        };
        logger.debug('Batch upload saved with original file', {
          fileName: stored.metadata.file_name,
          rows: stored.metadata.rows,
        });
      } catch (storageError) {
        logger.warn('Failed to save batch upload storage', { error: storageError });
      }
      // Also persist to legacy localStorage for compatibility
      try {
        localStorage.setItem("bulk_call_targets", JSON.stringify({ data: parsed }));
      } catch { }
      push({
        title: "Excel imported",
        description: `${parsed.length} rows loaded`,
      });
    } catch (err: any) {
      logger.error('Failed to parse file', { error: err });
      push({ variant: "error", title: "Parse Error", description: "Unable to process uploaded file." });
    }
  };
  const BulkTable = () => {
    // Collect all extra column names dynamically
    const extraColumns = (() => {
      const set = new Set<string>();
      bulkEntries.forEach((row) => {
        Object.keys(row._extra || {}).forEach((k) => {
          const key = String(k || "").trim();
          if (key) set.add(key);
        });
      });
      return Array.from(set);
    })();
    return (
      <div className="w-full mx-0">
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-gray-700 dark:text-white block">Bulk List</label>
          <div className="text-xs text-gray-500 dark:text-[#7a8ba3]">{bulkEntries.length} numbers</div>
        </div>
        {/* New UI row: Download template + Choose file */}
        <div className="flex gap-3 mb-3">
          <Button variant="outline" onClick={downloadTemplate} className="flex items-center gap-2">
            <Download className="w-4 h-4" /> Download Template
          </Button>
          {/* File chooser */}
          <label className="flex-1">
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                handleFile(f);
                e.currentTarget.value = "";
              }}
              className="hidden"
              id="bulk-file-input"
            />
            <div className="w-full h-10 flex items-center justify-center rounded-[10px] border border-dashed dark:border-[#262831] cursor-pointer text-sm text-gray-600 dark:text-[#7a8ba3]">
              Choose file (xlsx / csv)
            </div>
          </label>
        </div>
        <div className="max-h-64 overflow-auto border dark:border-[#262831] rounded-[10px] relative z-0">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 dark:bg-[#1a2a43] sticky top-0 z-10">
              <tr>
                <th className="p-2"></th>
                <th className="text-left p-2 font-semibold">Phone</th>
                <th className="text-left p-2 font-semibold">Name</th>
                {/* Extra Excel columns */}
                {extraColumns.map((col) => (
                  <th key={col} className="text-left p-2 font-semibold capitalize">
                    {col.replace(/_/g, " ")}
                  </th>
                ))}
                <th className="p-2"></th>
              </tr>
            </thead>
            <tbody>
              {bulkEntries.slice(0, visibleCount).map((row, idx) => (
                <tr key={idx} className="border-t">
                  {/* --- radio + edit before phone --- */}
                  <td className="p-2 align-middle text-center">
                    <div className="flex items-center justify-center gap-2">
                      {/* <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="selectedSummary"
                        checked={selectedSummaryIndex === idx}
                        onChange={() => onRadioChange(idx)}
                        className="w-4 h-4"
                        aria-label={`Select summary from row ${idx}`}
                      />
                    </label> */}
                      <button
                        type="button"
                        aria-label={`View summary for row ${idx}`}
                        onClick={() => selectedSummaryIndex === idx ? onRadioChange(null) : onRadioChange(idx)}
                        className={`inline-flex items-center justify-center h-8 w-8 rounded border hover:bg-gray-50
                        ${selectedSummaryIndex === idx ? "bg-gray-100 border-gray-400" : ""}`}
                      >
                        {selectedSummaryIndex === idx ? (
                          <Eye className="w-4 h-4" />
                        ) : (
                          <EyeOff className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        type="button"
                        aria-label={`Edit summary for row ${idx}`}
                        onClick={() => openEditorFor(idx)}
                        className="inline-flex items-center justify-center h-8 w-8 rounded border hover:bg-gray-50"
                      >
                        <SquarePen className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                  <td className="p-2">
                    <Input
                      disabled
                      value={row.to_number}
                      onChange={(e) => {
                        const copy = [...bulkEntries];
                        // Normalize phone number - remove spaces when editing
                        copy[idx] = { ...copy[idx], to_number: e.target.value.replace(/\s+/g, "") };
                        onBulkEntriesChange?.(copy);
                      }}
                      placeholder="+1..."
                      className="bg-gray-100 cursor-not-allowed"
                    />
                  </td>
                  <td className="p-2">
                    <Input
                      disabled
                      value={row.name || (row as any).company_name || ""}
                      onChange={(e) => {
                        const copy = [...bulkEntries];
                        copy[idx] = { ...copy[idx], name: e.target.value };
                        onBulkEntriesChange?.(copy);
                      }}
                      placeholder="Lead name (optional)"
                    />
                  </td>
                  {/* Extra Excel data */}
                  {extraColumns.map((col) => (
                    <td key={col} className="p-2 text-gray-600 dark:text-[#7a8ba3] text-sm">
                      {String((row._extra as any)?.[col] ?? "")}
                    </td>
                  ))}
                  <td className="p-2 text-right">
                    <Button
                      variant="outline"
                      onClick={() => {
                        removeRow(idx);
                      }}
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
              {bulkEntries.length === 0 && (
                <tr>
                  <td colSpan={4 + extraColumns.length} className="p-4 text-center text-gray-500 dark:text-[#7a8ba3]">
                    No rows
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {bulkEntries.length > 5 && (
          <div className="mt-3">
            <Button
              variant="outline"
              className="w-full rounded-[10px]"
              onClick={() => setExpanded((v) => !v)}
            >
              {expanded ? "View less" : `View more (${bulkEntries.length - 5} more)`}
            </Button>
          </div>
        )}
        <p className={'text-xs text-gray-500 dark:text-[#7a8ba3] mt-2'}>These rows came from your &ldquo;Resolve Phones&rdquo; selection.</p>
      </div>
    );
  };
  return (
    <Card className="rounded-2xl transition-all p-2 bg-white dark:bg-[#000724] border border-gray-100 dark:border-[#262831]">
      <CardHeader className="backdrop-blur-xl bg-white/80 dark:bg-[#000724] rounded-3xl px-5 py-1 border border-white/30 dark:border-[#000724] mb-1 -mx-2 mt-2">
        <CardTitle className="text-lg font-bold text-gray-900 dark:text-white">
          <PhoneCall className="w-5 h-5 inline mr-2" /> Call Options
        </CardTitle>
        <CardDescription className="text-sm text-gray-600 dark:text-[#7a8ba3]">Single or bulk mode</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex gap-3">
          <Button
            variant={!useCsv ? "default" : "outline"}
            className="flex-1 h-12 rounded-[10px]"
            onClick={() => onUseCsvChange(false)}
          >
            Single Call
          </Button>
          <Button
            variant={useCsv ? "default" : "outline"}
            className="flex-1 h-12 rounded-[10px]"
            onClick={() => onUseCsvChange(true)}
          >
            Bulk List
          </Button>
        </div>
        {!useCsv ? (
          // — Single Call UI with Country Selector —
          <div className="space-y-3">
            {/* Phone Number with Country Dropdown */}
            <div className="relative">
              <div className="flex rounded-[10px] border border-gray-200 dark:border-[#262831] overflow-hidden focus-within:ring-2 focus-within:ring-gray-200 focus-within:border-gray-200 h-12">
                {/* Country Dropdown Button */}
                <button
                  type="button"
                  onClick={() => setShowCountryDropdown(!showCountryDropdown)}
                  className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-[#1a2a43] border-r border-gray-200 dark:border-[#262831] hover:bg-gray-100 dark:hover:bg-[#253456] transition-colors min-w-[80px]"
                >
                  <Image
                    src={`https://flagcdn.com/w40/${selectedCountry.code.toLowerCase()}.png`}
                    alt={selectedCountry.name}
                    width={24}
                    height={16}
                    // className="rounded-sm"
                    unoptimized
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-white">{selectedCountry.dialCode}</span>
                  <ChevronDown className="w-4 h-4 text-gray-500 dark:text-[#7a8ba3]" />
                </button>
                {/* Phone Input */}
                <input
                  type="tel"
                  value={dial}
                  onChange={(e) => onDialChange(e.target.value)}
                  placeholder="Enter phone number"
                  className="flex-1 px-3 py-2 text-sm outline-none bg-white dark:bg-[#000724] text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-[#7a8ba3]"
                />
              </div>

              {/* Country Dropdown Menu */}
              {showCountryDropdown && (
                <div className="absolute top-full left-0 mt-1 w-[280px] max-h-64 overflow-y-auto bg-white dark:bg-[#1a2a43] border border-gray-200 dark:border-[#262831] rounded-[10px] shadow-lg z-50">
                  <div className="sticky top-0 bg-white dark:bg-[#1a2a43] border-b border-gray-100 dark:border-[#262831] p-2">
                    <input
                      type="text"
                      placeholder="Search country..."
                      className="w-full px-3 py-1.5 text-sm border border-gray-200 dark:border-[#262831] rounded-lg outline-none focus:border-gray-200 bg-white dark:bg-[#253456] text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-[#7a8ba3]"
                      onChange={(e) => {
                        const searchTerm = e.target.value.toLowerCase();
                        const filtered = COUNTRIES.filter(
                          (c) =>
                            c.name.toLowerCase().includes(searchTerm) ||
                            c.dialCode.includes(searchTerm) ||
                            c.code.toLowerCase().includes(searchTerm)
                        );
                        // Update the dropdown list dynamically
                        const dropdownList = document.getElementById('country-dropdown-list');
                        if (dropdownList) {
                          dropdownList.innerHTML = '';
                          filtered.forEach((country) => {
                            const item = document.createElement('button');
                            item.className = 'w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 transition-colors text-left';
                            item.innerHTML = `<img src="https://flagcdn.com/w40/${country.code.toLowerCase()}.png" alt="${country.name}" width="24" height="16"  /><span class="flex-1 text-sm text-gray-700">${country.name}</span><span class="text-sm font-medium text-gray-500">${country.dialCode}</span>`;
                            item.onclick = () => {
                              setSelectedCountry(country);
                              setShowCountryDropdown(false);
                            };
                            dropdownList.appendChild(item);
                          });
                        }
                      }}
                    />
                  </div>
                  <div id="country-dropdown-list" className="py-1">
                    {COUNTRIES.map((country) => (
                      <button
                        key={country.code}
                        type="button"
                        onClick={() => {
                          setSelectedCountry(country);
                          setShowCountryDropdown(false);
                        }}
                        className={`w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 dark:hover:bg-[#253456] transition-colors text-left ${selectedCountry.code === country.code ? 'bg-gray-50 dark:bg-[#253456]' : ''
                          }`}
                      >
                        <Image
                          src={`https://flagcdn.com/w40/${country.code.toLowerCase()}.png`}
                          alt={country.name}
                          width={20}
                          height={20}
                          className=""
                          unoptimized
                        />
                        <span className="flex-1 text-sm text-gray-700 dark:text-white">{country.name}</span>
                        <span className="text-sm font-medium text-gray-500 dark:text-[#7a8ba3]">{country.dialCode}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <Input
              value={clientName}
              onChange={(e) => onClientNameChange(e.target.value)}
              placeholder="Lead name (optional)"
              className="h-12 rounded-[10px]"
            />
          </div>
        ) : (
          <BulkTable />
        )}
        <Button
          disabled={loading || (!useCsv && !dial) || (useCsv && (!bulkEntries || bulkEntries.length === 0))}
          onClick={handleSubmit}
          className="w-full h-14 rounded-[10px] font-semibold shadow-sm mx-0"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Processing...
            </>
          ) : useCsv ? (
            <>
              <FileText className="w-5 h-5 mr-2" /> Start Bulk Calls
            </>
          ) : (
            <>
              <Phone className="w-5 h-5 mr-2" /> Initiate Call
            </>
          )}
        </Button>
      </CardContent>
      {/* Summary editor dialog */}
      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <SquarePen className="w-4 h-4" /> Edit Profile
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 px-8 py-6">
            <label className="text-xs text-gray-600 dark:text-[#7a8ba3]">Phone</label>
            <Input value={editorValues.to_number} onChange={(e) => setEditorValues((v) => ({ ...v, to_number: e.target.value.replace(/\s+/g, "") }))} />
            <label className="text-xs text-gray-600 dark:text-[#7a8ba3]">Name</label>
            <Input value={editorValues.name || ""} onChange={(e) => setEditorValues((v) => ({ ...v, name: e.target.value }))} />
            <label className="text-xs text-gray-600 dark:text-[#7a8ba3]">Company</label>
            <Input
              value={editorValues.requested_id || ""}
              onChange={(e) => setEditorValues((v) => ({ ...v, requested_id: e.target.value }))}
              placeholder={dataType === 'employee' ? 'e.g. 57da3722a6da985435dbab61' : 'e.g. company-id'}
            />
            <div className="relative">
              <textarea
                value={dataType === 'employee' ? (editorValues.company_sales_summary || "") : (editorValues.sales_summary || "")}
                onChange={(e) => setEditorValues((v) => (
                  dataType === 'employee'
                    ? { ...v, company_sales_summary: e.target.value, summary: e.target.value }
                    : { ...v, sales_summary: e.target.value, summary: e.target.value }
                ))}
                className="w-full h-24 p-3 pr-12 text-sm border border-gray-200 dark:border-[#262831] rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-[#1a2a43] text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-[#7a8ba3]"
                placeholder="Enter summary to save..."
              />
              <button
                type="button"
                title="Maya-Rephrase"
                onClick={async () => {
                  const activeText = (dataType === 'employee'
                    ? (editorValues.company_sales_summary || editorValues.summary || '')
                    : (editorValues.sales_summary || editorValues.summary || '')).trim();
                  const text = activeText;
                  if (!text) return;
                  try {
                    setIsRephrasing(true);
                    const res = await fetch(
                      `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/gemini/generate-phrase`,
                      {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ context: text }),
                      }
                    );
                    const data = await res.json();
                    if (data.success) {
                      const generated = data.generatedText as string;
                      setEditorValues((v) => (
                        dataType === 'employee'
                          ? { ...v, company_sales_summary: generated, summary: generated }
                          : { ...v, sales_summary: generated, summary: generated }
                      ));
                    } else {
                      logger.error('Gemini API error', { error: data.error });
                    }
                  } catch (err) {
                    logger.error('Rephrase operation failed', { error: err });
                  } finally {
                    setIsRephrasing(false);
                  }
                }}
                className="absolute right-2 top-2 p-2 text-gray-500 dark:text-[#7a8ba3] hover:text-gray-700 dark:hover:text-white"
              >
                {isRephrasing ? (
                  <span className="animate-spin text-gray-600">⏳</span>
                ) : (
                  <>✨</>
                )}
              </button>
            </div>
          </div>
          <DialogActions>
            <Button 
              onClick={saveEditor} 
              disabled={savingSummary} 
              className="rounded-xl px-10 h-11 font-bold bg-[#0B1957] hover:bg-[#0B1957]/90 text-white shadow-sm transition-all"
            >
              {savingSummary ? 'Saving...' : 'Save & Send'}
            </Button>
          </DialogActions>
        </DialogContent>
      </Dialog>
    </Card>
  );
}