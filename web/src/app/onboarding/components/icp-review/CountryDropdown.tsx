'use client';
// R8 Phase 5 - country picker built on the same chip pattern. Provides quick
// adds for the most common MENA + global targets; falls through to free
// text so anything else works too.

import * as React from 'react';
import IndustryChipInput from './IndustryChipInput';

const SUGGESTED_COUNTRIES = [
  'United Arab Emirates',
  'Saudi Arabia',
  'Egypt',
  'Qatar',
  'Bahrain',
  'Kuwait',
  'Oman',
  'United Kingdom',
  'United States',
  'India',
  'Singapore',
];

interface CountryDropdownProps {
  value: string[];
  onChange: (next: string[]) => void;
}

export default function CountryDropdown({ value, onChange }: CountryDropdownProps) {
  return (
    <IndustryChipInput
      value={value}
      onChange={onChange}
      placeholder="Add countries…"
      suggestions={SUGGESTED_COUNTRIES}
      tone="#0ea5e9"
    />
  );
}
