import { useId } from 'react';
import type { deviceKind } from '@/utils/device-kind';

type Kind = ReturnType<typeof deviceKind>;

/** Local category illustrations, independent of a particular product model. */
export function ApplianceGlyph({ kind, ceiling }: { kind: Kind; ceiling: boolean }) {
  const id = useId();
  const white = `url(#${id}-white)`;
  const dark = `url(#${id}-dark)`;
  const blue = `url(#${id}-blue)`;
  const illustrations = {
    camera: (
      <>
        <path d="M29 49v10m-11 3h36" stroke="#ced6da" strokeWidth="4" strokeLinecap="round" />
        <rect x="16" y="9" width="40" height="42" rx="17" fill={white} stroke="#d8dde2" />
        <circle cx="36" cy="29" r="13" fill="#343d46" />
        <circle cx="36" cy="29" r="7" fill="#536f80" />
        <circle cx="36" cy="29" r="3.5" fill="#182b38" />
        <circle cx="33" cy="26" r="1.5" fill="#c4e5e8" />
      </>
    ),
    lock: (
      <>
        <rect x="24" y="5" width="25" height="62" rx="8" fill={dark} />
        <rect x="29" y="11" width="15" height="19" rx="4" fill="#263139" />
        <circle cx="36" cy="19" r="4" fill="#4f656b" />
        <path d="M35 38h22" stroke="#6c737c" strokeWidth="6" strokeLinecap="round" />
        <circle cx="36" cy="56" r="2" fill="#9aa1a8" />
      </>
    ),
    heater: (
      <>
        <rect x="6" y="17" width="60" height="37" rx="16" fill={white} stroke="#d6dce1" />
        <rect x="45" y="29" width="11" height="10" rx="2" fill="#4a5863" />
        <path d="M23 54v9m13-9v9" stroke="#b8cbd0" strokeWidth="3" />
        <path d="M48 34h5" stroke="#b2dfd4" />
      </>
    ),
    light: ceiling ? (
      <>
        <ellipse cx="36" cy="39" rx="28" ry="12" fill="#e3d9bd" />
        <ellipse cx="36" cy="35" rx="28" ry="12" fill={white} stroke="#e3e5e8" />
        <ellipse cx="36" cy="36" rx="23" ry="8" fill="#fff8dd" />
      </>
    ) : (
      <>
        <ellipse cx="35" cy="62" rx="19" ry="4" fill="#d7dade" />
        <path d="M35 58V37L49 21" stroke="#c7cbd0" strokeWidth="4" strokeLinecap="round" />
        <path d="m43 13 17 12-9 10-18-13Z" fill={white} stroke="#d5d9de" strokeLinejoin="round" />
        <path d="m51 35-18-13" stroke="#f2d98d" strokeWidth="3" />
      </>
    ),
    'air-conditioner': (
      <>
        <rect x="5" y="21" width="62" height="28" rx="7" fill={white} stroke="#d6dbe0" />
        <path d="M10 40h52M12 44h48" stroke="#bec7cf" strokeWidth="1.5" />
        <rect x="51" y="28" width="7" height="3" rx="1" fill="#d8e7ec" />
        <circle cx="61" cy="29" r="1" fill="#91cdb8" />
      </>
    ),
    purifier: (
      <>
        <path d="M20 11h31v51H20Z" fill={white} stroke="#d7dce1" strokeLinejoin="round" />
        <ellipse cx="35.5" cy="11" rx="15.5" ry="4" fill="#e0e4e8" />
        <ellipse cx="35.5" cy="11" rx="11" ry="2" fill="#a9b2bb" />
        <circle cx="36" cy="31" r="7" fill="#374448" />
        <path d="M33 31h6" stroke="#a8e1cb" />
        {[44, 48, 52, 56].map((y) => (
          <path key={y} d={`M24 ${y}h23`} stroke="#d0d6dd" strokeWidth="1" strokeDasharray="1 2" />
        ))}
      </>
    ),
    speaker: (
      <>
        <rect x="19" y="14" width="35" height="47" rx="11" fill={dark} />
        <ellipse cx="36.5" cy="16" rx="15.5" ry="5" fill="#52575e" />
        <ellipse cx="36.5" cy="15" rx="11" ry="2.5" fill="#33373d" />
        <path
          d="M26 28v24m5-26v29m5-30v31m5-31v30m5-27v23"
          stroke="#727780"
          strokeWidth="1"
          strokeDasharray="1 2"
        />
        <path d="M31 17h11" stroke="#79cce3" strokeWidth="1.5" strokeLinecap="round" />
      </>
    ),
    curtain: (
      <>
        <rect x="9" y="9" width="54" height="3" rx="1.5" fill="#bdc5cd" />
        <path d="M12 13h22v48l-7-4-7 4-8-3Z" fill={blue} />
        <path d="M38 13h22v45l-8 3-7-4-7 4Z" fill={blue} />
        <path
          d="M18 14v41m9-41v39m18-39v39m9-39v41"
          stroke="#6895b4"
          strokeOpacity=".4"
          strokeWidth="2"
        />
      </>
    ),
    vacuum: (
      <>
        <ellipse cx="36" cy="46" rx="27" ry="17" fill="#454a50" />
        <ellipse cx="36" cy="41" rx="27" ry="17" fill={dark} stroke="#6b7077" />
        <ellipse cx="38" cy="35" rx="8" ry="6" fill="#777d85" />
        <ellipse cx="38" cy="33" rx="8" ry="5" fill="#afb4ba" />
        <path d="M17 43q18 15 40-1" stroke="#858b93" strokeWidth=".8" />
        <circle cx="23" cy="37" r="1.3" fill="#97d1c0" />
      </>
    ),
    sensor: (
      <>
        <rect x="13" y="13" width="47" height="47" rx="10" fill={white} stroke="#d8dde2" />
        <rect x="20" y="23" width="33" height="24" rx="3" fill="#e0e7e7" />
        <text
          x="36"
          y="35"
          textAnchor="middle"
          fontSize="10"
          fill="#5f6d70"
          fontFamily="sans-serif"
        >
          °C
        </text>
        <text x="36" y="43" textAnchor="middle" fontSize="5" fill="#7c898b" fontFamily="sans-serif">
          %
        </text>
        <circle cx="36" cy="54" r="1.2" fill="#c2c9d0" />
      </>
    ),
    fan: (
      <>
        <ellipse cx="36" cy="64" rx="18" ry="3.5" fill="#d0d7dc" />
        <path d="M36 40v22" stroke="#bfc9cf" strokeWidth="4" />
        <circle cx="36" cy="26" r="21" fill="#f0f5f5" stroke="#c8d6d6" strokeWidth="2" />
        <path
          d="M36 25C13 6 14 36 31 29M37 26C59 5 65 34 42 30M36 30C41 54 15 47 31 30"
          fill="#c3d9d2"
        />
        <circle cx="36" cy="27" r="4" fill="#a9c4b9" />
        <circle cx="36" cy="26" r="17" stroke="#d9e4e1" />
      </>
    ),
    outlet: (
      <>
        <rect x="16" y="13" width="41" height="47" rx="9" fill={white} stroke="#d8dce1" />
        <path d="M29 28v7m15-7v7m-8 3v7" stroke="#9ba4ad" strokeWidth="3" strokeLinecap="round" />
        <circle cx="37" cy="53" r="2" fill="#b5c8c2" />
      </>
    ),
    humidifier: (
      <>
        <rect x="18" y="24" width="38" height="38" rx="10" fill={white} stroke="#d6dde1" />
        <ellipse cx="37" cy="25" rx="18" ry="5" fill="#e6edef" />
        <path d="M34 25h7" stroke="#a8bec4" strokeWidth="2" strokeLinecap="round" />
        <path
          d="M34 17q-5-5 0-10m7 12q-5-5 0-10"
          stroke="#b6d7df"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <circle cx="37" cy="48" r="2" fill="#a3cbbf" />
      </>
    ),
    device: (
      <>
        <rect x="16" y="13" width="41" height="48" rx="12" fill={white} stroke="#d5dce2" />
        <circle cx="36" cy="35" r="10" fill="#e4ecee" />
        <circle cx="36" cy="35" r="3" fill="#a1b9ba" />
        <path d="M29 53h14" stroke="#c0cccf" strokeWidth="2" strokeLinecap="round" />
      </>
    ),
  };
  return (
    <svg className="appliance-icon" viewBox="0 0 72 72" fill="none" aria-hidden="true">
      <defs>
        <linearGradient
          id={`${id}-white`}
          x1="15"
          y1="10"
          x2="60"
          y2="60"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#fff" />
          <stop offset=".5" stopColor="#f7f8fa" />
          <stop offset="1" stopColor="#e3e7ec" />
        </linearGradient>
        <linearGradient
          id={`${id}-dark`}
          x1="15"
          y1="10"
          x2="60"
          y2="60"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#646970" />
          <stop offset="1" stopColor="#30343b" />
        </linearGradient>
        <linearGradient
          id={`${id}-blue`}
          x1="12"
          y1="12"
          x2="60"
          y2="60"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#c2ddeb" />
          <stop offset="1" stopColor="#85b7d3" />
        </linearGradient>
      </defs>
      {illustrations[kind]}
    </svg>
  );
}
