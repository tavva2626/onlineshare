import { QRCodeSVG } from 'qrcode.react';
import { useTheme } from '../../context/ThemeContext';

export default function QRCode({ value, size = 160 }) {
  const { dark } = useTheme();

  const url = `${window.location.origin}/receive?code=${value}`;

  return (
    <div className="flex flex-col items-center gap-3 animate-scale-in">
      <div className="p-4 rounded-2xl bg-white shadow-lg">
        <QRCodeSVG
          value={url}
          size={size}
          bgColor="#ffffff"
          fgColor={dark ? '#312e81' : '#1e1b4b'}
          level="H"
          includeMargin={false}
        />
      </div>
      <p className="text-xs text-surface-400 dark:text-surface-500">
        Scan to retrieve share
      </p>
    </div>
  );
}
