// Ícones de traço próprios (sem emoji como ícone principal).
type P = { size?: number; className?: string };
const S = ({ size = 26, className, children }: P & { children: React.ReactNode }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
    {children}
  </svg>
);
export const IconUs = (p: P) => (<S {...p}><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" /></S>);
export const IconAsk = (p: P) => (<S {...p}><path d="M4 5h16v11H9l-5 4z" /><path d="M9 10h6" /></S>);
export const IconCal = (p: P) => (<S {...p}><rect x="4" y="5" width="16" height="15" rx="3" /><path d="M8 3v4M16 3v4M4 10h16" /></S>);
export const IconBook = (p: P) => (<S {...p}><path d="M5 4h10a4 4 0 0 1 4 4v12H9a4 4 0 0 1-4-4z" /><path d="M9 9h6M9 13h4" /></S>);
export const IconGear = (p: P) => (<S {...p}><circle cx="12" cy="12" r="3" /><path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M5.6 18.4l1.8-1.8M16.6 7.4l1.8-1.8" /></S>);
export const IconVault = (p: P) => (<S {...p}><rect x="4" y="6" width="16" height="13" rx="3" /><path d="M8 6V5a4 4 0 0 1 8 0v1" /><circle cx="12" cy="12.5" r="2" /></S>);
export const IconPause = (p: P) => (<S {...p}><circle cx="12" cy="12" r="9" /><path d="M10 9v6M14 9v6" /></S>);
export const IconPlay = (p: P) => (<S {...p}><circle cx="12" cy="12" r="9" /><path d="M10 8.5l5 3.5-5 3.5z" /></S>);
export const IconCheck = (p: P) => (<S {...p}><path d="M5 12.5l4.5 4.5L19 7.5" /></S>);
export const IconPaw = (p: P) => (<S {...p}><circle cx="7" cy="10" r="1.8" /><circle cx="11" cy="6.5" r="1.8" /><circle cx="15.5" cy="7.5" r="1.8" /><circle cx="18" cy="11.5" r="1.8" /><path d="M8.5 17c0-3 2.2-5 4.5-5s3.5 2.5 3.5 4.5-2 2.5-4 2.5-4 .5-4-2z" /></S>);
export const IconSpark = (p: P) => (<S {...p}><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" /></S>);
export const IconBack = (p: P) => (<S {...p}><path d="M15 5l-7 7 7 7" /></S>);
export const IconPlus = (p: P) => (<S {...p}><path d="M12 5v14M5 12h14" /></S>);
