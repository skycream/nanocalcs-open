<!--
npm name candidates (checked with `npm view`, all unclaimed on 2026-10-16):
  1. national-id-validator   <- used
  2. nationid-check
  3. national-id-check
-->

# national-id-validator

Check-digit validation and text detection for national ID numbers from 18 countries, plus IBAN. Zero dependencies, ESM + CJS, TypeScript types included.

Live calculator: https://nanocalcs.com/en/pii-redactor/

| Country | Number | How it is checked |
|---|---|---|
| KR | RRN (resident registration) | Birth date from the gender digit; checksum also required for separator-less text (numbers issued after Oct 2020 have none) |
| JP | My Number | Weighted mod 11 |
| CN | Resident ID (18) | Birth date + ISO 7064 MOD 11-2 |
| IN | Aadhaar, PAN | Verhoeff; PAN holder-type letter pattern |
| TR | T.C. Kimlik | Two check digits |
| BR | CPF, CNPJ | Two mod 11 check digits |
| ID | NIK | Province code, birth date (women: day + 40), serial |
| RU | SNILS, INN | Weighted checksums (INN: 10 and 12 digit forms) |
| ES | DNI, NIE | Number mod 23 letter |
| FR | NIR | Key = 97 - (first 13 digits mod 97), Corsica 2A/2B |
| PK | CNIC | Region digit 1-7 (no check digit exists) |
| MY | MyKad | Birth date + place-of-birth code |
| SA | National ID, Iqama | Luhn |
| VN | CCCD | Province code (no check digit exists) |
| US | SSN | Area/group/serial exclusion rules |
| EU etc. | IBAN | Length per country + mod 97 |

## Install

```sh
npm install national-id-validator
```

## Usage

```ts
import { validate, detect, cpfValid, myNumberValid } from 'national-id-validator';

validate('CPF', '529.982.247-25');                 // true
validate('IBAN', 'GB82 WEST 1234 5698 7654 32');   // true
validate('AADHAAR', '2345 6789 0124');             // true
myNumberValid('123456789018');                     // true (digits only)

detect('Mail 529.982.247-25 or GB82WEST12345698765432');
// [
//   { type: 'CPF',  start: 5,  end: 19, value: '529.982.247-25' },
//   { type: 'IBAN', start: 23, end: 45, value: 'GB82WEST12345698765432' }
// ]
```

`detect(text, types?)` takes an optional `Set` of types (see `PII_TYPES`). It also finds emails, card numbers (Luhn), IPs, phone numbers and API keys, because the code comes from a PII redactor. Pass only the ID types you want. `validate(type, value)` returns true only when the whole trimmed value is a valid number of that type.

The per-country functions (`cpfValid`, `cnpjValid`, `tcknValid`, `snilsValid`, `innValid`, `dniValid`, `nirValid`, ...) expect digits and letters only, with separators removed. `NATIONAL_COUNTRY` maps each type to its ISO 3166 country code.

## Accuracy notes

- A passing check digit means the number is well formed, not that it was issued to anyone. Never treat it as identity proof.
- Types without a check digit (PK CNIC, VN CCCD, ID NIK, MY MyKad, KR RRN issued after Oct 2020) are screened by dates and region codes only, so false positives are possible. The detector orders overlapping matches so strong check-digit types win.
- Algorithms: Verhoeff (Aadhaar), ISO 7064 MOD 11-2 (CN), ISO 13616 mod 97 (IBAN), Luhn (SA), and the published weights of each national registry. The test suite generates fake numbers with independent generators, so no real person's number is used.

The code is built from the same source as the calculator above (single source of truth), and the site's own tests run against this package.

## License

MIT

## Disclaimer

Provided as is, without warranty (MIT). This package checks format and checksum only; a valid result does not mean the number was issued or belongs to anyone. Results are for reference only and are not legal, financial, medical or tax advice. Figures that change over time (prices, model limits) carry a "checked" date; verify with the provider before relying on them. Issues and pull requests are welcome, but responses are not guaranteed.
