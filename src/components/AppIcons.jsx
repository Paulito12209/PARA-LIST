import React from 'react';

export const TagIcon = ({ size = 24, color = "currentColor", strokeWidth = 1.5 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} fill="none" viewBox="0 0 24 24" strokeWidth={strokeWidth} stroke={color} className="lucide lucide-tag">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 0 0 3 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 0 0 5.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 0 0 9.568 3Z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6Z" />
  </svg>
);

export const ArchiveIcon = ({ size = 24, color = "currentColor", strokeWidth = 1.5 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={strokeWidth} stroke={color} width={size} height={size}>
    <path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
  </svg>
);

export const BookmarkIcon = ({ size = 24, color = "currentColor", strokeWidth = 1.5 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={strokeWidth} stroke={color} width={size} height={size}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z" />
  </svg>
);

export const CustomSettingsIcon = ({ size = 24, color = "currentColor", strokeWidth = 2, className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="10 10 20 20" strokeWidth={strokeWidth} stroke={color} width={size} height={size} className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M28 15H19" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M22 25H13" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M22 25C22 25.7956 22.3161 26.5587 22.8787 27.1213C23.4413 27.6839 24.2044 28 25 28C25.7956 28 26.5587 27.6839 27.1213 27.1213C27.6839 26.5587 28 25.7956 28 25C28 24.2044 27.6839 23.4413 27.1213 22.8787C26.5587 22.3161 25.7956 22 25 22C24.2044 22 23.4413 22.3161 22.8787 22.8787C22.3161 23.4413 22 24.2044 22 25Z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15C12 15.394 12.0776 15.7841 12.2284 16.1481C12.3791 16.512 12.6001 16.8427 12.8787 17.1213C13.1573 17.3999 13.488 17.6209 13.8519 17.7716C14.2159 17.9224 14.606 18 15 18C15.394 18 15.7841 17.9224 16.1481 17.7716C16.512 17.6209 16.8427 17.3999 17.1213 17.1213C17.3999 16.8427 17.6209 16.512 17.7716 16.1481C17.9224 15.7841 18 15.394 18 15C18 14.606 17.9224 14.2159 17.7716 13.8519C17.6209 13.488 17.3999 13.1573 17.1213 12.8787C16.8427 12.6001 16.512 12.3791 16.1481 12.2284C15.7841 12.0776 15.394 12 15 12C14.606 12 14.2159 12.0776 13.8519 12.2284C13.488 12.3791 13.1573 12.6001 12.8787 12.8787C12.6001 13.1573 12.3791 13.488 12.2284 13.8519C12.0776 14.2159 12 14.606 12 15Z" />
  </svg>
);
