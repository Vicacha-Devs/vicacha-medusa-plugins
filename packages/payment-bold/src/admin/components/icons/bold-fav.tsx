import { SVGProps } from "react";

export const BoldFavIcon = ({ width = 24, height = 24, ...props }: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={width}
    height={height}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <rect width="256" height="256" rx="56" fill="#000000" />
    <path
    d="M64 56H136C166.928 56 192 81.0721 192 112C192 128.532 184.832 143.392 173.408 153.648C185.728 164.288 193.5 179.936 193.5 197.5C193.5 229.808 167.308 256 135 256H64V56Z"
    fill="url(#bold-grad)"
    />
    <path
    d="M64 56H132C162.928 56 188 81.0721 188 112C188 142.928 162.928 168 132 168H108V56H64Z"
    fill="#FFFFFF"
    />
    <circle cx="108" cy="112" r="20" fill="#000000" />
    <defs>
    <linearGradient
        id="bold-grad"
        x1="64"
        y1="56"
        x2="193.5"
        y2="256"
        gradientUnits="userSpaceOnUse"
    >
        <stop stopColor="#00E5FF" />
        <stop offset="0.5" stopColor="#0052FF" />
        <stop offset="1" stopColor="#7000FF" />
    </linearGradient>
    </defs>
  </svg>
)
